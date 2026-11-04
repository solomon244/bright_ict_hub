const Progress = require('../models/Progress');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const gamification = require('./gamificationService');

const STATUSES = ['not_started', 'in_progress', 'completed'];

/** Percentage of a course's lessons completed, 0-100. */
const coursePercentage = (completed, total) => (total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0);

/**
 * Saves a student's progress on a lesson.
 * The course is derived from the lesson itself (never trusted from the client), the student must be
 * enrolled, and XP / badges are granted only here, on the server.
 */
const updateProgress = async ({ studentId, lessonId, status, percentage }) => {
  if (!STATUSES.includes(status)) throw new AppError('Invalid progress status', 422);
  if (percentage !== undefined && (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)) {
    throw new AppError('percentage must be between 0 and 100', 422);
  }

  const lesson = await Lesson.findById(lessonId).select('course');
  if (!lesson) throw new AppError('Lesson not found', 404);

  const enrollment = await Enrollment.findOne({ course: lesson.course, student: studentId });
  if (!enrollment || enrollment.status === 'dropped') {
    throw new AppError('Enroll in this course to track your progress', 403);
  }

  const normalizedPercentage = status === 'completed' ? 100 : status === 'not_started' ? 0 : Math.round(percentage ?? 0);

  const progress = await Progress.findOneAndUpdate(
    { student: studentId, lesson: lessonId },
    { course: lesson.course, status, percentage: normalizedPercentage, lastVisitedAt: new Date() },
    { upsert: true, new: true }
  );

  const [completedCount, totalLessons] = await Promise.all([
    Progress.countDocuments({ student: studentId, course: lesson.course, status: 'completed' }),
    Lesson.countDocuments({ course: lesson.course }),
  ]);
  const progressPercentage = coursePercentage(completedCount, totalLessons);
  const courseCompleted = totalLessons > 0 && completedCount >= totalLessons;

  enrollment.progressPercentage = progressPercentage;
  enrollment.lastLesson = lesson._id;
  enrollment.lastAccessedAt = new Date();
  enrollment.status = courseCompleted ? 'completed' : 'active';
  await enrollment.save();

  let reward = { xpAwarded: 0, newBadges: [] };
  if (status === 'completed') {
    reward = await gamification.recordEvent({ userId: studentId, type: 'lesson_complete', refId: lesson._id });
    if (courseCompleted) {
      const bonus = await gamification.recordEvent({ userId: studentId, type: 'course_complete', refId: lesson.course });
      reward = {
        xpAwarded: reward.xpAwarded + bonus.xpAwarded,
        newBadges: [...reward.newBadges, ...bonus.newBadges],
      };
    }
  }

  return new ApiResponse(200, 'Progress updated', {
    progress,
    courseProgress: { percentage: progressPercentage, completed: courseCompleted },
    reward,
  });
};

const getProgressByCourse = async ({ studentId, courseId }) => {
  const progress = await Progress.find({ student: studentId, course: courseId });
  return new ApiResponse(200, 'Progress fetched', { progress });
};

module.exports = { updateProgress, getProgressByCourse, coursePercentage };
