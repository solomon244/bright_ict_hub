const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const env = require('../config/env');
const fs = require('fs');
const path = require('path');
const { handleProfileImageUpload } = require('../middleware/uploadMiddleware');
const userService = require('../services/userService');

exports.getProfile = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, 'Profile fetched', { user: req.user }));
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, 'User not found'));
  }

  // Update top-level fields
  const allowedFields = ['firstName', 'lastName', 'bio', 'skills', 'socialLinks', 'profileImage'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  // Handle instructorProfile updates (nested fields)
  if (req.body.instructorProfile !== undefined) {
    if (!user.instructorProfile) {
      user.instructorProfile = {};
    }
    if (req.body.instructorProfile.experienceYears !== undefined) {
      user.instructorProfile.experienceYears = req.body.instructorProfile.experienceYears;
    }
    if (req.body.instructorProfile.highlight !== undefined) {
      user.instructorProfile.highlight = req.body.instructorProfile.highlight;
    }
    // Note: status can only be updated by admins
  }

  await user.save();

  res.json(new ApiResponse(200, 'Profile updated', { user }));
});

// Upload profile image
exports.uploadProfileImage = [
  handleProfileImageUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json(new ApiResponse(400, 'No file uploaded'));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json(new ApiResponse(404, 'User not found'));
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      const oldImagePath = path.join(env.uploadDir, 'profiles', path.basename(user.profileImage));
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (error) {
          console.error('Failed to delete old profile image:', error.message);
        }
      }
    }

    // Update user with new profile image URL
    const fileUrl = `${env.clientUrl}/uploads/profiles/${req.file.filename}`;
    user.profileImage = fileUrl;
    await user.save();

    res.json(
      new ApiResponse(200, 'Profile image uploaded successfully', {
        user,
        file: {
          url: fileUrl,
          filename: req.file.filename,
        },
      })
    );
  }),
];

// Change password
exports.changePassword = asyncHandler(async (req, res) => {
  const response = await userService.changePassword(req.user.id, req.body);
  res.status(response.statusCode).json(response);
});


