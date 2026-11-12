const env = require('../config/env');
const AppError = require('../utils/AppError');

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
  const statusCode = err.isOperational ? err.statusCode : 500;
  const errorCode = err.isOperational ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = err.isOperational
    ? err.message
    : 'An unexpected internal server error occurred';


  if (!err.isOperational) {
    console.error('[UNEXPECTED ERROR]', err);
  }

  const responseBody = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };

  if (env.nodeEnv === 'development' && !err.isOperational) {
    responseBody.error.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};