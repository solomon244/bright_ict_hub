const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(new ApiResponse(401, 'Authentication required'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(decoded.sub).select('-password');
    if (!user) {
      return res.status(401).json(new ApiResponse(401, 'Invalid credentials'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json(new ApiResponse(403, 'Forbidden'));
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
};


