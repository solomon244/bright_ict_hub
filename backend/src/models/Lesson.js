const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['pdf', 'doc', 'link', 'code'],
      default: 'pdf',
    },
    title: String,
    url: String,
  },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    order: {
      type: Number,
      default: 0,
    },
    content: String,
    videoUrl: String,
    duration: Number,
    resources: [resourceSchema],
    isPreviewable: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Lesson', lessonSchema);


