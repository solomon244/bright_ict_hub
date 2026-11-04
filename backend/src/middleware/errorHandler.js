const ApiResponse = require('../utils/apiResponse');

const notFoundHandler = (req, res, next) => {
  const response = new ApiResponse(404, `Not Found - ${req.originalUrl}`);
  res.status(response.statusCode).json(response);
};

/** Translate well-known library errors into proper HTTP statuses. */
const normalizeError = (err) => {
  if (err.name === 'TokenExpiredError') return { statusCode: 401, message: 'Session expired. Please sign in again.' };
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return { statusCode: 401, message: 'Invalid authentication token' };
  }
  if (err.name === 'CastError') return { statusCode: 400, message: 'Invalid identifier format' };
  if (err.name === 'ValidationError' && err.errors) {
    return { statusCode: 422, message: 'Validation failed' };
  }
  if (err.code === 11000) return { statusCode: 409, message: 'A record with these details already exists' };
  if (err.type === 'entity.too.large') return { statusCode: 413, message: 'Request body too large' };
  if (err.type === 'entity.parse.failed') return { statusCode: 400, message: 'Malformed JSON body' };
  if (err.message === 'Not allowed by CORS') return { statusCode: 403, message: 'Origin not allowed' };
  return null;
};

const errorHandler = (err, req, res, next) => {
  const normalized = normalizeError(err);
  const statusCode = normalized?.statusCode || err.statusCode || 500;
  const isServerError = statusCode >= 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (process.env.NODE_ENV !== 'test' && isServerError) {
    console.error(err);
  }

  // Never leak internal error messages for unexpected 5xx failures in production.
  const message =
    normalized?.message || (isServerError && isProduction ? 'Internal Server Error' : err.message || 'Internal Server Error');

  const response = new ApiResponse(statusCode, message, null, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    errors: isServerError && isProduction ? undefined : err.errors && err.name !== 'ValidationError' ? err.errors : undefined,
  });
  res.status(statusCode).json(response);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  normalizeError,
};
