const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/learningController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { submissionLimiter } = require('../middleware/rateLimiters');
const { USER_ROLES } = require('../constants/roles');

const { STUDENT, INSTRUCTOR, ADMIN } = USER_ROLES;
const id = [param('id').isMongoId()];

/* ---------------- gamification ---------------- */
const gamificationRouter = express.Router();
gamificationRouter.use(authenticate, authorize(STUDENT));

/**
 * @swagger
 * /api/gamification/me:
 *   get: { summary: "My XP, level, streak and badges (XP is granted only by server-verified events)", tags: [Gamification], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/gamification/leaderboard:
 *   get: { summary: "Weekly XP leaderboard — only students who opted in, shown as 'First L.'", tags: [Gamification], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/gamification/leaderboard-opt-in:
 *   put: { summary: "Show or hide myself on the leaderboard (default hidden)", tags: [Gamification], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
gamificationRouter.get('/me', controller.myStats);
gamificationRouter.get('/leaderboard', controller.leaderboard);
gamificationRouter.put('/leaderboard-opt-in', [body('optIn').isBoolean().toBoolean()], validateRequest, controller.setOptIn);

/* ---------------- learning paths ---------------- */
const pathRouter = express.Router();
pathRouter.use(authenticate);

/**
 * @swagger
 * /api/learning-paths:
 *   get: { summary: "List published learning paths (admins also see drafts)", tags: [Learning Paths], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   post: { summary: "Create a path from an ordered list of course ids (admin)", tags: [Learning Paths], security: [{ bearerAuth: [] }], responses: { 201: { description: Created } } }
 * /api/learning-paths/{id}:
 *   get: { summary: "Path with the student's progress per course and the next course to take", tags: [Learning Paths], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   put: { summary: "Update a path (admin)", tags: [Learning Paths], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   delete: { summary: "Delete a path (admin)", tags: [Learning Paths], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
pathRouter.get('/', controller.listPaths);
pathRouter.get('/:id', id, validateRequest, controller.getPath);
pathRouter.post('/', authorize(ADMIN), controller.createPath);
pathRouter.put('/:id', authorize(ADMIN), id, validateRequest, controller.updatePath);
pathRouter.delete('/:id', authorize(ADMIN), id, validateRequest, controller.deletePath);

/* ---------------- coding challenges ---------------- */
const codingRouter = express.Router();
codingRouter.use(authenticate);

/**
 * @swagger
 * /api/coding/challenges:
 *   get: { summary: "List coding challenges with my best result", tags: [Coding], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   post: { summary: "Create a JavaScript function challenge (instructor/admin). Tests are JSON data, never code.", tags: [Coding], security: [{ bearerAuth: [] }], responses: { 201: { description: Created } } }
 * /api/coding/challenges/{id}/submissions:
 *   post: { summary: "Save an attempt. Tests run in the student's browser sandbox, so the result is self-reported; no XP is granted for it.", tags: [Coding], security: [{ bearerAuth: [] }], responses: { 201: { description: Saved } } }
 */
codingRouter.get('/challenges', controller.listChallenges);
codingRouter.post('/challenges', authorize(INSTRUCTOR, ADMIN), controller.createChallenge);
codingRouter.get('/challenges/:id', id, validateRequest, controller.getChallenge);
codingRouter.put('/challenges/:id', authorize(INSTRUCTOR, ADMIN), id, validateRequest, controller.updateChallenge);
codingRouter.delete('/challenges/:id', authorize(INSTRUCTOR, ADMIN), id, validateRequest, controller.deleteChallenge);
codingRouter.post(
  '/challenges/:id/submissions',
  authorize(STUDENT),
  submissionLimiter,
  [...id, body('code').isString().isLength({ min: 1, max: 20000 }), body('passedCount').isInt({ min: 0 }).toInt()],
  validateRequest,
  controller.submitSolution
);
codingRouter.get('/challenges/:id/submissions', authorize(STUDENT), id, validateRequest, controller.mySubmissions);

module.exports = { gamificationRouter, pathRouter, codingRouter };
