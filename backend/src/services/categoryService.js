const slugify = require('slugify');
const Category = require('../models/Category');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const createCategory = async (payload) => {
  const slug = slugify(payload.name, { lower: true, strict: true });
  const category = await Category.create({
    ...payload,
    slug,
  });
  return new ApiResponse(201, 'Category created', { category });
};

const listCategories = async () => {
  const categories = await Category.find().sort('name');
  return new ApiResponse(200, 'Categories fetched', { categories });
};

const getCategory = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  return new ApiResponse(200, 'Category fetched', { category });
};

const updateCategory = async (id, payload) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  if (payload.name) {
    category.slug = slugify(payload.name, { lower: true, strict: true });
    category.name = payload.name;
  }
  if (payload.description) {
    category.description = payload.description;
  }
  if (payload.icon) {
    category.icon = payload.icon;
  }
  await category.save();
  return new ApiResponse(200, 'Category updated', { category });
};

const deleteCategory = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if category is being used by any courses
  const Course = require('../models/Course');
  const courseCount = await Course.countDocuments({ category: id });
  if (courseCount > 0) {
    throw new AppError(`Cannot delete category. It is being used by ${courseCount} course(s)`, 400);
  }

  await category.deleteOne();
  return new ApiResponse(200, 'Category deleted successfully');
};

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};


