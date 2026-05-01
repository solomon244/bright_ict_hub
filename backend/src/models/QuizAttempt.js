const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: Number,
    answers: [
      {
        questionIndex: Number,
        selectedOptionIndex: Number,
        isCorrect: Boolean,
      },
    ],
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

quizAttemptSchema.index({ quiz: 1, student: 1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);


