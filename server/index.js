require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

const PORT = process.env.PORT || 3000;

// — Active SSE clients —
const clients = new Set();

// — Broadcast to all connected SSE clients —
function broadcast(payload) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(msg);
    } catch (err) {
      console.error('Failed to write to client, removing:', err.message);
      clients.delete(res);
    }
  }
  console.log(`[broadcast] ${payload.operation} → ${clients.size} client(s)`);
}

// — Connect to Postgres with retry —
async function connectWithRetry(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      console.log('[pg] Connected to Postgres');
      return client;
    } catch (err) {
      console.log(`[pg] Not ready, retrying (${i + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('[pg] Could not connect after max retries');
}

// — HTTP server —
const server = http.createServer((req, res) => {

  // Serve browser client
  if (req.method === 'GET' && req.url === '/') {
    const filePath = path.join(__dirname, '../client/index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // SSE endpoint
  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connected event
    res.write('data: {"type":"connected","message":"Listening for order updates"}\n\n');

    clients.add(res);
    console.log(`[sse] Client connected. Total: ${clients.size}`);

    req.on('close', () => {
      clients.delete(res);
      console.log(`[sse] Client disconnected. Total: ${clients.size}`);
    });

    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// — Bootstrap —
(async () => {
  const pgClient = await connectWithRetry();

  await pgClient.query('LISTEN orders_channel');
  console.log('[pg] Listening on orders_channel');

  pgClient.on('notification', (msg) => {
    try {
      const payload = JSON.parse(msg.payload);
      broadcast(payload);
    } catch (err) {
      console.error('[pg] Failed to parse notification payload:', err.message);
    }
  });

  server.listen(PORT, () => {
    console.log(`[http] Server running on http://localhost:${PORT}`);
  });
})();
