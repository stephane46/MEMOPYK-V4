const express = require('express');
const app = express();

app.use(express.json());

// Simple test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test analytics endpoint
app.get('/api/analytics/dashboard', (req, res) => {
  res.json({ 
    views: 1250, 
    sessions: 890, 
    users: 654,
    timestamp: new Date().toISOString()
  });
});

const port = 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
});