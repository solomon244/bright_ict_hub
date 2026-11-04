const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const XPEvent = require('../models/XPEvent');
const Achievement = require('../models/Achievement');
const AIConversation = require('../models/AIConversation');
const AIMessage = require('../models/AIMessage');
const CodingSubmission = require('../models/CodingSubmission');
const LearningPath = require('../models/LearningPath');
const Discussion = require('../models/Discussion');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const Token = require('../models/Token');
const TutorEscalation = require('../models/TutorEscalation');
const TutorConfusionCounter = require('../models/TutorConfusionCounter');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { USER_ROLES } = require('../constants/roles');
const audit = require('./auditService');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dashboardStats = async () => {
  const [userCount, instructorPending, courseCount, enrollmentCount] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ 'instructorProfile.status': 'pending' }),
    Course.countDocuments(),
    Enrollment.countDocuments(),
  ]);

  return new ApiResponse(200, 'Admin stats', {
    stats: { userCount, instructorPending, courseCount, enrollmentCount },
  });
};

/** Paginated and searchable. Defaults keep the old "return everyone" behaviour for small deployments. */
const listUsers = async ({ page = 1, limit = 200, q, role } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const safePage = Math.max(Number(page) || 1, 1);
  const filter = {};
  if (Object.values(USER_ROLES).includes(role)) filter.role = role;
  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim().slice(0, 60)), 'i');
    filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip((safePage - 1) * safeLimit).limit(safeLimit),
    User.countDocuments(filter),
  ]);
  return new ApiResponse(200, 'Users fetched', { users, pagination: { page: safePage, limit: safeLimit, total } });
};

const updateInstructorStatus = async ({ instructorId, status, actor, ip }) => {
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

  await audit.record({ actor, action: `instructor.${status}`, targetType: 'user', targetId: instructorId, ip });
  return new ApiResponse(200, `Instructor ${status}`, { user });
};

const getUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return new ApiResponse(200, 'User fetched', { user });
};

const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'role', 'isEmailVerified', 'bio', 'skills'];

const validateField = (key, value) => {
  const text = (max) => {
    if (typeof value !== 'string' || value.length > max) throw new AppError(`${key} must be text up to ${max} characters`, 422);
    return value.trim();
  };
  switch (key) {
    case 'firstName':
    case 'lastName': {
      const v = text(60);
      if (!v) throw new AppError(`${key} cannot be empty`, 422);
      return v;
    }
    case 'bio':
      return text(1000);
    case 'email': {
      const v = text(254).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw new AppError('Invalid email address', 422);
      return v;
    }
    case 'role':
      if (!Object.values(USER_ROLES).includes(value)) throw new AppError('Invalid role', 422);
      return value;
    case 'isEmailVerified':
      if (typeof value !== 'boolean') throw new AppError('isEmailVerified must be true or false', 422);
      return value;
    case 'skills':
      if (!Array.isArray(value) || value.length > 20 || value.some((s) => typeof s !== 'string' || s.length > 40)) {
        throw new AppError('skills must be up to 20 short strings', 422);
      }
      return value.map((s) => s.trim()).filter(Boolean);
    default:
      return value;
  }
};

