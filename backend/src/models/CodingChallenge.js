const mongoose = require('mongoose');

/**
 * A small JavaScript function exercise. Tests are visible to students and are run inside a sandbox
 * in the student's own browser; the server never executes student code.
 */
const codingChallengeSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    titleAm: { type: String, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 4000 },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    language: { type: String, enum: ['javascript'], default: 'javascript' },
    functionName: { type: String, required: true },
    starterCode: { type: String, default: '', maxlength: 5000 },
    tests: [
      {
        _id: false,
        args: { type: [mongoose.Schema.Types.Mixed], default: [] },
        expected: mongoose.Schema.Types.Mixed,
      },
    ],
    isPublished: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

codingChallengeSchema.index({ isPublished: 1, difficulty: 1 });

module.exports = mongoose.model('CodingChallenge', codingChallengeSchema);
