import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { restoreTokens } from "./lib/auth-simple";
import characterRouter from "./character-routes";
import { setupTranscriptionProxy } from "./transcription-proxy";
import transcriptionRoutes from "./transcription-route";
import videoEditRoutes from "./video-edit-routes";
import { logger } from "./logger";
import path from "path";
import cookieParser from "cookie-parser";
import { runAutomationScheduler } from "./lib/automated-call-service";
import automatedCallRouter from "./automated-call-routes";
import session from "express-session";
import { createReferralTrackingMiddleware, createConversionAttributionMiddleware } from "./middleware/referral-tracking";
import { storage } from "./storage";
// Security-related imports
import helmet from "helmet";
import csrf from "csurf";
import rateLimit from "express-rate-limit";
import xss from "xss-clean";
import hpp from "hpp";

const app = express();
app.use(express.json({ limit: '10mb' })); // Limit JSON body size
app.use(express.urlencoded({ extended: false, limit: '10mb' })); // Limit URL-encoded body size
app.use(cookieParser()); // Add cookie parser to handle JWT tokens in cookies

// Set up session middleware for tracking referrals
app.use(session({
  secret: process.env.SESSION_SECRET || 'warmleadnetwork-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true, // Prevents JavaScript access to cookies
    sameSite: 'lax' // Protects against CSRF attacks
  }
}));

// Use Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow inline scripts and styles for the UI frameworks
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://*'],
      connectSrc: ["'self'", 'https://*', 'wss://*', 'ws://*'],
      mediaSrc: ["'self'", 'https://*', 'blob:'],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding from other origins
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow resources from other origins
}));

// Prevent parameter pollution
app.use(hpp());

// Sanitize data against XSS (cross-site scripting)
app.use(xss());

// Apply rate limiting to API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit headers
  message: 'Too many requests from this IP, please try again later.'
});

