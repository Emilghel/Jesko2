// server-render.js
// This is a simplified deployment server for Render.com that includes both static serving and API routes
// It uses ES modules syntax (import/export) for compatibility with the project's package.json type: "module"

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import jwt from 'jsonwebtoken';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Neon database
neonConfig.webSocketConstructor = ws;

// Create Express app
const app = express();

// Set trust proxy for Render.com deployment (important for proper IP handling)
app.set('trust proxy', 1);

// Initialize middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Add session middleware with cookie security settings
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'jesko-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true, // Always secure on Render deployment
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Use Helmet for security headers with appropriate CSP settings
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://*'],
      connectSrc: ["'self'", 'https://*', 'wss://*', 'ws://*'],
      mediaSrc: ["'self'", 'https://*', 'blob:'],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  credentials: true,
  allowedHeaders: 'Content-Type,Authorization,Cookie,Set-Cookie,X-Requested-With,Accept,Origin'
}));

// Database connection
let db;
let pool;

try {
  if (process.env.DATABASE_URL) {
    console.log('Initializing database connection...');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // We'll initialize schema after importing it
    db = pool;
    console.log('Database connection established.');
  } else {
    console.warn('DATABASE_URL not set. Database functionality will be limited.');
  }
} catch (error) {
  console.error('Database connection error:', error);
}

// Simple authentication middleware
const isAuthenticated = async (req, res, next) => {
  try {
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      if (pool) {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows && result.rows.length > 0) {
          req.user = result.rows[0];
          return next();
        }
      }
    }
    
    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin check middleware
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
};

// Partner check middleware
const isPartner = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Check if user is a partner
    if (pool) {
      const result = await pool.query('SELECT * FROM partners WHERE user_id = $1 AND LOWER(status) = LOWER($2)', 
        [req.user.id, 'ACTIVE']);
        
      if (result.rows && result.rows.length > 0) {
        req.partner = result.rows[0];
        return next();
      } else if (req.user.isAdmin) {
        // Create a mock partner for admin users
        req.partner = {
          id: 0,
          user_id: req.user.id,
          company_name: 'Admin Account',
          referral_code: 'ADMIN',
          status: 'ACTIVE'
        };
        return next();
      }
    }
    
    return res.status(403).json({ error: 'Partner access required' });
  } catch (error) {
    console.error('Partner check error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Create essential API routes

// Status route
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online',
    environment: 'production',
    version: '1.0.0',
    serverTime: new Date().toISOString()
  });
});

// Member count route - similar to the one in your original app
app.get('/api/stats/member-count', async (req, res) => {
  try {
    const count = 2931; // Default count
    const lastUpdated = new Date().toISOString();

    // Try to get from database if available
    if (pool) {
      try {
        const result = await pool.query('SELECT COUNT(*) FROM users');
        if (result.rows && result.rows.length > 0) {
          return res.json({
            count: parseInt(result.rows[0].count, 10),
            lastUpdated
          });
        }
      } catch (dbError) {
        console.error('Database error when fetching member count:', dbError);
      }
    }

    // Return default if DB query fails
    return res.json({ count, lastUpdated });
  } catch (error) {
    console.error('Error in member count API:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth routes
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    if (pool) {
      // Get user with the provided email
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows && result.rows.length > 0) {
        const user = result.rows[0];
        
        // Simple password check - replace with bcrypt in production
        // This is a simplified version for the deployment
        if (user.password === password) {
          // Create JWT token
          const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
          );
          
          // Return user data and token
          return res.json({
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              displayName: user.display_name,
              isAdmin: user.is_admin
            },
            token
          });
        }
      }
    }
    
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User route for getting the current user
app.get('/api/user', isAuthenticated, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    username: req.user.username,
    displayName: req.user.display_name,
    isAdmin: req.user.is_admin
  });
});

// Static file serving - important to serve the React app
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Serve files from "static" directory for direct static assets
app.use('/static', express.static(path.join(__dirname, 'static')));

// Serve temp directory files for video content
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// Handle React routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Return the React app for all other routes
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Initialize server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});