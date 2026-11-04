jest.mock('../../src/models/User');
jest.mock('../../src/models/Course');
jest.mock('../../src/models/Lesson');
jest.mock('../../src/models/Quiz');
jest.mock('../../src/models/QuizAttempt');
jest.mock('../../src/models/Enrollment');
jest.mock('../../src/models/Progress');
jest.mock('../../src/models/XPEvent');
jest.mock('../../src/models/Achievement');
jest.mock('../../src/models/AIConversation', () => ({ deleteMany: jest.fn().mockResolvedValue({}), TUTOR_MODES: [] }));
jest.mock('../../src/models/AIMessage');
jest.mock('../../src/models/CodingSubmission');
jest.mock('../../src/models/LearningPath');
jest.mock('../../src/models/Discussion');
jest.mock('../../src/models/Comment');
jest.mock('../../src/models/Notification');
jest.mock('../../src/models/Token');
jest.mock('../../src/models/TutorEscalation');
jest.mock('../../src/models/TutorConfusionCounter');
jest.mock('../../src/services/auditService', () => ({ record: jest.fn().mockResolvedValue(undefined) }));

const User = require('../../src/models/User');
const Course = require('../../src/models/Course');
const Lesson = require('../../src/models/Lesson');
const Quiz = require('../../src/models/Quiz');
const Discussion = require('../../src/models/Discussion');
const Comment = require('../../src/models/Comment');
const XPEvent = require('../../src/models/XPEvent');
const AIMessage = require('../../src/models/AIMessage');
const TutorEscalation = require('../../src/models/TutorEscalation');
const TutorConfusionCounter = require('../../src/models/TutorConfusionCounter');
const Token = require('../../src/models/Token');
const audit = require('../../src/services/auditService');
const admin = require('../../src/services/adminService');
const { chain } = require('../helpers');

const me = { id: 'a1', _id: 'a1', role: 'admin' };
const target = (over = {}) => ({ _id: 'u1', role: 'student', email: 'old@x.com', isEmailVerified: true, save: jest.fn(), deleteOne: jest.fn(), ...over });

beforeEach(() => jest.clearAllMocks());

describe('updateUser safeguards', () => {
  test('admins cannot change their own role', async () => {
    User.findById.mockResolvedValue(target({ _id: 'a1', role: 'admin' }));
    await expect(admin.updateUser('a1', { role: 'student' }, me)).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/own role/) });
  });

  test('the last administrator cannot be demoted', async () => {
    User.findById.mockResolvedValue(target({ _id: 'a2', role: 'admin' }));
    User.countDocuments.mockResolvedValue(0);
    await expect(admin.updateUser('a2', { role: 'student' }, me)).rejects.toMatchObject({ message: expect.stringMatching(/last administrator/) });
  });

  test('invalid values are rejected', async () => {
    User.findById.mockResolvedValue(target());
    await expect(admin.updateUser('u1', { role: 'superuser' }, me)).rejects.toMatchObject({ statusCode: 422 });
    await expect(admin.updateUser('u1', { email: 'not-an-email' }, me)).rejects.toMatchObject({ statusCode: 422 });
    await expect(admin.updateUser('u1', { isEmailVerified: 'yes' }, me)).rejects.toMatchObject({ statusCode: 422 });
  });

  test('an email already in use is a 409; a changed email must be re-verified; unknown fields are ignored', async () => {
    const u = target();
    User.findById.mockResolvedValue(u);
    User.findOne.mockResolvedValue({ _id: 'other' });
    await expect(admin.updateUser('u1', { email: 'taken@x.com' }, me)).rejects.toMatchObject({ statusCode: 409 });
    User.findOne.mockResolvedValue(null);
    await admin.updateUser('u1', { email: 'New@X.com', password: 'hacked', instructorProfile: { status: 'approved' } }, me, '1.2.3.4');
    expect(u.email).toBe('new@x.com');
    expect(u.isEmailVerified).toBe(false);
    expect(u.password).toBeUndefined();
    expect(u.instructorProfile).toBeUndefined();
  });

  test('role changes are written to the audit log with from/to', async () => {
    User.findById.mockResolvedValue(target());
    await admin.updateUser('u1', { role: 'instructor' }, me, '1.2.3.4');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.role_changed', targetId: 'u1', meta: { fields: ['role'], from: 'student', to: 'instructor' }, ip: '1.2.3.4' }));
  });
});

describe('deleteUser erases personal data', () => {
  test('admin accounts cannot be deleted', async () => {
    User.findById.mockResolvedValue(target({ role: 'admin' }));
    await expect(admin.deleteUser('u1', me)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('wipes the newer AI, gamification, community and tutor data (correct field names)', async () => {
    const u = target();
    User.findById.mockResolvedValue(u);
    Discussion.find.mockReturnValue(chain([{ _id: 'd1' }]));
    await admin.deleteUser('u1', me, '1.1.1.1');
    expect(XPEvent.deleteMany).toHaveBeenCalledWith({ user: 'u1' });
    expect(AIMessage.deleteMany).toHaveBeenCalledWith({ user: 'u1' });
    expect(Token.deleteMany).toHaveBeenCalledWith({ user: 'u1' });
    expect(TutorEscalation.deleteMany).toHaveBeenCalledWith({ studentId: 'u1' });
    expect(TutorConfusionCounter.deleteMany).toHaveBeenCalledWith({ studentId: 'u1' });
    expect(Comment.deleteMany).toHaveBeenCalledWith({ author: 'u1' });
    expect(Comment.deleteMany).toHaveBeenCalledWith({ discussion: { $in: ['d1'] } });
    expect(u.deleteOne).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.deleted', meta: { role: 'student' } }));
  });

  test('deleting an instructor also removes their courses, quizzes and course discussions', async () => {
    User.findById.mockResolvedValue(target({ role: 'instructor' }));
    Course.find.mockReturnValue(chain([{ _id: 'c1' }]));
    Lesson.find.mockReturnValue(chain([{ _id: 'l1' }]));
    Quiz.find.mockReturnValue(chain([{ _id: 'q1' }]));
    Discussion.find.mockReturnValue(chain([{ _id: 'd1' }]));
    await admin.deleteUser('u1', me);
    expect(Quiz.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['q1'] } });
    expect(Course.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['c1'] } });
    expect(Discussion.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['d1'] } });
  });
});
