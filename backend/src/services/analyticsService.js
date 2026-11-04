const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Discussion = require('../models/Discussion');
const AIUsageLog = require('../models/AIUsageLog');
const ApiResponse = require('../utils/apiResponse');
const { toCsv } = require('../utils/csv');
const { TIMEZONE, TZ_OFFSET_MINUTES } = require('../constants/gamification');

const DAY = 24 * 60 * 60 * 1000;
const percent = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
const dayFormat = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: TIMEZONE } });
const localDay = (ms) => new Date(ms + TZ_OFFSET_MINUTES * 60 * 1000).toISOString().slice(0, 10);

/** Pure: one row per local day in the window, merging the separate series (missing days = 0). */
function fillDaily(days, series, now = Date.now()) {
  const rows = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = localDay(now - i * DAY);
    rows.push({
      date,
      new_users: series.users?.[date] || 0,
      new_enrollments: series.enrollments?.[date] || 0,
      lessons_completed: series.lessons?.[date] || 0,
      quiz_attempts: series.quizzes?.[date]?.attempts || 0,
    });
  }
  return rows;
}

const toMap = (rows, pick = (r) => r.count) => Object.fromEntries(rows.map((r) => [r._id, pick(r)]));

/* ------------------------------ instructor ------------------------------ */

const instructorAnalytics = async (user) => {
  const courses = await Course.find({ instructor: user.id }).select('title').lean();
  const ids = courses.map((c) => c._id);
  const empty = {
    summary: { courses: 0, learners: 0, enrollments: 0, completedEnrollments: 0, completionRate: 0, activeLearners7d: 0, atRiskLearners: 0, unansweredQuestions: 0 },
    courses: [],
    weakestQuizzes: [],
    unanswered: [],
  };
  if (ids.length === 0) return new ApiResponse(200, 'Instructor analytics', empty);

  const now = Date.now();
  const sevenDays = new Date(now - 7 * DAY);
  const fourteenDays = new Date(now - 14 * DAY);

  const [byCourse, learners, active, atRisk, lessons, unansweredDocs, unansweredCount] = await Promise.all([
    Enrollment.aggregate([
      { $match: { course: { $in: ids } } },
      { $group: { _id: '$course', enrollments: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, avgProgress: { $avg: '$progressPercentage' } } },
    ]),
    Enrollment.distinct('student', { course: { $in: ids } }),
    Progress.distinct('student', { course: { $in: ids }, lastVisitedAt: { $gte: sevenDays } }),
    Enrollment.countDocuments({
      course: { $in: ids },
      status: 'active',
      createdAt: { $lt: fourteenDays },
      $or: [{ lastAccessedAt: { $lt: fourteenDays } }, { lastAccessedAt: null }],
    }),
    Lesson.find({ course: { $in: ids } }).select('course').lean(),
    Discussion.find({ course: { $in: ids }, isResolved: false, commentCount: 0, isHidden: false }).sort('-createdAt').limit(5).populate('course', 'title').lean(),
    Discussion.countDocuments({ course: { $in: ids }, isResolved: false, commentCount: 0, isHidden: false }),
  ]);

  const stats = Object.fromEntries(byCourse.map((r) => [String(r._id), r]));
  const perCourse = courses.map((c) => {
    const s = stats[String(c._id)] || { enrollments: 0, completed: 0, avgProgress: 0 };
    return { courseId: c._id, title: c.title, enrollments: s.enrollments, completed: s.completed, completionRate: percent(s.completed, s.enrollments), avgProgress: Math.round(s.avgProgress || 0) };
  });
  const totalEnrollments = perCourse.reduce((a, c) => a + c.enrollments, 0);
  const totalCompleted = perCourse.reduce((a, c) => a + c.completed, 0);

  // Weakest quizzes (need a few attempts so one bad day does not mislead).
  const courseOfLesson = Object.fromEntries(lessons.map((l) => [String(l._id), String(l.course)]));
  const quizzes = lessons.length ? await Quiz.find({ lesson: { $in: lessons.map((l) => l._id) } }).select('title lesson').lean() : [];
  let weakest = [];
  if (quizzes.length) {
    const attempts = await QuizAttempt.aggregate([
      { $match: { quiz: { $in: quizzes.map((q) => q._id) } } },
      { $group: { _id: '$quiz', attempts: { $sum: 1 }, avgRatio: { $avg: { $cond: [{ $gt: ['$totalQuestions', 0] }, { $divide: ['$score', '$totalQuestions'] }, 0] } } } },
    ]);
    const quizById = Object.fromEntries(quizzes.map((q) => [String(q._id), q]));
    const titleOfCourse = Object.fromEntries(courses.map((c) => [String(c._id), c.title]));
    weakest = attempts
      .filter((a) => a.attempts >= 3)
      .sort((a, b) => a.avgRatio - b.avgRatio)
      .slice(0, 5)
      .map((a) => {
        const q = quizById[String(a._id)];
        return { quizId: a._id, title: q.title, courseTitle: titleOfCourse[courseOfLesson[String(q.lesson)]] || '', attempts: a.attempts, avgScorePercent: Math.round(a.avgRatio * 100) };
      });
  }

  return new ApiResponse(200, 'Instructor analytics', {
    summary: {
      courses: courses.length,
      learners: learners.length,
      enrollments: totalEnrollments,
      completedEnrollments: totalCompleted,
      completionRate: percent(totalCompleted, totalEnrollments),
      activeLearners7d: active.length,
      atRiskLearners: atRisk,
      unansweredQuestions: unansweredCount,
    },
    courses: perCourse,
    weakestQuizzes: weakest,
    unanswered: unansweredDocs.map((d) => ({ _id: d._id, title: d.title, courseTitle: d.course?.title || '', createdAt: d.createdAt })),
  });
};

