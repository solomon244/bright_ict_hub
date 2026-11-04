const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: ['spam', 'inappropriate', 'harassment', 'wrong_info', 'other'], default: 'other' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

/** A question/discussion thread. `course: null` means the platform-wide community board. */
const discussionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    isResolved: { type: Boolean, default: false },
    acceptedComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    commentCount: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    isHidden: { type: Boolean, default: false },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reports: { type: [reportSchema], default: [] },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

discussionSchema.index({ course: 1, isHidden: 1, lastActivityAt: -1 });
discussionSchema.index({ isHidden: 1, reportCount: -1 });
discussionSchema.index({ author: 1 });

module.exports = mongoose.model('Discussion', discussionSchema);
