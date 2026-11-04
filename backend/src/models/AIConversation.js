const mongoose = require('mongoose');

const TUTOR_MODES = ['beginner', 'intermediate', 'advanced', 'exam_prep', 'practice', 'programming_mentor'];

const aiConversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, maxlength: 120, default: 'New chat' },
    mode: { type: String, enum: TUTOR_MODES, default: 'beginner' },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

aiConversationSchema.index({ user: 1, lastMessageAt: -1 });

module.exports = mongoose.model('AIConversation', aiConversationSchema);
module.exports.TUTOR_MODES = TUTOR_MODES;
