const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[SERVER] Payment Ledger API running on http://localhost:${PORT}`);
});


process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down gracefully...');
  server.close(() => {
    console.log('[SERVER] HTTP server closed.');
    process.exit(0);
  });
});