const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError(
        'Authentication required. Please provide a valid Bearer token.',
        401,
        'UNAUTHORIZED'
      )
    );
  }

  const token = authHeader.split(' ')[1];

  try {

    const decoded = jwt.verify(token, env.jwtSecret);


    req.user = {
      id: decoded.sub,
      email: decoded.email,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError('Access token has expired', 401, 'TOKEN_EXPIRED')
      );
    }
    return next(
      new AppError('Invalid access token', 401, 'INVALID_TOKEN')
    );
  }
};

module.exports = {
  requireAuth,
};