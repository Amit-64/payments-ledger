const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  serviceName: process.env.SERVICE_NAME || 'payments-ledger-api',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payments_ledger',
    max: Number(process.env.DB_POOL_MAX) || 10,
  },
};

module.exports = env;
