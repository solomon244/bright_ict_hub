const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ethio Tech Hub API',
      version: '1.0.0',
      description: 'Complete API documentation for Ethio Tech Hub EdTech Platform',
      contact: {
        name: 'Ethio Tech Hub Support',
        email: 'support@ethiotechhub.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: env.nodeEnv === 'production' 
          ? 'https://ethio-tech-edtechapi.onrender.com'
          : `http://localhost:${env.port}`,
        description: env.nodeEnv === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password'],
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '507f1f77bcf86cd799439011',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              example: 'John',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              example: 'Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            role: {
              type: 'string',
              enum: ['student', 'instructor', 'admin'],
              description: 'User role',
              example: 'student',
            },
            profileImage: {
              type: 'string',
              format: 'uri',
              description: 'Profile image URL',
            },
            bio: {
              type: 'string',
              description: 'User biography',
            },
            isEmailVerified: {
              type: 'boolean',
              description: 'Email verification status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Course: {
          type: 'object',
          required: ['title', 'description', 'category', 'level'],
          properties: {
            _id: {
              type: 'string',
              description: 'Course ID',
            },
            title: {
              type: 'string',
              description: 'Course title',
              example: 'Introduction to React',
            },
            description: {
              type: 'string',
              description: 'Course description',
            },
            slug: {
              type: 'string',
              description: 'URL-friendly course identifier',
            },
            category: {
              type: 'string',
              description: 'Category ID or populated category object',
            },
            level: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced'],
              description: 'Course difficulty level',
            },
            instructor: {
              type: 'string',
              description: 'Instructor ID or populated user object',
            },
            price: {
              type: 'number',
              description: 'Course price',
              example: 0,
            },
            isPublished: {
              type: 'boolean',
              description: 'Publication status',
            },
            thumbnailUrl: {
              type: 'string',
              format: 'uri',
              description: 'Course thumbnail image URL',
            },
            totalLessons: {
              type: 'number',
              description: 'Total number of lessons',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Course tags',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Lesson: {
          type: 'object',
          required: ['title', 'course', 'order'],
          properties: {
            _id: {
              type: 'string',
              description: 'Lesson ID',
            },
            course: {
              type: 'string',
              description: 'Course ID',
            },
            title: {
              type: 'string',
              description: 'Lesson title',
            },
            description: {
              type: 'string',
              description: 'Lesson description',
            },
            order: {
              type: 'number',
              description: 'Lesson order in course',
            },
            content: {
              type: 'string',
              description: 'Lesson content (HTML/text)',
            },
            videoUrl: {
              type: 'string',
              format: 'uri',
              description: 'Lesson video URL',
            },
            duration: {
              type: 'number',
              description: 'Lesson duration in minutes',
            },
            isPreviewable: {
              type: 'boolean',
              description: 'Whether lesson can be previewed',
            },
          },
        },
        Enrollment: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Enrollment ID',
            },
            course: {
              type: 'string',
              description: 'Course ID or populated course object',
            },
            student: {
              type: 'string',
              description: 'Student ID or populated user object',
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'dropped'],
              description: 'Enrollment status',
            },
            progressPercentage: {
              type: 'number',
              description: 'Course completion percentage',
              example: 75,
            },
            lastAccessedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last access timestamp',
            },
          },
        },
        Quiz: {
          type: 'object',
          required: ['title', 'lesson', 'questions'],
          properties: {
            _id: {
              type: 'string',
              description: 'Quiz ID',
            },
            lesson: {
              type: 'string',
              description: 'Lesson ID',
            },
            title: {
              type: 'string',
              description: 'Quiz title',
            },
            durationMinutes: {
              type: 'number',
              description: 'Quiz duration in minutes',
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  prompt: {
                    type: 'string',
                    description: 'Question text',
                  },
                  options: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Answer options',
                  },
                  correctAnswerIndex: {
                    type: 'number',
                    description: 'Index of correct answer',
                  },
                  explanation: {
                    type: 'string',
                    description: 'Explanation for the answer',
                  },
                },
              },
            },
          },
        },
        QuizAttempt: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Attempt ID',
            },
            quiz: {
              type: 'string',
              description: 'Quiz ID',
            },
            student: {
              type: 'string',
              description: 'Student ID',
            },
            score: {
              type: 'number',
              description: 'Quiz score',
            },
            totalQuestions: {
              type: 'number',
              description: 'Total questions in quiz',
            },
            answers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  questionIndex: { type: 'number' },
                  selectedOptionIndex: { type: 'number' },
                  isCorrect: { type: 'boolean' },
                },
              },
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Progress: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Progress ID',
            },
            student: {
              type: 'string',
              description: 'Student ID',
            },
            lesson: {
              type: 'string',
              description: 'Lesson ID',
            },
            course: {
              type: 'string',
              description: 'Course ID',
            },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed'],
              description: 'Progress status',
            },
            percentage: {
              type: 'number',
              description: 'Completion percentage',
              example: 100,
            },
            lastVisitedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Category: {
          type: 'object',
          required: ['name', 'description'],
          properties: {
            _id: {
              type: 'string',
              description: 'Category ID',
            },
            name: {
              type: 'string',
              description: 'Category name',
              example: 'Web Development',
            },
            description: {
              type: 'string',
              description: 'Category description',
            },
            icon: {
              type: 'string',
              description: 'Category icon',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
            },
            statusCode: {
              type: 'number',
              description: 'HTTP status code',
            },
            message: {
              type: 'string',
              description: 'Response message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            meta: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            statusCode: {
              type: 'number',
              example: 400,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            meta: {
              type: 'object',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/app.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

