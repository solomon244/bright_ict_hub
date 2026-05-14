const mongoose = require('mongoose');

const tutorEscalationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['low_confidence', 'repeated_confusion', 'out_of_scope', 'distress', 'policy'],
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    attemptedAnswer: {
      type: String,
      default: '',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    resolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TutorEscalation', tutorEscalationSchema);
