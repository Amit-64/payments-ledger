const express = require('express');
const env = require('./config/env');
const db = require('./config/db');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const accountRoutes = require('./routes/account.routes');

const app = express();


app.use(express.json());
app.use(requestLogger);


app.get('/api/v1/health', async (req, res, next) => {
  try {
   
    await db.query('SELECT 1');

    res.status(200).json({
      success: true,
      data: {
        status: 'UP',
        service: env.serviceName,
        environment: env.nodeEnv,
        database: 'CONNECTED',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/v1/accounts', accountRoutes);


app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;
