const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    discussion: { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    isHidden: { type: Boolean, default: false },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reports: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        reason: { type: String, enum: ['spam', 'inappropriate', 'harassment', 'wrong_info', 'other'], default: 'other' },
        at: { type: Date, default: Date.now },
      },
    ],
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ discussion: 1, createdAt: 1 });
commentSchema.index({ isHidden: 1, reportCount: -1 });
commentSchema.index({ author: 1 });

module.exports = mongoose.model('Comment', commentSchema);
