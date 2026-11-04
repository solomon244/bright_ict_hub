const Discussion = require('../models/Discussion');
const Comment = require('../models/Comment');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { USER_ROLES } = require('../constants/roles');
const { publicName } = require('./gamificationService');
const notifications = require('./notificationService');
const audit = require('./auditService');

const AUTO_HIDE_AFTER_REPORTS = 3; // distinct reporters; a moderator reviews and can unhide
const MAX_COMMENTS_PER_THREAD = 500;
const REPORT_REASONS = ['spam', 'inappropriate', 'harassment', 'wrong_info', 'other'];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const preview = (text, n = 200) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

/** Names are shown as "First L." for everyone (many learners are minors). */
const authorView = (u) => (u ? { id: String(u._id), name: publicName(u), role: u.role } : { id: null, name: 'Deleted user', role: null });

/** Who may see a course's board, and who moderates it. */
async function courseAccess(user, courseId) {
  if (user.role === USER_ROLES.ADMIN) return { allowed: true, isManager: true };
  if (user.role === USER_ROLES.INSTRUCTOR) {
    const own = Boolean(await Course.exists({ _id: courseId, instructor: user.id }));
    return { allowed: own, isManager: own };
  }
  const enrolled = Boolean(await Enrollment.exists({ course: courseId, student: user.id, status: { $ne: 'dropped' } }));
  return { allowed: enrolled, isManager: false };
}

/** General board: open to every signed-in user, moderated by admins. */
async function threadAccess(user, thread) {
  const courseId = thread.course?._id || thread.course;
  if (!courseId) return { allowed: true, isManager: user.role === USER_ROLES.ADMIN };
  return courseAccess(user, courseId);
}

const isAuthor = (user, doc) => String(doc.author?._id || doc.author) === String(user.id);

const clampPage = (page, limit, max) => ({
  page: Math.max(Number(page) || 1, 1),
  limit: Math.min(Math.max(Number(limit) || 20, 1), max),
});

const cleanText = (value, label, max) => {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(`${label} is required`, 422);
  if (value.trim().length > max) throw new AppError(`${label} must be at most ${max} characters`, 422);
  return value.trim();
};

/** Boards the caller can browse (for the course filter). */
const listBoards = async (user) => {
  let courses = [];
  if (user.role === USER_ROLES.ADMIN) courses = await Course.find({}).select('title').sort('title').limit(200).lean();
  else if (user.role === USER_ROLES.INSTRUCTOR) courses = await Course.find({ instructor: user.id }).select('title').sort('title').lean();
  else {
    const rows = await Enrollment.find({ student: user.id, status: { $ne: 'dropped' } }).populate('course', 'title').lean();
    courses = rows.map((r) => r.course).filter(Boolean);
  }
  return new ApiResponse(200, 'Boards fetched', { courses: courses.map((c) => ({ _id: c._id, title: c.title })) });
};

const listThreads = async (user, { course, status, q, page, limit } = {}) => {
  const p = clampPage(page, limit, 50);
  const filter = { isHidden: false };
  if (course) {
    const access = await courseAccess(user, course);
    if (!access.allowed) throw new AppError('Join this course to see its discussions', 403);
    filter.course = course;
  } else {
    filter.course = null;
  }
  if (status === 'open') filter.isResolved = false;
  if (status === 'resolved') filter.isResolved = true;
  if (typeof q === 'string' && q.trim()) filter.title = new RegExp(escapeRegex(q.trim().slice(0, 60)), 'i');

  const [rows, total] = await Promise.all([
    Discussion.find(filter).sort('-lastActivityAt').skip((p.page - 1) * p.limit).limit(p.limit).populate('author', 'firstName lastName role').populate('course', 'title').lean(),
    Discussion.countDocuments(filter),
  ]);
  return new ApiResponse(200, 'Threads fetched', {
    threads: rows.map((t) => ({
      _id: t._id,
      title: t.title,
      preview: preview(t.body),
      author: authorView(t.author),
      course: t.course ? { _id: t.course._id, title: t.course.title } : null,
      isResolved: t.isResolved,
      commentCount: t.commentCount,
      lastActivityAt: t.lastActivityAt,
      createdAt: t.createdAt,
    })),
    pagination: { page: p.page, limit: p.limit, total },
  });
};

const createThread = async (user, { course, title, body }) => {
  const data = { title: cleanText(title, 'Title', 140), body: cleanText(body, 'Body', 5000) };
  if (course) {
    const access = await courseAccess(user, course);
    if (!access.allowed) throw new AppError('Join this course to post in its discussions', 403);
    data.course = course;
  }
  const thread = await Discussion.create({ ...data, author: user.id });
  return new ApiResponse(201, 'Discussion posted', { thread: { _id: thread._id } });
};

