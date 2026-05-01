const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      validate: [(v) => v.length >= 2, 'At least two options required'],
    },
    correctAnswerIndex: {
      type: Number,
      required: true,
    },
    explanation: String,
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 15,
    },
    questions: [questionSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Quiz', quizSchema);


