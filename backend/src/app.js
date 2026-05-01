const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const router = require('./routes');
const env = require('./config/env');
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

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
app.use(logger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.resolve(env.uploadDir)));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: ' Bright ICT Hub API Documentation',
}));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: ' Bright ICT Hub API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs',
      swagger: '/api-docs',
    },
    documentation: {
      swagger: `${req.protocol}://${req.get('host')}/api-docs`,
      description: 'Interactive API documentation with Swagger UI',
    },
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

app.use('/api', router);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;


