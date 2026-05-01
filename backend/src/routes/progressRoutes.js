const express = require('express');
const progressController = require('../controllers/progressController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { USER_ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate, authorize(USER_ROLES.STUDENT));

/**
 * @swagger
 * /api/progress:
 *   post:
 *     summary: Update learning progress
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - lessonId
 *               - status
 *               - percentage
 *             properties:
 *               courseId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               lessonId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439012
 *               status:
 *                 type: string
 *                 enum: [not_started, in_progress, completed]
 *                 example: completed
 *               percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 100
 *     responses:
 *       200:
 *         description: Progress updated successfully
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
 *                     progress:
 *                       $ref: '#/components/schemas/Progress'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', progressController.updateProgress);

/**
 * @swagger
 * /api/progress/{courseId}:
 *   get:
 *     summary: Get progress for a course
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of progress records for the course
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
 *                     progress:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Progress'
 *       401:
 *         description: Unauthorized
 */
router.get('/:courseId', progressController.getCourseProgress);

module.exports = router;
