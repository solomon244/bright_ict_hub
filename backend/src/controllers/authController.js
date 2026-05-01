const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

exports.register = asyncHandler(async (req, res) => {
  const response = await authService.register(req.body);
  res.status(response.statusCode).json(response);
});

exports.login = asyncHandler(async (req, res) => {
  const response = await authService.login(req.body);
  res.status(response.statusCode).json(response);
});

exports.refresh = asyncHandler(async (req, res) => {
  const response = await authService.refreshSession(req.body.refreshToken);
  res.status(response.statusCode).json(response);
});

exports.logout = asyncHandler(async (req, res) => {
  const response = await authService.logout(req.body.refreshToken);
  res.status(response.statusCode).json(response);
});

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const response = await authService.requestPasswordReset(req.body.email);
  res.status(response.statusCode).json(response);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const response = await authService.resetPassword(req.body);
  res.status(response.statusCode).json(response);
});

exports.requestEmailVerification = asyncHandler(async (req, res) => {
  const response = await authService.requestEmailVerification(req.user.id);
  res.status(response.statusCode).json(response);
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const response = await authService.verifyEmail(req.body.token);
  res.status(response.statusCode).json(response);
});


