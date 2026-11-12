const env = require('./config/env');
const app = require('./app');

const server = app.listen(env.port, () => {
  console.log(
    `[SERVER] ${env.serviceName} (${env.nodeEnv}) running on http://localhost:${env.port}`
  );
});

process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down gracefully...');
  server.close(() => {
    console.log('[SERVER] HTTP server closed.');
    process.exit(0);
  });
});