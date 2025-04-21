/**
 * Production Server for Jesko AI Platform
 * This imports your actual application code and uses ES Module syntax
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Get port from environment
const PORT = process.env.PORT || 3000;

console.log(`Starting Jesko AI Platform on port ${PORT}...`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);

// Try to import route files
try {
  // If we have a proper build, try to load it
  console.log('Checking for server routes...');
  
  // List all files in server directory
  const serverDir = path.join(process.cwd(), 'server');
  if (fs.existsSync(serverDir)) {
    console.log('Server directory found:', serverDir);
    const files = fs.readdirSync(serverDir);
    console.log('Files in server directory:', files);
    
    // Look for route files
    files.forEach(file => {
      if (file.includes('route') || file.includes('api')) {
        console.log('Potential route file found:', file);
      }
    });
  } else {
    console.log('Server directory not found');
  }
  
  // Set up routes
  console.log('Setting up API routes...');
  
  // API routes setup
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      message: 'Jesko AI Platform API is running'
    });
  });
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      message: 'Jesko AI Platform is running' 
    });
  });
  
  // Attempt to import main routes using dynamic import for ES modules
  try {
    if (fs.existsSync(path.join(process.cwd(), 'routes.js'))) {
      console.log('Found routes.js in root directory');
      const routesModule = await import('./routes.js');
      if (typeof routesModule.default === 'function') {
        routesModule.default(app);
        console.log('Routes successfully loaded from routes.js');
      }
    }
    else if (fs.existsSync(path.join(process.cwd(), 'server', 'routes.js'))) {
      console.log('Found routes.js in server directory');
      const routesModule = await import('./server/routes.js');
      if (typeof routesModule.default === 'function') {
        routesModule.default(app);
        console.log('Routes successfully loaded from server/routes.js');
      }
    }
  } catch (routeError) {
    console.error('Error loading routes:', routeError);
  }
  
  // Check for a client build to serve
  const publicPath = path.join(process.cwd(), 'dist', 'public');
  const hasPublicFiles = fs.existsSync(publicPath);
  
  if (hasPublicFiles) {
    console.log(`Serving static files from: ${publicPath}`);
    app.use(express.static(publicPath));
    
    // For all other routes, serve index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(publicPath, 'index.html'));
      }
    });
  } else {
    console.log('No client build found at:', publicPath);
    
    // For all other routes, serve a temporary page
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Jesko AI Platform</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                h1 { color: #333; }
                .container { max-width: 800px; margin: 0 auto; }
                .status { padding: 15px; background: #f8f9fa; border-radius: 5px; margin: 20px 0; }
                .notice { background: #e7f3ff; border-left: 4px solid #0070f3; padding: 10px 15px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Jesko AI Platform</h1>
                <p>Server is running. Current time: ${new Date().toLocaleString()}</p>
                
                <div class="status">
                  <h2>Deployment Status</h2>
                  <p>The server is running and API endpoints are available.</p>
                  <p>The frontend is currently being configured.</p>
                </div>
                
                <div class="notice">
                  <p><strong>Server Information:</strong></p>
                  <p>Node.js: ${process.version}</p>
                  <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
                  <p>Server started: ${new Date().toLocaleString()}</p>
                  <p>API Status: <a href="/api/status">/api/status</a></p>
                  <p>Health Check: <a href="/health">/health</a></p>
                </div>
              </div>
            </body>
          </html>
        `);
      }
    });
  }
  
} catch (error) {
  console.error('Error starting server:', error);
  
  // Show error page
  app.get('*', (req, res) => {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Jesko AI Platform - Error</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #d32f2f; }
            pre { background: #f5f5f5; padding: 15px; overflow: auto; }
            .container { max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Jesko AI Platform - Server Error</h1>
            <p>The server encountered an error during startup:</p>
            <pre>${error.stack}</pre>
            <p><a href="/health">Check server health</a></p>
          </div>
        </body>
      </html>
    `);
  });
}

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Jesko AI Platform server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
