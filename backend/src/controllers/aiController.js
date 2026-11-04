const asyncHandler = require('../utils/asyncHandler');
const aiQuizDraftService = require('../services/aiQuizDraftService');
const aiAdminService = require('../services/aiAdminService');

exports.quizDraft = asyncHandler(async (req, res) => {
  const response = await aiQuizDraftService.generateQuizDraft({ user: req.user, ...req.body });
  res.status(response.statusCode).json(response);
});

exports.usageSummary = asyncHandler(async (req, res) => {
  const response = await aiAdminService.usageSummary({ days: Number(req.query.days) || 30 });
  res.status(response.statusCode).json(response);
});