const getThread = async (user, id, { page, limit } = {}) => {
  const thread = await Discussion.findById(id).populate('author', 'firstName lastName role').populate('course', 'title').lean();
  if (!thread) throw new AppError('Discussion not found', 404);
  const access = await threadAccess(user, thread);
  if (!access.allowed) throw new AppError('Join this course to see its discussions', 403);
  const mine = isAuthor(user, thread);
  if (thread.isHidden && !access.isManager && !mine) throw new AppError('Discussion not found', 404);

  const p = clampPage(page, limit, 100);
  const commentFilter = { discussion: thread._id, ...(access.isManager ? {} : { isHidden: false }) };
  const [comments, total] = await Promise.all([
    Comment.find(commentFilter).sort('createdAt').skip((p.page - 1) * p.limit).limit(p.limit).populate('author', 'firstName lastName role').lean(),
    Comment.countDocuments(commentFilter),
  ]);

  return new ApiResponse(200, 'Discussion fetched', {
    thread: {
      _id: thread._id,
      title: thread.title,
      body: thread.body,
      author: authorView(thread.author),
      course: thread.course ? { _id: thread.course._id, title: thread.course.title } : null,
      isResolved: thread.isResolved,
      acceptedComment: thread.acceptedComment,
      isHidden: thread.isHidden,
      commentCount: thread.commentCount,
      createdAt: thread.createdAt,
    },
    comments: comments.map((c) => ({
      _id: c._id,
      body: c.body,
      author: authorView(c.author),
      isHidden: c.isHidden,
      isAccepted: String(thread.acceptedComment || '') === String(c._id),
      mine: isAuthor(user, c),
      createdAt: c.createdAt,
    })),
    pagination: { page: p.page, limit: p.limit, total },
    permissions: { canModerate: access.isManager, isAuthor: mine },
  });
};

const addComment = async (user, threadId, body) => {
  const text = cleanText(body, 'Reply', 3000);
  const thread = await Discussion.findById(threadId);
  if (!thread || thread.isHidden) throw new AppError('Discussion not found', 404);
  const access = await threadAccess(user, thread);
  if (!access.allowed) throw new AppError('Join this course to reply', 403);
  if (thread.commentCount >= MAX_COMMENTS_PER_THREAD) throw new AppError('This discussion is full', 400);

  const comment = await Comment.create({ discussion: thread._id, author: user.id, body: text });
  await Discussion.updateOne({ _id: thread._id }, { $inc: { commentCount: 1 }, $set: { lastActivityAt: new Date() } });

  if (String(thread.author) !== String(user.id)) {
    await notifications.notify({
      userId: thread.author,
      type: 'reply',
      message: `${publicName(user)} replied to "${preview(thread.title, 60)}"`,
      link: `/community/${thread._id}`,
    });
  }
  return new ApiResponse(201, 'Reply posted', { comment: { _id: comment._id } });
};

const acceptAnswer = async (user, threadId, commentId) => {
  const thread = await Discussion.findById(threadId);
  if (!thread) throw new AppError('Discussion not found', 404);
  const access = await threadAccess(user, thread);
  if (!access.allowed) throw new AppError('Access denied', 403);
  if (!isAuthor(user, thread) && !access.isManager) throw new AppError('Only the asker or a moderator can accept an answer', 403);

  const comment = await Comment.findOne({ _id: commentId, discussion: thread._id, isHidden: false });
  if (!comment) throw new AppError('Reply not found', 404);

  thread.acceptedComment = comment._id;
  thread.isResolved = true;
  await thread.save();

  if (String(comment.author) !== String(user.id)) {
    await notifications.notify({
      userId: comment.author,
      type: 'answer_accepted',
      message: `Your reply to "${preview(thread.title, 60)}" was marked as the answer 🎉`,
      link: `/community/${thread._id}`,
    });
  }
  return new ApiResponse(200, 'Answer accepted');
};

const loadTarget = async (kind, id) => {
  if (kind === 'thread') {
    const thread = await Discussion.findById(id);
    return thread ? { doc: thread, thread, Model: Discussion } : null;
  }
  const comment = await Comment.findById(id);
  if (!comment) return null;
  const thread = await Discussion.findById(comment.discussion);
  return thread ? { doc: comment, thread, Model: Comment } : null;
};

