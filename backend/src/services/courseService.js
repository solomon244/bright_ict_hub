const slugify = require('slugify');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');

const createCourse = async (payload, instructorId) => {
  // Check if category exists
  const Category = require('../models/Category');
  const category = await Category.findById(payload.category);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Generate unique slug
  let slug = slugify(payload.title, { lower: true, strict: true });
  let slugExists = await Course.findOne({ slug });
  let counter = 1;
  while (slugExists) {
    slug = `${slugify(payload.title, { lower: true, strict: true })}-${counter}`;
    slugExists = await Course.findOne({ slug });
    counter++;
  }

  const course = await Course.create({
    ...payload,
    slug,
    instructor: instructorId,
    isPublished: false, // Always start as unpublished
  });

  // Populate category and instructor for response
  await course.populate('category', 'name description');
  await course.populate('instructor', 'firstName lastName');

  return new ApiResponse(201, 'Course created successfully', { course });
};

const listCourses = async (query = {}) => {
  const filters = {};
  if (query.category) {
    filters.category = query.category;
  }
  if (query.level) {
    filters.level = query.level;
  }
  if (query.isPublished !== undefined) {
    filters.isPublished = query.isPublished === 'true';
  }

  const courses = await Course.find(filters)
    .populate('instructor', 'firstName lastName')
    .populate('category', 'name');

  return new ApiResponse(200, 'Courses fetched', { courses });
};

const getCourse = async (id) => {
  const course = await Course.findById(id)
    .populate('instructor', 'firstName lastName bio')
    .populate('category', 'name description');

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  const lessons = await Lesson.find({ course: course._id }).sort('order');

  return new ApiResponse(200, 'Course fetched', {
    course,
    lessons,
  });
};

const updateCourse = async (id, payload, userId) => {
  const course = await Course.findOne({ _id: id, instructor: userId });
  if (!course) {
    throw new AppError('Course not found or not authorized', 404);
  }

  // If category is being updated, validate it exists
  if (payload.category) {
    const Category = require('../models/Category');
    const category = await Category.findById(payload.category);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
  }

  // Update slug if title changed
  if (payload.title && payload.title !== course.title) {
    let slug = slugify(payload.title, { lower: true, strict: true });
    let slugExists = await Course.findOne({ slug, _id: { $ne: id } });
    let counter = 1;
    while (slugExists) {
      slug = `${slugify(payload.title, { lower: true, strict: true })}-${counter}`;
      slugExists = await Course.findOne({ slug, _id: { $ne: id } });
      counter++;
    }
    payload.slug = slug;
  }

  Object.assign(course, payload);
  await course.save();

  // Populate for response
  await course.populate('category', 'name description');
  await course.populate('instructor', 'firstName lastName');

  return new ApiResponse(200, 'Course updated successfully', { course });
};

const deleteCourse = async (id, userId) => {
  const course = await Course.findOne({ _id: id, instructor: userId });
  if (!course) {
    throw new AppError('Course not found or not authorized', 404);
  }

  await Lesson.deleteMany({ course: course._id });
  await course.deleteOne();

  return new ApiResponse(200, 'Course removed');
};

const publishCourse = async (id, userId, isPublished) => {
  const course = await Course.findOne({ _id: id, instructor: userId });
  if (!course) {
    throw new AppError('Course not found or not authorized', 404);
  }

  // Validation: Course must have at least one lesson to be published
  if (isPublished) {
    const Lesson = require('../models/Lesson');
    const lessonCount = await Lesson.countDocuments({ course: course._id });
    if (lessonCount === 0) {
      throw new AppError('Cannot publish course without lessons', 400);
    }
  }

  course.isPublished = isPublished;
  await course.save();

  // Populate for response
  await course.populate('category', 'name description');
  await course.populate('instructor', 'firstName lastName');

  return new ApiResponse(200, isPublished ? 'Course published successfully' : 'Course unpublished successfully', {
    course,
  });
};

module.exports = {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
};


