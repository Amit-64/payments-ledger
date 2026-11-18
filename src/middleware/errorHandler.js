const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const env = require('../config/env');

const notFoundHandler = (req, res, next) => {
  next(
    new AppError(
      `Route ${req.method} ${req.originalUrl} not found`,
      404,
      'ROUTE_NOT_FOUND'
    )
  );
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  const message =
    statusCode === 500 && env.nodeEnv === 'production'
      ? 'An unexpected internal server error occurred'
      : err.message || 'An unexpected internal server error occurred';

  if (statusCode >= 500) {
    logger.error(
      {
        requestId: req.requestId,
        userId: req.user?.id || null,
        errorCode,
        err: {
          message: err.message,
          stack: err.stack,
        },
      },
      'Unhandled Server Error'
    );
  }

  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      requestId: req.requestId,
    },
  };

  if (env.nodeEnv === 'development' && statusCode >= 500) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
