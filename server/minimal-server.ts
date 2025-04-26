import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Convert ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Stats endpoint
let memberCount = 4086;
const lastUpdated = new Date().toISOString();

app.get('/api/stats/member-count', (req, res) => {
  res.json({ count: memberCount, lastUpdated });
});

// Serve static files from public directory
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Public directory: ${publicPath}`);
  
  // Check if index.html exists
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`Found index.html at ${indexPath}`);
  } else {
    console.warn(`WARNING: index.html not found at ${indexPath}`);
  }
});