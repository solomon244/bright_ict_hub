const Enrollment = require('../models/Enrollment');
const Lesson = require('../models/Lesson');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const QuizAttempt = require('../models/QuizAttempt');
const ApiResponse = require('../utils/apiResponse');

const DAY = 24 * 60 * 60 * 1000;
const WEAK_SCORE = 0.6;
const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced'];

/**
 * Pure rule-based engine (no LLM): every item is derived from real enrolment, progress and quiz data,
 * so nothing here is invented. Kept free of database access so it can be unit tested.
 *
 * @param {object} d
 *  enrollments: [{ course: {_id,title,level,category}, lastAccessedAt }]   (active only)
 *  lessonsByCourse: { [courseId]: [{_id,title,order}] }
 *  progress: [{ lesson, course, status, lastVisitedAt }]
 *  attempts: [{ quizId, quizTitle, lessonId, score, totalQuestions, createdAt }]   (newest first)
 *  catalog: [{_id,title,level,category}]  all courses
 *  completedCourseIds: [id]
 */
function buildRecommendations({ enrollments, lessonsByCourse, progress, attempts, catalog, completedCourseIds = [], now = Date.now() }) {
  const items = [];
  const completedLessons = new Set(progress.filter((p) => p.status === 'completed').map((p) => String(p.lesson)));

  // 1) Continue where you stopped: next unfinished lesson of each active course.
  const active = [...enrollments].sort((a, b) => new Date(b.lastAccessedAt || 0) - new Date(a.lastAccessedAt || 0));
  for (const e of active) {
    const lessons = [...(lessonsByCourse[String(e.course._id)] || [])].sort((a, b) => a.order - b.order);
    const next = lessons.find((l) => !completedLessons.has(String(l._id)));
    if (next) {
      items.push({
        type: 'continue_lesson',
        priority: 1,
        courseId: String(e.course._id),
        lessonId: String(next._id),
        title: next.title,
        reason: `Continue "${e.course.title}" with your next lesson.`,
        reasonAm: `«${e.course.title}» ኮርስህን በቀጣዩ ትምህርት ቀጥል።`,
      });
    }
  }

  // 2) Revise: latest attempt per quiz scored below 60%.
  const seenQuiz = new Set();
  for (const a of attempts) {
    const key = String(a.quizId);
    if (seenQuiz.has(key)) continue;
    seenQuiz.add(key);
    if (!a.totalQuestions) continue;
    const ratio = a.score / a.totalQuestions;
    if (ratio < WEAK_SCORE) {
      const pct = Math.round(ratio * 100);
      items.push({
        type: 'revise_quiz',
        priority: 2,
        quizId: key,
        lessonId: a.lessonId ? String(a.lessonId) : undefined,
        courseId: a.courseId ? String(a.courseId) : undefined,
        title: a.quizTitle,
        reason: `You scored ${pct}% on "${a.quizTitle}". Review the lesson, then try the quiz again.`,
        reasonAm: `በ«${a.quizTitle}» ፈተና ${pct}% አግኝተሃል። ትምህርቱን ደግመህ ካየህ በኋላ እንደገና ሞክር።`,
      });
    }
  }

  // 3) Discover: courses not yet taken, preferring the learner's categories and the next level up.
  const takenIds = new Set([...enrollments.map((e) => String(e.course._id)), ...completedCourseIds.map(String)]);
  const takenCats = new Set(enrollments.map((e) => String(e.course.category)));
  const highestLevel = Math.max(-1, ...enrollments.map((e) => LEVEL_ORDER.indexOf(e.course.level)));
  if (enrollments.length === 0 || active.every((e) => !(lessonsByCourse[String(e.course._id)] || []).some((l) => !completedLessons.has(String(l._id))))) {
    let pool = catalog.filter((c) => !takenIds.has(String(c._id)));
    if (enrollments.length === 0) {
      // A first-time learner should only be pointed at beginner material (if any exists).
      const beginner = pool.filter((c) => c.level === 'beginner');
      if (beginner.length) pool = beginner;
    }
    const candidates = pool
      .map((c) => {
        let score = 0;
        if (takenCats.has(String(c.category))) score += 2;
        const lv = LEVEL_ORDER.indexOf(c.level);
        if (enrollments.length === 0 ? lv === 0 : lv === Math.min(highestLevel + 1, 2)) score += 1;
        return { c, score };
      })
      .sort((x, y) => y.score - x.score)
      .slice(0, 3);
    for (const { c } of candidates) {
      items.push({
        type: 'start_course',
        priority: 3,
        courseId: String(c._id),
        title: c.title,
        reason: enrollments.length === 0 ? `A good first course to start your journey (${c.level}).` : `A suitable next step after your current courses (${c.level}).`,
        reasonAm: enrollments.length === 0 ? `ጉዞህን ለመጀመር የሚመች ኮርስ (${c.level})።` : `ከአሁኑ ኮርሶችህ በኋላ ተስማሚ ቀጣይ እርምጃ (${c.level})።`,
      });
    }
  }

  // 4) At-risk: unfinished enrolments but no learning activity for 7+ days.
  const lastActivity = Math.max(
    0,
    ...progress.map((p) => new Date(p.lastVisitedAt || 0).getTime()),
    ...enrollments.map((e) => new Date(e.lastAccessedAt || 0).getTime())
  );
  const hasUnfinished = items.some((i) => i.type === 'continue_lesson');
  const atRisk = hasUnfinished && lastActivity > 0 && now - lastActivity > 7 * DAY;
  if (atRisk) {
    items.unshift({
      type: 'welcome_back',
      priority: 0,
      title: 'Welcome back',
      reason: 'It has been over a week. Finishing just one lesson today restarts your momentum.',
      reasonAm: 'ከ7 ቀን በላይ ሆኗል። ዛሬ አንድ ትምህርት ብቻ መጨረስ ግስጋሴህን ያስጀምርልሃል።',
    });
  }

  // 5) Goals from the learner's own recent pace (completed lessons over the last 4 weeks).
  const fourWeeksAgo = now - 28 * DAY;
  const recentCompleted = progress.filter((p) => p.status === 'completed' && new Date(p.lastVisitedAt || 0).getTime() >= fourWeeksAgo).length;
  const perWeek = recentCompleted / 4;
  const weeklyLessons = perWeek === 0 ? 3 : Math.min(10, Math.max(2, Math.round(perWeek * 1.2)));
  const goals = { weeklyLessons, dailyLessons: Math.max(1, Math.ceil(weeklyLessons / 5)), basedOn: perWeek === 0 ? 'default' : 'recent_pace' };

  return { items: items.sort((a, b) => a.priority - b.priority).slice(0, 8), goals, atRisk, source: 'rules' };
}

