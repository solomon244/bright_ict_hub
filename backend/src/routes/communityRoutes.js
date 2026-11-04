const express = require('express');
const { body, param, query } = require('express-validator');
const c = require('../controllers/communityController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { postLimiter } = require('../middleware/rateLimiters');
const { USER_ROLES } = require('../constants/roles');
const { REPORT_REASONS } = require('../services/communityService');

const id = [param('id').isMongoId()];

/* ---------------- community (all signed-in roles) ---------------- */
const communityRouter = express.Router();
communityRouter.use(authenticate);

/**
 * @swagger
 * /api/community/threads:
 *   get: { summary: "List discussion threads of a course board (course=<id>) or the general board", tags: [Community], security: [{ bearerAuth: [] }], responses: { 200: { description: OK }, 403: { description: "Not enrolled in that course" } } }
 *   post: { summary: "Start a discussion (course optional). Plain text only.", tags: [Community], security: [{ bearerAuth: [] }], responses: { 201: { description: Posted } } }
 * /api/community/threads/{id}/comments:
 *   post: { summary: "Reply to a discussion", tags: [Community], security: [{ bearerAuth: [] }], responses: { 201: { description: Posted } } }
 * /api/community/threads/{id}/report:
 *   post: { summary: "Report a post (3 distinct reports auto-hide it pending moderator review)", tags: [Community], security: [{ bearerAuth: [] }], responses: { 200: { description: Received } } }
 */
communityRouter.get('/boards', c.boards);
communityRouter.get(
  '/threads',
  [query('course').optional().isMongoId(), query('status').optional().isIn(['open', 'resolved', 'all'])],
  validateRequest,
  c.listThreads
);
communityRouter.post(
  '/threads',
  postLimiter,
  [
    body('title').isString().trim().isLength({ min: 3, max: 140 }).withMessage('Title must be 3-140 characters'),
    body('body').isString().trim().isLength({ min: 3, max: 5000 }).withMessage('Body must be 3-5000 characters'),
    body('course').optional({ nullable: true }).isMongoId(),
  ],
  validateRequest,
  c.createThread
);
communityRouter.get('/threads/:id', id, validateRequest, c.getThread);
communityRouter.post(
  '/threads/:id/comments',
  postLimiter,
  [...id, body('body').isString().trim().isLength({ min: 1, max: 3000 }).withMessage('Reply must be 1-3000 characters')],
  validateRequest,
  c.addComment
);
communityRouter.post('/threads/:id/accept', [...id, body('commentId').isMongoId()], validateRequest, c.acceptAnswer);

const reportRules = [...id, body('reason').optional().isIn(REPORT_REASONS)];
const moderateRules = [...id, body('action').isIn(['hide', 'unhide', 'delete'])];
communityRouter.post('/threads/:id/report', postLimiter, reportRules, validateRequest, c.report('thread'));
communityRouter.post('/comments/:id/report', postLimiter, reportRules, validateRequest, c.report('comment'));
communityRouter.post('/threads/:id/moderate', moderateRules, validateRequest, c.moderate('thread'));
communityRouter.post('/comments/:id/moderate', moderateRules, validateRequest, c.moderate('comment'));

/* ---------------- notifications ---------------- */
const notificationRouter = express.Router();
notificationRouter.use(authenticate);
/** @swagger
 * /api/notifications:
 *   get: { summary: "My notifications and unread count", tags: [Notifications], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
notificationRouter.get('/', c.listNotifications);
notificationRouter.get('/unread-count', c.unreadCount);
notificationRouter.post('/read-all', c.markAllRead);
notificationRouter.post('/:id/read', id, validateRequest, c.markRead);

/* ---------------- analytics ---------------- */
const analyticsRouter = express.Router();
analyticsRouter.use(authenticate);
/**
 * @swagger
 * /api/analytics/instructor:
 *   get: { summary: "Real learner analytics for the instructor's own courses", tags: [Analytics], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/analytics/admin:
 *   get: { summary: "Platform analytics: users, enrolments, completion, retention, daily series", tags: [Analytics], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/analytics/admin/export:
 *   get: { summary: "Aggregated CSV report (report=daily|courses). Contains no personal data.", tags: [Analytics], security: [{ bearerAuth: [] }], responses: { 200: { description: "text/csv" } } }
 */
analyticsRouter.get('/instructor', authorize(USER_ROLES.INSTRUCTOR), c.instructorAnalytics);
analyticsRouter.get('/admin', authorize(USER_ROLES.ADMIN), [query('days').optional().isInt({ min: 7, max: 180 })], validateRequest, c.adminAnalytics);
analyticsRouter.get(
  '/admin/export',
  authorize(USER_ROLES.ADMIN),
  [query('report').isIn(['daily', 'courses']), query('days').optional().isInt({ min: 7, max: 180 })],
  validateRequest,
  c.exportReport
);

module.exports = { communityRouter, notificationRouter, analyticsRouter };
