const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/adminService');

exports.dashboardStats = asyncHandler(async (req, res) => {
  const response = await adminService.dashboardStats();
  res.status(response.statusCode).json(response);
});

exports.listUsers = asyncHandler(async (req, res) => {
  const response = await adminService.listUsers();
  res.status(response.statusCode).json(response);
});

exports.updateInstructorStatus = asyncHandler(async (req, res) => {
  const response = await adminService.updateInstructorStatus({
    instructorId: req.params.instructorId,
    status: req.body.status,
  });
  res.status(response.statusCode).json(response);
});

exports.getUser = asyncHandler(async (req, res) => {
  const response = await adminService.getUser(req.params.userId);
  res.status(response.statusCode).json(response);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const response = await adminService.updateUser(req.params.userId, req.body);
  res.status(response.statusCode).json(response);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const response = await adminService.deleteUser(req.params.userId);
  res.status(response.statusCode).json(response);
});


