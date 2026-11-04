const mongoose = require('mongoose');

/** An ordered sequence of courses that together build a skill (e.g. Web Development). */
const learningPathSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    titleAm: { type: String, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    skills: [{ type: String, trim: true, maxlength: 40 }],
    courses: [
      {
        _id: false,
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        order: { type: Number, required: true },
      },
    ],
    isPublished: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

learningPathSchema.index({ isPublished: 1, level: 1 });

module.exports = mongoose.model('LearningPath', learningPathSchema);