async function getRecommendations(studentId) {
  const enrollmentDocs = await Enrollment.find({ student: studentId, status: { $in: ['active', 'completed'] } })
    .populate('course', 'title level category')
    .limit(50)
    .lean();
  const valid = enrollmentDocs.filter((e) => e.course);
  const active = valid.filter((e) => e.status === 'active');
  const completedCourseIds = valid.filter((e) => e.status === 'completed').map((e) => e.course._id);

  const activeIds = active.map((e) => e.course._id);
  const [lessons, progress, attemptDocs, catalog] = await Promise.all([
    activeIds.length ? Lesson.find({ course: { $in: activeIds } }).select('title order course').lean() : [],
    Progress.find({ student: studentId }).select('lesson course status lastVisitedAt').limit(2000).lean(),
    QuizAttempt.find({ student: studentId })
      .sort('-createdAt')
      .limit(50)
      .populate({ path: 'quiz', select: 'title lesson', populate: { path: 'lesson', select: 'course' } })
      .lean(),
    Course.find({}).select('title level category').limit(200).lean(),
  ]);

  const lessonsByCourse = {};
  for (const l of lessons) (lessonsByCourse[String(l.course)] ||= []).push(l);

  const attempts = attemptDocs
    .filter((a) => a.quiz)
    .map((a) => ({
      quizId: a.quiz._id,
      quizTitle: a.quiz.title,
      lessonId: a.quiz.lesson?._id,
      courseId: a.quiz.lesson?.course,
      score: a.score,
      totalQuestions: a.totalQuestions,
      createdAt: a.createdAt,
    }));

  const data = buildRecommendations({ enrollments: active, lessonsByCourse, progress, attempts, catalog, completedCourseIds });
  return new ApiResponse(200, 'Recommendations fetched', { ...data, generatedAt: new Date().toISOString() });
}

module.exports = { buildRecommendations, getRecommendations };
