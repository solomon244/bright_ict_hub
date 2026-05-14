const asyncHandler = require('../utils/asyncHandler');
const tutorService = require('../services/tutorService');

exports.chat = asyncHandler(async (req, res) => {
  const response = await tutorService.chat({
    studentId: req.user._id,
    messages: req.body.messages,
  });
  res.status(response.statusCode).json(response);
});
