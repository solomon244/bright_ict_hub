const express = require('express');
const quizController = require('../controllers/quizController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { USER_ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/quizzes/lesson/{lessonId}:
 *   get:
 *     summary: Get quiz by lesson ID
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     quiz:
 *                       $ref: '#/components/schemas/Quiz'
 *       404:
 *         description: Quiz not found
 */
router.get('/lesson/:lessonId', quizController.getQuizByLesson);

/**
 * @swagger
 * /api/quizzes/{quizId}:
 *   get:
 *     summary: Get quiz details
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     quiz:
 *                       $ref: '#/components/schemas/Quiz'
 *       404:
 *         description: Quiz not found
 */
router.get('/:quizId', quizController.getQuiz);

/**
 * @swagger
 * /api/quizzes:
 *   post:
 *     summary: Create a new quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - lesson
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *                 example: React Hooks Quiz
 *               lesson:
 *                 type: string
 *                 description: Lesson ID
 *               durationMinutes:
 *                 type: number
 *                 example: 30
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - prompt
 *                     - options
 *                     - correctAnswerIndex
 *                   properties:
 *                     prompt:
 *                       type: string
 *                       example: What is useState used for?
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["State management", "Side effects", "Rendering", "Styling"]
 *                     correctAnswerIndex:
 *                       type: number
 *                       example: 0
 *                     explanation:
 *                       type: string
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN), quizController.createQuiz);

/**
 * @swagger
 * /api/quizzes/{quizId}:
 *   patch:
 *     summary: Update a quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               durationMinutes:
 *                 type: number
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quiz not found
 */
router.patch('/:quizId', authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN), quizController.updateQuiz);

/**
 * @swagger
 * /api/quizzes/{quizId}:
 *   delete:
 *     summary: Delete a quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quiz not found
 */
router.delete('/:quizId', authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN), quizController.deleteQuiz);

/**
 * @swagger
 * /api/quizzes/{quizId}/attempts:
 *   get:
 *     summary: Get all quiz attempts (Instructor/Admin only)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of quiz attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     attempts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuizAttempt'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/:quizId/attempts', authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN), quizController.getQuizAttempts);

/**
 * @swagger
 * /api/quizzes/{quizId}/submit:
 *   post:
 *     summary: Submit quiz answers
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionIndex
 *                     - selectedOptionIndex
 *                   properties:
 *                     questionIndex:
 *                       type: number
 *                       example: 0
 *                     selectedOptionIndex:
 *                       type: number
 *                       example: 1
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     attempt:
 *                       $ref: '#/components/schemas/QuizAttempt'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/:quizId/submit', authorize(USER_ROLES.STUDENT), quizController.submitQuiz);

/**
 * @swagger
 * /api/quizzes/history/me:
 *   get:
 *     summary: Get current user's quiz history
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of quiz attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     attempts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuizAttempt'
 *       401:
 *         description: Unauthorized
 */
router.get('/history/me', authorize(USER_ROLES.STUDENT), quizController.quizHistory);

module.exports = router;
