const mongoose = require('mongoose');

const tutorConfusionCounterSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fingerprint: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastQuestion: String,
  },
  { timestamps: true }
);

tutorConfusionCounterSchema.index({ studentId: 1, fingerprint: 1 }, { unique: true });

module.exports = mongoose.model('TutorConfusionCounter', tutorConfusionCounterSchema);
