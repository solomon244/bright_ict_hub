const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/appError');
const { detectKind, matchesExtension } = require('../utils/fileSignature');

const ensureUploadDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureUploadDir(env.uploadDir);

const FOLDERS = {
  profileImage: 'profiles',
  thumbnail: 'thumbnails',
  video: 'videos',
  resource: 'resources',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(env.uploadDir, FOLDERS[file.fieldname] || 'general');
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  // Never reuse the client-supplied name on disk (path tricks, XSS via filenames, collisions).
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const MB = 1024 * 1024;

const CATEGORIES = {
  image: {
    field: 'profileImage',
    pattern: /\.(jpg|jpeg|png|gif|webp)$/i,
    label: 'image files (jpg, jpeg, png, gif, webp)',
    maxBytes: 5 * MB,
  },
  thumbnail: {
    field: 'thumbnail',
    pattern: /\.(jpg|jpeg|png|gif|webp)$/i,
    label: 'image files (jpg, jpeg, png, gif, webp)',
    maxBytes: 5 * MB,
  },
  video: {
    field: 'video',
    pattern: /\.(mp4|mov|avi|wmv|flv|webm|ogg)$/i,
    label: 'video files (mp4, mov, avi, wmv, flv, webm, ogg)',
    maxBytes: 500 * MB,
  },
  resource: {
    field: 'resource',
    pattern: /\.(pdf|doc|docx|txt)$/i,
    label: 'document files (pdf, doc, docx, txt)',
    maxBytes: 50 * MB,
  },
};

const removeFile = (filePath) => {
  if (filePath) fs.unlink(filePath, () => {});
};

/** Verify the saved file really is what its extension claims (magic bytes). */
const verifySavedFile = async (file) => {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(8192);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const kind = detectKind(buffer.subarray(0, bytesRead));
    return matchesExtension(path.extname(file.originalname), kind);
  } finally {
    await handle.close();
  }
};

const createUploadHandler = (categoryKey) => {
  const category = CATEGORIES[categoryKey];
  const uploader = multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (!category.pattern.test(file.originalname)) {
        return cb(new AppError(`Only ${category.label} are allowed`, 400), false);
      }
      return cb(null, true);
    },
    limits: { fileSize: category.maxBytes, files: 1 },
  }).single(category.field);

  return (req, res, next) => {
    uploader(req, res, async (err) => {
      if (err) {
        if (err instanceof AppError) return next(err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(`File too large. Maximum size is ${Math.round(category.maxBytes / MB)}MB`, 400)
          );
        }
        return next(new AppError(err.message || 'File upload failed', 400));
      }

      if (!req.file) return next();

      try {
        const ok = await verifySavedFile(req.file);
        if (!ok) {
          removeFile(req.file.path);
          return next(new AppError('File content does not match its extension', 400));
        }
        return next();
      } catch (verifyError) {
        removeFile(req.file.path);
        return next(new AppError('Could not verify the uploaded file', 400));
      }
    });
  };
};

module.exports = {
  handleProfileImageUpload: createUploadHandler('image'),
  handleThumbnailUpload: createUploadHandler('thumbnail'),
  handleVideoUpload: createUploadHandler('video'),
  handleResourceUpload: createUploadHandler('resource'),
};
