const express = require('express');
const env = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();


app.use(express.json());
app.use(requestLogger);


app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      service: env.serviceName,
      environment : env.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});
app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;