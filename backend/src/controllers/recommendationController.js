const asyncHandler = require('../utils/asyncHandler');
const recommendationService = require('../services/recommendationService');

exports.list = asyncHandler(async (req, res) => {
  const response = await recommendationService.getRecommendations(req.user._id);
  res.status(response.statusCode).json(response);
});
