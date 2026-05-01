const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccessToken = (payload, expiresIn = '30m') =>
  jwt.sign(payload, env.jwtSecret, { expiresIn });

const signRefreshToken = (payload, expiresIn = '7d') =>
  jwt.sign(payload, env.jwtRefreshSecret, { expiresIn });

const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};


