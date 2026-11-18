const crypto = require('crypto');
const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  
  const incomingId = req.headers['x-request-id']?.trim();
  const requestId =
    incomingId && incomingId.length <= 64 ? incomingId : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - startTime;
    const durationMs = Number(durationNs) / 1e6;

    const logData = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userId: req.user?.id || null,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'HTTP Request Failed (5xx)');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'HTTP Request Client Error (4xx)');
    } else {
      logger.info(logData, 'HTTP Request Completed');
    }
  });

  next();
};

module.exports = requestLogger;
