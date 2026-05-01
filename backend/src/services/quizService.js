const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');
const QuizAttempt = require('../models/QuizAttempt');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');

const createQuiz = async (payload) => {
  const lesson = await Lesson.findById(payload.lesson).populate('course');
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  const quiz = await Quiz.create(payload);
  return new ApiResponse(201, 'Quiz created', { quiz });
};

const submitQuiz = async ({ quizId, studentId, answers }) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  let score = 0;
  const mappedAnswers = answers.map((answer) => {
    const question = quiz.questions[answer.questionIndex];
    const isCorrect = question?.correctAnswerIndex === answer.selectedOptionIndex;
    if (isCorrect) {
      score += 1;
    }
    return {
      ...answer,
      isCorrect,
    };
  });

  const attempt = await QuizAttempt.create({
    quiz: quiz._id,
    student: studentId,
    score,
    totalQuestions: quiz.questions.length,
    answers: mappedAnswers,
    completedAt: new Date(),
  });

  return new ApiResponse(200, 'Quiz submitted', { attempt });
};

const fetchQuizHistory = async (studentId) => {
  const attempts = await QuizAttempt.find({ student: studentId })
    .populate('quiz', 'title')
    .sort('-createdAt');

  return new ApiResponse(200, 'Quiz history fetched', { attempts });
};

const getQuizByLesson = async (lessonId) => {
  const quiz = await Quiz.findOne({ lesson: lessonId }).populate('lesson', 'title');
  if (!quiz) {
    throw new AppError('Quiz not found for this lesson', 404);
  }
  return new ApiResponse(200, 'Quiz fetched', { quiz });
};

const getQuiz = async (quizId) => {
  const quiz = await Quiz.findById(quizId).populate('lesson', 'title course');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }
  return new ApiResponse(200, 'Quiz fetched', { quiz });
};

const updateQuiz = async (quizId, payload, userId) => {
  const quiz = await Quiz.findById(quizId).populate('lesson');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  // Check if user is the instructor of the course
  const Course = require('../models/Course');
  const course = await Course.findOne({ _id: quiz.lesson.course, instructor: userId });
  if (!course) {
    throw new AppError('Unauthorized', 403);
  }

  Object.assign(quiz, payload);
  await quiz.save();

  return new ApiResponse(200, 'Quiz updated successfully', { quiz });
};

const deleteQuiz = async (quizId, userId) => {
  const quiz = await Quiz.findById(quizId).populate('lesson');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  // Check if user is the instructor of the course
  const Course = require('../models/Course');
  const course = await Course.findOne({ _id: quiz.lesson.course, instructor: userId });
  if (!course) {
    throw new AppError('Unauthorized', 403);
  }

  // Delete all attempts for this quiz
  await QuizAttempt.deleteMany({ quiz: quiz._id });
  await quiz.deleteOne();

  return new ApiResponse(200, 'Quiz deleted successfully');
};

const getQuizAttempts = async (quizId, userId) => {
  const quiz = await Quiz.findById(quizId).populate('lesson');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  // Check if user is the instructor of the course
  const Course = require('../models/Course');
  const course = await Course.findOne({ _id: quiz.lesson.course, instructor: userId });
  if (!course) {
    throw new AppError('Unauthorized', 403);
  }

  const attempts = await QuizAttempt.find({ quiz: quizId })
    .populate('student', 'firstName lastName email')
    .sort('-createdAt');

  return new ApiResponse(200, 'Quiz attempts fetched', { attempts });
};

module.exports = {
  createQuiz,
  submitQuiz,
  fetchQuizHistory,
  getQuizByLesson,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizAttempts,
};


