const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const router = require('./routes');
const env = require('./config/env');
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');

const app = express();

if (env.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// CORS configuration - allow both local development and production origins
// Supports comma-separated CLIENT_URL values for multiple frontends.
const allowedOrigins = (env.clientUrl || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
// Always include localhost for local dev
if (!allowedOrigins.includes('http://localhost:5173')) {
  allowedOrigins.push('http://localhost:5173');
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-to-server, health checks, Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
// Security headers. Swagger UI needs inline scripts/styles, so CSP is applied only when docs are off.
// CORP is cross-origin because the frontend (another origin) embeds uploaded images and videos.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.enableApiDocs ? false : undefined,
  })
);
app.use(logger);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
// Strip `$`/`.` operator keys from user input to block NoSQL operator injection.
app.use(mongoSanitize());

// Uploaded files are user content: never let browsers sniff or execute them as pages.
app.use(
  '/uploads',
  express.static(path.resolve(env.uploadDir), {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

// Swagger (disabled in production unless ENABLE_API_DOCS=true — see config/env.js)
if (env.enableApiDocs) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Ethio Tech Hub API Documentation',
    })
  );
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Ethio Tech Hub API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      ...(env.enableApiDocs ? { docs: '/api-docs', swagger: '/api-docs' } : {}),
    },
    documentation: env.enableApiDocs
      ? {
          swagger: `${req.protocol}://${req.get('host')}/api-docs`,
          description: 'Interactive API documentation with Swagger UI',
        }
      : { description: 'API docs disabled in this environment (set ENABLE_API_DOCS=true to enable).' },
  });
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiLimiter, router);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;


