const asyncHandler = require('../utils/asyncHandler');
const categoryService = require('../services/categoryService');

exports.createCategory = asyncHandler(async (req, res) => {
  const response = await categoryService.createCategory(req.body);
  res.status(response.statusCode).json(response);
});

exports.listCategories = asyncHandler(async (req, res) => {
  const response = await categoryService.listCategories();
  res.status(response.statusCode).json(response);
});

exports.getCategory = asyncHandler(async (req, res) => {
  const response = await categoryService.getCategory(req.params.categoryId);
  res.status(response.statusCode).json(response);
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const response = await categoryService.updateCategory(req.params.categoryId, req.body);
  res.status(response.statusCode).json(response);
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const response = await categoryService.deleteCategory(req.params.categoryId);
  res.status(response.statusCode).json(response);
});


