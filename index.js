const express = require('express');

const app = express();

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mode: 'mock'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Workflow Automation API',
    version: '1.0.0',
    message: 'API is running!'
  });
});

// Webhook endpoint
app.post('/api/webhooks/receive', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook received',
    data: req.body
  });
});

// Export for Vercel
module.exports = app;
