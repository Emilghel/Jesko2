/**
 * Production Server - Standalone version without Vite dependencies
 * 
 * This server is specifically designed for production deployment and
 * does not rely on any Vite dependencies that might cause issues in
 * the production environment.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import core routes and middlewares
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { Pool } from '@neondatabase/serverless';
import createMemoryStore from 'memorystore';

const MemoryStore = createMemoryStore(session);

// Convert ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const port = process.env.PORT || 10000;

// Database connection
let pool: Pool | null = null;
if (process.env.DATABASE_URL) {
  console.log('Connecting to database...');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Configure session
const sessionConfig = {
  secret: process.env.JWT_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  })
};

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));

// Basic API routes
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

// Sample stats endpoint
let memberCount = 4130;
const lastUpdated = new Date().toISOString();

app.get('/api/stats/member-count', (req, res) => {
  res.json({ count: memberCount, lastUpdated });
});

// Database health check
app.get('/api/database-status', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ status: 'error', message: 'No database connection' });
  }
  
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'connected', 
      timestamp: result.rows[0].now,
      message: 'Database connection successful'
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message || 'Unknown error'
    });
  }
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
  console.log(`Production server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});