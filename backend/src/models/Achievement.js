const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    awardedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

achievementSchema.index({ user: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);
