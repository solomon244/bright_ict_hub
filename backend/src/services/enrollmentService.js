const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const enrollStudent = async ({ courseId, studentId }) => {
  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) {
    throw new AppError('Course not available', 400);
  }

  const enrollment = await Enrollment.findOneAndUpdate(
    { course: courseId, student: studentId },
    { status: 'active' },
    { new: true, upsert: true }
  );

  return new ApiResponse(200, 'Enrollment successful', { enrollment });
};

const listEnrollments = async (studentId) => {
  const enrollments = await Enrollment.find({ student: studentId })
    .populate('course')
    .sort('-createdAt');

  return new ApiResponse(200, 'Enrollments fetched', { enrollments });
};

const getEnrollment = async (enrollmentId, studentId) => {
  const enrollment = await Enrollment.findOne({ _id: enrollmentId, student: studentId })
    .populate('course')
    .populate('student', 'firstName lastName email');

  if (!enrollment) {
    throw new AppError('Enrollment not found', 404);
  }

  return new ApiResponse(200, 'Enrollment fetched', { enrollment });
};

const deleteEnrollment = async (enrollmentId, studentId) => {
  const enrollment = await Enrollment.findOne({ _id: enrollmentId, student: studentId });
  if (!enrollment) {
    throw new AppError('Enrollment not found', 404);
  }

  await enrollment.deleteOne();
  return new ApiResponse(200, 'Enrollment removed successfully');
};

const getCourseEnrollments = async (courseId, instructorId) => {
  // Verify instructor owns the course
  const course = await Course.findOne({ _id: courseId, instructor: instructorId });
  if (!course) {
    throw new AppError('Course not found or unauthorized', 404);
  }

  const enrollments = await Enrollment.find({ course: courseId })
    .populate('student', 'firstName lastName email')
    .sort('-createdAt');

  return new ApiResponse(200, 'Course enrollments fetched', { enrollments });
};

module.exports = {
  enrollStudent,
  listEnrollments,
  getEnrollment,
  deleteEnrollment,
  getCourseEnrollments,
};


