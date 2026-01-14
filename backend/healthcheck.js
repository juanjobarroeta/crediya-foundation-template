// Simple healthcheck server for debugging Railway
const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: port,
    env: process.env.NODE_ENV,
    hasDbUrl: !!process.env.DATABASE_URL
  }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Healthcheck server running on port ${port}`);
  console.log(`🌐 Visit: http://0.0.0.0:${port}`);
});

