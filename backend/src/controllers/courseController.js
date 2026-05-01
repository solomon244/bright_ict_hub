const asyncHandler = require('../utils/asyncHandler');
const courseService = require('../services/courseService');
const lessonService = require('../services/lessonService');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const env = require('../config/env');
const fs = require('fs');
const path = require('path');
const { handleThumbnailUpload, handleVideoUpload } = require('../middleware/uploadMiddleware');

exports.createCourse = asyncHandler(async (req, res) => {
  const response = await courseService.createCourse(req.body, req.user.id);
  res.status(response.statusCode).json(response);
});

exports.listCourses = asyncHandler(async (req, res) => {
  const response = await courseService.listCourses(req.query);
  res.status(response.statusCode).json(response);
});

exports.getCourse = asyncHandler(async (req, res) => {
  const response = await courseService.getCourse(req.params.courseId);
  res.status(response.statusCode).json(response);
});

exports.updateCourse = asyncHandler(async (req, res) => {
  const response = await courseService.updateCourse(req.params.courseId, req.body, req.user.id);
  res.status(response.statusCode).json(response);
});

exports.deleteCourse = asyncHandler(async (req, res) => {
  const response = await courseService.deleteCourse(req.params.courseId, req.user.id);
  res.status(response.statusCode).json(response);
});

exports.createLesson = asyncHandler(async (req, res) => {
  const response = await lessonService.createLesson(
    { ...req.body, course: req.params.courseId },
    req.user.id
  );
  res.status(response.statusCode).json(response);
});

exports.updateLesson = asyncHandler(async (req, res) => {
  const response = await lessonService.updateLesson(req.params.lessonId, req.body, req.user.id);
  res.status(response.statusCode).json(response);
});

exports.deleteLesson = asyncHandler(async (req, res) => {
  const response = await lessonService.deleteLesson(req.params.lessonId, req.user.id);
  res.status(response.statusCode).json(response);
});

// Publish/Unpublish course
exports.publishCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { isPublished } = req.body;

  if (typeof isPublished !== 'boolean') {
    return res.status(400).json(new ApiResponse(400, 'isPublished must be a boolean'));
  }

  const response = await courseService.publishCourse(courseId, req.user.id, isPublished);
  res.status(response.statusCode).json(response);
});

// Upload course thumbnail
exports.uploadThumbnail = [
  handleThumbnailUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json(new ApiResponse(400, 'No file uploaded'));
    }

    const { courseId } = req.params;
    const course = await Course.findOne({ _id: courseId, instructor: req.user.id });
    if (!course) {
      return res.status(404).json(new ApiResponse(404, 'Course not found or unauthorized'));
    }

    // Delete old thumbnail if exists
    if (course.thumbnailUrl) {
      const oldThumbPath = path.join(env.uploadDir, 'thumbnails', path.basename(course.thumbnailUrl));
      if (fs.existsSync(oldThumbPath)) {
        try {
          fs.unlinkSync(oldThumbPath);
        } catch (error) {
          console.error('Failed to delete old thumbnail:', error.message);
        }
      }
    }

    // Update course with new thumbnail URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/thumbnails/${req.file.filename}`;
    course.thumbnailUrl = fileUrl;
    await course.save();

    res.json(
      new ApiResponse(200, 'Thumbnail uploaded successfully', {
        course,
        file: {
          url: fileUrl,
          filename: req.file.filename,
        },
      })
    );
  }),
];

// Upload lesson video
exports.uploadLessonVideo = [
  handleVideoUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json(new ApiResponse(400, 'No file uploaded'));
    }

    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId).populate('course');
    if (!lesson) {
      return res.status(404).json(new ApiResponse(404, 'Lesson not found'));
    }

    const course = await Course.findOne({ _id: lesson.course._id, instructor: req.user.id });
    if (!course) {
      return res.status(403).json(new ApiResponse(403, 'Unauthorized'));
    }

    // Delete old video if exists
    if (lesson.videoUrl) {
      const oldVideoPath = path.join(env.uploadDir, 'videos', path.basename(lesson.videoUrl));
      if (fs.existsSync(oldVideoPath)) {
        try {
          fs.unlinkSync(oldVideoPath);
        } catch (error) {
          console.error('Failed to delete old video:', error.message);
        }
      }
    }

    // Update lesson with new video URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${req.file.filename}`;
    lesson.videoUrl = fileUrl;
    await lesson.save();

    res.json(
      new ApiResponse(200, 'Video uploaded successfully', {
        lesson,
        file: {
          url: fileUrl,
          filename: req.file.filename,
        },
      })
    );
  }),
];


