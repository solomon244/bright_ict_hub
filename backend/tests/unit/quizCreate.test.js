jest.mock('../../src/models/Quiz');
jest.mock('../../src/models/Lesson');
jest.mock('../../src/models/Course');
jest.mock('../../src/models/Enrollment');
jest.mock('../../src/models/QuizAttempt');
jest.mock('../../src/services/gamificationService', () => ({}));

const Quiz = require('../../src/models/Quiz');
const Lesson = require('../../src/models/Lesson');
const Course = require('../../src/models/Course');
const quizService = require('../../src/services/quizService');

const instructor = { id: 'i1', _id: 'i1', role: 'instructor' };
const payload = {
  lesson: 'l1',
  title: 'Quiz',
  questions: [{ prompt: 'Q?', options: ['a', 'b'], correctAnswerIndex: 0 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  Lesson.findById.mockResolvedValue({ _id: 'l1', course: 'c1' });
  Course.exists.mockResolvedValue({ _id: 'c1' });
  Quiz.create.mockImplementation(async (d) => ({ _id: 'q1', ...d }));
});

test('creates a quiz for a lesson that has none', async () => {
  Quiz.exists.mockResolvedValue(null);
  const res = await quizService.createQuiz(payload, instructor);
  expect(res.statusCode).toBe(201);
  expect(Quiz.create).toHaveBeenCalledTimes(1);
});

test('a second quiz for the same lesson is refused with 409', async () => {
  Quiz.exists.mockResolvedValue({ _id: 'q0' });
  await expect(quizService.createQuiz(payload, instructor)).rejects.toMatchObject({ statusCode: 409 });
  expect(Quiz.create).not.toHaveBeenCalled();
});

test('non-owners are refused before the duplicate check', async () => {
  Course.exists.mockResolvedValue(null);
  await expect(quizService.createQuiz(payload, instructor)).rejects.toMatchObject({ statusCode: 403 });
  expect(Quiz.exists).not.toHaveBeenCalled();
});