// Apply stricter rate limiting to authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 10, // Limit each IP to 10 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts from this IP, please try again after 15 minutes.'
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Apply authentication rate limiting to login routes
app.use('/api/login', authLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/partner/login', authLimiter);

// Add referral tracking middleware (before static files)
app.use(createReferralTrackingMiddleware(storage));

// Redirect incorrect admin dashboard URL patterns
app.use('/your-domain.com/admin-dashboard-v2.html', (req, res) => {
  console.log('Redirecting from incorrect admin dashboard URL pattern');
  res.redirect('/admin-dashboard-fix.html');
});

// Admin Dashboard Security Middleware with IP Restriction
app.use('/admin-dashboard-v2.html', (req, res, next) => {
  // Get client IP
  const clientIP = req.ip || req.socket.remoteAddress || '';
  console.log(`Admin dashboard access attempt from IP: ${clientIP}`);
  
  // List of allowed IPs - add your production IP address here
  const allowedIPs = ['127.0.0.1', '::1', 'localhost', '172.31.128.58', '172.31.128.39', '178.138.32.194', '10.83.3.78', '10.83.9.32'];
  
  // Check if request includes Basic Auth
  const authHeader = req.headers.authorization;
  
  // If no auth header and IP not allowed, require authentication
  if (!authHeader && !allowedIPs.includes(clientIP)) {
    console.log(`Blocking admin access from unauthorized IP: ${clientIP}`);
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Access"');
    return res.status(401).send('Authentication required');
  }
  
  // If we have an auth header, validate credentials
  if (authHeader) {
    try {
      // Extract and decode credentials
      const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
      const [username, password] = auth.split(':');
      
      // Check credentials (use environment variables in production)
      if (username === 'admin' && password === 'admin2025secure') {
        console.log(`Admin authenticated successfully from IP: ${clientIP}`);
        return next();
      }
      
      // Special case for Replit testing/development
      if (username === 'replit' && password === 'testing') {
        console.log(`Replit testing access granted from IP: ${clientIP}`);
        return next();
      }
    } catch (error) {
      console.error('Error validating admin credentials:', error);
    }
    
    // Invalid credentials
    console.log(`Invalid admin credentials from IP: ${clientIP}`);
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Access"');
    return res.status(401).send('Invalid credentials');
  }
  
  // Allow access if IP is whitelisted (without credentials)
  if (allowedIPs.includes(clientIP)) {
    console.log(`Admin access granted to whitelisted IP: ${clientIP}`);
    return next();
  }
  
  // Default deny
  res.status(403).send('Access forbidden');
});

app.use(express.static(path.join(process.cwd(), "public")));

// Serve the temp directory for generated videos
app.use('/temp', express.static(path.join(process.cwd(), "temp")));

// Enable CORS for all routes using a very permissive approach
app.use((req, res, next) => {
  // Get the origin from the request or default to localhost
  const requestOrigin = req.headers.origin || 'http://localhost:5000';
  
  // Log the request origin for debugging
  console.log(`Request origin: ${requestOrigin}`);
  console.log(`Request path: ${req.path}`);
  console.log(`Request method: ${req.method}`);
  console.log(`Request headers:`, req.headers);
  
  // Check if we're in the production deployment
  const isProduction = process.env.REPL_SLUG === 'node-ninja-emilghelmeci';
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  
  // Always allow any origin in all environments to fix CORS issues
  res.header('Access-Control-Allow-Origin', '*');
  
  // Standard CORS headers with enhanced permissions
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
  res.header('Vary', 'Origin'); // Important for proxies to respect varying responses
  
  // Handle preflight requests with more detailed logging
  if (req.method === 'OPTIONS') {
    console.log(`Processing preflight request for path: ${req.path}`);
    return res.sendStatus(200);
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Restore authentication tokens from previous sessions
  await restoreTokens();

  // Setup CSRF protection for routes that change state
  // This needs to be after session middleware
  const csrfProtection = csrf({ cookie: true });
  
  // Define paths that should be exempt from CSRF protection (such as webhooks, API tokens)
  const csrfExemptPaths = [
    '/api/webhook',
    '/api/transcription/webhook',
    '/api/external/',
    '/api/public/',
    '/api/open-auth'
  ];
  
  // Custom middleware to apply CSRF protection selectively
  app.use((req, res, next) => {
    // Skip CSRF for exempt paths or for non-state-changing methods
    const isExemptPath = csrfExemptPaths.some(path => req.path.startsWith(path));
    const isReadOnlyMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    
    if (isExemptPath || isReadOnlyMethod) {
      return next();
    }
    
    // Apply CSRF protection
    return csrfProtection(req, res, next);
  });
  
  // Add CSRF token route for the frontend
  app.get('/api/csrf-token', csrfProtection, (req: Express.Request, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // Register character redirects before API routes
  app.use(characterRouter);
  
  // Register our direct transcription routes
  app.use(transcriptionRoutes);
  
  // NOTE: Disabled Cloudinary video editing routes until proper credentials are provided
  // app.use('/api/video-edit', videoEditRoutes);
  
  // Setup the transcription service proxy
  setupTranscriptionProxy(app);
  
  // Register automated call routes
  app.use('/api/automated-calls', automatedCallRouter);
  
  // Setup direct admin access for emergency admin access
  import('./direct-admin-access.js').then(module => {
    module.setupDirectAdminAccess(app);
  }).catch(error => {
    console.error('Error setting up direct admin access:', error);
  });
  
  // Setup admin dashboard API for comprehensive admin functionality
  import('./admin-dashboard-api').then(module => {
    app.use('/api/admin', module.default);
    console.log('Admin dashboard API routes registered');
  }).catch(error => {
    console.error('Error setting up admin dashboard API:', error);
  });
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the automated call scheduler
    log(`Starting automated call scheduler`);
    // Initial run
    setTimeout(async () => {
      try {
        await runAutomationScheduler();
      } catch (error) {
        console.error('Error running initial automation scheduler:', error);
      }
    }, 10000); // Wait 10 seconds after server start
    
    // Set up regular interval (every 5 minutes)
    setInterval(async () => {
      try {
        await runAutomationScheduler();
      } catch (error) {
        console.error('Error running scheduled automation:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
  });
})();
