const pino = require('pino');
const env = require('../config/env');

const logger = pino({
  level: env.nodeEnv === 'test' ? 'silent' : env.logLevel || 'info',
  base: {
    service: env.serviceName,
    environment: env.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label.toUpperCase() };
    },
  },

  redact: {
    paths: [
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'accessToken',
      '*.accessToken',
      'req.headers.authorization',
      'headers.authorization',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
