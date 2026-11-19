const { Pool } = require('pg');
const env = require('./env');

const poolConfig = env.databaseUrl
  ? {
      connectionString: env.databaseUrl,
      ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
    };

const pool = new Pool({
  ...poolConfig,
  max: env.db.max || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB POOL ERROR] Unexpected error on idle PostgreSQL client:', err);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
};
