const express = require('express');
const env = require('./config/env');
const app = express();


app.use(express.json());


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


module.exports = app;