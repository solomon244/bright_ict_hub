const crypto = require('crypto');
const User = require('../models/User');
const Token = require('../models/Token');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/token');
const env = require('../config/env');
const emailService = require('./emailService');
const { USER_ROLES, SELF_REGISTER_ROLES } = require('../constants/roles');

const buildUserPayload = (user) => ({
  sub: user._id.toString(),
  role: user.role,
});

const generateAndStoreRefreshToken = async (user) => {
  const payload = buildUserPayload(user);
  const refreshToken = signRefreshToken(payload);

  const decoded = verifyRefreshToken(refreshToken);

  await Token.create({
    user: user._id,
    token: refreshToken,
    type: 'refresh',
    expiresAt: new Date(decoded.exp * 1000),
  });

  return refreshToken;
};

const register = async (payload) => {
  const { email, role, firstName, lastName, password } = payload;
  // Defence in depth (the validator also checks this): public sign-up can never mint an admin.
  if (role && !SELF_REGISTER_ROLES.includes(role)) {
    throw new AppError('Invalid role selection', 400);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  // Explicit allow-list: never pass req.body straight to the model (blocks mass assignment of
  // isEmailVerified, instructorProfile.status, etc.).
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: role || USER_ROLES.STUDENT,
  });

  // Send welcome email (non-blocking - won't fail registration if email fails)
  emailService.queueEmail({
    to: user.email,
    subject: 'Welcome to Ethio Tech Hub',
    html: `<p>Selam ${user.firstName}, welcome to Ethio Tech Hub!</p>`,
  }).catch((error) => {
    // Email failure is logged but doesn't affect registration
    console.error('Failed to send welcome email:', error.message);
  });

  return new ApiResponse(201, 'Registration successful', {
    user,
  });
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = signAccessToken(buildUserPayload(user));
  const refreshToken = await generateAndStoreRefreshToken(user);

  return new ApiResponse(200, 'Login successful', {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
};

const refreshSession = async (token) => {
  if (!token) {
    throw new AppError('Refresh token missing', 400);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }

  const storedToken = await Token.findOne({
    token,
    type: 'refresh',
    isUsed: false,
  });

  if (!storedToken) {
    throw new AppError('Refresh token expired', 401);
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new AppError('User no longer exists', 404);
  }

  storedToken.isUsed = true;
  await storedToken.save();

  const accessToken = signAccessToken(buildUserPayload(user));
  const newRefreshToken = await generateAndStoreRefreshToken(user);

  return new ApiResponse(200, 'Session refreshed', {
    tokens: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
};

const logout = async (token) => {
  if (!token) {
    return new ApiResponse(200, 'Logged out');
  }

  await Token.updateOne({ token, type: 'refresh' }, { isUsed: true });
  return new ApiResponse(200, 'Logged out');
};

const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    return new ApiResponse(200, 'Password reset link sent');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.resetTokenExpiryMinutes * 60000);

  await Token.create({
    user: user._id,
    token: resetToken,
    type: 'reset_password',
    expiresAt,
  });

  // Send password reset email (non-blocking)
  emailService.queueEmail({
    to: user.email,
    subject: 'Reset your Ethio Tech Hub password',
    html: `<p>Use this code to reset your password: <strong>${resetToken}</strong></p>`,
  }).catch((error) => {
    console.error('Failed to send password reset email:', error.message);
  });

  return new ApiResponse(200, 'Password reset link sent');
};

const resetPassword = async ({ token, newPassword }) => {
  const storedToken = await Token.findOne({
    token,
    type: 'reset_password',
    isUsed: false,
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError('Invalid or expired token', 400);
  }

  const user = await User.findById(storedToken.user).select('+password');
  user.password = newPassword;
  await user.save();

  storedToken.isUsed = true;
  await storedToken.save();

  return new ApiResponse(200, 'Password updated');
};

const requestEmailVerification = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.verifyTokenExpiryMinutes * 60000);

  await Token.create({
    user: user._id,
    token,
    type: 'verify_email',
    expiresAt,
  });

  // Send verification email (non-blocking)
  emailService.queueEmail({
    to: user.email,
    subject: 'Verify your Ethio Tech Hub email',
    html: `<p>Here is your verification code: <strong>${token}</strong></p>`,
  }).catch((error) => {
    console.error('Failed to send verification email:', error.message);
  });

  return new ApiResponse(200, 'Verification email sent');
};

const verifyEmail = async (token) => {
  const storedToken = await Token.findOne({
    token,
    type: 'verify_email',
    isUsed: false,
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError('Invalid or expired token', 400);
  }

  await User.updateOne({ _id: storedToken.user }, { isEmailVerified: true });
  storedToken.isUsed = true;
  await storedToken.save();

  return new ApiResponse(200, 'Email verified');
};

module.exports = {
  register,
  login,
  refreshSession,
  logout,
  requestPasswordReset,
  resetPassword,
  requestEmailVerification,
  verifyEmail,
};


