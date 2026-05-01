const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { changePasswordValidator } = require('../validators/userValidators');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', userController.getProfile);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               bio:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               socialLinks:
 *                 type: object
 *                 properties:
 *                   youtube:
 *                     type: string
 *                   linkedin:
 *                     type: string
 *                   website:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.patch('/me', userController.updateProfile);

/**
 * @swagger
 * /api/users/me/profile-image:
 *   post:
 *     summary: Upload profile image
 *     tags: [Users]
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
 *       400:
 *         description: Invalid file or no file uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/me/profile-image', userController.uploadProfileImage);

/**
 * @swagger
 * /api/users/me/password:
 *   patch:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password or validation error
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/me/password',
  changePasswordValidator,
  validateRequest,
  userController.changePassword
);

module.exports = router;
