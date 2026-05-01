const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');

const createLesson = async (payload, instructorId) => {
  const course = await Course.findOne({
    _id: payload.course,
    instructor: instructorId,
  });
  if (!course) {
    throw new AppError('Course not found or unauthorized', 404);
  }

  const lesson = await Lesson.create(payload);
  course.totalLessons += 1;
  await course.save();

  return new ApiResponse(201, 'Lesson created', { lesson });
};

const updateLesson = async (lessonId, payload, instructorId) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  const course = await Course.findOne({
    _id: lesson.course,
    instructor: instructorId,
  });

  if (!course) {
    throw new AppError('Unauthorized', 403);
  }

  Object.assign(lesson, payload);
  await lesson.save();

  return new ApiResponse(200, 'Lesson updated', { lesson });
};

const deleteLesson = async (lessonId, instructorId) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  const course = await Course.findOne({
    _id: lesson.course,
    instructor: instructorId,
  });

  if (!course) {
    throw new AppError('Unauthorized', 403);
  }

  await lesson.deleteOne();
  course.totalLessons = Math.max(0, course.totalLessons - 1);
  await course.save();

  return new ApiResponse(200, 'Lesson removed');
};

module.exports = {
  createLesson,
  updateLesson,
  deleteLesson,
};


