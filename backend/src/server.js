const http = require('http');
const env = require('./config/env');
const connectDatabase = require('./config/db');
const app = require('./app');

const startServer = async () => {
  await connectDatabase();

  const server = http.createServer(app);
  const port = process.env.PORT || env.port;
  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Ethio Tech Hub API running on port ${port}`);
  });
};

startServer();


