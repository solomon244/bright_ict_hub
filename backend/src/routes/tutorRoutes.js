const express = require('express');
const { body, param } = require('express-validator');
const tutorController = require('../controllers/tutorController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { geminiUserLimiter } = require('../middleware/geminiRateLimit');
const { TUTOR_MODES } = require('../models/AIConversation');

const router = express.Router();

router.use(authenticate, authorize('student'));

/**
 * @swagger
 * /api/tutor/chat:
 *   post:
 *     summary: Chat with the Solomon AI tutor (history is stored server-side)
 *     tags: [AI Tutor]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages: { type: array, description: "Last item must be the new user message" }
 *               conversationId: { type: string, description: "Omit to start a new conversation" }
 *               mode: { type: string, enum: [beginner, intermediate, advanced, exam_prep, practice, programming_mentor] }
 *     responses:
 *       200: { description: "Reply with conversationId, messageId and aiGenerated flag" }
 *       429: { description: "Rate or daily AI limit reached" }
 *       503: { description: "AI provider not configured" }
 */
router.post(
  '/chat',
  geminiUserLimiter,
  [
    body('messages').isArray({ min: 1, max: 50 }).withMessage('messages must be a non-empty array'),
    body('messages.*.role').isIn(['user', 'assistant']).withMessage('invalid role'),
    body('messages.*.content').isString().trim().notEmpty().isLength({ max: 4000 }).withMessage('content required (max 4000 characters)'),
    body('conversationId').optional().isMongoId().withMessage('invalid conversationId'),
    body('mode').optional().isIn(TUTOR_MODES).withMessage('invalid mode'),
  ],
  validateRequest,
  tutorController.chat
);

/** @swagger
 * /api/tutor/conversations:
 *   get: { summary: "List my tutor conversations", tags: [AI Tutor], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get('/conversations', tutorController.listConversations);

/** @swagger
 * /api/tutor/conversations/{id}/messages:
 *   get: { summary: "Messages of one of my conversations", tags: [AI Tutor], security: [{ bearerAuth: [] }], responses: { 200: { description: OK }, 404: { description: Not found } } }
 */
router.get('/conversations/:id/messages', [param('id').isMongoId()], validateRequest, tutorController.getMessages);

/** @swagger
 * /api/tutor/conversations/{id}:
 *   delete: { summary: "Delete one of my conversations and its messages", tags: [AI Tutor], security: [{ bearerAuth: [] }], responses: { 200: { description: Deleted } } }
 */
router.delete('/conversations/:id', [param('id').isMongoId()], validateRequest, tutorController.deleteConversation);

/** @swagger
 * /api/tutor/messages/{messageId}/feedback:
 *   post: { summary: "Rate or report an AI answer (e.g. inaccurate)", tags: [AI Tutor], security: [{ bearerAuth: [] }], responses: { 200: { description: Recorded } } }
 */
router.post(
  '/messages/:messageId/feedback',
  [
    param('messageId').isMongoId(),
    body('rating').isIn(['up', 'down']).withMessage('rating must be up or down'),
    body('reason').optional().isIn(['inaccurate', 'confusing', 'inappropriate', 'other']),
    body('comment').optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  tutorController.submitFeedback
);

module.exports = router;
