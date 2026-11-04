jest.mock('../../src/models/User');
jest.mock('../../src/models/Discussion');
jest.mock('../../src/models/Comment');
jest.mock('../../src/models/Course');
jest.mock('../../src/models/Enrollment');
jest.mock('../../src/models/Notification');
jest.mock('../../src/models/AuditLog');
jest.mock('../../src/models/Progress');
jest.mock('../../src/models/QuizAttempt');
jest.mock('../../src/models/AIUsageLog');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Enrollment = require('../../src/models/Enrollment');
const Discussion = require('../../src/models/Discussion');
const Notification = require('../../src/models/Notification');
const AuditLog = require('../../src/models/AuditLog');
const Course = require('../../src/models/Course');
const { chain } = require('../helpers');

const auth = (id) => `Bearer ${jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: '5m' })}`;
const asUser = (u) => User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(u) });
const student = { id: 's1', _id: 's1', role: 'student', firstName: 'A', lastName: 'B' };
const instructor = { id: 'i1', _id: 'i1', role: 'instructor' };
const admin = { id: 'a1', _id: 'a1', role: 'admin' };
const ID = '64b000000000000000000001';

beforeEach(() => jest.clearAllMocks());

describe('community endpoints', () => {
  test('require authentication', async () => {
    expect((await request(app).get('/api/community/threads')).status).toBe(401);
  });

  test('validate thread input and ids', async () => {
    asUser(student);
    const short = await request(app).post('/api/community/threads').set('Authorization', auth('s1')).send({ title: 'x', body: 'y' });
    const badCourse = await request(app).get('/api/community/threads?course=notanid').set('Authorization', auth('s1'));
    const badId = await request(app).get('/api/community/threads/xyz').set('Authorization', auth('s1'));
    expect([short.status, badCourse.status, badId.status]).toEqual([422, 422, 422]);
  });

  test('an unenrolled student cannot read or post on a course board', async () => {
    asUser(student);
    Enrollment.exists.mockResolvedValue(null);
    const read = await request(app).get(`/api/community/threads?course=${ID}`).set('Authorization', auth('s1'));
    const post = await request(app).post('/api/community/threads').set('Authorization', auth('s1')).send({ title: 'Hello world', body: 'A question', course: ID });
    expect(read.status).toBe(403);
    expect(post.status).toBe(403);
    expect(Discussion.create).not.toHaveBeenCalled();
  });

  test('posting to the general board works and stores the author from the token, not the body', async () => {
    asUser(student);
    Discussion.create.mockResolvedValue({ _id: 't1' });
    const res = await request(app).post('/api/community/threads').set('Authorization', auth('s1')).send({ title: 'Hello world', body: 'A question', author: 'someone-else', isResolved: true });
    expect(res.status).toBe(201);
    expect(Discussion.create).toHaveBeenCalledWith({ title: 'Hello world', body: 'A question', author: 's1' });
  });

  test('students cannot moderate', async () => {
    asUser(student);
    Discussion.findById.mockResolvedValue({ _id: ID, course: null, author: 'someone' });
    const res = await request(app).post(`/api/community/threads/${ID}/moderate`).set('Authorization', auth('s1')).send({ action: 'hide' });
    expect(res.status).toBe(403);
  });

  test('moderate and report validate their payloads', async () => {
    asUser(student);
    const a = await request(app).post(`/api/community/threads/${ID}/moderate`).set('Authorization', auth('s1')).send({ action: 'explode' });
    const b = await request(app).post(`/api/community/threads/${ID}/report`).set('Authorization', auth('s1')).send({ reason: 'because' });
    expect([a.status, b.status]).toEqual([422, 422]);
  });
});

describe('notifications', () => {
  test('only return my own, with an unread count', async () => {
    asUser(student);
    Notification.find.mockReturnValue(chain([{ _id: 'n1', message: 'hi' }]));
    Notification.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/notifications').set('Authorization', auth('s1'));
    expect(res.status).toBe(200);
    expect(Notification.find).toHaveBeenCalledWith({ user: 's1' });
    expect(res.body.data.unread).toBe(1);
  });
});

describe('analytics and admin gates', () => {
  test('instructor analytics are instructor-only; admin analytics and export are admin-only', async () => {
    asUser(student);
    const a = await request(app).get('/api/analytics/instructor').set('Authorization', auth('s1'));
    const b = await request(app).get('/api/analytics/admin').set('Authorization', auth('s1'));
    const c = await request(app).get('/api/analytics/admin/export?report=daily').set('Authorization', auth('s1'));
    asUser(instructor);
    const d = await request(app).get('/api/analytics/admin').set('Authorization', auth('i1'));
    expect([a.status, b.status, c.status, d.status]).toEqual([403, 403, 403, 403]);
  });

  test('an instructor with no courses gets an honest empty summary (no invented numbers)', async () => {
    asUser(instructor);
    Course.find.mockReturnValue(chain([]));
    const res = await request(app).get('/api/analytics/instructor').set('Authorization', auth('i1'));
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toMatchObject({ courses: 0, learners: 0, enrollments: 0 });
  });

  test('CSV export validates its parameters', async () => {
    asUser(admin);
    const bad = await request(app).get('/api/analytics/admin/export?report=users').set('Authorization', auth('a1'));
    const badDays = await request(app).get('/api/analytics/admin/export?report=daily&days=9999').set('Authorization', auth('a1'));
    expect([bad.status, badDays.status]).toEqual([422, 422]);
  });

  test('moderation queue and audit log are admin-only', async () => {
    asUser(instructor);
    const a = await request(app).get('/api/admin/moderation').set('Authorization', auth('i1'));
    const b = await request(app).get('/api/admin/audit-logs').set('Authorization', auth('i1'));
    expect([a.status, b.status]).toEqual([403, 403]);
    asUser(admin);
    AuditLog.find.mockReturnValue(chain([{ action: 'user.deleted' }]));
    AuditLog.countDocuments.mockResolvedValue(1);
    const ok = await request(app).get('/api/admin/audit-logs?action=user.deleted').set('Authorization', auth('a1'));
    expect(ok.status).toBe(200);
    expect(AuditLog.find).toHaveBeenCalledWith({ action: 'user.deleted' });
  });

  test('audit log action filter ignores injection-style values', async () => {
    asUser(admin);
    AuditLog.find.mockReturnValue(chain([]));
    AuditLog.countDocuments.mockResolvedValue(0);
    await request(app).get('/api/admin/audit-logs?action[$ne]=x').set('Authorization', auth('a1'));
    expect(AuditLog.find).toHaveBeenCalledWith({});
  });
});
