const asyncHandler = require('../utils/asyncHandler');
const community = require('../services/communityService');
const notifications = require('../services/notificationService');
const analytics = require('../services/analyticsService');

const send = (res, response) => res.status(response.statusCode).json(response);

exports.boards = asyncHandler(async (req, res) => send(res, await community.listBoards(req.user)));
exports.listThreads = asyncHandler(async (req, res) => send(res, await community.listThreads(req.user, req.query)));
exports.createThread = asyncHandler(async (req, res) => send(res, await community.createThread(req.user, req.body)));
exports.getThread = asyncHandler(async (req, res) => send(res, await community.getThread(req.user, req.params.id, req.query)));
exports.addComment = asyncHandler(async (req, res) => send(res, await community.addComment(req.user, req.params.id, req.body.body)));
exports.acceptAnswer = asyncHandler(async (req, res) => send(res, await community.acceptAnswer(req.user, req.params.id, req.body.commentId)));
exports.report = (kind) => asyncHandler(async (req, res) => send(res, await community.report(req.user, kind, req.params.id, req.body.reason)));
exports.moderate = (kind) => asyncHandler(async (req, res) => send(res, await community.moderate(req.user, kind, req.params.id, req.body.action)));

exports.listNotifications = asyncHandler(async (req, res) => send(res, await notifications.list(req.user._id, req.query)));
exports.unreadCount = asyncHandler(async (req, res) => send(res, await notifications.unreadCount(req.user._id)));
exports.markRead = asyncHandler(async (req, res) => send(res, await notifications.markRead(req.user._id, req.params.id)));
exports.markAllRead = asyncHandler(async (req, res) => send(res, await notifications.markAllRead(req.user._id)));

exports.instructorAnalytics = asyncHandler(async (req, res) => send(res, await analytics.instructorAnalytics(req.user)));
exports.adminAnalytics = asyncHandler(async (req, res) => send(res, await analytics.adminAnalytics({ days: req.query.days })));
exports.exportReport = asyncHandler(async (req, res) => {
  const { filename, csv } = await analytics.exportReport({ report: req.query.report, days: req.query.days });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(csv);
});
