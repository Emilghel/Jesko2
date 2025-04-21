/**
 * Production Server Entry Point for Render.com
 * 
 * This file serves as the entry point for the deployed application on Render.com.
 * It loads the compiled server code or falls back to direct TypeScript execution
 * with ts-node if necessary.
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

// Setup basic Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Jesko AI production server...');
console.log('Current directory:', __dirname);

// Create connection pool if database URL is provided
let pool;
try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log('PostgreSQL connection pool created');
    
    // Test the database connection
    pool.query('SELECT NOW()', (err, result) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Database connected successfully:', result.rows[0].now);
      }
    });
  } else {
    console.log('No DATABASE_URL provided, running without database');
  }
} catch (error) {
  console.error('Error setting up database connection:', error);
}

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Database check endpoint
app.get('/test-db', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'No database connection available' });
  }

  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'connected', 
      timestamp: result.rows[0].now,
      message: 'Database connection successful' 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed', 
      error: error.message 
    });
  }
});

// Environment information endpoint
app.get('/api/environment', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  });
});

// Check for built server file
const distServerPath = path.join(__dirname, 'dist', 'server', 'index.js');
const serverEntryPath = path.join(__dirname, 'server', 'index.ts');

if (fs.existsSync(distServerPath)) {
  console.log('Found built server, loading from:', distServerPath);
  import(distServerPath).catch(err => {
    console.error('Error loading built server:', err);
    startFallbackServer();
  });
} else if (fs.existsSync(serverEntryPath)) {
  console.log('No built server found, attempting to run TypeScript directly');
  
  // Try to dynamically import ts-node and run the TypeScript file
  import('ts-node').then(tsNode => {
    tsNode.register({
      transpileOnly: true,
      compilerOptions: {
        module: 'ESNext',
        moduleResolution: 'Node',
        target: 'ES2020'
      }
    });

    import(serverEntryPath).catch(err => {
      console.error('Error running TypeScript server:', err);
      startFallbackServer();
    });
  }).catch(err => {
    console.error('Error loading ts-node:', err);
    startFallbackServer();
  });
} else {
  console.log('No server files found, starting fallback server');
  startFallbackServer();
}

function startFallbackServer() {
  console.log('Starting fallback server mode');
  
  // Serve static files if the dist/client directory exists
  const clientDistPath = path.join(__dirname, 'dist', 'client');
  if (fs.existsSync(clientDistPath)) {
    console.log('Serving static files from:', clientDistPath);
    app.use(express.static(clientDistPath));
    
    // Serve index.html for any unmatched routes (for SPA)
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  } else {
    // If no client files, serve a basic HTML page
    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>Jesko AI</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1 { color: #333; }
              .container { max-width: 800px; margin: 0 auto; }
              .status { padding: 15px; background: #f8f9fa; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Jesko AI Platform</h1>
              <p>Welcome to the Jesko AI Platform. This is a fallback mode while the full application is being initialized.</p>
              
              <div class="status">
                <h2>Server Status</h2>
                <p>Server is running in fallback mode.</p>
                <p>Current time: ${new Date().toLocaleString()}</p>
              </div>
              
              <p>For API status, visit the <a href="/health">/health</a> endpoint.</p>
              <p>To check database connectivity, visit the <a href="/test-db">/test-db</a> endpoint.</p>
            </div>
          </body>
        </html>
      `);
    });
    
    // Catch-all route for non-existing endpoints
    app.get('*', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>Jesko AI - Page Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; text-align: center; }
              h1 { color: #333; }
              .container { max-width: 600px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Page Not Found</h1>
              <p>The page you are looking for does not exist.</p>
              <p><a href="/">Return to Home</a></p>
            </div>
          </body>
        </html>
      `);
    });
  }
  
  // Start the server on the specified port
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fallback server running on port ${PORT}`);
  });
}
