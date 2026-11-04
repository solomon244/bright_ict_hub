const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const QuizAttempt = require('../models/QuizAttempt');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { USER_ROLES } = require('../constants/roles');
const { validateQuestions, validateAnswers, stripAnswerKey } = require('./quizValidation');
const gamification = require('./gamificationService');
const { QUIZ_PASS_RATIO } = require('../constants/gamification');

const isAdmin = (user) => user.role === USER_ROLES.ADMIN;

/** Admins manage everything; instructors only their own courses. */
const canManageCourse = async (user, courseId) => {
  if (isAdmin(user)) return true;
  if (user.role !== USER_ROLES.INSTRUCTOR) return false;
  return Boolean(await Course.exists({ _id: courseId, instructor: user.id }));
};

const isEnrolled = async (user, courseId) =>
  Boolean(await Enrollment.exists({ course: courseId, student: user.id }));

const requireManager = async (user, courseId) => {
  if (!(await canManageCourse(user, courseId))) {
    throw new AppError('You do not have permission to manage this quiz', 403);
  }
};

/** Loads a quiz and decides what the caller may see of it. */
const loadQuizForUser = async (quiz, user) => {
  const courseId = quiz.lesson.course;
  if (await canManageCourse(user, courseId)) {
    return quiz.toObject();
  }
  if (await isEnrolled(user, courseId)) {
    return stripAnswerKey(quiz);
  }
  throw new AppError('Enroll in this course to access its quizzes', 403);
};

const createQuiz = async (payload, user) => {
  const lesson = await Lesson.findById(payload.lesson);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }
  await requireManager(user, lesson.course);

  if (typeof payload.title !== 'string' || !payload.title.trim()) {
    throw new AppError('Quiz title is required', 422);
  }
  // One quiz per lesson: lookups by lesson return a single quiz, so a second one would be unreachable.
  if (await Quiz.exists({ lesson: lesson._id })) {
    throw new AppError('This lesson already has a quiz. Edit it instead of creating another.', 409);
  }

  const quiz = await Quiz.create({
    lesson: lesson._id,
    title: payload.title.trim(),
    durationMinutes: Number.isFinite(payload.durationMinutes) ? payload.durationMinutes : undefined,
    questions: validateQuestions(payload.questions),
  });
  return new ApiResponse(201, 'Quiz created', { quiz });
};

const submitQuiz = async ({ quizId, student, answers }) => {
  const quiz = await Quiz.findById(quizId).populate('lesson', 'course');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }
  if (!(await isEnrolled(student, quiz.lesson.course))) {
    throw new AppError('Enroll in this course to take its quizzes', 403);
  }

  const cleanAnswers = validateAnswers(answers, quiz.questions.length);

  let score = 0;
  const mappedAnswers = cleanAnswers.map((answer) => {
    const isCorrect = quiz.questions[answer.questionIndex].correctAnswerIndex === answer.selectedOptionIndex;
    if (isCorrect) score += 1;
    return { ...answer, isCorrect };
  });

  const attempt = await QuizAttempt.create({
    quiz: quiz._id,
    student: student.id,
    score,
    totalQuestions: quiz.questions.length,
    answers: mappedAnswers,
    completedAt: new Date(),
  });

  // XP is granted once per quiz (first pass / first perfect score), graded by the server.
  const total = quiz.questions.length;
  let reward = { xpAwarded: 0, newBadges: [] };
  if (total > 0 && score / total >= QUIZ_PASS_RATIO) {
    reward = await gamification.recordEvent({ userId: student.id, type: 'quiz_pass', refId: quiz._id });
    if (score === total) {
      const bonus = await gamification.recordEvent({ userId: student.id, type: 'quiz_perfect', refId: quiz._id });
      reward = { xpAwarded: reward.xpAwarded + bonus.xpAwarded, newBadges: [...reward.newBadges, ...bonus.newBadges] };
    }
  }

  return new ApiResponse(200, 'Quiz submitted', { attempt, reward });
};

const fetchQuizHistory = async (studentId) => {
  const attempts = await QuizAttempt.find({ student: studentId })
    .populate('quiz', 'title')
    .sort('-createdAt');

  return new ApiResponse(200, 'Quiz history fetched', { attempts });
};

const getQuizByLesson = async (lessonId, user) => {
  const quiz = await Quiz.findOne({ lesson: lessonId }).populate('lesson', 'title course');
  if (!quiz) {
    throw new AppError('Quiz not found for this lesson', 404);
  }
  return new ApiResponse(200, 'Quiz fetched', { quiz: await loadQuizForUser(quiz, user) });
};

const getQuiz = async (quizId, user) => {
  const quiz = await Quiz.findById(quizId).populate('lesson', 'title course');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }
  return new ApiResponse(200, 'Quiz fetched', { quiz: await loadQuizForUser(quiz, user) });
};

const updateQuiz = async (quizId, payload, user) => {
  const quiz = await Quiz.findById(quizId).populate('lesson');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }
  await requireManager(user, quiz.lesson.course);

  // Allow-list: the lesson (and thus ownership) can never be reassigned through an update.
  if (payload.title !== undefined) {
    if (typeof payload.title !== 'string' || !payload.title.trim()) {
      throw new AppError('Quiz title cannot be empty', 422);
    }
    quiz.title = payload.title.trim();
  }
  if (payload.durationMinutes !== undefined) {
    if (!Number.isFinite(payload.durationMinutes) || payload.durationMinutes <= 0) {
      throw new AppError('durationMinutes must be a positive number', 422);
    }
    quiz.durationMinutes = payload.durationMinutes;
  }
  if (payload.questions !== undefined) {
    quiz.questions = validateQuestions(payload.questions);
  }
  await quiz.save();

  return new ApiResponse(200, 'Quiz updated successfully', { quiz });
};

const deleteQuiz = async (quizId, user) => {
  const quiz = await Quiz.findById(quizId).populate('lesson');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }
  await requireManager(user, quiz.lesson.course);

  await QuizAttempt.deleteMany({ quiz: quiz._id });
  await quiz.deleteOne();

  return new ApiResponse(200, 'Quiz deleted successfully');
};

const getQuizAttempts = async (quizId, user) => {
  const quiz = await Quiz.findById(quizId).populate('lesson');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }
  await requireManager(user, quiz.lesson.course);

  const attempts = await QuizAttempt.find({ quiz: quizId })
    .populate('student', 'firstName lastName email')
    .sort('-createdAt');

  return new ApiResponse(200, 'Quiz attempts fetched', { attempts });
};

module.exports = {
  canManageCourse,
  createQuiz,
  submitQuiz,
  fetchQuizHistory,
  getQuizByLesson,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizAttempts,
};
