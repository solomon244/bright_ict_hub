const express = require('express');
const controller = require('../controllers/recommendationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Personalised next steps and suggested goals (rule-based, from real progress data)
 *     tags: [Learning]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "items[], goals, atRisk, source" }
 */
router.get('/', authenticate, authorize('student'), controller.list);

module.exports = router;
