class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    if (errors) {
      this.errors = errors;
    }
  }
}

module.exports = AppError;


