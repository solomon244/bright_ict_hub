const { body } = require('express-validator');
const { COURSE_LEVELS } = require('../constants/courseLevels');

const createCourseValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Course title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Course description is required')
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('level')
    .optional()
    .isIn(COURSE_LEVELS)
    .withMessage(`Level must be one of: ${COURSE_LEVELS.join(', ')}`),
  body('language')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Language must be less than 50 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  body('outcomes')
    .optional()
    .isArray()
    .withMessage('Outcomes must be an array'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
];

const updateCourseValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('level')
    .optional()
    .isIn(COURSE_LEVELS)
    .withMessage(`Level must be one of: ${COURSE_LEVELS.join(', ')}`),
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  body('outcomes')
    .optional()
    .isArray()
    .withMessage('Outcomes must be an array'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
];

const createLessonValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Lesson title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
  body('content')
    .optional()
    .trim(),
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Video URL must be a valid URL'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('isPreviewable')
    .optional()
    .isBoolean()
    .withMessage('isPreviewable must be a boolean'),
];

module.exports = {
  createCourseValidator,
  updateCourseValidator,
  createLessonValidator,
};

