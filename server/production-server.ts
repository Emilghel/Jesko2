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
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Enable trust proxy for Render's proxy setup
app.set('trust proxy', 1);

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

// Import core route modules
import stripeRouter from "./stripe-routes";
import partnerRoutes from "./partner-routes";
import { createReferralTrackingMiddleware, createConversionAttributionMiddleware } from "./middleware/referral-tracking";
import { storage } from "./storage";
import adminDashboardApiRoutes from "./admin-dashboard-api";
import { setupGoogleAuth } from "./google-auth";
import { v4 as uuidv4 } from "uuid";

// Create the middleware for tracking referrals and conversions
const referralTracking = createReferralTrackingMiddleware(storage);
const conversionAttribution = createConversionAttributionMiddleware(storage);

// Basic API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.5.0',
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

// Add referral tracking middleware
app.use(referralTracking);

// Authentication/API registration routes
try {
  setupGoogleAuth(app);
} catch (error) {
  console.error("Failed to setup Google Auth:", error);
}

// User authentication routes
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const newUser = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      displayName: username,
      createdAt: new Date(),
      lastLogin: new Date(),
      coins: 0,
      isAdmin: false
    });

    // Create token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        coins: newUser.coins,
        isAdmin: newUser.isAdmin
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '30d' }
    );
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        coins: user.coins,
        is_admin: user.is_admin
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Middleware to protect routes
const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { id: number, email: string };
      
      // Get user from the token
      const user = await storage.getUser(decoded.id);
      if (user) {
        req.user = user;
        next();
      } else {
        res.status(401).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ error: 'Not authorized' });
    }
  } else {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};

// Partner dashboard routes
app.use('/api/partner', partnerRoutes);

// Admin dashboard API routes
app.use('/api/admin', adminDashboardApiRoutes);

// Stripe payment routes
app.use('/api/stripe', stripeRouter);

// User-specific endpoints
app.get('/api/user/profile', protect, async (req, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      coins: user.coins,
      is_admin: user.is_admin,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user coin balance
app.get('/api/user/coins', protect, async (req, res) => {
  try {
    const coins = await storage.getUserCoins(req.user.id);
    res.json({ coins });
  } catch (error) {
    console.error('Error fetching user coins:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get transaction history
app.get('/api/user/transactions', protect, async (req, res) => {
  try {
    const transactions = await storage.getCoinTransactions(req.user.id);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User agent routes
app.get('/api/user/agents', protect, async (req, res) => {
  try {
    const agents = await storage.getUserAgents(req.user.id);
    res.json(agents);
  } catch (error) {
    console.error('Error fetching user agents:', error);
    res.status(500).json({ error: 'Server error' });
  }
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