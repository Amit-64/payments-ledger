const { Pool } = require('pg');
const env = require('./env');


const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: env.db.max,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
