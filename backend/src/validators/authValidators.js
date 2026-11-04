const { body } = require('express-validator');
const { SELF_REGISTER_ROLES } = require('../constants/roles');

const registerValidator = [
  body('firstName').isString().trim().notEmpty().isLength({ max: 60 }).withMessage('First name is required (max 60 characters)'),
  body('lastName').isString().trim().notEmpty().isLength({ max: 60 }).withMessage('Last name is required (max 60 characters)'),
  body('email').isString().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8, max: 72 }) // bcrypt only uses the first 72 bytes
    .withMessage('Password must be 8-72 characters')
    .matches(/\d/)
    .withMessage('Password must include a number'),
  // Admin accounts are never created through public sign-up.
  body('role')
    .optional()
    .isIn(SELF_REGISTER_ROLES)
    .withMessage('Invalid role selection'),
];

const loginValidator = [
  body('email').isString().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

const refreshValidator = [body('refreshToken').notEmpty().withMessage('Refresh token is required')];

const passwordResetRequestValidator = [body('email').isEmail().withMessage('Valid email is required')];

const passwordResetValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isString().isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters'),
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


