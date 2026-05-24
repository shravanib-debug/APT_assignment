require('dotenv').config();
const { EventSource } = require('eventsource');

const url = process.env.SSE_URL || 'http://localhost:3000/events';
const es  = new EventSource(url);

es.onopen = () => console.log('Connected. Waiting for order updates...\n');

es.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'connected') return;

  const time = new Date().toLocaleTimeString();
  const { id, customer_name, product_name, status } = msg.data;
  console.log(
    `[${time}] ${msg.operation.padEnd(6)} — Order #${id} | ${customer_name} | ${product_name} | ${status}`
  );
};

es.onerror = () => console.error('Connection error. Retrying...');

process.on('SIGINT', () => { es.close(); process.exit(0); });
