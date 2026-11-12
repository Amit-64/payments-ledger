const dotenv = require('dotenv');

dotenv.config();

const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    serviceName: process.env.SERVICE_NAME || 'payments-ledger-api',
  };
  
  module.exports = env;