/* -------------------------------- admin --------------------------------- */

const clampDays = (days) => Math.min(Math.max(Number(days) || 30, 7), 180);

const loadDailySeries = async (since) => {
  const [users, enrollments, lessons, quizzes] = await Promise.all([
    User.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: dayFormat('$createdAt'), count: { $sum: 1 } } }]),
    Enrollment.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: dayFormat('$createdAt'), count: { $sum: 1 } } }]),
    Progress.aggregate([{ $match: { status: 'completed', lastVisitedAt: { $gte: since } } }, { $group: { _id: dayFormat('$lastVisitedAt'), count: { $sum: 1 } } }]),
    QuizAttempt.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: dayFormat('$createdAt'), attempts: { $sum: 1 } } }]),
  ]);
  return { users: toMap(users), enrollments: toMap(enrollments), lessons: toMap(lessons), quizzes: toMap(quizzes, (r) => ({ attempts: r.attempts })) };
};

const adminAnalytics = async ({ days } = {}) => {
  const windowDays = clampDays(days);
  const now = Date.now();
  const since = new Date(now - windowDays * DAY);
  const d14 = new Date(now - 14 * DAY);

  const [byRole, pendingInstructors, courseCount, enrollTotals, series, active7, topCourses, cohort, recentlyActive, quizTotals, aiRequests] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'instructor', 'instructorProfile.status': 'pending' }),
    Course.countDocuments(),
    Enrollment.aggregate([{ $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, avgProgress: { $avg: '$progressPercentage' } } }]),
    loadDailySeries(since),
    Progress.distinct('student', { lastVisitedAt: { $gte: new Date(now - 7 * DAY) } }),
    Enrollment.aggregate([
      { $group: { _id: '$course', enrollments: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { enrollments: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $project: { enrollments: 1, completed: 1, title: '$course.title' } },
    ]),
    Enrollment.distinct('student', { createdAt: { $lte: d14 }, status: { $ne: 'dropped' } }),
    Progress.distinct('student', { lastVisitedAt: { $gte: d14 } }),
    QuizAttempt.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: null, attempts: { $sum: 1 }, avgRatio: { $avg: { $cond: [{ $gt: ['$totalQuestions', 0] }, { $divide: ['$score', '$totalQuestions'] }, 0] } } } }]),
    AIUsageLog.countDocuments({ createdAt: { $gte: since } }),
  ]);

  const roles = Object.fromEntries(byRole.map((r) => [r._id, r.count]));
  const e = enrollTotals[0] || { total: 0, completed: 0, avgProgress: 0 };
  const recent = new Set(recentlyActive.map(String));
  const retained = cohort.filter((s) => recent.has(String(s))).length;
  const daily = fillDaily(windowDays, series, now);
  const q = quizTotals[0] || { attempts: 0, avgRatio: 0 };

  return new ApiResponse(200, 'Admin analytics', {
    windowDays,
    totals: {
      users: Object.values(roles).reduce((a, b) => a + b, 0),
      students: roles.student || 0,
      instructors: roles.instructor || 0,
      admins: roles.admin || 0,
      pendingInstructors,
      courses: courseCount,
      enrollments: e.total,
      completedEnrollments: e.completed,
      completionRate: percent(e.completed, e.total),
      avgProgress: Math.round(e.avgProgress || 0),
      activeLearners7d: active7.length,
    },
    retention14d: { cohortSize: cohort.length, retained, rate: percent(retained, cohort.length) },
    window: {
      newUsers: daily.reduce((a, r) => a + r.new_users, 0),
      newEnrollments: daily.reduce((a, r) => a + r.new_enrollments, 0),
      lessonsCompleted: daily.reduce((a, r) => a + r.lessons_completed, 0),
      quizAttempts: q.attempts,
      avgQuizScorePercent: Math.round(q.avgRatio * 100),
      aiRequests,
    },
    daily,
    topCourses: topCourses.map((c) => ({ courseId: c._id, title: c.title, enrollments: c.enrollments, completed: c.completed, completionRate: percent(c.completed, c.enrollments) })),
    // Honest about what is not collected: no demographic fields exist, and certificates are not built yet.
    notCollected: ['gender', 'location', 'certificates'],
  });
};

const REPORTS = {
  daily: ['date', 'new_users', 'new_enrollments', 'lessons_completed', 'quiz_attempts'],
  courses: ['course', 'enrollments', 'completed', 'completion_rate_percent', 'avg_progress_percent'],
};

/** Aggregated, non-personal CSV reports for impact measurement. */
const exportReport = async ({ report, days }) => {
  const windowDays = clampDays(days);
  if (report === 'daily') {
    const series = await loadDailySeries(new Date(Date.now() - windowDays * DAY));
    return { filename: `ethio-tech-hub-daily-${windowDays}d.csv`, csv: toCsv(REPORTS.daily, fillDaily(windowDays, series)) };
  }
  const rows = await Enrollment.aggregate([
    { $group: { _id: '$course', enrollments: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, avgProgress: { $avg: '$progressPercentage' } } },
    { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
    { $unwind: '$course' },
    { $sort: { enrollments: -1 } },
  ]);
  const data = rows.map((r) => ({ course: r.course.title, enrollments: r.enrollments, completed: r.completed, completion_rate_percent: percent(r.completed, r.enrollments), avg_progress_percent: Math.round(r.avgProgress || 0) }));
  return { filename: 'ethio-tech-hub-courses.csv', csv: toCsv(REPORTS.courses, data) };
};

module.exports = { percent, fillDaily, instructorAnalytics, adminAnalytics, exportReport, REPORTS };
