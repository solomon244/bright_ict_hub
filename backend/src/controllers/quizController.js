const asyncHandler = require('../utils/asyncHandler');
const quizService = require('../services/quizService');

exports.createQuiz = asyncHandler(async (req, res) => {
  const response = await quizService.createQuiz(req.body);
  res.status(response.statusCode).json(response);
});

exports.submitQuiz = asyncHandler(async (req, res) => {
  const response = await quizService.submitQuiz({
    quizId: req.params.quizId,
    studentId: req.user.id,
    answers: req.body.answers,
  });
  res.status(response.statusCode).json(response);
});

exports.quizHistory = asyncHandler(async (req, res) => {
  const response = await quizService.fetchQuizHistory(req.user.id);
  res.status(response.statusCode).json(response);
});

exports.getQuizByLesson = asyncHandler(async (req, res) => {
  const response = await quizService.getQuizByLesson(req.params.lessonId);
  res.status(response.statusCode).json(response);
});

exports.getQuiz = asyncHandler(async (req, res) => {
  const response = await quizService.getQuiz(req.params.quizId);
  res.status(response.statusCode).json(response);
});

exports.updateQuiz = asyncHandler(async (req, res) => {
  const response = await quizService.updateQuiz(req.params.quizId, req.body, req.user.id);
  res.status(response.statusCode).json(response);
});

exports.deleteQuiz = asyncHandler(async (req, res) => {
  const response = await quizService.deleteQuiz(req.params.quizId, req.user.id);
  res.status(response.statusCode).json(response);
});

exports.getQuizAttempts = asyncHandler(async (req, res) => {
  const response = await quizService.getQuizAttempts(req.params.quizId, req.user.id);
  res.status(response.statusCode).json(response);
});


