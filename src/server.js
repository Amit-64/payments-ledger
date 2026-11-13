const env = require('./config/env');
const app = require('./app');
const { pool } = require('./config/db');

const server = app.listen(env.port, () => {
  console.log(
    `[SERVER] ${env.serviceName} (${env.nodeEnv}) running on http://localhost:${env.port}`
  );
});

process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down gracefully...');
  server.close(async () => {
    console.log('[SERVER] HTTP server closed.');
    await pool.end();
    console.log('[SERVER] PostgreSQL connection pool closed.');
    process.exit(0);
  });
});
