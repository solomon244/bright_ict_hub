const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_that_is_long_enough_123456';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_12';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'ethio-tech-hub-test-uploads');
process.env.ENABLE_API_DOCS = 'false';
