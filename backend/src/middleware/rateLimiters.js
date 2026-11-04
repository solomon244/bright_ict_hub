const rateLimit = require('express-rate-limit');

const json429 = (message) => (req, res) =>
  res.status(429).json({ success: false, statusCode: 429, message });

const build = ({ windowMs, max, message, skipSuccessfulRequests = false, keyGenerator }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: json429(message),
  });

const MINUTE = 60 * 1000;

/** Broad safety net for the whole API (per IP). */
const apiLimiter = build({
  windowMs: 15 * MINUTE,
  max: 600,
  message: 'Too many requests. Please slow down and try again shortly.',
});

/** Brute-force protection: failed logins only count (successful ones are skipped). */
const loginLimiter = build({
  windowMs: 15 * MINUTE,
  max: 10,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

const registerLimiter = build({
  windowMs: 60 * MINUTE,
  max: 10,
  message: 'Too many sign-ups from this network. Please try again later.',
});

/** Forgot / reset password and email-verification emails (prevents email flooding). */
const emailActionLimiter = build({
  windowMs: 60 * MINUTE,
  max: 5,
  message: 'Too many requests. Please try again in an hour.',
});

/** Uploads are expensive: limit per authenticated user (falls back to IP). */
const uploadLimiter = build({
  windowMs: 60 * MINUTE,
  max: 30,
  message: 'Upload limit reached. Please try again later.',
  keyGenerator: (req) => (req.user && req.user._id ? String(req.user._id) : req.ip || 'unknown'),
});

/** Saving coding attempts: per user, generous for learning but stops spam. */
const submissionLimiter = build({
  windowMs: 60 * MINUTE,
  max: 120,
  message: 'Too many saved attempts. Please slow down.',
  keyGenerator: (req) => (req.user && req.user._id ? String(req.user._id) : req.ip || 'unknown'),
});

/** Posting threads/replies and reporting: per user, stops spam floods. */
const postLimiter = build({
  windowMs: 60 * MINUTE,
  max: 40,
  message: 'You are posting too quickly. Please try again later.',
  keyGenerator: (req) => (req.user && req.user._id ? String(req.user._id) : req.ip || 'unknown'),
});

module.exports = { apiLimiter, loginLimiter, registerLimiter, emailActionLimiter, uploadLimiter, submissionLimiter, postLimiter };
