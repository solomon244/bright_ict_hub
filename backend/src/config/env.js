const path = require('path');
const dotenv = require('dotenv');

const crypto = require('crypto');

const rootDir = process.cwd();
dotenv.config({
  path: path.resolve(rootDir, '.env'),
});

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || '',
  // Without configured secrets, use random per-process ones (sessions reset on restart) instead of a
  // publicly known default string that would let anyone forge tokens.
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex'),
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || crypto.randomBytes(48).toString('hex'),
  jwtSecretsConfigured: Boolean(process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // Every allowed frontend origin (CLIENT_URL may be comma-separated). Trailing slashes and quotes are stripped
  // because browsers send origins without them, so "https://x.vercel.app/" would otherwise never match.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, ''))
    .filter(Boolean),
  email: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'no-reply@example.com',
    pass: process.env.EMAIL_PASS || 'password',
  },
  uploadDir: process.env.UPLOAD_DIR || path.join(rootDir, 'uploads'),
  resetTokenExpiryMinutes: Number(process.env.RESET_TOKEN_EXPIRY_MINUTES) || 30,
  verifyTokenExpiryMinutes: Number(process.env.VERIFY_TOKEN_EXPIRY_MINUTES) || 60,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  // Provider-independent AI layer: 'gemini' (default) or 'openai' (any OpenAI-compatible API).
  aiProvider: (process.env.AI_PROVIDER || '').toLowerCase() || (process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY ? 'openai' : 'gemini'),
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  aiDailyLimitPerUser: Number(process.env.AI_DAILY_LIMIT_PER_USER) || 50,
  aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000,
  // Optional: USD per 1,000 tokens, to estimate spend in the admin usage report.
  aiCostPer1kInput: Number(process.env.AI_COST_PER_1K_INPUT) || 0,
  aiCostPer1kOutput: Number(process.env.AI_COST_PER_1K_OUTPUT) || 0,
  /**
   * Swagger UI: off in production by default; set ENABLE_API_DOCS=true to expose.
   */
  enableApiDocs:
    process.env.ENABLE_API_DOCS === 'true' ||
    (process.env.ENABLE_API_DOCS !== 'false' && (process.env.NODE_ENV || 'development') !== 'production'),
};

// Production environment validation
if (env.nodeEnv === 'production') {
  const errors = [];

  if (!process.env.JWT_SECRET || env.jwtSecret.length < 32) {
    errors.push('❌ CRITICAL: JWT_SECRET must be set and at least 32 characters long in production!');
  }

  if (!process.env.JWT_REFRESH_SECRET || env.jwtRefreshSecret.length < 32) {
    errors.push('❌ CRITICAL: JWT_REFRESH_SECRET must be set and at least 32 characters long in production!');
  }

  if (!env.mongoUri || env.mongoUri.trim() === '') {
    errors.push('❌ CRITICAL: MONGO_URI must be set in production!');
  }

  if (env.clientUrls.length === 1 && env.clientUrls[0] === 'http://localhost:5173') {
    errors.push('⚠️  WARNING: CLIENT_URL is still set to localhost. Update for production!');
  }

  if (!env.geminiApiKey.trim() && !env.openai.apiKey.trim()) {
    errors.push(
      '⚠️  WARNING: No AI provider key set (GEMINI_API_KEY or OPENAI_API_KEY) — AI tutor and dashboard coach will stay offline until configured.'
    );
  }

  if (errors.length > 0) {
    console.error('\n🚨 PRODUCTION ENVIRONMENT VALIDATION FAILED:\n');
    errors.forEach((error) => console.error(`  ${error}`));
    console.error('\n');
    if (errors.some((e) => e.includes('CRITICAL'))) {
      process.exit(1);
    }
  }
}

// Development warnings
if (env.nodeEnv === 'development') {
  if (!env.jwtSecretsConfigured) {
    console.warn('⚠️  Warning: JWT_SECRET / JWT_REFRESH_SECRET not set — using random temporary secrets (logins reset on every restart).');
  }
  if (!env.mongoUri || env.mongoUri.trim() === '') {
    console.warn('⚠️  Warning: MONGO_URI not set in environment variables');
  }
  if (!env.geminiApiKey.trim() && !env.openai.apiKey.trim()) {
    console.warn('⚠️  Warning: no AI provider key set (GEMINI_API_KEY / OPENAI_API_KEY) — tutor and dashboard AI coach will return fallback states.');
  }
}

module.exports = env;