/** Reports are idempotent per user; enough distinct reports auto-hide the content pending review. */
const report = async (user, kind, id, reason) => {
  const why = REPORT_REASONS.includes(reason) ? reason : 'other';
  const target = await loadTarget(kind, id);
  if (!target) throw new AppError('Content not found', 404);
  const access = await threadAccess(user, target.thread);
  if (!access.allowed) throw new AppError('Access denied', 403);
  if (isAuthor(user, target.doc)) throw new AppError('You cannot report your own post', 400);

  const updated = await target.Model.findOneAndUpdate(
    { _id: id, 'reports.user': { $ne: user.id } },
    { $push: { reports: { user: user.id, reason: why } }, $inc: { reportCount: 1 } },
    { new: true }
  );
  if (!updated) return new ApiResponse(200, 'Already reported — thank you');

  if (updated.reportCount >= AUTO_HIDE_AFTER_REPORTS && !updated.isHidden) {
    await target.Model.updateOne({ _id: id }, { $set: { isHidden: true } });
    await audit.record({ actor: user, action: 'content.auto_hidden', targetType: kind, targetId: id, meta: { reports: updated.reportCount } });
  }
  return new ApiResponse(200, 'Report received — a moderator will review it');
};

/** Moderators (admin / the course's instructor) can hide, unhide or delete; authors can delete their own. */
const moderate = async (user, kind, id, action) => {
  if (!['hide', 'unhide', 'delete'].includes(action)) throw new AppError('Invalid action', 422);
  const target = await loadTarget(kind, id);
  if (!target) throw new AppError('Content not found', 404);
  const access = await threadAccess(user, target.thread);
  const own = isAuthor(user, target.doc);
  const allowed = access.isManager || (own && action === 'delete');
  if (!allowed) throw new AppError('You do not have permission to moderate this content', 403);

  if (action === 'hide') {
    await target.Model.updateOne({ _id: id }, { $set: { isHidden: true, hiddenBy: user.id } });
  } else if (action === 'unhide') {
    // Unhiding counts as a review: clear reports so it is not immediately re-queued.
    await target.Model.updateOne({ _id: id }, { $set: { isHidden: false, reports: [], reportCount: 0 }, $unset: { hiddenBy: 1 } });
  } else if (kind === 'thread') {
    await Comment.deleteMany({ discussion: target.thread._id });
    await target.thread.deleteOne();
  } else {
    await target.doc.deleteOne();
    const update = { $inc: { commentCount: -1 } };
    if (String(target.thread.acceptedComment || '') === String(id)) Object.assign(update, { $set: { acceptedComment: null, isResolved: false } });
    await Discussion.updateOne({ _id: target.thread._id }, update);
  }

  await audit.record({ actor: user, action: `content.${action === 'delete' ? 'deleted' : action === 'hide' ? 'hidden' : 'unhidden'}`, targetType: kind, targetId: id, meta: { byAuthor: own } });

  if (action === 'hide' && !own) {
    await notifications.notify({
      userId: target.doc.author,
      type: 'moderation',
      message: 'A moderator hid one of your posts for review. Please follow the community guidelines.',
      link: '/community',
    });
  }
  return new ApiResponse(200, `Content ${action === 'delete' ? 'deleted' : action === 'hide' ? 'hidden' : 'restored'}`);
};

const summarizeReasons = (reports = []) =>
  reports.reduce((acc, r) => ({ ...acc, [r.reason]: (acc[r.reason] || 0) + 1 }), {});

/** Admin review queue: reported or hidden threads and replies. */
const moderationQueue = async ({ page, limit } = {}) => {
  const p = clampPage(page, limit, 50);
  const filter = { $or: [{ reportCount: { $gt: 0 } }, { isHidden: true }] };
  const [threads, comments] = await Promise.all([
    Discussion.find(filter).sort({ reportCount: -1, updatedAt: -1 }).limit(p.limit).populate('author', 'firstName lastName role').lean(),
    Comment.find(filter).sort({ reportCount: -1, updatedAt: -1 }).limit(p.limit).populate('author', 'firstName lastName role').lean(),
  ]);
  const items = [
    ...threads.map((t) => ({ kind: 'thread', id: t._id, threadId: t._id, text: preview(`${t.title} — ${t.body}`, 240), author: authorView(t.author), reportCount: t.reportCount, reasons: summarizeReasons(t.reports), isHidden: t.isHidden, createdAt: t.createdAt })),
    ...comments.map((c) => ({ kind: 'comment', id: c._id, threadId: c.discussion, text: preview(c.body, 240), author: authorView(c.author), reportCount: c.reportCount, reasons: summarizeReasons(c.reports), isHidden: c.isHidden, createdAt: c.createdAt })),
  ].sort((a, b) => b.reportCount - a.reportCount || new Date(b.createdAt) - new Date(a.createdAt));
  return new ApiResponse(200, 'Moderation queue', { items });
};

module.exports = {
  AUTO_HIDE_AFTER_REPORTS,
  REPORT_REASONS,
  listBoards,
  listThreads,
  createThread,
  getThread,
  addComment,
  acceptAnswer,
  report,
  moderate,
  moderationQueue,
  summarizeReasons,
};
