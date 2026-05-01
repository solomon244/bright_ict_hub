const { body } = require('express-validator');
const { USER_ROLES } = require('../constants/roles');

const registerValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must include a number'),
  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role selection'),
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const refreshValidator = [body('refreshToken').notEmpty().withMessage('Refresh token is required')];

const passwordResetRequestValidator = [body('email').isEmail().withMessage('Valid email is required')];

const passwordResetValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const verifyEmailValidator = [body('token').notEmpty().withMessage('Verification token is required')];

module.exports = {
  registerValidator,
  loginValidator,
  refreshValidator,
  passwordResetRequestValidator,
  passwordResetValidator,
  verifyEmailValidator,
};