const updateUser = async (userId, payload, actor, ip) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const changes = {};
  for (const key of Object.keys(payload || {})) {
    if (ALLOWED_FIELDS.includes(key)) changes[key] = validateField(key, payload[key]);
  }

  if (changes.role && changes.role !== user.role) {
    if (actor && String(actor.id) === String(user._id)) {
      throw new AppError('You cannot change your own role', 400);
    }
    if (user.role === USER_ROLES.ADMIN) {
      const otherAdmins = await User.countDocuments({ role: USER_ROLES.ADMIN, _id: { $ne: user._id } });
      if (otherAdmins === 0) throw new AppError('Cannot remove the last administrator', 400);
    }
  }
  if (changes.email && changes.email !== user.email) {
    if (await User.findOne({ email: changes.email, _id: { $ne: user._id } })) {
      throw new AppError('Email already in use', 409);
    }
    // A changed address must be re-verified unless the admin explicitly marks it verified.
    if (changes.isEmailVerified === undefined) changes.isEmailVerified = false;
  }

  const before = { role: user.role, email: user.email, isEmailVerified: user.isEmailVerified };
  Object.assign(user, changes);
  await user.save();

  const changed = Object.keys(changes).filter((k) => ['role', 'email', 'isEmailVerified'].includes(k) && before[k] !== changes[k]);
  if (changed.length) {
    await audit.record({
      actor,
      action: changed.includes('role') ? 'user.role_changed' : 'user.updated',
      targetType: 'user',
      targetId: userId,
      meta: { fields: changed, ...(changed.includes('role') ? { from: before.role, to: changes.role } : {}) },
      ip,
    });
  }
  return new ApiResponse(200, 'User updated successfully', { user });
};

/** Removes everything a user owns or generated, including the newer AI, gamification and community data. */
const eraseUserData = async (user) => {
  const userId = user._id;

  if (user.role === USER_ROLES.INSTRUCTOR) {
    const courseIds = (await Course.find({ instructor: userId }).select('_id').lean()).map((c) => c._id);
    if (courseIds.length) {
      const lessonIds = (await Lesson.find({ course: { $in: courseIds } }).select('_id').lean()).map((l) => l._id);
      const quizIds = (await Quiz.find({ lesson: { $in: lessonIds } }).select('_id').lean()).map((q) => q._id);
      const threadIds = (await Discussion.find({ course: { $in: courseIds } }).select('_id').lean()).map((d) => d._id);
      await QuizAttempt.deleteMany({ quiz: { $in: quizIds } });
      await Quiz.deleteMany({ _id: { $in: quizIds } });
      await Comment.deleteMany({ discussion: { $in: threadIds } });
      await Discussion.deleteMany({ _id: { $in: threadIds } });
      await Lesson.deleteMany({ _id: { $in: lessonIds } });
      await Enrollment.deleteMany({ course: { $in: courseIds } });
      await Progress.deleteMany({ course: { $in: courseIds } });
      await LearningPath.updateMany({}, { $pull: { courses: { course: { $in: courseIds } } } });
      await Course.deleteMany({ _id: { $in: courseIds } });
    }
  }

  // Personal data of any user
  const ownThreadIds = (await Discussion.find({ author: userId }).select('_id').lean()).map((d) => d._id);
  await Comment.deleteMany({ discussion: { $in: ownThreadIds } });
  await Discussion.deleteMany({ _id: { $in: ownThreadIds } });
  await Comment.deleteMany({ author: userId });
  await Enrollment.deleteMany({ student: userId });
  await Progress.deleteMany({ student: userId });
  await QuizAttempt.deleteMany({ student: userId });
  await XPEvent.deleteMany({ user: userId });
  await Achievement.deleteMany({ user: userId });
  await CodingSubmission.deleteMany({ user: userId });
  await Notification.deleteMany({ user: userId });
  await Token.deleteMany({ user: userId });
  await AIMessage.deleteMany({ user: userId });
  await AIConversation.deleteMany({ user: userId });
  await TutorEscalation.deleteMany({ studentId: userId });
  await TutorConfusionCounter.deleteMany({ studentId: userId });
};

const deleteUser = async (userId, actor, ip) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (user.role === USER_ROLES.ADMIN) {
    throw new AppError('Cannot delete admin user', 400);
  }

  await eraseUserData(user);
  await user.deleteOne();
  await audit.record({ actor, action: 'user.deleted', targetType: 'user', targetId: userId, meta: { role: user.role }, ip });
  return new ApiResponse(200, 'User deleted successfully');
};

module.exports = {
  dashboardStats,
  listUsers,
  updateInstructorStatus,
  getUser,
  updateUser,
  deleteUser,
  eraseUserData,
};
