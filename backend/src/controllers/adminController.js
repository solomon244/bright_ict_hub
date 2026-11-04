const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/adminService');

exports.dashboardStats = asyncHandler(async (req, res) => {
  const response = await adminService.dashboardStats();
  res.status(response.statusCode).json(response);
});

exports.listUsers = asyncHandler(async (req, res) => {
  const response = await adminService.listUsers(req.query);
  res.status(response.statusCode).json(response);
});

exports.updateInstructorStatus = asyncHandler(async (req, res) => {
  const response = await adminService.updateInstructorStatus({
    instructorId: req.params.instructorId,
    status: req.body.status,
    actor: req.user,
    ip: req.ip,
  });
  res.status(response.statusCode).json(response);
});

exports.getUser = asyncHandler(async (req, res) => {
  const response = await adminService.getUser(req.params.userId);
  res.status(response.statusCode).json(response);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const response = await adminService.updateUser(req.params.userId, req.body, req.user, req.ip);
  res.status(response.statusCode).json(response);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const response = await adminService.deleteUser(req.params.userId, req.user, req.ip);
  res.status(response.statusCode).json(response);
});

exports.moderationQueue = asyncHandler(async (req, res) => {
  const response = await require('../services/communityService').moderationQueue(req.query);
  res.status(response.statusCode).json(response);
});

exports.auditLogs = asyncHandler(async (req, res) => {
  const response = await require('../services/auditService').list(req.query);
  res.status(response.statusCode).json(response);
});
