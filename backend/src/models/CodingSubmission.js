const mongoose = require('mongoose');

/** A saved attempt. passedCount is reported by the student's browser (self-reported, not server-verified). */
const codingSubmissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingChallenge', required: true },
    code: { type: String, required: true, maxlength: 20000 },
    passedCount: { type: Number, required: true, min: 0 },
    totalTests: { type: Number, required: true, min: 1 },
    selfReported: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

codingSubmissionSchema.index({ user: 1, challenge: 1, createdAt: -1 });

module.exports = mongoose.model('CodingSubmission', codingSubmissionSchema);
