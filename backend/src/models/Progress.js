const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    lastVisitedAt: Date,
    percentage: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

progressSchema.index({ student: 1, lesson: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);


