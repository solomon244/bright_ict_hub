const mongoose = require('mongoose');
const { COURSE_LEVELS } = require('../constants/courseLevels');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    level: {
      type: String,
      enum: COURSE_LEVELS,
      default: 'beginner',
    },
    language: {
      type: String,
      default: 'English',
    },
    requirements: [String],
    outcomes: [String],
    thumbnailUrl: String,
    promoVideoUrl: String,
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    totalDuration: Number,
    totalLessons: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Course', courseSchema);


