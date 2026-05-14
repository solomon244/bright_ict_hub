const express = require('express');
const { body } = require('express-validator');
const tutorController = require('../controllers/tutorController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { geminiUserLimiter } = require('../middleware/geminiRateLimit');

const router = express.Router();

router.post(
  '/chat',
  authenticate,
  authorize('student'),
  geminiUserLimiter,
  [
    body('messages')
      .isArray({ min: 1 })
      .withMessage('messages must be a non-empty array'),
    body('messages.*.role').isIn(['user', 'assistant']).withMessage('invalid role'),
    body('messages.*.content').isString().trim().notEmpty().withMessage('content required'),
  ],
  validateRequest,
  tutorController.chat
);

module.exports = router;
