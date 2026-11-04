const mongoose = require('mongoose');

const aiMessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIConversation', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 12000 },
    aiGenerated: { type: Boolean, default: false },
    meta: {
      escalated: Boolean,
      reason: String,
      confidence: Number,
      lessonHints: [{ _id: false, lessonId: String, title: String, courseId: String }],
    },
    // Students can rate and report answers (responsible-AI requirement).
    feedback: {
      rating: { type: String, enum: ['up', 'down'] },
      reason: { type: String, enum: ['inaccurate', 'confusing', 'inappropriate', 'other'] },
      comment: { type: String, maxlength: 500 },
      at: Date,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiMessageSchema.index({ conversation: 1, createdAt: 1 });
aiMessageSchema.index({ 'feedback.rating': 1, createdAt: -1 });

module.exports = mongoose.model('AIMessage', aiMessageSchema);
