const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const formatted = errors.array().map((error) => ({
    field: error.param,
    message: error.msg,
  }));

  const response = new ApiResponse(422, 'Validation failed', null, { errors: formatted });
  return res.status(response.statusCode).json(response);
};

module.exports = validateRequest;


