const express = require('express');
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  handleProfileImageUpload,
  handleThumbnailUpload,
  handleVideoUpload,
  handleResourceUpload,
} = require('../middleware/uploadMiddleware');

const router = express.Router();

// All upload routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/upload/profile-image:
 *   post:
 *     summary: Upload profile image
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpg, jpeg, png, gif, webp, max 5MB)
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
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
 *                     file:
 *                       type: object
 *                       properties:
 *                         filename:
 *                           type: string
 *                         url:
 *                           type: string
 *                         size:
 *                           type: number
 *       400:
 *         description: Invalid file or no file uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/profile-image', handleProfileImageUpload, uploadController.uploadProfileImage);

/**
 * @swagger
 * /api/upload/thumbnail:
 *   post:
 *     summary: Upload course thumbnail
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
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
 */
router.post('/thumbnail', handleThumbnailUpload, uploadController.uploadThumbnail);

/**
 * @swagger
 * /api/upload/video:
 *   post:
 *     summary: Upload video file
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
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
 */
router.post('/video', handleVideoUpload, uploadController.uploadVideo);

/**
 * @swagger
 * /api/upload/resource:
 *   post:
 *     summary: Upload resource file (PDF, DOC, etc.)
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resource:
 *                 type: string
 *                 format: binary
 *                 description: Resource file (pdf, doc, docx, txt, zip, max 50MB)
 *     responses:
 *       200:
 *         description: Resource uploaded successfully
 *       400:
 *         description: Invalid file or no file uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/resource', handleResourceUpload, uploadController.uploadResource);

module.exports = router;
