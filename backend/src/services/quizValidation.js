const AppError = require('../utils/appError');

const MAX_QUESTIONS = 100;
const MAX_OPTIONS = 10;

/** Validates and normalises a quiz question list. Throws AppError(422) on bad input. */
const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > MAX_QUESTIONS) {
    throw new AppError(`A quiz needs between 1 and ${MAX_QUESTIONS} questions`, 422);
  }

  return questions.map((q, index) => {
    const label = `Question ${index + 1}`;
    if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) {
      throw new AppError(`${label}: prompt is required`, 422);
    }
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > MAX_OPTIONS) {
      throw new AppError(`${label}: provide between 2 and ${MAX_OPTIONS} options`, 422);
    }
    if (q.options.some((o) => typeof o !== 'string' || !o.trim())) {
      throw new AppError(`${label}: every option must be non-empty text`, 422);
    }
    if (!Number.isInteger(q.correctAnswerIndex) || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
      throw new AppError(`${label}: correctAnswerIndex must point at one of the options`, 422);
    }
    return {
      prompt: q.prompt.trim(),
      options: q.options.map((o) => o.trim()),
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: typeof q.explanation === 'string' ? q.explanation.trim() : undefined,
    };
  });
};

/** Validates submitted answers against the quiz size. Each question can be answered once. */
const validateAnswers = (answers, questionCount) => {
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > questionCount) {
    throw new AppError('Provide one answer per question', 422);
  }
  const seen = new Set();
  return answers.map((a) => {
    if (
      !a ||
      !Number.isInteger(a.questionIndex) ||
      a.questionIndex < 0 ||
      a.questionIndex >= questionCount ||
      !Number.isInteger(a.selectedOptionIndex) ||
      a.selectedOptionIndex < 0
    ) {
      throw new AppError('Invalid answer format', 422);
    }
    if (seen.has(a.questionIndex)) {
      throw new AppError('Duplicate answer for the same question', 422);
    }
    seen.add(a.questionIndex);
    return { questionIndex: a.questionIndex, selectedOptionIndex: a.selectedOptionIndex };
  });
};

/** Removes answer keys so students can never read the solutions before submitting. */
const stripAnswerKey = (quizDoc) => {
  const quiz = typeof quizDoc.toObject === 'function' ? quizDoc.toObject() : { ...quizDoc };
  quiz.questions = (quiz.questions || []).map(({ correctAnswerIndex, explanation, ...safe }) => safe);
  return quiz;
};

module.exports = { validateQuestions, validateAnswers, stripAnswerKey };
