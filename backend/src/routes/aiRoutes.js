const express = require('express');
const { body } = require('express-validator');
const aiController = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { geminiUserLimiter } = require('../middleware/geminiRateLimit');
const { USER_ROLES } = require('../constants/roles');

const router = express.Router();

/**
 * @swagger
 * /api/ai/quiz-draft:
 *   post:
 *     summary: Generate a DRAFT multiple-choice quiz from a lesson (instructor/admin; never auto-published)
 *     tags: [AI Content]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonId]
 *             properties:
 *               lessonId: { type: string }
 *               count: { type: integer, minimum: 1, maximum: 10, default: 5 }
 *               difficulty: { type: string, enum: [beginner, intermediate, advanced] }
 *               language: { type: string, enum: [en, am] }
 *     responses:
 *       200: { description: "draft with questions, status=draft, requiresReview=true" }
 */
router.post(
  '/quiz-draft',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  geminiUserLimiter,
  [
    body('lessonId').isMongoId().withMessage('lessonId is required'),
    body('count').optional().isInt({ min: 1, max: 10 }).toInt(),
    body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
    body('language').optional().isIn(['en', 'am']),
  ],
  validateRequest,
  aiController.quizDraft
);

module.exports = router;
