const Progress = require('../models/Progress');
const ApiResponse = require('../utils/apiResponse');

const updateProgress = async ({ studentId, courseId, lessonId, status, percentage }) => {
  const progress = await Progress.findOneAndUpdate(
    { student: studentId, lesson: lessonId },
    {
      course: courseId,
      status,
      percentage,
      lastVisitedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return new ApiResponse(200, 'Progress updated', { progress });
};

const getProgressByCourse = async ({ studentId, courseId }) => {
  const progress = await Progress.find({ student: studentId, course: courseId });
  return new ApiResponse(200, 'Progress fetched', { progress });
};

module.exports = {
  updateProgress,
  getProgressByCourse,
};


