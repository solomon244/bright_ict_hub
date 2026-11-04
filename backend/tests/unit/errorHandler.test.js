const { normalizeError } = require('../../src/middleware/errorHandler');

describe('normalizeError', () => {
  test('maps JWT errors to 401 instead of 500', () => {
    expect(normalizeError({ name: 'JsonWebTokenError' }).statusCode).toBe(401);
    expect(normalizeError({ name: 'TokenExpiredError' }).statusCode).toBe(401);
  });
  test('maps bad ObjectIds, duplicates and oversized bodies to client errors', () => {
    expect(normalizeError({ name: 'CastError' }).statusCode).toBe(400);
    expect(normalizeError({ code: 11000 }).statusCode).toBe(409);
    expect(normalizeError({ type: 'entity.too.large' }).statusCode).toBe(413);
    expect(normalizeError({ message: 'Not allowed by CORS' }).statusCode).toBe(403);
  });
  test('leaves unknown errors alone', () => {
    expect(normalizeError(new Error('boom'))).toBeNull();
  });
});
