jest.mock('../../src/models/User');
jest.mock('../../src/models/Progress');
jest.mock('../../src/models/Lesson');
jest.mock('../../src/models/Enrollment');
jest.mock('../../src/models/XPEvent');
jest.mock('../../src/models/Achievement');
jest.mock('../../src/models/CodingChallenge');
jest.mock('../../src/models/CodingSubmission');
jest.mock('../../src/models/LearningPath');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Enrollment = require('../../src/models/Enrollment');
const Lesson = require('../../src/models/Lesson');
const XPEvent = require('../../src/models/XPEvent');
const CodingChallenge = require('../../src/models/CodingChallenge');

const auth = (id) => `Bearer ${jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: '5m' })}`;
const asUser = (u) => User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(u) });
const student = { id: 's1', _id: 's1', role: 'student' };
const instructor = { id: 'i1', _id: 'i1', role: 'instructor' };
const MONGO_ID = '64b000000000000000000001';

beforeEach(() => jest.clearAllMocks());

describe('progress endpoint', () => {
  test('rejects a malformed lessonId and unknown status', async () => {
    asUser(student);
    const a = await request(app).post('/api/progress').set('Authorization', auth('s1')).send({ lessonId: 'nope', status: 'completed' });
    const b = await request(app).post('/api/progress').set('Authorization', auth('s1')).send({ lessonId: MONGO_ID, status: 'cheated' });
    expect(a.status).toBe(422);
    expect(b.status).toBe(422);
  });

  test('a non-enrolled student cannot record progress or earn XP', async () => {
    asUser(student);
    Lesson.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: MONGO_ID, course: 'c9' }) });
    Enrollment.findOne.mockResolvedValue(null);
    const res = await request(app).post('/api/progress').set('Authorization', auth('s1')).send({ lessonId: MONGO_ID, status: 'completed', courseId: 'forged' });
    expect(res.status).toBe(403);
    expect(XPEvent.create).not.toHaveBeenCalled();
  });
});

describe('role gates', () => {
  test('students cannot create challenges or learning paths', async () => {
    asUser(student);
    const c = await request(app).post('/api/coding/challenges').set('Authorization', auth('s1')).send({});
    const p = await request(app).post('/api/learning-paths').set('Authorization', auth('s1')).send({});
    expect(c.status).toBe(403);
    expect(p.status).toBe(403);
  });

  test('instructors may create challenges, but only for valid definitions', async () => {
    asUser(instructor);
    const bad = await request(app).post('/api/coding/challenges').set('Authorization', auth('i1')).send({ slug: 'x', title: 'x', description: 'x', functionName: 'bad name', tests: [] });
    expect(bad.status).toBe(422);
    CodingChallenge.create.mockResolvedValue({ _id: 'c1', slug: 'sum' });
    const ok = await request(app).post('/api/coding/challenges').set('Authorization', auth('i1')).send({
      slug: 'sum', title: 'Sum', description: 'd', functionName: 'sum', tests: [{ args: [[1]], expected: 1 }],
    });
    expect(ok.status).toBe(201);
  });

  test('instructors cannot use student-only attempt saving or the XP board', async () => {
    asUser(instructor);
    const s = await request(app).post(`/api/coding/challenges/${MONGO_ID}/submissions`).set('Authorization', auth('i1')).send({ code: 'x', passedCount: 1 });
    const l = await request(app).get('/api/gamification/leaderboard').set('Authorization', auth('i1'));
    expect(s.status).toBe(403);
    expect(l.status).toBe(403);
  });
});

describe('gamification', () => {
  test('leaderboard opt-in must be a boolean', async () => {
    asUser(student);
    const res = await request(app).put('/api/gamification/leaderboard-opt-in').set('Authorization', auth('s1')).send({ optIn: 'maybe' });
    expect(res.status).toBe(422);
  });

  test('leaderboard returns only first name + initial', async () => {
    asUser(student);
    XPEvent.aggregate.mockResolvedValue([{ _id: 'u2', xp: 90, u: { firstName: 'Selam', lastName: 'Kebede' } }]);
    const res = await request(app).get('/api/gamification/leaderboard').set('Authorization', auth('s1'));
    expect(res.status).toBe(200);
    expect(res.body.data.entries[0]).toEqual({ rank: 1, name: 'Selam K.', xp: 90, isMe: false });
    expect(JSON.stringify(res.body)).not.toMatch(/Kebede/);
  });
});
