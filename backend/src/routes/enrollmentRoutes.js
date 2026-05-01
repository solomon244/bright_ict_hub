const express = require('express');
const enrollmentController = require('../controllers/enrollmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { USER_ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/enrollments:
 *   post:
 *     summary: Enroll in a course
 *     tags: [Enrollments]
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
 *             properties:
 *               courseId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       201:
 *         description: Successfully enrolled in course
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
 *                     enrollment:
 *                       $ref: '#/components/schemas/Enrollment'
 *       400:
 *         description: Already enrolled or course not found
 *       401:
 *         description: Unauthorized
 */
router.post('/', authorize(USER_ROLES.STUDENT), enrollmentController.enroll);

/**
 * @swagger
 * /api/enrollments/me:
 *   get:
 *     summary: Get current user's enrollments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user enrollments
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
 *                     enrollments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authorize(USER_ROLES.STUDENT), enrollmentController.myEnrollments);

/**
 * @swagger
 * /api/enrollments/{enrollmentId}:
 *   get:
 *     summary: Get enrollment details
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enrollment details
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
 *                     enrollment:
 *                       $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Enrollment not found
 */
router.get('/:enrollmentId', authorize(USER_ROLES.STUDENT), enrollmentController.getEnrollment);

/**
 * @swagger
 * /api/enrollments/{enrollmentId}:
 *   delete:
 *     summary: Unenroll from a course
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully unenrolled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Enrollment not found
 */
router.delete('/:enrollmentId', authorize(USER_ROLES.STUDENT), enrollmentController.deleteEnrollment);

/**
 * @swagger
 * /api/enrollments/course/{courseId}:
 *   get:
 *     summary: Get all enrollments for a course (Instructor/Admin only)
 *     tags: [Enrollments]
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
 *         description: List of course enrollments
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
 *                     enrollments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an instructor or admin
 */
router.get(
  '/course/:courseId',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  enrollmentController.getCourseEnrollments
);

module.exports = router;
