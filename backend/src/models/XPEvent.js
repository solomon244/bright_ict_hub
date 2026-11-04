const mongoose = require('mongoose');

/**
 * Append-only XP ledger. The unique (user, type, refId) index makes every award idempotent:
 * re-completing a lesson or re-passing a quiz can never farm XP.
 */
const xpEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['lesson_complete', 'quiz_pass', 'quiz_perfect', 'course_complete'], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    xp: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

xpEventSchema.index({ user: 1, type: 1, refId: 1 }, { unique: true });
xpEventSchema.index({ user: 1, createdAt: -1 });
xpEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('XPEvent', xpEventSchema);
