const ApiResponse = require('../utils/apiResponse');

const notFoundHandler = (req, res, next) => {
  const response = new ApiResponse(404, `Not Found - ${req.originalUrl}`);
  res.status(response.statusCode).json(response);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }
  const response = new ApiResponse(statusCode, message, null, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    errors: err.errors,
  });
  res.status(statusCode).json(response);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};


