const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { USER_ROLES } = require('../constants/roles');

const dashboardStats = async () => {
  const [userCount, instructorPending, courseCount, enrollmentCount] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ 'instructorProfile.status': 'pending' }),
    Course.countDocuments(),
    Enrollment.countDocuments(),
  ]);

  return new ApiResponse(200, 'Admin stats', {
    stats: {
      userCount,
      instructorPending,
      courseCount,
      enrollmentCount,
    },
  });
};

const listUsers = async () => {
  const users = await User.find().sort('-createdAt');
  return new ApiResponse(200, 'Users fetched', { users });
};

const updateInstructorStatus = async ({ instructorId, status }) => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const user = await User.findOneAndUpdate(
    { _id: instructorId, role: USER_ROLES.INSTRUCTOR },
    { 'instructorProfile.status': status },
    { new: true }
  );

  if (!user) {
    throw new AppError('Instructor not found', 404);
  }

  return new ApiResponse(200, `Instructor ${status}`, { user });
};

const getUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return new ApiResponse(200, 'User fetched', { user });
};

const updateUser = async (userId, payload) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Allowed fields for admin update
  const allowedFields = ['firstName', 'lastName', 'email', 'role', 'isEmailVerified', 'bio', 'skills'];
  Object.keys(payload).forEach((key) => {
    if (allowedFields.includes(key)) {
      user[key] = payload[key];
    }
  });

  await user.save();
  return new ApiResponse(200, 'User updated successfully', { user });
};

const deleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent deleting admin users
  if (user.role === USER_ROLES.ADMIN) {
    throw new AppError('Cannot delete admin user', 400);
  }

  // Delete related data
  const Course = require('../models/Course');
  const Enrollment = require('../models/Enrollment');
  const Progress = require('../models/Progress');
  const QuizAttempt = require('../models/QuizAttempt');

  // If instructor, delete their courses
  if (user.role === USER_ROLES.INSTRUCTOR) {
    const courses = await Course.find({ instructor: userId });
    const courseIds = courses.map((c) => c._id);

    // Delete lessons, enrollments, progress, quiz attempts for these courses
    const Lesson = require('../models/Lesson');
    await Lesson.deleteMany({ course: { $in: courseIds } });
    await Enrollment.deleteMany({ course: { $in: courseIds } });
    await Progress.deleteMany({ course: { $in: courseIds } });
    await Course.deleteMany({ instructor: userId });
  }

  // Delete student-related data
  await Enrollment.deleteMany({ student: userId });
  await Progress.deleteMany({ student: userId });
  await QuizAttempt.deleteMany({ student: userId });

  await user.deleteOne();
  return new ApiResponse(200, 'User deleted successfully');
};

module.exports = {
  dashboardStats,
  listUsers,
  updateInstructorStatus,
  getUser,
  updateUser,
  deleteUser,
};


