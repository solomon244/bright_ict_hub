const express = require('express');
const dashboardAiController = require('../controllers/dashboardAiController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { geminiUserLimiter } = require('../middleware/geminiRateLimit');

const router = express.Router();

router.get(
  '/ai-insights',
  authenticate,
  authorize('student'),
  geminiUserLimiter,
  dashboardAiController.insights
);

module.exports = router;
