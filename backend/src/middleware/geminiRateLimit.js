const rateLimit = require('express-rate-limit');

/**
 * Per-authenticated-user throttle for Gemini-backed routes (after authenticate middleware).
 */
const geminiUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const id = req.user && req.user._id;
    return id ? String(id) : req.ip || 'unknown';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      message:
        'ፈጣን ጥያቄዎች በጣም ብዙ ናቸው። እባክዎ አንድ ደቂቃ ቆይተው እንደገና ይሞክሩ። / Too many AI requests. Please wait a moment and try again.',
    });
  },
});

module.exports = { geminiUserLimiter };
