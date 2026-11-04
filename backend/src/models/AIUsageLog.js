const mongoose = require('mongoose');

/** One row per AI provider call: powers daily limits, cost tracking and the admin usage report. */
const aiUsageLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    feature: { type: String, required: true }, // tutor | dashboard_coach | quiz_draft | ...
    provider: String,
    modelName: String, // (not `model`: that name collides with Mongoose's Document#model)
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    estimatedCostUsd: { type: Number, default: 0 },
    latencyMs: Number,
    status: { type: String, enum: ['success', 'error'], default: 'success' },
    errorCode: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiUsageLogSchema.index({ user: 1, createdAt: -1 });
aiUsageLogSchema.index({ feature: 1, createdAt: -1 });
// Data minimisation: usage rows (no prompt text is stored) expire after 180 days.
aiUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('AIUsageLog', aiUsageLogSchema);
