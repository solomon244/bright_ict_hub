const User = require('../models/User');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return new ApiResponse(200, 'Password changed successfully');
};

module.exports = {
  changePassword,
};

