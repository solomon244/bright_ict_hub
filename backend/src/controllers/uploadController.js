const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const env = require('../config/env');
const path = require('path');

// Upload profile image
exports.uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const fileUrl = `/uploads/profiles/${req.file.filename}`;
  const fullUrl = `${env.clientUrl}${fileUrl}`;

  res.status(200).json(
    new ApiResponse(200, 'Profile image uploaded successfully', {
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fullUrl,
        path: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    })
  );
});

// Upload course thumbnail
exports.uploadThumbnail = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const fileUrl = `/uploads/thumbnails/${req.file.filename}`;
  const fullUrl = `${env.clientUrl}${fileUrl}`;

  res.status(200).json(
    new ApiResponse(200, 'Thumbnail uploaded successfully', {
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fullUrl,
        path: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    })
  );
});

// Upload video
exports.uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const fileUrl = `/uploads/videos/${req.file.filename}`;
  const fullUrl = `${env.clientUrl}${fileUrl}`;

  res.status(200).json(
    new ApiResponse(200, 'Video uploaded successfully', {
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fullUrl,
        path: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    })
  );
});

// Upload resource (PDF, DOC, etc.)
exports.uploadResource = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const fileUrl = `/uploads/resources/${req.file.filename}`;
  const fullUrl = `${env.clientUrl}${fileUrl}`;

  // Determine file type from extension
  const ext = path.extname(req.file.filename).toLowerCase().slice(1);
  let fileType = 'pdf';
  if (['doc', 'docx'].includes(ext)) {
    fileType = 'doc';
  } else if (ext === 'txt') {
    fileType = 'text';
  }

  res.status(200).json(
    new ApiResponse(200, 'Resource uploaded successfully', {
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fullUrl,
        path: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
        type: fileType,
      },
    })
  );
});

