/**
 * Simplified Express server for Render.com deployment
 * 
 * This is a fallback server that provides basic functionality
 * when the full application can't be deployed.
 */

import express from 'express';
import cors from 'cors';
import pg from 'pg';
const { Pool } = pg;
const app = express();

// Apply middleware
app.use(cors());
app.use(express.json());

// Define a pool for database connections
let pool;
try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log('PostgreSQL connection pool created');
  } else {
    console.log('No DATABASE_URL provided, running without database');
  }
} catch (error) {
  console.error('Error creating database pool:', error);
}

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Simple DB test endpoint
app.get('/test-db', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'No database connection available' });
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

// Home page
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
          <p>Welcome to the Jesko AI Platform. This is a temporary landing page while the full application is being prepared for deployment.</p>
          
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
