const asyncHandler = require('../utils/asyncHandler');
const dashboardAiService = require('../services/dashboardAiService');

exports.insights = asyncHandler(async (req, res) => {
  const response = await dashboardAiService.getDashboardInsights(req.user._id);
  res.status(response.statusCode).json(response);
});
