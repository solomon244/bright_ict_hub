const express = require('express');
const courseController = require('../controllers/courseController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { USER_ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const {
  createCourseValidator,
  updateCourseValidator,
  createLessonValidator,
} = require('../validators/courseValidators');

const router = express.Router();

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: List all courses
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by course level
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
 *         description: Filter by publication status
 *     responses:
 *       200:
 *         description: List of courses
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
 *                     courses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Course'
 */
router.get('/', courseController.listCourses);

/**
 * @swagger
 * /api/courses/{courseId}:
 *   get:
 *     summary: Get course details
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course details with lessons
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
 *                     course:
 *                       $ref: '#/components/schemas/Course'
 *                     lessons:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Lesson'
 *       404:
 *         description: Course not found
 */
router.get('/:courseId', courseController.getCourse);

router.use(authenticate);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
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
 *               - description
 *               - category
 *               - level
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 example: Introduction to React
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 example: Learn React from scratch
 *               category:
 *                 type: string
 *                 description: Category ID
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 0
 *               language:
 *                 type: string
 *                 example: English
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *               outcomes:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Course created successfully
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
 *                     course:
 *                       $ref: '#/components/schemas/Course'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  createCourseValidator,
  validateRequest,
  courseController.createCourse
);

/**
 * @swagger
 * /api/courses/{courseId}:
 *   patch:
 *     summary: Update a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               price:
 *                 type: number
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.patch(
  '/:courseId',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  updateCourseValidator,
  validateRequest,
  courseController.updateCourse
);

/**
 * @swagger
 * /api/courses/{courseId}:
 *   delete:
 *     summary: Delete a course
 *     tags: [Courses]
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
 *         description: Course deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.delete(
  '/:courseId',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  courseController.deleteCourse
);

/**
 * @swagger
 * /api/courses/{courseId}/lessons:
 *   post:
 *     summary: Create a lesson for a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *               - title
 *               - order
 *             properties:
 *               title:
 *                 type: string
 *                 example: Introduction to Components
 *               description:
 *                 type: string
 *               order:
 *                 type: number
 *                 example: 1
 *               content:
 *                 type: string
 *               duration:
 *                 type: number
 *                 description: Duration in minutes
 *               isPreviewable:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/:courseId/lessons',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  createLessonValidator,
  validateRequest,
  courseController.createLesson
);

/**
 * @swagger
 * /api/courses/lessons/{lessonId}:
 *   patch:
 *     summary: Update a lesson
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
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
 *               description:
 *                 type: string
 *               order:
 *                 type: number
 *               content:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *               duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lesson not found
 */
router.patch(
  '/lessons/:lessonId',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  courseController.updateLesson
);

/**
 * @swagger
 * /api/courses/lessons/{lessonId}:
 *   delete:
 *     summary: Delete a lesson
 *     tags: [Courses]
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
 *         description: Lesson deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lesson not found
 */
router.delete(
  '/lessons/:lessonId',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  courseController.deleteLesson
);

/**
 * @swagger
 * /api/courses/{courseId}/publish:
 *   patch:
 *     summary: Publish or unpublish a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *               - isPublished
 *             properties:
 *               isPublished:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Course publication status updated
 *       400:
 *         description: Cannot publish course with no lessons
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.patch(
  '/:courseId/publish',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  courseController.publishCourse
);

/**
 * @swagger
 * /api/courses/{courseId}/thumbnail:
 *   post:
 *     summary: Upload course thumbnail
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpg, jpeg, png, gif, webp, max 5MB)
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
 *       400:
 *         description: Invalid file or no file uploaded
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post(
  '/:courseId/thumbnail',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  courseController.uploadThumbnail
);

/**
 * @swagger
 * /api/courses/lessons/{lessonId}/video:
 *   post:
 *     summary: Upload lesson video
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video file (mp4, mov, avi, wmv, flv, max 500MB)
 *     responses:
 *       200:
 *         description: Video uploaded successfully
 *       400:
 *         description: Invalid file or no file uploaded
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lesson not found
 */
router.post(
  '/lessons/:lessonId/video',
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  courseController.uploadLessonVideo
);

module.exports = router;
