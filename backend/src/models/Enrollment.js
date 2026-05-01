const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped'],
      default: 'active',
    },
    progressPercentage: {
      type: Number,
      default: 0,
    },
    lastLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    lastAccessedAt: Date,
  },
  {
    timestamps: true,
  }
);

enrollmentSchema.index({ course: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);

