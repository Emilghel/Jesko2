// deploy-server.js
// A simplified server for deployment that requires minimal build process

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Set environment
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);

// Check if client/dist exists, if not, look for dist/client
let clientDistPath = path.join(__dirname, 'client', 'dist');
if (!fs.existsSync(clientDistPath)) {
  clientDistPath = path.join(__dirname, 'dist', 'client');
}

// Serve static files
app.use(express.static(clientDistPath));

// Serve static assets
app.use('/static', express.static(path.join(__dirname, 'static')));

// Basic API endpoint for testing
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online',
    environment: isProduction ? 'production' : 'development',
    version: '1.0.0',
    serverTime: new Date().toISOString()
  });
});

// Member count API for homepage counter
app.get('/api/stats/member-count', async (req, res) => {
  try {
    // Simple implementation for deployment test
    const count = 3675;
    const lastUpdated = new Date().toISOString();
    
    return res.json({ count, lastUpdated });
  } catch (error) {
    console.error('Error in member count API:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Return the React app
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});