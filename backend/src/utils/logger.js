const morgan = require('morgan');

const stream = {
  write: (message) => {
    process.stdout.write(message);
  },
};

const logger = morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream,
});

module.exports = logger;


