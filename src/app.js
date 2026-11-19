const express = require('express');
const env = require('./config/env');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/openapi.json');
const { query } = require('./config/db');
const { apiLimiter, authLimiter } = require('./middleware/rateLimitter');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const transferRoutes = require('./routes/transfer.routes');
const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(requestLogger);

app.use('/api/v1', apiLimiter);

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Payments Ledger API',
    status: 'live',
    interactiveDocs: '/docs',
    description:
      'Double-entry payments ledger backend with FOR UPDATE row locking, SHA-256 idempotency keys, and immutable reversals.',
    healthCheck: '/api/v1/health',
    githubRepo: 'https://github.com/Amit-64/payments-ledger',
  });
});

app.use(
  '/docs',
  (req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Payments Ledger API — Interactive Docs',
  })
);

app.get('/api/v1/health', async (req, res, next) => {
  try {
    await query('SELECT 1');
    res.status(200).json({
      success: true,
      data: {
        status: 'UP',
        database: 'CONNECTED',
        service: env.serviceName,
        environment: env.nodeEnv,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/transfers', transferRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
