const path = require('path');
const dotenv = require('dotenv');

const rootDir = process.cwd();
dotenv.config({
  path: path.resolve(rootDir, '.env'),
});

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'fallback_jwt_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
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
};

// Production environment validation
if (env.nodeEnv === 'production') {
  const errors = [];

  if (env.jwtSecret === 'fallback_jwt_secret' || env.jwtSecret.length < 32) {
    errors.push('❌ CRITICAL: JWT_SECRET must be set and at least 32 characters long in production!');
  }

  if (env.jwtRefreshSecret === 'fallback_refresh_secret' || env.jwtRefreshSecret.length < 32) {
    errors.push('❌ CRITICAL: JWT_REFRESH_SECRET must be set and at least 32 characters long in production!');
  }

  if (!env.mongoUri || env.mongoUri.trim() === '') {
    errors.push('❌ CRITICAL: MONGO_URI must be set in production!');
  }

  if (env.clientUrl === 'http://localhost:5173') {
    errors.push('⚠️  WARNING: CLIENT_URL is still set to localhost. Update for production!');
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
  if (env.jwtSecret === 'fallback_jwt_secret' || env.jwtRefreshSecret === 'fallback_refresh_secret') {
    console.warn('⚠️  Warning: Using fallback JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET in production!');
  }
  if (!env.mongoUri || env.mongoUri.trim() === '') {
    console.warn('⚠️  Warning: MONGO_URI not set in environment variables');
  }
}

module.exports = env;


