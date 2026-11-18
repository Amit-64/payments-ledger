const rateLimit = require('express-rate-limit');
const env = require('../config/env');


const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: env.nodeEnv === 'test' ? 1000 : 100,
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
  },
});


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: env.nodeEnv === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message:
        'Too many authentication attempts from this IP, please try again after 15 minutes',
    },
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
