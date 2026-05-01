const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const AppError = require('../utils/appError');

// Ensure upload directory exists
const ensureUploadDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Ensure main upload directory exists
ensureUploadDir(env.uploadDir);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = env.uploadDir;

    // Organize files by type
    if (file.fieldname === 'profileImage') {
      uploadPath = path.join(env.uploadDir, 'profiles');
    } else if (file.fieldname === 'thumbnail') {
      uploadPath = path.join(env.uploadDir, 'thumbnails');
    } else if (file.fieldname === 'video') {
      uploadPath = path.join(env.uploadDir, 'videos');
    } else if (file.fieldname === 'resource') {
      uploadPath = path.join(env.uploadDir, 'resources');
    } else {
      uploadPath = path.join(env.uploadDir, 'general');
    }

    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter for images
const imageFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return cb(new AppError('Only image files are allowed (jpg, jpeg, png, gif, webp)', 400), false);
  }
  cb(null, true);
};

// File filter for videos
const videoFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(mp4|mov|avi|wmv|flv|webm|ogg)$/i)) {
    return cb(new AppError('Only video files are allowed (mp4, mov, avi, wmv, flv, webm, ogg)', 400), false);
  }
  cb(null, true);
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(pdf|doc|docx|txt)$/i)) {
    return cb(new AppError('Only document files are allowed (pdf, doc, docx, txt)', 400), false);
  }
  cb(null, true);
};

// Upload middleware functions
const uploadProfileImage = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('profileImage');

const uploadCourseThumbnail = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('thumbnail');

const uploadLessonVideo = multer({
  storage: storage,
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
}).single('video');

const uploadResource = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}).single('resource');

// Wrapper functions to handle errors properly
const handleProfileImageUpload = (req, res, next) => {
  uploadProfileImage(req, res, (err) => {
    if (err) {
      if (err instanceof AppError) {
        return next(err);
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large. Maximum size is 5MB', 400));
      }
      return next(new AppError(err.message || 'File upload failed', 400));
    }
    next();
  });
};

const handleThumbnailUpload = (req, res, next) => {
  uploadCourseThumbnail(req, res, (err) => {
    if (err) {
      if (err instanceof AppError) {
        return next(err);
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large. Maximum size is 5MB', 400));
      }
      return next(new AppError(err.message || 'File upload failed', 400));
    }
    next();
  });
};

const handleVideoUpload = (req, res, next) => {
  uploadLessonVideo(req, res, (err) => {
    if (err) {
      if (err instanceof AppError) {
        return next(err);
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large. Maximum size is 500MB', 400));
      }
      return next(new AppError(err.message || 'File upload failed', 400));
    }
    next();
  });
};

const handleResourceUpload = (req, res, next) => {
  uploadResource(req, res, (err) => {
    if (err) {
      if (err instanceof AppError) {
        return next(err);
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large. Maximum size is 50MB', 400));
      }
      return next(new AppError(err.message || 'File upload failed', 400));
    }
    next();
  });
};

module.exports = {
  handleProfileImageUpload,
  handleThumbnailUpload,
  handleVideoUpload,
  handleResourceUpload,
};

