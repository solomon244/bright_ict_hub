jest.mock('../../src/models/User');
jest.mock('../../src/models/Token');
jest.mock('../../src/models/Course');
jest.mock('../../src/models/Lesson');
jest.mock('../../src/models/Enrollment');
jest.mock('../../src/models/Quiz');
jest.mock('../../src/models/QuizAttempt');
jest.mock('../../src/services/emailService', () => ({ queueEmail: jest.fn().mockResolvedValue(undefined) }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Course = require('../../src/models/Course');
const Enrollment = require('../../src/models/Enrollment');
const Quiz = require('../../src/models/Quiz');

const tokenFor = (id) => jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: '5m' });
const asUser = (user) =>
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

const student = { id: 's1', _id: 's1', role: 'student' };
const instructor = { id: 'i1', _id: 'i1', role: 'instructor' };

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

beforeEach(() => jest.clearAllMocks());

describe('registration cannot create privileged accounts', () => {
  const body = { firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'password1' };

  test('role "admin" is rejected before touching the database', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...body, role: 'admin' });
    expect(res.status).toBe(422);
    expect(User.create).not.toHaveBeenCalled();
  });

  test('only allow-listed fields reach the model (no mass assignment)', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ email: 'a@b.com', firstName: 'A' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...body, role: 'instructor', isEmailVerified: true, instructorProfile: { status: 'approved' } });
    expect(res.status).toBe(201);
    expect(User.create).toHaveBeenCalledWith({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'password1',
      role: 'instructor',
    });
  });

  test('defaults to the student role', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ email: 'a@b.com', firstName: 'A' });
    await request(app).post('/api/auth/register').send(body);
    expect(User.create.mock.calls[0][0].role).toBe('student');
  });

  test('operator-injection style email is rejected', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: 'x' });
    expect(res.status).toBe(422);
  });
});

describe('authentication errors', () => {
  test('a garbage token yields 401, not 500', async () => {
    const res = await request(app).get('/api/quizzes/abc').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });
  test('missing token yields 401', async () => {
    const res = await request(app).get('/api/quizzes/abc');
    expect(res.status).toBe(401);
  });
});

describe('quiz answer keys', () => {
  const makeQuiz = () => {
    const raw = {
      title: 'HTML basics',
      lesson: { _id: 'l1', course: 'c1' },
      questions: [{ prompt: 'Q?', options: ['a', 'b'], correctAnswerIndex: 1, explanation: 'because' }],
    };
    return { ...raw, toObject: () => JSON.parse(JSON.stringify(raw)) };
  };
  const mockQuiz = () =>
    Quiz.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(makeQuiz()) });

  test('enrolled students never receive correctAnswerIndex or explanations', async () => {
    asUser(student);
    mockQuiz();
    Course.exists.mockResolvedValue(null);
    Enrollment.exists.mockResolvedValue({ _id: 'e1' });
    const res = await request(app).get('/api/quizzes/q1').set('Authorization', `Bearer ${tokenFor('s1')}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/correctAnswerIndex|because/);
    expect(res.body.data.quiz.questions[0].prompt).toBe('Q?');
  });

  test('students who are not enrolled are refused', async () => {
    asUser(student);
    mockQuiz();
    Course.exists.mockResolvedValue(null);
    Enrollment.exists.mockResolvedValue(null);
    const res = await request(app).get('/api/quizzes/q1').set('Authorization', `Bearer ${tokenFor('s1')}`);
    expect(res.status).toBe(403);
  });

  test("the course's own instructor still sees the full quiz", async () => {
    asUser(instructor);
    mockQuiz();
    Course.exists.mockResolvedValue({ _id: 'c1' });
    const res = await request(app).get('/api/quizzes/q1').set('Authorization', `Bearer ${tokenFor('i1')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.quiz.questions[0].correctAnswerIndex).toBe(1);
  });
});

describe('uploads', () => {
  test('students cannot upload course videos', async () => {
    asUser(student);
    const res = await request(app)
      .post('/api/upload/video')
      .set('Authorization', `Bearer ${tokenFor('s1')}`)
      .attach('video', Buffer.from('data'), 'lesson.mp4');
    expect(res.status).toBe(403);
  });

  test('HTML disguised as a PNG is rejected', async () => {
    asUser(student);
    const res = await request(app)
      .post('/api/upload/profile-image')
      .set('Authorization', `Bearer ${tokenFor('s1')}`)
      .attach('profileImage', Buffer.from('<script>alert(1)</script>'), 'avatar.png');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not match/);
  });

  test('a real PNG is accepted and stored under a random name', async () => {
    asUser(student);
    const res = await request(app)
      .post('/api/upload/profile-image')
      .set('Authorization', `Bearer ${tokenFor('s1')}`)
      .attach('profileImage', PNG, '../../evil name.png');
    expect(res.status).toBe(200);
    expect(res.body.data.file.filename).toMatch(/^[0-9a-f]{32}\.png$/);
  });
});

describe('transport hardening', () => {
  test('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('oversized JSON bodies are refused with 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'x'.repeat(1_200_000) });
    expect(res.status).toBe(413);
  });

  // Keep last: exhausts the login limiter for this IP.
  test('repeated failed logins are rate limited', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    let last;
    for (let i = 0; i < 12; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      last = await request(app).post('/api/auth/login').send({ email: 'x@y.com', password: 'wrongpass1' });
      if (last.status === 429) break;
    }
    expect(last.status).toBe(429);
  });
});
