const asyncHandler = require('../utils/asyncHandler');
const progressService = require('../services/progressService');

exports.updateProgress = asyncHandler(async (req, res) => {
  const response = await progressService.updateProgress({
    studentId: req.user.id,
    courseId: req.body.courseId,
    lessonId: req.body.lessonId,
    status: req.body.status,
    percentage: req.body.percentage,
  });
  res.status(response.statusCode).json(response);
});

exports.getCourseProgress = asyncHandler(async (req, res) => {
  const response = await progressService.getProgressByCourse({
    studentId: req.user.id,
    courseId: req.params.courseId,
  });
  res.status(response.statusCode).json(response);
});


