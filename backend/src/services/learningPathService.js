const LearningPath = require('../models/LearningPath');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Pure: merges a path's ordered courses with the learner's enrolments.
 * enrollmentsByCourse: { [courseId]: { status, progressPercentage } }
 */
function buildPathProgress(pathCourses, enrollmentsByCourse) {
  const ordered = [...pathCourses].sort((a, b) => a.order - b.order);
  const courses = ordered.map(({ course, order }) => {
    const e = enrollmentsByCourse[String(course._id || course)];
    const status = !e ? 'not_enrolled' : e.status === 'completed' ? 'completed' : 'in_progress';
    return { order, course, status, progressPercentage: e ? e.progressPercentage || 0 : 0 };
  });
  const completedCourses = courses.filter((c) => c.status === 'completed').length;
  const total = courses.length;
  const partial = courses.reduce((sum, c) => sum + (c.status === 'completed' ? 100 : c.progressPercentage), 0);
  const next = courses.find((c) => c.status !== 'completed');
  return {
    courses,
    completedCourses,
    totalCourses: total,
    percent: total ? Math.round(partial / total) : 0,
    nextCourseId: next ? String(next.course._id || next.course) : null,
  };
}

const validatePathPayload = (payload, { partial = false } = {}) => {
  const out = {};
  if (!partial || payload.title !== undefined) {
    if (typeof payload.title !== 'string' || !payload.title.trim()) throw new AppError('title is required', 422);
    out.title = payload.title.trim();
  }
  for (const key of ['titleAm', 'description']) if (typeof payload[key] === 'string') out[key] = payload[key].trim();
  if (payload.level !== undefined) {
    if (!['beginner', 'intermediate', 'advanced'].includes(payload.level)) throw new AppError('invalid level', 422);
    out.level = payload.level;
  }
  if (payload.skills !== undefined) {
    if (!Array.isArray(payload.skills) || payload.skills.length > 20 || payload.skills.some((s) => typeof s !== 'string')) {
      throw new AppError('skills must be a list of up to 20 strings', 422);
    }
    out.skills = payload.skills.map((s) => s.trim()).filter(Boolean);
  }
  if (payload.courseIds !== undefined) {
    if (!Array.isArray(payload.courseIds) || payload.courseIds.length === 0 || payload.courseIds.length > 30) {
      throw new AppError('courseIds must list between 1 and 30 courses, in learning order', 422);
    }
    if (new Set(payload.courseIds.map(String)).size !== payload.courseIds.length) throw new AppError('courseIds contains duplicates', 422);
    out.courses = payload.courseIds.map((course, i) => ({ course, order: i + 1 }));
  }
  if (typeof payload.isPublished === 'boolean') out.isPublished = payload.isPublished;
  return out;
};

const listPaths = async (user) => {
  const filter = user.role === 'admin' ? {} : { isPublished: true };
  const paths = await LearningPath.find(filter).select('-createdBy').sort('level title').lean();
  return new ApiResponse(200, 'Learning paths fetched', {
    paths: paths.map((p) => ({ ...p, totalCourses: p.courses.length, courses: undefined })),
  });
};

const getPath = async (id, user) => {
  const path = await LearningPath.findById(id).populate('courses.course', 'title level thumbnail totalLessons').lean();
  if (!path || (!path.isPublished && user.role !== 'admin')) throw new AppError('Learning path not found', 404);

  let enrollmentsByCourse = {};
  if (user.role === 'student') {
    const ids = path.courses.map((c) => c.course?._id).filter(Boolean);
    const rows = await Enrollment.find({ student: user.id, course: { $in: ids } }).select('course status progressPercentage').lean();
    enrollmentsByCourse = Object.fromEntries(rows.map((r) => [String(r.course), r]));
  }
  const live = path.courses.filter((c) => c.course); // skip courses deleted since
  return new ApiResponse(200, 'Learning path fetched', {
    path: { ...path, courses: undefined },
    progress: buildPathProgress(live, enrollmentsByCourse),
  });
};

const createPath = async (payload, user) => {
  const data = validatePathPayload(payload);
  if (!data.courses) throw new AppError('courseIds is required', 422);
  const path = await LearningPath.create({ ...data, createdBy: user.id });
  return new ApiResponse(201, 'Learning path created', { path });
};

const updatePath = async (id, payload) => {
  const path = await LearningPath.findById(id);
  if (!path) throw new AppError('Learning path not found', 404);
  Object.assign(path, validatePathPayload(payload, { partial: true }));
  await path.save();
  return new ApiResponse(200, 'Learning path updated', { path });
};

const deletePath = async (id) => {
  const path = await LearningPath.findById(id);
  if (!path) throw new AppError('Learning path not found', 404);
  await path.deleteOne();
  return new ApiResponse(200, 'Learning path deleted');
};

module.exports = { buildPathProgress, validatePathPayload, listPaths, getPath, createPath, updatePath, deletePath };
