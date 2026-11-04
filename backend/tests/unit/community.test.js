jest.mock('../../src/models/Discussion');
jest.mock('../../src/models/Comment');
jest.mock('../../src/models/Course');
jest.mock('../../src/models/Enrollment');
jest.mock('../../src/services/notificationService', () => ({ notify: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../src/services/auditService', () => ({ record: jest.fn().mockResolvedValue(undefined) }));

const Discussion = require('../../src/models/Discussion');
const Comment = require('../../src/models/Comment');
const Course = require('../../src/models/Course');
const Enrollment = require('../../src/models/Enrollment');
const notifications = require('../../src/services/notificationService');
const audit = require('../../src/services/auditService');
const svc = require('../../src/services/communityService');
const { chain } = require('../helpers');

const student = { id: 's1', _id: 's1', role: 'student', firstName: 'Selam', lastName: 'Kebede' };
const other = { id: 's2', _id: 's2', role: 'student', firstName: 'Abel', lastName: 'Tesfaye' };
const owner = { id: 'i1', _id: 'i1', role: 'instructor', firstName: 'Mimi', lastName: 'Bekele' };
const stranger = { id: 'i2', _id: 'i2', role: 'instructor', firstName: 'Dawit', lastName: 'Haile' };
const admin = { id: 'a1', _id: 'a1', role: 'admin', firstName: 'Admin', lastName: 'User' };

const thread = (over = {}) => ({ _id: 't1', course: 'c1', author: 's1', title: 'How do loops work?', body: 'Help', isHidden: false, commentCount: 0, ...over });

beforeEach(() => {
  jest.clearAllMocks();
  Enrollment.exists.mockResolvedValue({ _id: 'e' });
  Course.exists.mockResolvedValue(null);
});

describe('course board access', () => {
  test('students must be enrolled; unenrolled students are refused', async () => {
    Enrollment.exists.mockResolvedValue(null);
    await expect(svc.listThreads(other, { course: 'c1' })).rejects.toMatchObject({ statusCode: 403 });
    await expect(svc.createThread(other, { course: 'c1', title: 'Hello there', body: 'Question' })).rejects.toMatchObject({ statusCode: 403 });
  });

  test('instructors only reach boards of courses they teach', async () => {
    Course.exists.mockResolvedValue(null);
    await expect(svc.listThreads(stranger, { course: 'c1' })).rejects.toMatchObject({ statusCode: 403 });
    Course.exists.mockResolvedValue({ _id: 'c1' });
    Discussion.find.mockReturnValue(chain([]));
    Discussion.countDocuments.mockResolvedValue(0);
    await expect(svc.listThreads(owner, { course: 'c1' })).resolves.toMatchObject({ statusCode: 200 });
  });

  test('the general board needs no enrolment', async () => {
    Discussion.find.mockReturnValue(chain([]));
    Discussion.countDocuments.mockResolvedValue(0);
    await svc.listThreads(other, {});
    expect(Discussion.find).toHaveBeenCalledWith(expect.objectContaining({ course: null, isHidden: false }));
  });

  test('thread titles and bodies are validated', async () => {
    await expect(svc.createThread(student, { title: ' ', body: 'x' })).rejects.toMatchObject({ statusCode: 422 });
    await expect(svc.createThread(student, { title: 'Valid title', body: 'x'.repeat(5001) })).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('privacy and hidden content', () => {
  const populated = (over) => thread({ author: { _id: 's1', firstName: 'Selam', lastName: 'Kebede', role: 'student' }, course: { _id: 'c1', title: 'HTML' }, ...over });

  test('authors appear as "First L." only', async () => {
    Discussion.findById.mockReturnValue(chain(populated()));
    Comment.find.mockReturnValue(chain([]));
    Comment.countDocuments.mockResolvedValue(0);
    const res = await svc.getThread(other, 't1');
    expect(res.data.thread.author.name).toBe('Selam K.');
    expect(JSON.stringify(res.data)).not.toMatch(/Kebede/);
  });

  test('hidden threads are invisible to other students but visible to the asker and moderators', async () => {
    Discussion.findById.mockReturnValue(chain(populated({ isHidden: true })));
    Comment.find.mockReturnValue(chain([]));
    Comment.countDocuments.mockResolvedValue(0);
    await expect(svc.getThread(other, 't1')).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.getThread(student, 't1')).resolves.toMatchObject({ statusCode: 200 });
    Course.exists.mockResolvedValue({ _id: 'c1' });
    const asOwner = await svc.getThread(owner, 't1');
    expect(asOwner.data.permissions.canModerate).toBe(true);
  });
});

describe('replies and answers', () => {
  test('replying notifies the asker but never yourself', async () => {
    Discussion.findById.mockResolvedValue({ ...thread(), commentCount: 0 });
    Comment.create.mockResolvedValue({ _id: 'cm1' });
    await svc.addComment(other, 't1', 'Try a for loop');
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 's1', type: 'reply' }));
    notifications.notify.mockClear();
    await svc.addComment(student, 't1', 'Thanks, solved');
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  test('cannot reply to hidden threads or beyond the cap', async () => {
    Discussion.findById.mockResolvedValue(thread({ isHidden: true }));
    await expect(svc.addComment(other, 't1', 'hi')).rejects.toMatchObject({ statusCode: 404 });
    Discussion.findById.mockResolvedValue(thread({ commentCount: 500 }));
    await expect(svc.addComment(other, 't1', 'hi')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('only the asker or a moderator can accept an answer', async () => {
    const t = { ...thread(), save: jest.fn() };
    Discussion.findById.mockResolvedValue(t);
    Comment.findOne.mockResolvedValue({ _id: 'cm1', author: 's2' });
    await expect(svc.acceptAnswer(other, 't1', 'cm1')).rejects.toMatchObject({ statusCode: 403 });
    await svc.acceptAnswer(student, 't1', 'cm1');
    expect(t.isResolved).toBe(true);
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 's2', type: 'answer_accepted' }));
  });
});

describe('reporting', () => {
  beforeEach(() => Discussion.findById.mockResolvedValue(thread()));

  test('you cannot report your own post', async () => {
    await expect(svc.report(student, 'thread', 't1', 'spam')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('a repeat report by the same user is a no-op', async () => {
    Discussion.findOneAndUpdate.mockResolvedValue(null);
    const res = await svc.report(other, 'thread', 't1', 'spam');
    expect(res.message).toMatch(/Already reported/);
    expect(Discussion.updateOne).not.toHaveBeenCalled();
  });

  test('the third distinct report auto-hides the post and is audited', async () => {
    Discussion.findOneAndUpdate.mockResolvedValue({ reportCount: svc.AUTO_HIDE_AFTER_REPORTS, isHidden: false });
    await svc.report(other, 'thread', 't1', 'harassment');
    expect(Discussion.updateOne).toHaveBeenCalledWith({ _id: 't1' }, { $set: { isHidden: true } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'content.auto_hidden' }));
  });

  test('fewer reports do not hide it; unknown reasons fall back to "other"', async () => {
    Discussion.findOneAndUpdate.mockResolvedValue({ reportCount: 1, isHidden: false });
    await svc.report(other, 'thread', 't1', 'nonsense');
    expect(Discussion.findOneAndUpdate.mock.calls[0][1].$push.reports.reason).toBe('other');
    expect(Discussion.updateOne).not.toHaveBeenCalled();
  });
});

describe('moderation permissions', () => {
  beforeEach(() => {
    Discussion.findById.mockResolvedValue({ ...thread(), deleteOne: jest.fn() });
    Discussion.updateOne.mockResolvedValue({});
  });

  test('other students cannot hide or delete someone else’s post', async () => {
    await expect(svc.moderate(other, 'thread', 't1', 'hide')).rejects.toMatchObject({ statusCode: 403 });
    await expect(svc.moderate(other, 'thread', 't1', 'delete')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('authors may delete their own post but not "hide" it', async () => {
    Comment.deleteMany.mockResolvedValue({});
    await expect(svc.moderate(student, 'thread', 't1', 'delete')).resolves.toMatchObject({ statusCode: 200 });
    await expect(svc.moderate(student, 'thread', 't1', 'hide')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('the course’s instructor can hide (author is told, action audited); another instructor cannot', async () => {
    Course.exists.mockResolvedValue(null);
    await expect(svc.moderate(stranger, 'thread', 't1', 'hide')).rejects.toMatchObject({ statusCode: 403 });
    Course.exists.mockResolvedValue({ _id: 'c1' });
    await svc.moderate(owner, 'thread', 't1', 'hide');
    expect(Discussion.updateOne).toHaveBeenCalledWith({ _id: 't1' }, { $set: { isHidden: true, hiddenBy: 'i1' } });
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 's1', type: 'moderation' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'content.hidden' }));
  });

  test('unhiding clears reports so the post is not instantly re-queued', async () => {
    await svc.moderate(admin, 'thread', 't1', 'unhide');
    expect(Discussion.updateOne).toHaveBeenCalledWith({ _id: 't1' }, expect.objectContaining({ $set: { isHidden: false, reports: [], reportCount: 0 } }));
  });

  test('rejects unknown actions', async () => {
    await expect(svc.moderate(admin, 'thread', 't1', 'nuke')).rejects.toMatchObject({ statusCode: 422 });
  });
});
