const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

/** Creates a notification. Never throws (a failed notification must not fail a post). */
async function notify({ userId, type, message, link }) {
  try {
    await Notification.create({ user: userId, type, message: String(message).slice(0, 200), link });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error('Notification failed:', err.message);
  }
}

const list = async (userId, { page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);
  const [items, unread] = await Promise.all([
    Notification.find({ user: userId }).sort('-createdAt').skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Notification.countDocuments({ user: userId, readAt: null }),
  ]);
  return new ApiResponse(200, 'Notifications fetched', { notifications: items, unread });
};

const unreadCount = async (userId) =>
  new ApiResponse(200, 'OK', { unread: await Notification.countDocuments({ user: userId, readAt: null }) });

const markRead = async (userId, id) => {
  const n = await Notification.findOneAndUpdate({ _id: id, user: userId }, { readAt: new Date() });
  if (!n) throw new AppError('Notification not found', 404);
  return new ApiResponse(200, 'Marked as read');
};

const markAllRead = async (userId) => {
  await Notification.updateMany({ user: userId, readAt: null }, { readAt: new Date() });
  return new ApiResponse(200, 'All notifications marked as read');
};

module.exports = { notify, list, unreadCount, markRead, markAllRead };
