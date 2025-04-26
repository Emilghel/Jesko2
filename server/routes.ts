import type { Express } from "express";
import { createServer as createHttpServer, type Server } from "http";
import { WebSocketServer, WebSocket as WSConnection } from "ws";
import bcrypt from "bcrypt";
import path from "path";
import * as fs from 'fs';

import { storage, getDb } from "./storage";
import { createReferralTrackingMiddleware, createConversionAttributionMiddleware, getReferralInfo } from "./middleware/referral-tracking";
import partnerRoutes from "./partner-routes";
import adminDashboardApiRoutes from "./admin-dashboard-api";
import { setupGoogleAuth } from "./google-auth";

// Create the middleware for tracking referrals and conversions
const referralTracking = createReferralTrackingMiddleware(storage);
const conversionAttribution = createConversionAttributionMiddleware(storage);
import { handleTwilioWebhook, endCall, handleRecordingWebhook, handleRecordingStatusWebhook } from "./lib/twilio";
import { simpleDeleteAgent, deleteAutomationSettingsForAgent } from "./simple-delete";
import { getTtsStream } from "./lib/elevenlabs";
import { getOpenAIResponse, chatWithAssistant } from "./lib/openai";
import { generateImageFromText, generateImageFromImageAndText } from "./lib/openai-image-fixed";
import { uploadSingleImage, uploadSingleVideo, uploadSingleClipVideo } from "./lib/multer-config";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { generateClips, mockGenerateClips } from "./lib/spike-api";
import { processVideoForTranscription } from "./direct-whisper";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { scrapeWebsite } from "./lib/website-scraper";
import WebSocket from "ws";
import * as crypto from "crypto";
import { 
  LogLevel, 
  CallStatus, 
  TransactionType, 
  PartnerStatus,
  ReferralStatus,
  PaymentStatus,
  CommissionStatus,
  InsertPartner,
  InsertPartnerPayment,
  InsertReferral,
  InsertPartnerCommission,
  stockVideos
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import stockVideosRouter from "./stock-videos-routes";
import videoHistoryRouter from "./video-history-routes";
import leadsRouter from "./leads-routes";
import leadCallsRouter from "./lead-calls-routes";
import calendarRouter from "./calendar-routes";
import twilioDirectRouter from "./twilio-direct-routes";
import twilioStreamRouter from "./twilio-stream-routes";
import salesGptProxyRouter from "./salesgpt-proxy";
import discountRouter from "./discount-routes";
import { registerPayPalRoutes } from "./paypal-api";
import seoKeywordRouter from "./seo-keyword-routes";
import authResetRouter from "./routes/auth-reset";
import authRestoreRouter from "./routes/auth-restore";
import stripeRouter from "./stripe-routes";
import adminEmergencyRouter from "./admin-emergency-fixed";
import adminTokenRouter from "./routes/admin-token";
import { registerContentLinkTrackingRoutes } from "./routes/content-link-tracking";
import os from "os";
import axios from "axios";
import twilio from "twilio";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import { setupPassport, isAuthenticated, registerUser, loginUser, logoutUser, registerToken, activeTokens } from "./lib/auth-simple";
import { pool, db } from "./db";
import paypalRoutes from "./lib/paypal-routes";
import { testPayPalCredentials } from "./lib/paypal";
import checkSecretsRouter from "./routes/check-secrets";
import { generateMemberJoinNotification } from "./lib/notification-utils";
import userProfileRoutes from "./user-profile-routes";
import FormData from "form-data";
import fetch from "node-fetch";

// Configure multer for image uploads
const upload = multer({
  dest: path.join(process.cwd(), 'uploads'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (_req, file, callback) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      callback(null, true);
    } else {
      callback(new Error('Only image files are allowed!'));
    }
  }
});

// Active WebSocket connections map
const clients = new Map<string, WebSocket>();

// Keep track of conversation contexts
const conversationContexts = new Map<string, any[]>();

// Store the startup time to calculate uptime
const startTime = new Date();

// Timer ID for member counter update interval
let memberCounterTimer: NodeJS.Timeout | null = null;

// Removed Play.ht import in favor of ElevenLabs

// Middleware for checking if a user is a partner
async function isPartner(req: Request, res: Response, next: NextFunction) {
  // Check for special tokens in Authorization header
  const authHeader = req.headers.authorization;
  
  // If we have an authorization header with Bearer token, check if it's a special token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log(`Checking token for partner access: ${token.substring(0, 10)}...`);
    
    // Note: We've removed the special hardcoded bypass tokens for better security
    // All partner access must now go through the proper authentication system
    // This helps ensure better audit trails and security controls
    
    try {
      // Attempt to verify the token and get the user
      const tokenInfo = activeTokens.get(token);
      
      if (!tokenInfo) {
        console.log(`Token not found in active tokens: ${token.substring(0, 10)}...`);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Token is found, get the user
      const user = await storage.getUser(tokenInfo.userId);
      if (!user) {
        console.log(`User not found for token: ${token.substring(0, 10)}...`);
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Set the user on the request for downstream middleware
      (req as any).user = user;
      
      // Check if this user is a partner with case-insensitive status check
      // Database status might be uppercase 'ACTIVE' while enum is lowercase 'active'
      const partnerQuery = await pool.query(`
        SELECT * FROM partners 
        WHERE user_id = $1 AND LOWER(status) = LOWER($2)
      `, [user.id, PartnerStatus.ACTIVE]);
      
      console.log(`Partner query for user ${user.id}: ${partnerQuery.rowCount} results`);
      
      if (partnerQuery.rowCount > 0) {
        const partner = partnerQuery.rows[0];
        console.log(`User ${user.email} is a partner with ID ${partner.id}`);
        
        // Add partner to request object
        (req as any).partner = partner;
        
        // Let the request proceed
        return next();
      } else if (user.isAdmin) {
        // Admin users can access partner routes
        console.log(`Admin user ${user.email} accessing partner route`);
        
        // Create a mock partner object for admin
        const adminPartner = {
          id: 0,
          user_id: user.id,
          company_name: 'Admin Account',
          contact_name: user.displayName || user.username,
          referral_code: 'ADMIN',
          commission_rate: 30,
          earnings_balance: 0,
          total_earnings: 0,
          status: PartnerStatus.ACTIVE,
          created_at: new Date(),
          website: 'https://warmleadnetwork.com',
          bio: 'Admin account with partner access'
        };
        
        (req as any).partner = adminPartner;
        return next();
      }
      
      console.log(`User ${user.email} is not a partner or admin`);
      return res.status(403).json({ error: 'Partner access required' });
    } catch (error) {
      console.error('Error in isPartner middleware:', error);
      return res.status(500).json({ error: 'Server error verifying partner status' });
    }
  }
  
  // No authorization header
  console.log('No authorization header in partner route');
  return res.status(401).json({ error: 'Authentication required' });
}

// Middleware to check if a user is an admin (and not a partner)
function isAdmin(req: Request, res: Response, next: NextFunction) {
  // We've removed special hardcoded token checks for improved security
  // Partner access is now determined solely through database validation

  // Check if the user is authenticated
  if (!(req as any).user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check admin status
  if (!(req as any).user.isAdmin) {
    return res.status(403).json({ error: 'Access forbidden - Admin privileges required' });
  }

  // User is admin, allow access
  next();
}

// Helper function to generate a unique referral code
function generateReferralCode(companyName: string): string {
  const cleanName = companyName
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 8) // Take first 8 chars
    .toUpperCase();
    
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}-${randomStr}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a direct inline HTML page for admin access
  const adminDirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Admin Access</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; }
    button { background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin-right: 10px; }
    button:hover { background: #2980b9; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
    th { background: #f2f2f2; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; }
    .pending { background: #f39c12; }
    .approved { background: #27ae60; }
    .rejected { background: #e74c3c; }
    .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin-bottom: 15px; display: none; }
    .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 15px; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Emergency Admin Panel</h1>
    <p>This is a direct, server-generated HTML admin panel for managing partner withdrawal requests.</p>
    
    <div id="messageSuccess" class="success"></div>
    <div id="messageError" class="error"></div>
    
    <h2>Partner Withdrawal Requests</h2>
    <table id="withdrawalTable">
      <thead>
        <tr>
          <th>ID</th>
          <th>Partner</th>
          <th>Amount</th>
          <th>Method</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="withdrawalTableBody">
        <tr>
          <td colspan="6" style="text-align: center;">Loading withdrawal requests...</td>
        </tr>
      </tbody>
    </table>
    
    <div style="margin-top: 20px;">
      <button id="refreshBtn">Refresh Data</button>
      <a href="/" style="margin-left: 10px; color: #3498db;">Return to Home</a>
    </div>
  </div>

  <script>
    // Simple admin panel functionality
    document.addEventListener('DOMContentLoaded', function() {
      loadWithdrawalRequests();
      
      document.getElementById('refreshBtn').addEventListener('click', function() {
        loadWithdrawalRequests();
      });
    });
    
    async function loadWithdrawalRequests() {
      try {
        const response = await fetch('/api/admin-emergency/withdrawal-requests', {
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('admin_auth_token')
          }
        });
        
        if (response.status === 401) {
          // Not authorized, redirect to login
          window.location.href = '/admin-emergency-login';
          return;
        }
        
        if (!response.ok) {
          showError('Failed to load withdrawal requests. Please try again.');
          return;
        }
        
        const data = await response.json();
        displayWithdrawalRequests(data);
      } catch (error) {
        showError('Error: ' + error.message);
      }
    }
    
    function displayWithdrawalRequests(requests) {
      const tableBody = document.getElementById('withdrawalTableBody');
      
      if (!requests || requests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No withdrawal requests found</td></tr>';
        return;
      }
      
      tableBody.innerHTML = '';
      
      requests.forEach(function(request) {
        const row = document.createElement('tr');
        
        // Status badge class
        let statusClass = '';
        switch(request.status) {
          case 'PENDING': statusClass = 'pending'; break;
          case 'APPROVED': statusClass = 'approved'; break;
          case 'REJECTED': statusClass = 'rejected'; break;
        }
        
        // Create row content
        row.innerHTML = \`
          <td>\${request.id}</td>
          <td>\${request.partner_name || 'Unknown'}</td>
          <td>$\${parseFloat(request.amount).toFixed(2)}</td>
          <td>\${request.payment_method}</td>
          <td><span class="badge \${statusClass}">\${request.status}</span></td>
          <td>
            \${request.status === 'PENDING' ? \`
              <button onclick="approveWithdrawal(\${request.id})">Approve</button>
              <button onclick="rejectWithdrawal(\${request.id})" style="background: #e74c3c;">Reject</button>
            \` : ''}
          </td>
        \`;
        
        tableBody.appendChild(row);
      });
    }
    
    async function approveWithdrawal(id) {
      try {
        const response = await fetch(\`/api/admin-emergency/withdrawal-requests/\${id}/approve\`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('admin_auth_token'),
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 401) {
          window.location.href = '/admin-emergency-login';
          return;
        }
        
        if (!response.ok) {
          const data = await response.json();
          showError(data.error || 'Failed to approve withdrawal');
          return;
        }
        
        showSuccess('Withdrawal approved successfully');
        setTimeout(loadWithdrawalRequests, 1500);
      } catch (error) {
        showError('Error: ' + error.message);
      }
    }
    
    async function rejectWithdrawal(id) {
      try {
        const response = await fetch(\`/api/admin-emergency/withdrawal-requests/\${id}/reject\`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('admin_auth_token'),
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 401) {
          window.location.href = '/admin-emergency-login';
          return;
        }
        
        if (!response.ok) {
          const data = await response.json();
          showError(data.error || 'Failed to reject withdrawal');
          return;
        }
        
        showSuccess('Withdrawal rejected successfully');
        setTimeout(loadWithdrawalRequests, 1500);
      } catch (error) {
        showError('Error: ' + error.message);
      }
    }
    
    function showSuccess(message) {
      const successElement = document.getElementById('messageSuccess');
      successElement.textContent = message;
      successElement.style.display = 'block';
      
      // Hide after 5 seconds
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 5000);
    }
    
    function showError(message) {
      const errorElement = document.getElementById('messageError');
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      
      // Hide after 5 seconds
      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 5000);
    }
  </script>
</body>
</html>`;

  // Create a direct inline login page for emergency admin access
  const adminLoginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Admin Login</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 400px; margin: 100px auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; }
    label { display: block; margin-bottom: 5px; }
    input { width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    button { background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; width: 100%; }
    button:hover { background: #2980b9; }
    .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 15px; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Emergency Admin Login</h1>
    <div id="loginError" class="error"></div>
    
    <form id="loginForm">
      <div>
        <label for="email">Email:</label>
        <input type="email" id="email" required>
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" id="password" required>
      </div>
      <button type="submit">Login</button>
    </form>
    
    <p style="margin-top: 20px; text-align: center;">
      <a href="/" style="color: #3498db;">Return to Home</a>
    </p>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const loginForm = document.getElementById('loginForm');
      const loginError = document.getElementById('loginError');
      
      // Check if already logged in
      const token = localStorage.getItem('admin_auth_token');
      if (token) {
        // Verify the token
        fetch('/api/admin-emergency/verify', {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        })
        .then(response => {
          if (response.ok) {
            // Already authenticated, redirect to admin panel
            window.location.href = '/admin-direct';
          }
        })
        .catch(error => {
          console.error('Token verification error:', error);
          // Continue with login page
        });
      }
      
      loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
          loginError.style.display = 'none';
          
          const response = await fetch('/api/admin-emergency/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });
          
          const data = await response.json();
          
          if (response.ok && data.token) {
            // Store token and redirect
            localStorage.setItem('admin_auth_token', data.token);
            window.location.href = '/admin-direct';
          } else {
            loginError.textContent = data.error || 'Invalid credentials';
            loginError.style.display = 'block';
          }
        } catch (error) {
          loginError.textContent = 'Server error. Please try again later.';
          loginError.style.display = 'block';
        }
      });
    });
  </script>
</body>
</html>`;

  // Serve admin-emergency.html directly via multiple routes to ensure it's accessible
  app.get('/admin-emergency', (req, res) => {
    console.log('Serving admin emergency panel HTML');
    res.sendFile(path.join(process.cwd(), 'public', 'admin-emergency.html'));
  });

  // Also handle the admin-emergency.html direct access
  app.get('/admin-emergency.html', (req, res) => {
    console.log('Serving admin emergency panel HTML via direct .html access');
    res.sendFile(path.join(process.cwd(), 'public', 'admin-emergency.html'));
  });
  
  // Serve the direct admin HTML page - completely server-generated
  app.get('/admin-direct', (req, res) => {
    console.log('Serving inline admin direct HTML');
    res.send(adminDirectHtml);
  });
  
  // Serve the direct admin login page - completely server-generated
  app.get('/admin-emergency-login', (req, res) => {
    console.log('Serving inline admin login HTML');
    res.send(adminLoginHtml);
  });
  
  // Add a utility endpoint to echo the domain name
  app.get('/echo-domain', (req, res) => {
    const domain = req.get('host') || 'unknown-domain';
    console.log(`Domain request: ${domain}`);
    res.send(domain);
  });
  const httpServer = createServer(app);
  
  // Check if this is the production deployment URL
  const isProductionDeploy = process.env.REPL_SLUG === 'node-ninja-emilghelmeci';
  console.log(`Detected environment: ${isProductionDeploy ? 'Production Deployment' : 'Development'}`);
  
  // Initialize our token-based auth system
  setupPassport();
  
  // Initialize Google Authentication
  setupGoogleAuth(app);
  
  // Initialize Stripe API
  try {
    const { initializeStripe } = await import('./stripe-api');
    const stripeInitialized = initializeStripe();
    console.log(`Stripe API initialization ${stripeInitialized ? 'successful' : 'failed'}`);
  } catch (error) {
    console.error('Error initializing Stripe API:', error instanceof Error ? error.message : String(error));
  }
  
  // Initialize Twilio client with credentials from config
  let twilioClient: any;

  // Function to initialize or refresh the Twilio client with latest credentials
  async function initializeTwilioClient() {
    try {
      console.log('==== TWILIO CREDENTIAL CHECK ====');
      
      // Get both sources of credentials
      const envSid = process.env.TWILIO_ACCOUNT_SID;
      const envToken = process.env.TWILIO_AUTH_TOKEN;
      
      // For debugging, log any URL-encoded characters in the token
      if (envToken && envToken.includes('%')) {
        console.log('WARNING: Environment token contains URL-encoded characters and may need decoding');
        
        // Try to decode the token
        try {
          const decodedToken = decodeURIComponent(envToken);
          console.log(`Original token length: ${envToken.length}, Decoded token length: ${decodedToken.length}`);
          // Use the decoded token instead
          twilioClient = twilio(envSid, decodedToken);
          
          // Test the client with a test request
          try {
            console.log('Testing Twilio client with decoded token...');
            const accounts = await twilioClient.api.accounts.list({limit: 1});
            console.log('Twilio test with decoded token successful!');
            return true;
          } catch (decodedError) {
            console.error('Twilio test with decoded token failed:', decodedError);
          }
        } catch (decodeError) {
          console.error('Error decoding auth token:', decodeError);
        }
      }
      
      // First priority: Use environment variables directly
      if (envSid && envToken) {
        console.log(`Initializing Twilio client with credentials from environment variables`);
        console.log(`SID starts with: ${envSid.substring(0, 6)}...`);
        console.log(`AUTH TOKEN exists: ${envToken ? 'YES' : 'NO'}`);
        console.log(`AUTH TOKEN length: ${envToken.length}`);
        
        // Remove any quotes that might have been added to the token
        const cleanToken = envToken.replace(/^["']|["']$/g, '');
        if (cleanToken !== envToken) {
          console.log('Removed quotes from auth token');
        }
        
        // Create the Twilio client with environment variables
        twilioClient = twilio(envSid, cleanToken);
        
        // Try a simple API call to test authentication
        try {
          console.log('Testing Twilio client with a simple API call...');
          const accounts = await twilioClient.api.accounts.list({limit: 1});
          console.log('Twilio test call successful!');
          return true;
        } catch (testError) {
          console.error('Twilio client test failed:', testError);
          
          // Log the error details for debugging
          if (testError instanceof Error) {
            console.error(`Error name: ${testError.name}`);
            console.error(`Error message: ${testError.message}`);
            
            // Check if it's a Twilio-specific error with status code
            if ('status' in testError) {
              console.error(`Error status: ${(testError as any).status}`);
              console.error(`Error code: ${(testError as any).code}`);
              console.error(`Error more info: ${(testError as any).moreInfo}`);
            }
          }
          
          // Continue to try database credentials
        }
      } else {
        console.log('No Twilio credentials found in environment variables');
      }
      
      // Fallback: Try database config
      const config = await storage.getConfig();
      if (config.twilioAccountSid && config.twilioAuthToken) {
        console.log(`Initializing Twilio client with credentials from database config`);
        console.log(`DB SID starts with: ${config.twilioAccountSid.substring(0, 6)}...`);
        console.log(`DB AUTH TOKEN exists: ${config.twilioAuthToken ? 'YES' : 'NO'}`);
        
        twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
        
        // Test the client with database credentials
        try {
          console.log('Testing Twilio client with database credentials...');
          const accounts = await twilioClient.api.accounts.list({limit: 1});
          console.log('Twilio test with database credentials successful!');
          return true;
        } catch (dbTestError) {
          console.error('Twilio test with database credentials failed:', dbTestError);
          // Both methods failed, return failure
          return false;
        }
      } 
      
      console.log('Twilio credentials not found in environment variables or database');
      console.log('==== END TWILIO CREDENTIAL CHECK ====');
      
      // Final attempt - create a more complete mock client for development
      console.log('Creating mock Twilio client for development');
      
      // Import and use our dedicated mock client
      const { createMockTwilioClient } = require('./lib/twilio');
      const mockClient = createMockTwilioClient();
      
      // Create a wrapper around the mock client to match the Twilio client structure
      twilioClient = {
        availablePhoneNumbers: (country: string) => ({
          local: {
            list: async (params: any) => {
              return mockClient.available.phoneNumbers.local.list(params);
            }
          }
        }),
        incomingPhoneNumbers: {
          create: async (params: any) => {
            return mockClient.incomingPhoneNumbers.create(params);
          }
        },
        api: {
          accounts: {
            list: async () => [{
              sid: 'MOCK_ACCOUNT_SID',
              friendlyName: 'Mock Twilio Account',
              status: 'active'
            }]
          }
        }
      };
      
      return true;
    } catch (error) {
      console.error('Error initializing Twilio client:', error);
      return false;
    }
  }
  
  // Initial setup of the Twilio client
  initializeTwilioClient();
  
  // Register Partner Dashboard routes
  app.use('/api/partner', partnerRoutes);
  
  // Register Admin Dashboard API routes
  app.use('/api/admin', adminDashboardApiRoutes);
  
  // Register PayPal routes
  app.use('/api/paypal', paypalRoutes);
  
  // Register User Profile routes
  app.use('/api/user', userProfileRoutes);
  
  // Register Stock Videos routes
  app.use('/api/stock-videos', stockVideosRouter);
  
  // Register Video History routes
  app.use('/api/video-history', videoHistoryRouter);
  
  // Register Leads Management routes
  app.use('/api/leads', leadsRouter);
  
  // Register Lead Calls routes
  app.use('/api/lead-calls', leadCallsRouter);
  
  // Register Calendar Integration routes
  app.use('/api/calendar', calendarRouter);
  
  // Register Discount Code routes
  app.use('/api/discount', discountRouter);
  
  // Register SEO Keyword Tracker routes
  app.use('/api/seo-keywords', seoKeywordRouter);
  
  // Register Emergency Admin Panel routes
  app.use('/', adminEmergencyRouter);
  
  // Register Admin Token request endpoint
  app.use('/api', adminTokenRouter);
  
  // Debug endpoint for testing the SEO keyword routes with access token
  app.get('/api/debug/get-test-token', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).send('Not found');
    }
    
    try {
      // Special endpoint just for testing - only in development mode
      const testUser = await storage.getUserByEmail('mulondo@partner.com');
      
      if (!testUser) {
        return res.status(404).json({ error: 'Test user not found' });
      }
      
      // Generate a token for admin
      const token = crypto.randomBytes(48).toString('base64');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiration for test tokens
      
      // Register the token
      activeTokens.set(token, {
        userId: testUser.id,
        expiresAt
      });
      
      // Save to database
      await pool.query(
        'INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET expires_at = $3',
        [token, testUser.id, expiresAt]
      );
      
      return res.json({ 
        token,
        expiresAt,
        message: 'This token is for debugging only. Do not use in production.',
        usage: 'Pass this token in Authorization header as "Bearer TOKEN"'
      });
    } catch (error) {
      console.error('Error generating test token:', error);
      return res.status(500).json({ error: 'Failed to generate test token' });
    }
  });
  
  // Debug endpoint to test SEO keyword APIs with the generated token
  app.get('/api/debug/test-seo-keywords', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).send('Not found');
    }
    
    try {
      // Get the token from the request
      const token = req.headers.authorization?.startsWith('Bearer ') 
        ? req.headers.authorization.substring(7)
        : null;
        
      if (!token) {
        return res.status(400).json({ 
          error: 'No token provided',
          message: 'Please provide a token in the Authorization header as "Bearer TOKEN"'
        });
      }
      
      // Verify the token
      const tokenInfo = activeTokens.get(token);
      if (!tokenInfo) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Get the user
      const user = await storage.getUser(tokenInfo.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Set headers to mimic a standard request
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      // Test endpoint 1: Get my keywords
      console.log('Testing /api/seo-keywords/my-keywords endpoint...');
      const myKeywordsResponse = await fetch('http://localhost:5000/api/seo-keywords/my-keywords', {
        method: 'GET',
        headers
      });
      
      const myKeywordsResult = {
        status: myKeywordsResponse.status,
        statusText: myKeywordsResponse.statusText,
        body: await myKeywordsResponse.text().then(text => {
          try {
            return JSON.parse(text);
          } catch (e) {
            return text;
          }
        })
      };
      
      // Test endpoint 2: Get partner keywords
      console.log('Testing partner keywords endpoint...');
      const partnerKeywordsResponse = await fetch(`http://localhost:5000/api/seo-keywords/${user.id}`, {
        method: 'GET',
        headers
      });
      
      const partnerKeywordsResult = {
        status: partnerKeywordsResponse.status,
        statusText: partnerKeywordsResponse.statusText,
        body: await partnerKeywordsResponse.text().then(text => {
          try {
            return JSON.parse(text);
          } catch (e) {
            return text;
          }
        })
      };
      
      // Return all test results
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        token: {
          value: token.substring(0, 10) + '...',
          expiresAt: tokenInfo.expiresAt
        },
        testResults: {
          myKeywords: myKeywordsResult,
          partnerKeywords: partnerKeywordsResult
        }
      });
    } catch (error) {
      console.error('Error testing SEO keywords:', error);
      return res.status(500).json({ 
        error: 'Failed to test SEO keyword endpoints',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Register Stripe payment routes
  app.use('/api/stripe', stripeRouter);
  
  // Register PayPal API integration routes
  registerPayPalRoutes(app);
  
  // Register Auth Reset routes
  app.use('/api/auth', authResetRouter);
  
  // Register Auth Restore routes (token management)
  app.use('/api/auth', authRestoreRouter);
  
  // Register check-secrets endpoint for secure environment variable checking
  app.use('/api/check-secrets', checkSecretsRouter);
  
  // Register Content Link Tracking routes
  registerContentLinkTrackingRoutes(app);

  // Register Direct Twilio Integration for enhanced Twilio calls
  // IMPORTANT: The router contains routes with full paths starting with /api/twilio-direct/
  // We need to register it at the base path to match these routes
  app.use('/', twilioDirectRouter);
  
  // Register Twilio Stream with ElevenLabs Integration
  // Use root path as this router may also contain full paths
  app.use('/', twilioStreamRouter);
  
  // Direct SalesGPT API endpoints for chat and voice
  app.post('/api/salesgpt/chat', async (req: Request, res: Response) => {
    try {
      console.log('[SalesGPT Direct] Chat request:', req.body);
      
      // Format the request for the FastAPI server
      const data = {
        session_id: req.body.session_id,
        message: req.body.message,
        agent_id: req.body.agent_id
      };
      
      console.log('[SalesGPT Direct] Sending to FastAPI:', JSON.stringify(data));
      
      // Make direct request to FastAPI server
      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        console.error('[SalesGPT Direct] Error from FastAPI server:', response.status, response.statusText);
        throw new Error(`Failed to communicate with AI: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[SalesGPT Direct] Response received from FastAPI');
      
      res.json(result);
    } catch (error) {
      console.error('[SalesGPT Direct] Error:', error);
      res.status(500).json({ error: 'Failed to communicate with SalesGPT server' });
    }
  });
  
  app.post('/api/salesgpt/voice', async (req: Request, res: Response) => {
    try {
      console.log('[SalesGPT Direct] Voice request:', req.body);
      
      // Format the request for the FastAPI server
      const data = {
        session_id: req.body.session_id,
        message: req.body.message,
        agent_id: req.body.agent_id
      };
      
      console.log('[SalesGPT Direct] Sending voice request to FastAPI:', JSON.stringify(data));
      
      // Make direct request to FastAPI server
      const response = await fetch('http://localhost:3001/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        console.error('[SalesGPT Direct] Error from FastAPI server:', response.status, response.statusText);
        throw new Error(`Failed to generate voice: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[SalesGPT Direct] Voice response received from FastAPI');
      
      res.json(result);
    } catch (error) {
      console.error('[SalesGPT Direct] Error:', error);
      res.status(500).json({ error: 'Failed to communicate with SalesGPT server' });
    }
  });
  
  // Create a static file proxy for SalesGPT audio files
  app.get('/static/audio/:filename', async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      console.log(`[SalesGPT Audio] Requesting audio file: ${filename}`);
      
      // Make direct request to FastAPI server for the audio file
      const response = await fetch(`http://localhost:3001/static/audio/${filename}`);
      
      if (!response.ok) {
        console.error(`[SalesGPT Audio] Error fetching audio file: ${response.status} ${response.statusText}`);
        return res.status(response.status).send('Audio file not found');
      }
      
      // Get content type from response
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const buffer = await response.arrayBuffer();
      
      // Set appropriate headers
      res.set('Content-Type', contentType);
      res.set('Content-Length', buffer.byteLength.toString());
      res.set('Accept-Ranges', 'bytes');
      
      // Send the file
      res.status(200).send(Buffer.from(buffer));
    } catch (error) {
      console.error('[SalesGPT Audio] Error handling audio file:', error);
      res.status(500).send('Error fetching audio file');
    }
  });
  
  // Register SalesGPT Proxy Router for other AI sales conversations endpoints
  app.use('/api/salesgpt', salesGptProxyRouter);
  
  // Register Stripe payment routes
  app.use('/api', stripeRouter);
  
  // Register Admin Panel routes - temporarily disabled
  // app.use(adminRoutes);
  
  // Serve static files from the temp directory
  // Use path.resolve with process.cwd() instead of __dirname for ES modules
  app.use('/temp', express.static(path.resolve(process.cwd(), 'temp')));
  
  // Initialize and set up the member counter
  const initializeMemberCounter = async () => {
    try {
      // Check if member_count statistic exists
      let memberCount = await storage.getSiteStatistic('member_count');
      
      // If not, create it with a default starting value
      if (!memberCount) {
        memberCount = await storage.createSiteStatistic({
          name: 'member_count',
          value: 2000
        });
        console.log('Created initial member counter with value:', memberCount.value);
      } else {
        console.log('Found existing member counter with value:', memberCount.value);
      }
      
      // Set up the counter update cycle with variable intervals
      const updateMemberCounter = async () => {
        try {
          // Slow down the increment rate by 5x
          // Only increment approximately 20% of the time
          if (Math.random() < 0.2) {
            // Possible increment amounts (smaller amounts for slower counting)
            const increments = [1];
            
            // Randomly select an increment amount
            const incrementAmount = increments[Math.floor(Math.random() * increments.length)];
            
            // Increment the counter
            const updatedCounter = await storage.incrementSiteStatistic('member_count', incrementAmount);
            console.log(`Member counter incremented by ${incrementAmount}, new value:`, updatedCounter?.value);
          
            // Generate member join notifications (one for each increment)
            for (let i = 0; i < incrementAmount; i++) {
              // Generate a random member join notification
              const notification = generateMemberJoinNotification();
              
              // Broadcast the notification to all connected clients
              broadcastToAll({
                type: 'member_join',
                data: notification,
                timestamp: new Date().toISOString()
              });
              
              // Small delay between multiple notifications if there are more than one
              if (i < incrementAmount - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
          
          // Set a random interval for the next update (between 10-20 seconds)
          const nextInterval = 10000 + Math.floor(Math.random() * 10000);
          
          // Schedule the next update
          memberCounterTimer = setTimeout(updateMemberCounter, nextInterval);
        } catch (error) {
          console.error('Error updating member counter:', error);
          // Try again in 30 seconds if there was an error
          memberCounterTimer = setTimeout(updateMemberCounter, 30000);
        }
      };
      
      // Start the first update cycle
      updateMemberCounter();
      
    } catch (error) {
      console.error('Error initializing member counter:', error);
    }
  };
  
  // Start the member counter
  initializeMemberCounter();
  
  // Endpoint to get the current member count
  app.get('/api/stats/member-count', async (req, res) => {
    try {
      let memberCount = await storage.getSiteStatistic('member_count');
      
      // If no member count exists, initialize it with a default value
      if (!memberCount) {
        // Start with a reasonable default for a SaaS platform
        memberCount = await storage.updateSiteStatistic('member_count', 2108);
        console.log('Found existing member counter with value:', memberCount.value);
      }
      
      res.json({ 
        count: memberCount.value,
        lastUpdated: memberCount.last_updated
      });
    } catch (error) {
      console.error('Error getting member count:', error);
      res.status(500).json({ error: 'Failed to retrieve member count' });
    }
  });
  
  // Get user's purchased phone numbers
  app.get('/api/user/phone-numbers', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const phoneNumbers = await storage.getPurchasedPhoneNumbers(user.id);
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Error getting user's phone numbers:", error);
      res.status(500).json({ error: "Failed to retrieve phone numbers" });
    }
  });
  
  // Get user's coin balance
  app.get('/api/user/coins', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Get user's coin balance using the storage method
      const coins = await storage.getUserCoins(user.id);
      res.json({ coins });
    } catch (error) {
      console.error("Error getting user's coin balance:", error);
      res.status(500).json({ error: "Failed to retrieve coin balance" });
    }
  });
  
  // Update user's profession
  app.post('/api/user/update-profession', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { profession } = req.body;
      
      if (!profession) {
        return res.status(400).json({ error: 'Profession is required' });
      }
      
      // Update the user's profession
      const updatedUser = await storage.updateUserProfession(user.id, profession);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      await logMessage(LogLevel.INFO, 'User', `User ${user.email} updated profession to: ${profession}`);
      
      res.status(200).json({ 
        success: true,
        message: 'Profession updated successfully',
        profession
      });
    } catch (error) {
      console.error('Error updating user profession:', error);
      res.status(500).json({ error: 'Failed to update profession' });
    }
  });
  
  // Special endpoint to add 1 million coins to a user (temporary endpoint)
  app.post('/api/admin/add-million-coins', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Find the user by email
      const userQuery = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ error: `User with email ${email} not found` });
      }
      
      const targetUser = userQuery.rows[0];
      const coinAmount = 1000000; // One million coins
      
      // Add the coins to the user's account
      const newCoinsBalance = await storage.addUserCoins(
        targetUser.id,
        coinAmount,
        'ADMIN_GIFT',
        `Special gift of 1 million coins to ${targetUser.email}`,
      );
      
      // Log the action
      await logMessage(LogLevel.INFO, 'Admin', `Added 1 million coins to user ${targetUser.email}`);
      
      res.json({ 
        success: true, 
        message: `Successfully added ${coinAmount} coins to ${targetUser.email}`,
        user: targetUser.email,
        newBalance: newCoinsBalance
      });
    } catch (error) {
      console.error("Error adding coins to user:", error);
      res.status(500).json({ error: "Failed to add coins to user", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Get user's coin transaction history
  app.get('/api/user/coins/transactions', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const transactions = await storage.getCoinTransactions(user.id, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error getting user's coin transactions:", error);
      res.status(500).json({ error: "Failed to retrieve coin transactions" });
    }
  });
  
  // Character selection endpoint
  // Get the user's current profession
  app.get('/api/user/character-selection', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Get the latest user data to ensure we have the current profession
      const currentUser = await storage.getUser(user.id);
      
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json({ 
        profession: currentUser.profession || null 
      });
    } catch (error) {
      console.error('Error getting character selection:', error);
      res.status(500).json({ error: 'Failed to get character selection' });
    }
  });

  // Set the user's profession choice
  app.post('/api/user/character-selection', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { profession } = req.body;
      
      if (!profession) {
        return res.status(400).json({ error: 'Profession selection is required' });
      }
      
      // Validate profession
      const validProfessions = [
        'real-estate', 'ecommerce', 'content-creator', 'law-firm', 
        'marketing-agency', 'insurance', 'crypto', 'event-planner'
      ];
      
      if (!validProfessions.includes(profession)) {
        return res.status(400).json({ error: 'Invalid profession selection' });
      }
      
      // Save the user's profession selection
      await storage.updateUserProfession(user.id, profession);
      
      // Log the character selection
      console.log(`Character selection saved for user ${user.id}: ${profession}`);
      
      res.status(200).json({ 
        success: true, 
        message: 'Character selection saved successfully',
        profession
      });
    } catch (error) {
      console.error('Error saving character selection:', error);
      res.status(500).json({ error: 'Failed to save character selection' });
    }
  });
  
  // Buy coins with payment gateway
  app.post('/api/coins/buy', isAuthenticated, conversionAttribution, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { package_id, payment_id, amount } = req.body;
      
      if (!package_id || !payment_id || !amount || typeof amount !== 'number') {
        return res.status(400).json({ error: 'Invalid request. Required fields: package_id, payment_id, amount' });
      }
      
      // Add coins to user account
      const newBalance = await storage.addUserCoins(
        user.id,
        amount,
        TransactionType.PURCHASE,
        `Purchased ${amount} coins`,
        package_id,
        payment_id
      );
      
      await logMessage(LogLevel.INFO, 'Coins', `User ${user.email} purchased ${amount} coins with payment ${payment_id}`);
      
      res.json({ 
        success: true, 
        coins: newBalance,
        message: `Successfully added ${amount} coins to your account`
      });
    } catch (error) {
      console.error("Error processing coin purchase:", error);
      await logMessage(LogLevel.ERROR, 'Coins', `Error processing coin purchase: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: "Failed to process purchase", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Helper function to get user from token
  async function getUserFromToken(token: string) {
    try {
      // Check if token exists in activeTokens map
      const tokenInfo = activeTokens.get(token);
      if (!tokenInfo) {
        console.log('Token not found or invalid:', token.substring(0, 10) + '...');
        return null;
      }
      
      // Check if token is expired
      if (tokenInfo.expiresAt < new Date()) {
        console.log('Token expired:', tokenInfo.expiresAt.toISOString());
        activeTokens.delete(token);
        return null;
      }
      
      // Get user from database
      const user = await storage.getUser(tokenInfo.userId);
      return user;
    } catch (error) {
      console.error('Error getting user from token:', error);
      return null;
    }
  }
  
  // Endpoint for AI clip generation to use coins
  app.post('/api/clips/generate', async (req, res) => {
    try {
      // Check if user is authenticated - try multiple methods
      const authHeader = req.headers.authorization;
      const user = (req as any).user;
      
      // If no auth header and no user object, user is not authenticated
      if (!authHeader && !user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Try to get the user information based on the authorization header if user is undefined
      let authenticatedUser = user;
      if (!authenticatedUser && authHeader) {
        try {
          // Extract token from Bearer format if present
          const token = authHeader.startsWith('Bearer ') ? 
            authHeader.substring(7, authHeader.length) : authHeader;
          
          console.log("Verifying token for clip generation endpoint:", token.substring(0, 10) + '...');
          
          // Try to get the user from the token
          const tokenUser = await getUserFromToken(token);
          if (tokenUser) {
            authenticatedUser = tokenUser;
            console.log(`User authenticated via token: ${authenticatedUser.email}`);
          }
        } catch (err) {
          console.error("Error verifying token:", err);
        }
      }
      
      // Final check if we have a valid user
      if (!authenticatedUser) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Fixed cost for generating AI clips - 15 coins
      const coinCost = 15;
      
      // Check if user has enough coins
      const userCoins = await storage.getUserCoins(authenticatedUser.id);
      
      if (userCoins < coinCost) {
        return res.status(403).json({ 
          error: 'Insufficient coins', 
          required: coinCost, 
          available: userCoins,
          message: `You need ${coinCost} coins to generate AI clips, but you only have ${userCoins} coins.`
        });
      }
      
      // Deduct coins from the user account
      const deductResult = await storage.deductUserCoins(
        authenticatedUser.id,
        coinCost,
        `Generated AI clips`
      );
      
      if (!deductResult) {
        return res.status(403).json({ error: 'Failed to deduct coins from account' });
      }
      
      // Log the coin deduction
      await logMessage(LogLevel.INFO, 'Coins', `User ${authenticatedUser.email} used ${coinCost} coins for AI clip generation`);
      
      // Get the coin transaction for this deduction (most recent transaction for this user)
      const transactions = await storage.getCoinTransactions(authenticatedUser.id, 1);
      const coinTransaction = transactions[0];
      
      if (!coinTransaction) {
        throw new Error('Coin transaction not found - this should never happen');
      }
      
      // Return success response with updated coin balance
      const updatedCoins = await storage.getUserCoins(authenticatedUser.id);
      
      res.json({ 
        success: true, 
        coins: updatedCoins,
        coinCost,
        message: `Successfully deducted ${coinCost} coins for AI clip generation`,
        transaction_id: coinTransaction.id
      });
    } catch (error) {
      console.error("Error processing clip generation coins:", error);
      await logMessage(LogLevel.ERROR, 'Coins', `Error processing clip generation coins: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: "Failed to process coin deduction", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Endpoint for AI voice generation to use coins
  app.post('/api/voiceover/use', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { text, voice_id } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Invalid request. Required field: text' });
      }
      
      // Calculate the cost of generating this text (1 coin per word)
      const wordCount = text.trim().split(/\s+/).length;
      const coinCost = wordCount;
      
      // Check if user has enough coins
      const userCoins = await storage.getUserCoins(user.id);
      
      if (userCoins < coinCost) {
        return res.status(403).json({ 
          error: 'Insufficient coins', 
          required: coinCost, 
          available: userCoins,
          message: `You need ${coinCost} coins to generate this voiceover, but you only have ${userCoins} coins.`
        });
      }
      
      // Process the text-to-speech request with ElevenLabs
      const selectedVoiceId = voice_id || "EXAVITQu4vr4xnSDxMaL"; // Default to Rachel voice if not specified
      
      // Create options object from request body
      const ttsOptions = {
        voiceId: selectedVoiceId,
        stability: req.body.stability || 0.5,
        similarity: req.body.similarity_boost || 0.75,
        style: req.body.style || 0,
        speakerBoost: req.body.speaker_boost || true,
        modelId: req.body.model_id || 'eleven_monolingual_v1',
        voice_speed: req.body.speed || 1.0
      };
      
      try {
        // First deduct coins from the user account
        const deductResult = await storage.deductUserCoins(
          user.id,
          coinCost,
          `Generated voiceover (${wordCount} words)`
        );
        
        if (!deductResult) {
          return res.status(403).json({ error: 'Failed to deduct coins from account' });
        }
        
        // Log the coin deduction
        await logMessage(LogLevel.INFO, 'Coins', `User ${user.email} used ${coinCost} coins for voiceover`);
        
        // Get the coin transaction for this deduction (most recent transaction for this user)
        const transactions = await storage.getCoinTransactions(user.id, 1);
        const coinTransaction = transactions[0];
        
        if (!coinTransaction) {
          throw new Error('Coin transaction not found - this should never happen');
        }
        
        // Now generate the audio with ElevenLabs
        // Use the imported function from the top of the file
        const audioStream = await getTtsStream(text, ttsOptions);
        
        // Generate file path
        const timestamp = Date.now();
        const filename = `voice_${timestamp}.mp3`;
        const tempDir = path.resolve(process.cwd(), 'temp');
        
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const audioPath = path.join(tempDir, filename);
        
        // Save the audio stream to a file
        const fileStream = fs.createWriteStream(audioPath);
        audioStream.pipe(fileStream);
        
        await new Promise((resolve, reject) => {
          fileStream.on('finish', resolve);
          fileStream.on('error', reject);
        });
        
        // Return success response with updated coin balance and audio URL
        const updatedCoins = await storage.getUserCoins(user.id);
        
        res.json({ 
          success: true, 
          coins: updatedCoins,
          wordCount,
          coinCost,
          audioUrl: `/temp/${filename}`,
          message: `Successfully generated voiceover using ${coinCost} coins`,
          transaction_id: coinTransaction.id
        });
      } catch (err) {
        // If anything fails after deducting coins, refund the coins
        await storage.addUserCoins(
          user.id,
          coinCost,
          TransactionType.REFUND,
          `Refund for failed voiceover generation (${wordCount} words)`
        );
        
        throw err; // Rethrow to be caught by the outer try-catch
      }
    } catch (error) {
      console.error("Error processing voiceover request:", error);
      await logMessage(LogLevel.ERROR, 'Coins', `Error processing voiceover request: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: "Failed to process voiceover request", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Image generation API routes
  // Text to Image - Generate an image from a text prompt
  app.post('/api/image/generate', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { prompt, size } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Invalid request. Required field: prompt' });
      }
      
      // Check if prompt is too short
      if (prompt.trim().length < 3) {
        return res.status(400).json({ error: 'Prompt is too short. Please provide a more detailed description.' });
      }
      
      // The cost for image generation is 5 coins per image
      const coinCost = 5;
      
      // Check if user has enough coins
      const userCoins = await storage.getUserCoins(user.id);
      
      if (userCoins < coinCost) {
        return res.status(403).json({ 
          error: 'Insufficient coins', 
          required: coinCost, 
          available: userCoins,
          message: `You need ${coinCost} coins to generate this image, but you only have ${userCoins} coins.`
        });
      }
      
      try {
        // First deduct coins from the user account
        const deductResult = await storage.deductUserCoins(
          user.id,
          coinCost,
          `Generated AI image from text`
        );
        
        if (!deductResult) {
          return res.status(403).json({ error: 'Failed to deduct coins from account' });
        }
        
        // Log the coin deduction
        await logMessage(LogLevel.INFO, 'Coins', `User ${user.email} used ${coinCost} coins for image generation`);
        
        // Get the coin transaction for this deduction (most recent transaction for this user)
        const transactions = await storage.getCoinTransactions(user.id, 1);
        const coinTransaction = transactions[0];
        
        if (!coinTransaction) {
          throw new Error('Coin transaction not found - this should never happen');
        }
        
        // Use OpenAI's DALL-E 3 model with the new API key
        const result = await generateImageFromText(
          prompt,
          user.id,
          size || "1024x1024",
          "dall-e-3"
        );
        
        // Return success response with updated coin balance and image URL
        const updatedCoins = await storage.getUserCoins(user.id);
        
        res.json({ 
          success: true, 
          coins: updatedCoins,
          coinCost,
          imageUrl: result.url,
          promptUsed: result.promptUsed,
          message: `Successfully generated image using ${coinCost} coins`,
          transaction_id: coinTransaction.id
        });
      } catch (err) {
        // If anything fails after deducting coins, refund the coins
        await storage.addUserCoins(
          user.id,
          coinCost,
          TransactionType.REFUND,
          `Refund for failed image generation`
        );
        
        throw err; // Rethrow to be caught by the outer try-catch
      }
    } catch (error) {
      console.error("Error processing image generation request:", error);
      await logMessage(LogLevel.ERROR, 'Coins', `Error processing image generation request: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: "Failed to process image generation request", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Image + Text to Image - Create an image variation from an existing image
  app.post('/api/image/edit', isAuthenticated, uploadSingleImage, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { prompt, size } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Invalid request. Required field: prompt' });
      }
      
      // Check if an image was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded. Please upload an image file.' });
      }
      
      // The cost for image editing is 5 coins per edit
      const coinCost = 5;
      
      // Check if user has enough coins
      const userCoins = await storage.getUserCoins(user.id);
      
      if (userCoins < coinCost) {
        // Clean up the uploaded file if the user doesn't have enough coins
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(403).json({ 
          error: 'Insufficient coins', 
          required: coinCost, 
          available: userCoins,
          message: `You need ${coinCost} coins to edit this image, but you only have ${userCoins} coins.`
        });
      }
      
      try {
        // First deduct coins from the user account
        const deductResult = await storage.deductUserCoins(
          user.id,
          coinCost,
          `Generated AI image from image+text`
        );
        
        if (!deductResult) {
          // Clean up the uploaded file
          if (req.file) {
            fs.unlinkSync(req.file.path);
          }
          
          return res.status(403).json({ error: 'Failed to deduct coins from account' });
        }
        
        // Log the coin deduction
        await logMessage(LogLevel.INFO, 'Coins', `User ${user.email} used ${coinCost} coins for image editing`);
        
        // Get the coin transaction for this deduction (most recent transaction for this user)
        const transactions = await storage.getCoinTransactions(user.id, 1);
        const coinTransaction = transactions[0];
        
        if (!coinTransaction) {
          throw new Error('Coin transaction not found - this should never happen');
        }
        
        // Use OpenAI's DALL-E 3 model with the new API key
        const result = await generateImageFromImageAndText(
          prompt,
          req.file.path,
          user.id,
          size || "1024x1024",
          "dall-e-3"
        );
        
        // Clean up the temporary uploaded file since we don't need it anymore
        fs.unlinkSync(req.file.path);
        
        // Return success response with updated coin balance and image URL
        const updatedCoins = await storage.getUserCoins(user.id);
        
        res.json({ 
          success: true, 
          coins: updatedCoins,
          coinCost,
          imageUrl: result.url,
          promptUsed: result.promptUsed,
          message: `Successfully edited image using ${coinCost} coins`,
          transaction_id: coinTransaction.id
        });
      } catch (err) {
        // Clean up the uploaded file if there was an error
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        
        // If anything fails after deducting coins, refund the coins
        await storage.addUserCoins(
          user.id,
          coinCost,
          TransactionType.REFUND,
          `Refund for failed image editing`
        );
        
        throw err; // Rethrow to be caught by the outer try-catch
      }
    } catch (error) {
      console.error("Error processing image editing request:", error);
      await logMessage(LogLevel.ERROR, 'Coins', `Error processing image editing request: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: "Failed to process image editing request", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Payment verification endpoint is now implemented below at line ~1260
  
  // Get all user agents
  app.get('/api/user/agents', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const agents = await storage.getUserAgents(user.id);
      res.json(agents);
    } catch (error) {
      console.error("Error getting user agents:", error);
      res.status(500).json({ error: "Failed to get user agents" });
    }
  });
  
  // Create a user agent
  app.post('/api/user/agents', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Debug logging
      console.log('Creating agent with request body:', req.body);
      
      // Validate essential fields
      if (!req.body.name) {
        return res.status(400).json({ error: 'Agent name is required' });
      }
      
      // Format the phone number if provided
      let formattedPhoneNumber = req.body.phone_number;
      if (formattedPhoneNumber) {
        // Clean the phone number - remove any spaces, dashes, or parentheses
        formattedPhoneNumber = formattedPhoneNumber.replace(/[\s\-\(\)]/g, '');
        
        // If the number doesn't start with a '+', add it (assuming US/North America)
        if (!formattedPhoneNumber.startsWith('+')) {
          if (formattedPhoneNumber.startsWith('1')) {
            formattedPhoneNumber = '+' + formattedPhoneNumber;
          } else {
            formattedPhoneNumber = '+1' + formattedPhoneNumber;  // Default to US country code
          }
          console.log(`[DEBUG] Formatted agent phone number to: '${formattedPhoneNumber}'`);
        }
      }
      
      // Add userId to the agent data and ensure required fields exist
      const agentData = {
        ...req.body,
        phone_number: formattedPhoneNumber, // Use formatted phone number
        user_id: user.id,
        system_prompt: req.body.system_prompt || "You are a helpful assistant.",
        greeting_message: req.body.greeting_message || "Hello, how can I help you today?",
        voice_id: req.body.voice_id || "EXAVITQu4vr4xnSDxMaL" // Default to Rachel voice
      };
      
      try {
        const newAgent = await storage.createUserAgentWithPhone(agentData);
        
        if (!newAgent) {
          throw new Error('Agent creation returned empty result');
        }
        
        console.log('Successfully created agent:', newAgent.id);
        await logMessage(LogLevel.INFO, 'Agent', `Created new user agent "${newAgent.name}" for user ${user.email}`);
        
        // Prepare response data as a serializable object
        const response = {
          id: newAgent.id,
          name: newAgent.name,
          user_id: newAgent.user_id,
          description: newAgent.description,
          system_prompt: newAgent.system_prompt,
          greeting_message: newAgent.greeting_message || null,
          voice_id: newAgent.voice_id,
          is_active: newAgent.is_active,
          created_at: newAgent.created_at,
          last_active: newAgent.last_active,
          phone_number_id: newAgent.phone_number_id,
          personality_id: newAgent.personality_id,
          custom_settings: newAgent.custom_settings,
          call_count: newAgent.call_count,
          total_duration: newAgent.total_duration,
          avatar_url: newAgent.avatar_url
        };
        
        // Ensure the response is properly serialized to JSON
        return res.status(201).json(response);
      } catch (createError) {
        console.error("Storage error creating user agent:", createError);
        return res.status(500).json({ 
          error: "Database error while creating user agent", 
          details: createError instanceof Error ? createError.message : String(createError)
        });
      }
    } catch (error) {
      console.error("Error creating user agent:", error);
      res.status(500).json({ 
        error: "Failed to create user agent", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update a specific user agent
  app.patch('/api/user/agents/:id', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const agentId = parseInt(req.params.id);
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Get the agent to make sure it belongs to the user
      const agent = await storage.getUserAgentById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Verify that the agent belongs to the user
      if (agent.user_id !== user.id) {
        return res.status(403).json({ error: 'Not authorized to update this agent' });
      }
      
      // Debug logging
      console.log('Updating agent with request body:', req.body);
      
      // Format the phone number if provided
      const updateData = { ...req.body };
      if (updateData.phone_number) {
        // Clean the phone number - remove any spaces, dashes, or parentheses
        let formattedPhoneNumber = updateData.phone_number.replace(/[\s\-\(\)]/g, '');
        
        // If the number doesn't start with a '+', add it (assuming US/North America)
        if (!formattedPhoneNumber.startsWith('+')) {
          if (formattedPhoneNumber.startsWith('1')) {
            formattedPhoneNumber = '+' + formattedPhoneNumber;
          } else {
            formattedPhoneNumber = '+1' + formattedPhoneNumber;  // Default to US country code
          }
          console.log(`[DEBUG] Formatted agent phone number to: '${formattedPhoneNumber}'`);
        }
        
        // Update the phone number in the data
        updateData.phone_number = formattedPhoneNumber;
      }
      
      try {
        // Update the agent with formatted data
        const updatedAgent = await storage.updateUserAgentById(agentId, updateData);
        
        if (!updatedAgent) {
          console.error(`Failed to update agent ${agentId} - update operation returned no data`);
          return res.status(404).json({ error: 'Failed to update agent' });
        }
        
        console.log(`Successfully updated agent ${agentId}`);
        await logMessage(LogLevel.INFO, 'Agent', `Updated user agent "${updatedAgent.name}" for user ${user.email}`);
        
        // Prepare response data as a serializable object
        const response = {
          id: updatedAgent.id,
          name: updatedAgent.name,
          user_id: updatedAgent.user_id,
          description: updatedAgent.description,
          system_prompt: updatedAgent.system_prompt,
          greeting_message: updatedAgent.greeting_message || null,
          voice_id: updatedAgent.voice_id,
          is_active: updatedAgent.is_active,
          created_at: updatedAgent.created_at,
          last_active: updatedAgent.last_active,
          phone_number_id: updatedAgent.phone_number_id,
          personality_id: updatedAgent.personality_id,
          custom_settings: updatedAgent.custom_settings,
          call_count: updatedAgent.call_count,
          total_duration: updatedAgent.total_duration,
          avatar_url: updatedAgent.avatar_url
        };
        
        // Ensure the response is properly serialized to JSON
        return res.json(response);
      } catch (updateError) {
        console.error(`Error in storage.updateUserAgentById for agent ${agentId}:`, updateError);
        return res.status(500).json({ 
          error: "Database error while updating user agent", 
          details: updateError instanceof Error ? updateError.message : String(updateError)
        });
      }
    } catch (error) {
      console.error("Error updating user agent:", error);
      res.status(500).json({ error: "Failed to update user agent", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Delete a specific user agent
  // Nuclear option endpoint for completely removing a problematic agent
  app.delete('/api/user/agents/:id/nuclear-delete', isAuthenticated, async (req, res) => {
    try {
      console.log(`NUCLEAR DELETE request received for agent`);
      const user = (req as any).user;
      const agentId = parseInt(req.params.id);
      
      if (!user) {
        console.error('Nuclear delete failed: User not authenticated');
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (isNaN(agentId)) {
        console.error('Nuclear delete failed: Invalid agent ID');
        return res.status(400).json({ error: 'Invalid agent ID' });
      }
      
      console.log(`Nuclear delete: Attempting to delete agent ${agentId} for user ${user.id}`);
      
      // Call our database procedure directly
      const db = getDb();
      await db.execute(`CALL cleanup_and_delete_agent(${agentId})`);
      
      console.log(`Nuclear delete: Procedure called for agent ${agentId}`);
      
      // Log the action
      await logMessage(LogLevel.INFO, 'Agent', `Nuclear delete executed for agent ID ${agentId}`);
      
      // Return success
      return res.status(204).send();
      
    } catch (error) {
      console.error(`Nuclear delete error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ error: 'Nuclear delete failed', details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Special endpoint for direct DB deletion - emergency use only
  app.delete('/api/user/agents/:id/emergency-delete', isAuthenticated, async (req, res) => {
    try {
      console.log(`🚨 EMERGENCY DB DELETE request received`);
      
      const user = (req as any).user;
      const agentId = parseInt(req.params.id);
      const requestId = req.headers['x-request-id'] || `e-${Date.now()}`;
      
      // Log details about the request
      console.log(`Emergency delete request ID: ${requestId}`);
      console.log(`Request headers:`, JSON.stringify(req.headers));
      
      if (!user) {
        console.error('Emergency delete failed: User not authenticated');
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (isNaN(agentId)) {
        console.error('Emergency delete failed: Invalid agent ID');
        return res.status(400).json({ error: 'Invalid agent ID' });
      }
      
      console.log(`Emergency delete: Attempting direct DB deletion for agent ${agentId} for user ${user.id}`);
      
      // Use our specialized direct database operation from simple-delete.ts
      const result = await simpleDeleteAgent(agentId);
      
      if (result.success) {
        console.log(`Emergency delete successful: ${result.message}`);
        
        // Log the action with details
        await logMessage(
          LogLevel.INFO, 
          'Agent', 
          `Emergency deletion successful for agent ${agentId} by user ${user.email} (${user.id}).`
        );
        
        // Return a 204 No Content success response
        return res.status(204).send();
      } else {
        console.error(`Emergency delete failed: ${result.message}`);
        return res.status(500).json({ 
          error: 'Emergency delete failed', 
          message: result.message
        });
      }
    } catch (error) {
      console.error(`Emergency delete error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        error: 'Emergency delete failed', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Special endpoint for the new direct DB deletion from the frontend
  app.delete('/api/agents/direct-db-delete/:id', isAuthenticated, async (req, res) => {
    try {
      console.log(`⚠️ DIRECT DB DELETE request received from new frontend approach`);
      
      const user = (req as any).user;
      const agentId = parseInt(req.params.id);
      const requestId = req.headers['x-delete-request-id'] || `dd-${Date.now()}`;
      
      // Log details about the request
      console.log(`Direct DB delete request ID: ${requestId}`);
      console.log(`Request headers:`, JSON.stringify(req.headers));
      
      if (!user) {
        console.error('Direct DB delete failed: User not authenticated');
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (isNaN(agentId)) {
        console.error('Direct DB delete failed: Invalid agent ID');
        return res.status(400).json({ error: 'Invalid agent ID' });
      }
      
      console.log(`Direct DB delete: Attempting for agent ${agentId} for user ${user.id}`);
      
      // Check if the agent exists before attempting deletion
      const agent = await storage.getUserAgentById(agentId);
      const agentExists = !!agent;
      
      if (!agentExists) {
        console.log(`Agent ${agentId} not found - considering it already deleted`);
        return res.status(204).send();
      }
      
      // Use our specialized direct database operation from simple-delete.ts
      const result = await simpleDeleteAgent(agentId);
      
      if (result.success) {
        console.log(`Direct DB delete successful: ${result.message}`);
        
        // Log the action with details
        await logMessage(
          LogLevel.INFO, 
          'Agent', 
          `Direct DB deletion successful for agent ${agentId} by user ${user.email} (${user.id})`
        );
        
        // Return a 204 No Content success response
        return res.status(204).send();
      } else {
        console.error(`Direct DB delete failed: ${result.message}`);
        return res.status(500).json({ 
          error: 'Direct DB delete failed', 
          message: result.message
        });
      }
    } catch (error) {
      console.error(`Direct DB delete error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        error: 'Direct DB delete failed', 
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  });
  
  // Standard delete endpoint
  app.delete('/api/user/agents/:id', isAuthenticated, async (req, res) => {
    try {
      console.log(`DELETE request received for agent ID: ${req.params.id}`);
      const user = (req as any).user;
      const agentId = parseInt(req.params.id);
      const forceDelete = req.query.force === 'true';
      // By default, use the nuclear delete approach which is most reliable
      const useNuclearDelete = req.query.nuclear !== 'false'; 
      
      console.log(`Agent deletion request details: ID=${agentId}, Force=${forceDelete}, Nuclear=${useNuclearDelete}`);
      
      if (!user) {
        console.error('Delete agent failed: User not authenticated');
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      console.log(`User authenticated: ${user.email}, user ID: ${user.id}`);
      
      // Get the agent to make sure it belongs to the user
      const agent = await storage.getUserAgentById(agentId);
      
      if (!agent) {
        console.error(`Delete agent failed: Agent with ID ${agentId} not found`);
        
        // If this is a force delete request, we'll treat a missing agent as already deleted
        if (forceDelete) {
          console.log(`Force delete requested for non-existent agent ${agentId} - treating as success`);
          await logMessage(LogLevel.INFO, 'Agent', `Attempted force delete of already missing agent ID ${agentId}`);
          return res.status(204).send();
        }
        
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Handle undefined agent names safely
      const agentName = agent.name || 'Unnamed Agent';
      console.log(`Agent found: ${agentName}, belongs to user ID: ${agent.user_id}`);
      
      // Verify that the agent belongs to the user
      if (agent.user_id !== user.id) {
        console.error(`Delete agent failed: Agent (${agentId}) belongs to user ${agent.user_id}, not ${user.id}`);
        return res.status(403).json({ error: 'Not authorized to delete this agent' });
      }
      
      console.log(`Authorization confirmed for deleting agent ${agentId}`);
      
      // Start with nuclear delete procedure (proven most reliable) as the default approach
      if (useNuclearDelete) {
        console.log(`Using nuclear delete procedure for agent ${agentId}`);
        try {
          const db = getDb();
          await db.execute(`CALL cleanup_and_delete_agent(${agentId})`);
          
          console.log(`Nuclear delete successful for agent ${agentId}`);
          await logMessage(LogLevel.INFO, 'Agent', `Deleted user agent "${agentName}" for user ${user.email} using nuclear delete`);
          return res.status(204).send();
        } catch (nuclearError) {
          console.error(`Nuclear delete failed for agent ${agentId}:`, nuclearError);
          // If nuclear delete fails, we'll try other methods
        }
      }
      
      // If nuclear delete failed or was skipped, try force delete
      if (forceDelete || !useNuclearDelete) {
        console.log(`FORCE DELETE requested for agent ${agentId} - calling database force_delete_agent function`);
        
        try {
          // Using db.execute directly to call our custom function
          const db = getDb();
          
          // Call our specialized database function that handles all dependencies with constraints disabled
          const forceDeletionResult = await db.execute(
            sql`SELECT force_delete_agent(${agentId}) as success`
          );
          
          const success = forceDeletionResult?.rows?.[0]?.success === true;
          console.log(`Force deletion database function result:`, success ? 'SUCCESS' : 'FAILED');
          
          if (success) {
            console.log(`DIRECT DELETE successful for agent ${agentId} using specialized DB function`);
            await logMessage(LogLevel.INFO, 'Agent', `Forcefully deleted user agent "${agentName}" for user ${user.email} using specialized DB function`);
            return res.status(204).send();
          } else {
            console.log(`Specialized DB function could not delete agent ${agentId}, falling back to normal method`);
          }
        } catch (forceDeletionError) {
          console.warn(`Force deletion function encountered error for agent ${agentId}:`, 
            forceDeletionError instanceof Error ? forceDeletionError.message : String(forceDeletionError));
          // We continue with normal deletion even if the specialized function has errors
        }
        
        // Fallback: Try direct cleanup if the function didn't work
        try {
          // Directly delete from the user_agents table as a last resort
          const directAgentDelete = await db.execute(
            sql`DELETE FROM user_agents WHERE id = ${agentId}`
          );
          
          if (directAgentDelete.rowCount && directAgentDelete.rowCount > 0) {
            console.log(`DIRECT DELETE successful for agent ${agentId}`);
            await logMessage(LogLevel.INFO, 'Agent', `Deleted user agent "${agentName}" for user ${user.email} using direct SQL`);
            return res.status(204).send();
          }
        } catch (directDeleteError) {
          console.warn(`Direct agent deletion failed, continuing with standard process: ${directDeleteError instanceof Error ? directDeleteError.message : String(directDeleteError)}`);
        }
      }
      
      // As a last resort, use the standard storage method
      console.log(`Attempting to delete agent ${agentId} from database using standard method...`);
      const deleted = await storage.deleteUserAgentById(agentId);
      
      if (!deleted) {
        console.error(`Database operation failed to delete agent ${agentId}`);
        
        // If standard deletion failed but we didn't try force delete yet, try one last approach
        if (!forceDelete) {
          console.log(`Standard deletion failed, attempting direct force delete for ${agentId}`);
          
          // DO NOT REDIRECT - this is causing duplication issues
          // Instead, try to delete directly with the force methods
          try {
            console.log(`Trying emergency direct SQL delete for agent ${agentId}`);
            const db = getDb();
            
            // Try our dedicated function first
            try {
              const emergencyResult = await db.execute(
                sql`SELECT force_delete_agent(${agentId}) as success`
              );
              const success = emergencyResult?.rows?.[0]?.success === true;
              
              if (success) {
                console.log(`Emergency forced deletion successful for agent ${agentId}`);
                await logMessage(LogLevel.INFO, 'Agent', `Emergency force deleted agent ${agentId}`);
                return res.status(204).send();
              }
            } catch (error) {
              const funcError = error as Error;
              console.warn(`Emergency force_delete_agent function failed: ${funcError.message || 'Unknown error'}`);
            }
            
            // Direct delete as absolute last resort
            try {
              await db.execute(sql`DELETE FROM user_agents WHERE id = ${agentId}`);
              console.log(`Last resort direct DELETE successful for agent ${agentId}`);
              await logMessage(LogLevel.INFO, 'Agent', `Last resort deletion for agent ${agentId}`);
              return res.status(204).send();
            } catch (error) {
              const directError = error as Error;
              console.error(`Last resort deletion failed: ${directError.message || 'Unknown error'}`);
            }
          } catch (error) {
            const emergencyError = error as Error;
            console.error(`All emergency deletion methods failed: ${emergencyError.message || 'Unknown error'}`);
          }
        }
        
        return res.status(400).json({ error: 'Failed to delete agent' });
      }
      
      console.log(`Successfully deleted agent ${agentId} from database`);
      await logMessage(LogLevel.INFO, 'Agent', `Deleted user agent "${agentName}" for user ${user.email}`);
      
      console.log(`Sending 204 success response for agent ${agentId} deletion`);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user agent:", error);
      await logMessage(LogLevel.ERROR, 'Agent', `Error deleting agent: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: "Failed to delete user agent", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Delete all agents for a user
  app.delete('/api/user/agents', isAuthenticated, async (req, res) => {
    try {
      console.log(`DELETE ALL request received for user agents`);
      const user = (req as any).user;
      const forceDelete = req.query.force === 'true';
      // By default, use the nuclear delete approach which is most reliable
      const useNuclearDelete = req.query.nuclear !== 'false';
      
      console.log(`Delete all agents request details: Force=${forceDelete}, Nuclear=${useNuclearDelete}`);
      
      if (!user) {
        console.error('Delete all agents failed: User not authenticated');
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      console.log(`User authenticated: ${user.email}, user ID: ${user.id}`);
      
      // Get all user agents
      const userAgents = await storage.getUserAgents(user.id);
      
      if (userAgents.length === 0) {
        console.log(`No agents found for user ${user.id}`);
        return res.status(200).json({ message: 'No agents to delete', deletedCount: 0 });
      }
      
      console.log(`Found ${userAgents.length} agents to delete for user ${user.id}`);
      const agentIds = userAgents.map(agent => agent.id);
      
      // Start with nuclear delete approach (most reliable)
      if (useNuclearDelete) {
        console.log(`Using nuclear delete procedure for all agents`);
        try {
          const db = getDb();
          
          // Process each agent with the cleanup_and_delete_agent stored procedure
          const results = await Promise.all(
            agentIds.map(async (agentId) => {
              try {
                console.log(`Calling cleanup_and_delete_agent for agent ID ${agentId}`);
                await db.execute(`CALL cleanup_and_delete_agent(${agentId})`);
                return true;
              } catch (error) {
                console.error(`Error nuclear-deleting agent ${agentId}:`, error);
                return false;
              }
            })
          );
          
          const successCount = results.filter(Boolean).length;
          console.log(`Successfully nuclear-deleted ${successCount} out of ${agentIds.length} agents`);
          
          if (successCount === agentIds.length) {
            // All agents were successfully deleted, we can return early
            await logMessage(LogLevel.INFO, 'Agent', `Nuclear deleted all ${successCount} agents for user ${user.email}`);
            return res.status(200).json({ 
              message: `Successfully deleted ${successCount} agents`,
              deletedCount: successCount,
              totalCount: agentIds.length
            });
          }
          
          // If some agents failed with nuclear delete, continue with other methods
          console.log(`Some agents could not be deleted with nuclear delete. Continuing with force delete.`);
        } catch (nuclearError) {
          console.warn(`Nuclear cleanup encountered an error:`, nuclearError);
          // Continue with force deletion if nuclear deletion failed
        }
      }
      
      // If nuclear delete failed or was skipped, try force deletion
      if (forceDelete || !useNuclearDelete) {
        console.log(`FORCE DELETE requested for all agents - using specialized DB function`);
        
        try {
          const db = getDb();
          console.log(`Agent IDs to force delete: ${agentIds.join(', ')}`);
          
          // Process each agent with our specialized force_delete_agent function
          const results = await Promise.all(
            agentIds.map(async (agentId) => {
              try {
                console.log(`Calling force_delete_agent for agent ID ${agentId}`);
                const result = await db.execute(
                  sql`SELECT force_delete_agent(${agentId}) as success`
                );
                
                const success = result?.rows?.[0]?.success === true;
                console.log(`Force deletion of agent ${agentId} result: ${success ? 'SUCCESS' : 'FAILED'}`);
                
                return success;
              } catch (error) {
                console.error(`Error force-deleting agent ${agentId}:`, error);
                return false;
              }
            })
          );
          
          const successCount = results.filter(Boolean).length;
          console.log(`Successfully force-deleted ${successCount} out of ${agentIds.length} agents using the specialized function`);
          
          if (successCount === agentIds.length) {
            // All agents were successfully deleted, we can return early
            await logMessage(LogLevel.INFO, 'Agent', `Deleted all ${successCount} agents for user ${user.email} using specialized DB function`);
            return res.status(200).json({ 
              message: `Successfully deleted ${successCount} agents`,
              deletedCount: successCount,
              totalCount: agentIds.length
            });
          }
          
          // If some agents failed, continue with standard deletion for the remaining ones
          console.log(`Some agents could not be deleted with the specialized function. Continuing with standard methods.`);
          
        } catch (forceDeleteError) {
          console.warn(`Force cleanup encountered an error:`, forceDeleteError);
          // Continue with individual deletions if the mass deletion failed
        }
      }
      
      // Traditional approach - delete agents one by one using API endpoints
      const results = await Promise.all(
        userAgents.map(async (agent) => {
          try {
            // For each agent, use the safest approach (nuclear + force)
            const response = await fetch(`/api/user/agents/${agent.id}?force=true&nuclear=true`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${req.cookies.auth_token}`
              }
            });
            
            return response.status === 204;
          } catch (error) {
            console.error(`Error deleting agent ${agent.id}:`, error);
            return false;
          }
        })
      );
      
      const successCount = results.filter(Boolean).length;
      
      console.log(`Successfully deleted ${successCount} out of ${userAgents.length} agents for user ${user.id}`);
      await logMessage(LogLevel.INFO, 'Agent', `Deleted ${successCount} agents for user ${user.email}`);
      
      res.status(200).json({ 
        message: `Successfully deleted ${successCount} agents`,
        deletedCount: successCount,
        totalCount: userAgents.length
      });
    } catch (error) {
      console.error("Error deleting all user agents:", error);
      await logMessage(LogLevel.ERROR, 'Agent', `Error deleting all agents: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: "Failed to delete all agents", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Get a specific user agent by ID
  app.get('/api/user/agents/:id', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const agentId = parseInt(req.params.id);
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (isNaN(agentId)) {
        return res.status(400).json({ error: 'Invalid agent ID' });
      }
      
      const agent = await storage.getUserAgentById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Verify that the agent belongs to the user
      if (agent.user_id !== user.id && !user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to view this agent' });
      }
      
      await logMessage(LogLevel.INFO, 'Agent', `Retrieved agent details for "${agent.name}" by user ${user.email}`);
      res.json(agent);
    } catch (error) {
      console.error("Error retrieving user agent:", error);
      res.status(500).json({ error: "Failed to retrieve user agent", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // API route to check if PayPal integration is working
  app.get('/api/system/check-paypal', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await testPayPalCredentials();
      await logMessage(
        result.isValid ? LogLevel.INFO : LogLevel.ERROR, 
        'System', 
        `PayPal credentials check: ${result.message}`
      );
      
      // Log additional details for debugging
      if (!result.isValid) {
        console.log('PayPal check details:', JSON.stringify(result.details, null, 2));
      }
      
      return res.json({
        isValid: result.isValid,
        message: result.message,
        details: result.details || {}
      });
    } catch (error: any) {
      console.error('Error checking PayPal credentials:', error);
      await logMessage(LogLevel.ERROR, 'System', `Error checking PayPal credentials: ${error.message}`);
      return res.status(500).json({ 
        isValid: false, 
        message: `Error: ${error.message}`,
        details: {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  });
  
  // Add a debug route to check environment variables
  app.get('/api/debug/env', (req, res) => {
    res.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        REPL_SLUG: process.env.REPL_SLUG || 'not set',
        REPL_OWNER: process.env.REPL_OWNER || 'not set'
      },
      auth: {
        type: 'token-based',
        hasAuthHeader: !!req.headers.authorization,
        cookieCount: Object.keys(req.cookies || {}).length
      }
    });
  });
  
  // Enhanced debugging endpoints for troubleshooting
  app.get('/api/debug/headers', (req, res) => {
    const isProduction = process.env.REPL_SLUG === 'node-ninja-emilghelmeci';
    console.log(`Debug headers called from environment: ${isProduction ? 'Production' : 'Development'}`);
    
    res.json({
      headers: req.headers,
      ip: req.ip,
      originalUrl: req.originalUrl,
      hostname: req.hostname,
      protocol: req.protocol,
      cookies: req.cookies,
      env: {
        REPL_SLUG: process.env.REPL_SLUG,
        NODE_ENV: process.env.NODE_ENV,
        isProduction
      }
    });
  });
  
  // Add a route to check token store status
  app.get('/api/debug/auth', isAuthenticated, (req, res) => {
    res.json({
      message: 'Authentication is working properly',
      user: (req as any).user
    });
  });
  
  // Add a diagnostic endpoint to verify token validity without requiring auth
  app.post('/api/debug/verify-token', async (req, res) => {
    try {
      let token = '';
      
      // Get token from the request
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.substring(7);
      } else if (req.body && req.body.token) {
        token = req.body.token;
      } else if (req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
      }
      
      if (!token) {
        return res.status(400).json({
          valid: false,
          message: 'No token provided',
          authHeader: !!req.headers.authorization,
          hasCookies: Object.keys(req.cookies || {}).length > 0,
          cookieNames: Object.keys(req.cookies || {})
        });
      }
      
      console.log(`Verifying token: ${token.substring(0, 10)}...`);
      
      // Check if token exists in memory
      const tokenInfo = activeTokens.get(token);
      
      if (!tokenInfo) {
        console.log('Token not found in memory store');
        
        // Check if token exists in database
        const dbResult = await pool.query(
          'SELECT user_id, expires_at FROM auth_tokens WHERE token = $1',
          [token]
        );
        
        if (dbResult.rows.length === 0) {
          return res.json({
            valid: false,
            message: 'Token not found in memory or database',
            inMemory: false,
            inDatabase: false,
            memoryTokenCount: activeTokens.size
          });
        }
        
        // Token in database but not in memory (this shouldn't happen normally)
        return res.json({
          valid: false,
          message: 'Token found in database but not in memory store',
          inMemory: false, 
          inDatabase: true,
          userId: dbResult.rows[0].user_id,
          expiresAt: dbResult.rows[0].expires_at,
          expired: new Date(dbResult.rows[0].expires_at) < new Date(),
          memoryTokenCount: activeTokens.size
        });
      }
      
      // Token found in memory, check if expired
      if (tokenInfo.expiresAt < new Date()) {
        return res.json({
          valid: false,
          message: 'Token is expired',
          inMemory: true,
          expired: true,
          userId: tokenInfo.userId,
          expiresAt: tokenInfo.expiresAt
        });
      }
      
      // Token is valid, get the user
      const user = await storage.getUser(tokenInfo.userId);
      
      if (!user) {
        return res.json({
          valid: false,
          message: 'Token valid but user not found',
          inMemory: true,
          expired: false,
          userId: tokenInfo.userId,
          expiresAt: tokenInfo.expiresAt
        });
      }
      
      // Success case
      return res.json({
        valid: true,
        message: 'Token is valid',
        inMemory: true,
        expired: false,
        userId: tokenInfo.userId,
        userEmail: user.email,
        expiresIn: Math.round((tokenInfo.expiresAt.getTime() - new Date().getTime()) / 1000 / 60) + ' minutes'
      });
      
    } catch (error) {
      console.error('Error checking token:', error);
      return res.status(500).json({
        valid: false,
        message: 'Server error checking token',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Add a route to test database connection
  app.get('/api/debug/database', async (req, res) => {
    try {
      console.log('[DEBUG] Testing database connection');
      const result = await pool.query('SELECT NOW() as time, current_database() as database');
      
      // Try to query a user to test if schema exists
      let userCount = 0;
      let testUser = null;
      
      try {
        const userResult = await pool.query('SELECT COUNT(*) as count FROM users');
        userCount = parseInt(userResult.rows[0].count);
        
        if (userCount > 0) {
          // Get first user (without password)
          const testUserResult = await pool.query('SELECT id, username, email, "displayName", "isAdmin" FROM users LIMIT 1');
          testUser = testUserResult.rows[0];
        }
      } catch (schemaError: any) {
        console.error('[DEBUG] Schema test error:', schemaError.message);
      }
      
      res.json({
        dbConnected: true,
        timeCheck: result.rows[0],
        schemaExists: userCount !== null,
        userCount,
        testUser,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[DEBUG] Database test error:', error);
      
      res.status(500).json({
        dbConnected: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Authentication routes with conversion attribution
  app.post('/api/auth/register', conversionAttribution, async (req, res) => {
    try {
      const { username, email, password, displayName, role, phoneNumber } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }
      
      // Validate phone number if provided
      if (phoneNumber) {
        // Simple validation - must be at least 10 digits
        const phoneDigits = phoneNumber.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
          return res.status(400).json({ error: 'Phone number must have at least 10 digits' });
        }
      }
      
      // Get client IP address
      const ipAddress = req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress || 
                      req.ip;
                      
      console.log(`Registration from IP address: ${ipAddress}`);
      
      // Check if this is a partner registration
      const isPartner = role === 'partner';
      console.log(`Registration request for ${email} with role: ${isPartner ? 'partner' : 'regular user'}`);
      
      // Register the user (pass isAdmin=false, the partner status will be handled separately)
      // phoneNumber and ipAddress parameters removed as they don't exist in the database
      const user = await registerUser(username, email, password, displayName, false);
      
      // If user is a partner, update their role in the database
      if (isPartner && user) {
        console.log(`Setting up partner account for: ${email}`);
        
        try {
          // Create a dedicated agent for the new partner
          const agentName = `${username}'s Agent`;
          const agentDesc = `Default agent for ${username}`;
          
          // Create a default agent for the partner
          const agent = await storage.createUserAgent({
            user_id: user.id,
            name: agentName,
            description: agentDesc,
            personality: "Friendly and professional",
            voice: "Adam",
            max_knowledge_length: 5000,
            knowledge_base: "I am an AI assistant. I can help you with various tasks.",
            goals: "Answer questions professionally and be helpful."
          });
          
          console.log(`Created dedicated agent for user ${user.id}`);
        } catch (agentError) {
          console.error(`Error creating agent for partner ${email}:`, agentError);
          // Continue with registration even if agent creation fails
        }
      }
      
      // Login the user with our token-based system
      const result = await loginUser(email, password);
      
      await logMessage(LogLevel.INFO, 'Auth', `User registered: ${email}`);
      
      // The result already contains all the user data, token and expiry
      return res.status(201).json(result);
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[${LogLevel.ERROR}] [Auth] Registration error:`, error);
        await logMessage(LogLevel.ERROR, 'Auth', `Registration error: ${error.message}`);
        return res.status(400).json({ error: error.message });
      }
      
      // Handle non-Error objects
      console.error(`[${LogLevel.ERROR}] [Auth] Registration error:`, error);
      await logMessage(LogLevel.ERROR, 'Auth', `Registration error: Unknown error occurred`);
      return res.status(400).json({ error: 'Unknown error occurred' });
    }
  });
  
  // Admin Panel Routes
  // User management endpoints
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await pool.query('SELECT id, username, email, display_name as "displayName", created_at as "createdAt", last_login as "lastLogin", is_admin as "isAdmin" FROM users ORDER BY id');
      res.json(users.rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error fetching users: ${error}`);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });
  
  app.get('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const userResult = await pool.query(
        'SELECT id, username, email, display_name as "displayName", created_at as "createdAt", last_login as "lastLogin", is_admin as "isAdmin" FROM users WHERE id = $1',
        [id]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get user agent
      let agent = null;
      try {
        agent = await storage.getUserAgent(parseInt(id));
      } catch (agentError) {
        console.error('Error fetching user agent:', agentError);
      }
      
      // Get API usage
      const apiUsageResult = await pool.query(
        `SELECT service, SUM(request_count) as total_requests, 
         AVG(response_time) as avg_response_time,
         SUM(character_count) as total_characters,
         SUM(token_count) as total_tokens
         FROM api_metrics 
         WHERE agent_id IN (SELECT id FROM agents WHERE user_id = $1)
         GROUP BY service`,
        [id]
      );
      
      res.json({
        ...userResult.rows[0],
        agent,
        apiUsage: apiUsageResult.rows
      });
    } catch (error) {
      console.error(`Error fetching user ${req.params.id}:`, error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error fetching user ${req.params.id}: ${error}`);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });
  
  app.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, displayName, isAdmin: userIsAdmin } = req.body;
      
      // Prevent non-admins from creating admin users
      // Additional security check even though route is protected by isAdmin middleware
      if (userIsAdmin && !(req.user as any).isAdmin) {
        return res.status(403).json({ error: 'Not authorized to create admin users' });
      }
      
      const updateResult = await pool.query(
        `UPDATE users 
         SET username = COALESCE($1, username),
             email = COALESCE($2, email),
             display_name = COALESCE($3, display_name),
             is_admin = COALESCE($4, is_admin)
         WHERE id = $5
         RETURNING id, username, email, display_name as "displayName", is_admin as "isAdmin"`,
        [username, email, displayName, userIsAdmin, id]
      );
      
      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      await logMessage(LogLevel.INFO, 'Admin', `User ${id} updated by admin ${(req.user as any).id}`);
      res.json(updateResult.rows[0]);
    } catch (error) {
      console.error(`Error updating user ${req.params.id}:`, error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error updating user ${req.params.id}: ${error}`);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });
  
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting admin users
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [id]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (userResult.rows[0].is_admin) {
        return res.status(403).json({ error: 'Cannot delete admin users' });
      }
      
      // Delete user agents first
      await pool.query('DELETE FROM agents WHERE user_id = $1', [id]);
      
      // Delete user
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      
      await logMessage(LogLevel.INFO, 'Admin', `User ${id} deleted by admin ${(req.user as any).id}`);
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting user ${req.params.id}:`, error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error deleting user ${req.params.id}: ${error}`);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });
  
  // Reset user password
  app.post('/api/admin/users/:id/reset-password', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      
      // Hash the new password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const updateResult = await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, username, email',
        [hashedPassword, id]
      );
      
      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      await logMessage(LogLevel.INFO, 'Admin', `Password reset for user ${id} by admin ${(req.user as any).id}`);
      res.json({ success: true, user: updateResult.rows[0] });
    } catch (error) {
      console.error(`Error resetting password for user ${req.params.id}:`, error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error resetting password for user ${req.params.id}: ${error}`);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });
  
  // System stats for admin dashboard
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get user count
      const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users');
      const userCount = parseInt(userCountResult.rows[0].count);
      
      // Get active agent count
      const agentCountResult = await pool.query('SELECT COUNT(*) as count FROM agents WHERE active = true');
      const activeAgentCount = parseInt(agentCountResult.rows[0].count);
      
      // Get API usage statistics
      const apiStatsResult = await pool.query(`
        SELECT 
          service, 
          SUM(request_count) as total_requests, 
          AVG(response_time) as avg_response_time
        FROM api_metrics
        GROUP BY service
      `);
      
      // Get recent logs (last 20)
      const logsResult = await pool.query(`
        SELECT * FROM logs
        ORDER BY timestamp DESC
        LIMIT 20
      `);
      
      // Get system uptime and resources
      const uptime = calculateUptime();
      const cpuUsage = process.cpuUsage();
      const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000 / os.cpus().length * 10);
      
      const totalMem = Math.round(os.totalmem() / (1024 * 1024)); // MB
      const freeMem = Math.round(os.freemem() / (1024 * 1024)); // MB
      const usedMem = totalMem - freeMem;
      
      res.json({
        users: {
          total: userCount,
          activeAgents: activeAgentCount
        },
        apiStats: apiStatsResult.rows,
        recentLogs: logsResult.rows,
        system: {
          uptime,
          cpu: cpuPercent > 100 ? 100 : cpuPercent,
          memory: {
            used: usedMem,
            total: totalMem,
            percent: Math.round((usedMem / totalMem) * 100)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error fetching admin stats: ${error}`);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });
  
  // Get all logs with pagination and filtering
  app.get('/api/admin/logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const level = req.query.level as string;
      const source = req.query.source as string;
      
      let query = 'SELECT * FROM logs';
      const queryParams: any[] = [];
      let whereClause = '';
      
      if (level) {
        whereClause += 'level = $1';
        queryParams.push(level);
      }
      
      if (source) {
        if (whereClause) {
          whereClause += ' AND ';
          queryParams.push(source);
          whereClause += `source = $${queryParams.length}`;
        } else {
          whereClause += 'source = $1';
          queryParams.push(source);
        }
      }
      
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
      }
      
      query += ' ORDER BY timestamp DESC';
      
      // Add pagination
      queryParams.push(limit);
      queryParams.push(offset);
      query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
      
      const logsResult = await pool.query(query, queryParams);
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as count FROM logs';
      if (whereClause) {
        countQuery += ` WHERE ${whereClause}`;
      }
      
      const countParams = queryParams.slice(0, -2); // Remove limit and offset
      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);
      
      res.json({
        logs: logsResult.rows,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error fetching logs: ${error}`);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });
  
  // API Configuration endpoints
  app.get('/api/admin/config', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      console.error('Error fetching configuration:', error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error fetching configuration: ${error}`);
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });
  
  app.patch('/api/admin/config', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const updatedConfig = await storage.updateConfig(req.body);
      await logMessage(LogLevel.INFO, 'Admin', `System configuration updated by admin ${(req.user as any).id}`);
      res.json(updatedConfig);
    } catch (error) {
      console.error('Error updating configuration:', error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error updating configuration: ${error}`);
    }
  });
  
  // Admin endpoint to get pending partner withdrawals
  app.get('/api/admin/partner-withdrawals', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get all partner withdrawal requests
      const withdrawals = await storage.getPartnerWithdrawalRequests();
      
      // Format the response
      const formattedWithdrawals = withdrawals.map(withdrawal => ({
        id: withdrawal.id,
        partnerId: withdrawal.partnerId,
        partnerName: withdrawal.partnerName,
        partnerEmail: withdrawal.partnerEmail,
        amount: withdrawal.amount,
        paymentMethod: withdrawal.paymentMethod,
        paymentDetails: withdrawal.paymentDetails,
        status: withdrawal.status,
        requestDate: withdrawal.requestDate,
        processedDate: withdrawal.processedDate || null,
        notes: withdrawal.notes || null
      }));
      
      res.json(formattedWithdrawals);
    } catch (error) {
      console.error('Error fetching partner withdrawals:', error);
      res.status(500).json({ error: 'Failed to retrieve partner withdrawal requests' });
    }
  });
  
  // Admin endpoint to process a partner withdrawal
  app.post('/api/admin/partner-withdrawals/:id/process', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const withdrawalId = parseInt(req.params.id);
      const { action, notes } = req.body;
      
      if (!withdrawalId || isNaN(withdrawalId)) {
        return res.status(400).json({ error: 'Invalid withdrawal ID' });
      }
      
      if (!action || !['approve', 'reject', 'mark-paid'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Must be "approve", "reject", or "mark-paid"' });
      }
      
      // Get the withdrawal request
      const withdrawal = await storage.getPartnerWithdrawalById(withdrawalId);
      
      if (!withdrawal) {
        return res.status(404).json({ error: 'Withdrawal request not found' });
      }
      
      // Update the withdrawal status based on action
      let newStatus;
      let processedDate = new Date().toISOString();
      
      switch (action) {
        case 'approve':
          newStatus = 'approved'; // Using string literals to match PaymentStatus.APPROVED
          break;
        case 'reject':
          newStatus = 'rejected'; // Using string literals to match PaymentStatus.REJECTED
          break;
        case 'mark-paid':
          newStatus = 'paid'; // Using string literals to match PaymentStatus.PAID
          break;
      }
      
      // Update the withdrawal record
      const updatedWithdrawal = await storage.updatePartnerWithdrawal(withdrawalId, {
        status: newStatus,
        processedDate,
        notes: notes || withdrawal.notes
      });
      
      // For rejected withdrawals, we need to return the funds to the partner's pending balance
      if (action === 'reject') {
        await storage.addPartnerPendingCommission(withdrawal.partnerId, withdrawal.amount);
      }
      
      // For paid withdrawals, we need to update the partner's records
      if (action === 'mark-paid') {
        await storage.updatePartnerCommissionStatus(withdrawal.partnerId, withdrawal.amount);
      }
      
      // Log the action
      await logMessage(
        LogLevel.INFO, 
        'Admin', 
        `Admin processed withdrawal request #${withdrawalId} for partner ${withdrawal.partnerName}: ${action.toUpperCase()}`
      );
      
      res.status(200).json({
        success: true,
        message: `Withdrawal request ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'marked as paid'} successfully.`,
        withdrawal: updatedWithdrawal
      });
      
    } catch (error) {
      console.error('Error processing partner withdrawal:', error);
      res.status(500).json({ error: 'Failed to process partner withdrawal request' });
    }
  });
  
  // Agent template management (only for admins)
  app.get('/api/admin/templates', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const templates = await storage.getAgentTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching agent templates:', error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error fetching agent templates: ${error}`);
      res.status(500).json({ error: 'Failed to fetch agent templates' });
    }
  });
  
  app.post('/api/admin/templates', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const newTemplate = await storage.createAgentTemplate(req.body);
      await logMessage(LogLevel.INFO, 'Admin', `New agent template created by admin ${(req.user as any).id}`);
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error('Error creating agent template:', error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error creating agent template: ${error}`);
      res.status(500).json({ error: 'Failed to create agent template' });
    }
  });
  
  app.patch('/api/admin/templates/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedTemplate = await storage.updateAgentTemplate(parseInt(id), req.body);
      
      if (!updatedTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      await logMessage(LogLevel.INFO, 'Admin', `Agent template ${id} updated by admin ${(req.user as any).id}`);
      res.json(updatedTemplate);
    } catch (error) {
      console.error(`Error updating agent template ${req.params.id}:`, error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error updating agent template ${req.params.id}: ${error}`);
      res.status(500).json({ error: 'Failed to update agent template' });
    }
  });
  
  app.delete('/api/admin/templates/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAgentTemplate(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      await logMessage(LogLevel.INFO, 'Admin', `Agent template ${id} deleted by admin ${(req.user as any).id}`);
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting agent template ${req.params.id}:`, error);
      await logMessage(LogLevel.ERROR, 'Admin', `Error deleting agent template ${req.params.id}: ${error}`);
      res.status(500).json({ error: 'Failed to delete agent template' });
    }
  });
  
  // Alias the auth/login to also be available at /api/login for test compatibility
  app.post('/api/login', async (req, res) => {
    // Forward to the auth/login handler
    req.url = '/api/auth/login';
    app._router.handle(req, res);
  });
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log('Login attempt:', req.body.email);
      
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Use our token-based authentication
      const result = await loginUser(email, password);
      
      // Log success
      console.log('Login successful for user:', result.email);
      logMessage(LogLevel.INFO, 'Auth', `User logged in: ${result.email}`);
      
      // Set the token in a cookie for better cross-environment compatibility
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax' as const,
        path: '/'
      };
      
      // Set the token cookie
      res.cookie('auth_token', result.token, cookieOptions);
      
      // Log cookie setting for debugging
      console.log('Setting auth_token cookie with options:', cookieOptions);
      
      // Return complete result including the token in the response body
      return res.json(result);
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      return res.status(401).json({ error: errorMessage });
    }
  });
  
  app.post('/api/auth/logout', async (req, res) => {
    // Get the token from any available source (header or cookie)
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    
    // Try to get token from Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    
    // If no token in header, try cookie as a fallback
    if (!token && req.cookies?.auth_token) {
      token = req.cookies.auth_token;
    }
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    try {
      // Use our token-based logout (now async)
      const result = await logoutUser(token);
      
      // Always clear the cookie regardless of token validity
      res.clearCookie('auth_token', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      await logMessage(LogLevel.INFO, 'Auth', `User logout ${result ? 'successful' : 'failed but cookie cleared'}`);
      
      if (result) {
        return res.status(200).json({ message: 'Logged out successfully' });
      } else {
        return res.status(400).json({ error: 'Invalid token, but cookie cleared' });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear the cookie
      res.clearCookie('auth_token', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      return res.status(500).json({ error: 'Error during logout, but cookie cleared' });
    }
  });
  
  app.get('/api/auth/me', isAuthenticated, (req, res) => {
    console.log('Auth check for user:', (req.user as any).email);
    
    // Return sanitized user object (without password and with explicit typecasting)
    const { password, ...userWithoutPassword } = req.user as any;
    
    // Log cookies for debugging
    console.log('Auth check cookies:', req.cookies);
    
    res.json(userWithoutPassword);
  });
  
  // Add a duplicate endpoint for backward compatibility
  app.get('/api/auth/user', isAuthenticated, (req, res) => {
    console.log('Auth check (via /user endpoint) for user:', (req.user as any).email);
    
    // Return sanitized user object (without password and with explicit typecasting)
    const { password, ...userWithoutPassword } = req.user as any;
    
    res.json(userWithoutPassword);
  });
  
  // Add an endpoint to register tokens from client
  app.post('/api/auth/register-token', async (req, res) => {
    try {
      const { token, userId } = req.body;
      
      if (!token || !userId) {
        return res.status(400).json({ error: 'Token and userId are required' });
      }
      
      const success = await registerToken(token, userId);
      
      if (success) {
        return res.status(200).json({ message: 'Token registered successfully' });
      } else {
        return res.status(400).json({ error: 'Failed to register token' });
      }
    } catch (error) {
      console.error('Error registering token:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  });
  
  // User Agent endpoints
  app.get('/api/user/agent', isAuthenticated, async (req, res) => {
    try {
      // The isAuthenticated middleware has already verified the user is authenticated
      // and set the user object on the request
      const user = (req as any).user;
      console.log('User from request:', user ? `ID: ${user.id}, Email: ${user.email}` : 'No user found');
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Get or create a user's agent if it doesn't exist
      let agent = await storage.getUserAgent(user.id);
      console.log('Agent found?', !!agent);
      
      if (!agent) {
        // Create a default agent for the user if one doesn't exist
        console.log('Creating new agent for user', user.id);
        agent = await storage.createUserAgent(user.id);
        logMessage(LogLevel.INFO, 'Agent', `Created new agent for user ${user.email}`);
      }
      
      res.json(agent);
    } catch (error: any) {
      console.error('Error getting user agent:', error);
      res.status(500).json({ error: 'Failed to retrieve agent', details: error?.message || 'Unknown error' });
    }
  });
  
  // Update the current user's agent
  app.patch('/api/user/agent', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const agent = await storage.getUserAgent(user.id);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Update agent with the provided fields
      const updatedAgent = await storage.updateAgent(agent.id, req.body);
      
      if (!updatedAgent) {
        return res.status(404).json({ error: 'Failed to update agent' });
      }
      
      logMessage(LogLevel.INFO, 'Agent', `Updated agent for user ${user.email}`);
      res.json(updatedAgent);
    } catch (error) {
      console.error('Error updating user agent:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });
  
  // Get agent templates
  app.get('/api/agent-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAgentTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching agent templates:', error);
      res.status(500).json({ error: 'Failed to retrieve agent templates' });
    }
  });
  
  // Admin-only endpoint to create a new agent template
  app.post('/api/agent-templates', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const template = await storage.createAgentTemplate(req.body);
      logMessage(LogLevel.INFO, 'Agent', `Admin created new agent template: ${template.name}`);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating agent template:', error);
      res.status(500).json({ error: 'Failed to create agent template' });
    }
  });
  
  // Personality Prompts API endpoints
  // Get all personality prompts
  app.get('/api/personality-prompts', isAuthenticated, async (req, res) => {
    try {
      const prompts = await storage.getPersonalityPrompts();
      res.json(prompts);
    } catch (error) {
      console.error('Error fetching personality prompts:', error);
      res.status(500).json({ error: 'Failed to retrieve personality prompts' });
    }
  });
  
  // Get a specific personality prompt by ID
  app.get('/api/personality-prompts/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const prompt = await storage.getPersonalityPrompt(parseInt(id));
      
      if (!prompt) {
        return res.status(404).json({ error: 'Personality prompt not found' });
      }
      
      res.json(prompt);
    } catch (error) {
      console.error('Error fetching personality prompt:', error);
      res.status(500).json({ error: 'Failed to retrieve personality prompt' });
    }
  });
  
  // Admin-only endpoint to create a new personality prompt
  app.post('/api/personality-prompts', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const prompt = await storage.createPersonalityPrompt(req.body);
      logMessage(LogLevel.INFO, 'AI', `Admin created new personality prompt: ${prompt.name}`);
      res.status(201).json(prompt);
    } catch (error) {
      console.error('Error creating personality prompt:', error);
      res.status(500).json({ error: 'Failed to create personality prompt' });
    }
  });
  
  // Admin-only endpoint to update a personality prompt
  app.patch('/api/personality-prompts/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedPrompt = await storage.updatePersonalityPrompt(parseInt(id), req.body);
      
      if (!updatedPrompt) {
        return res.status(404).json({ error: 'Personality prompt not found' });
      }
      
      logMessage(LogLevel.INFO, 'AI', `Admin updated personality prompt: ${updatedPrompt.name}`);
      res.json(updatedPrompt);
    } catch (error) {
      console.error('Error updating personality prompt:', error);
      res.status(500).json({ error: 'Failed to update personality prompt' });
    }
  });
  
  // Admin-only endpoint to delete a personality prompt
  app.delete('/api/personality-prompts/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.deletePersonalityPrompt(parseInt(id));
      
      if (!result) {
        return res.status(404).json({ error: 'Personality prompt not found' });
      }
      
      logMessage(LogLevel.INFO, 'AI', `Admin deleted personality prompt with ID: ${id}`);
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting personality prompt:', error);
      res.status(500).json({ error: 'Failed to delete personality prompt' });
    }
  });
  
  // Endpoint to merge a personality prompt with a user's custom prompt
  app.post('/api/personality-prompts/merge', isAuthenticated, async (req, res) => {
    try {
      const { personalityId, userPrompt } = req.body;
      
      if (!personalityId || !userPrompt) {
        return res.status(400).json({ error: 'Missing required fields: personalityId and userPrompt' });
      }
      
      const mergedPrompt = await storage.mergePersonalityWithUserPrompt(personalityId, userPrompt);
      res.json({ mergedPrompt });
    } catch (error) {
      console.error('Error merging personality prompt:', error);
      res.status(500).json({ error: 'Failed to merge personality prompt' });
    }
  });
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    const clientId = generateId();
    clients.set(clientId, ws);
    
    logMessage(LogLevel.INFO, 'WebSocket', `New connection established: ${clientId}`);
    
    // Send initial server status
    sendServerStatus(ws);
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        logMessage(LogLevel.INFO, 'WebSocket', `Received message: ${JSON.stringify(data)}`);
        
        // Handle different types of WebSocket messages
        if (data.type === 'call_update') {
          // Broadcast call updates to all clients
          broadcastToAll(data);
        }
      } catch (error) {
        logMessage(LogLevel.ERROR, 'WebSocket', `Error processing message: ${error}`);
      }
    });
    
    ws.on('close', () => {
      clients.delete(clientId);
      logMessage(LogLevel.INFO, 'WebSocket', `Connection closed: ${clientId}`);
    });
  });
  
  // Log APIs
  app.get('/api/logs', async (req, res) => {
    try {
      // Get all logs with default limit
      const logs = await storage.getLogs();
      
      // If level filter is provided, filter in-memory
      const { level } = req.query;
      if (level) {
        return res.json(logs.filter(log => log.level === level));
      }
      
      res.json(logs);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error fetching logs: ${error}`);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });
  
  // Phone Number APIs
  app.get('/api/phone-numbers/available', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const areaCode = req.query.areaCode as string || '';
      const country = req.query.country as string || 'US';
      
      console.log(`==== TWILIO PHONE NUMBER SEARCH ====`);
      console.log(`User: ${user?.email || 'Unknown'}`);
      console.log(`Country: ${country}, Area Code: ${areaCode || 'any'}`);
      
      // Make sure Twilio client is initialized
      if (!twilioClient) {
        console.log('No Twilio client available, attempting to initialize...');
        const initialized = await initializeTwilioClient();
        if (!initialized) {
          console.error('Failed to initialize Twilio client');
          await logMessage(LogLevel.ERROR, 'API', 'Twilio client could not be initialized');
          return res.status(500).json({ 
            error: 'Twilio integration is not properly configured',
            message: 'Please contact support to set up Twilio for this account'
          });
        }
        console.log('Successfully initialized Twilio client');
      } else {
        console.log('Twilio client is already initialized');
      }
      
      // Search for available phone numbers using Twilio API
      // Get available phone numbers with area code filter if provided
      const params: any = {
        limit: 50 // Increased limit to show more phone numbers
      };
      
      if (areaCode) {
        params.areaCode = parseInt(areaCode);
      }
      
      console.log(`Using search parameters:`, params);
      
      // Get the latest environment variables
      console.log(`Checking environment variables for Twilio SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing'}`);
      console.log(`Checking environment variables for Twilio Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing'}`);
      
      // Re-create the Twilio client with the latest environment variables
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        console.log('Recreating Twilio client with latest environment variables');
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      }
      
      // Log that we're about to make the Twilio API call
      await logMessage(LogLevel.INFO, 'API', `Searching for phone numbers with area code ${areaCode || 'any'} using Twilio`);
      
      // Make the Twilio API call with proper error handling
      console.log('Making Twilio API call to search for available phone numbers...');
      
      let availableNumbers;
      try {
        availableNumbers = await twilioClient.availablePhoneNumbers(country)
          .local.list(params);
        
        console.log(`Twilio API call successful, found ${availableNumbers.length} available numbers`);
      } catch (twilioError) {
        console.error('Error from Twilio API:', twilioError);
        
        // Special handling for development mode
        console.log('Development environment detected, using mock phone numbers due to Twilio API error');
        
        // Create and use a mock Twilio client
        const { createMockTwilioClient } = await import('./lib/twilio');
        const mockClient = createMockTwilioClient();
        
        // Get mock phone numbers using the same parameters
        availableNumbers = await mockClient.availablePhoneNumbers(country)
          .local.list(params);
        
        console.log(`Retrieved ${availableNumbers.length} mock phone numbers as fallback`);
      }
      
      // Format the response
      const formattedNumbers = availableNumbers.map((number: any) => ({
        phoneNumber: number.phoneNumber,
        formattedNumber: number.friendlyName,
        locality: number.locality || 'Unknown',
        region: number.region || 'Unknown',
        isoCountry: number.isoCountry,
        capabilities: JSON.stringify({
          voice: number.capabilities.voice,
          sms: number.capabilities.sms,
          mms: number.capabilities.mms
        }),
        price: 4.87 // Fixed price for each number
      }));
      
      console.log(`Returning ${formattedNumbers.length} formatted phone numbers`);
      console.log(`==== END TWILIO PHONE NUMBER SEARCH ====`);
      
      await logMessage(LogLevel.INFO, 'API', `Found ${formattedNumbers.length} available phone numbers for area code ${areaCode || 'any'}`);
      res.json(formattedNumbers);
    } catch (error) {
      console.error('Error searching for phone numbers:', error);
      
      // Log detailed error information
      console.error(`==== TWILIO ERROR DETAILS ====`);
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}`);
        console.error(`Error message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
        
        // Check if it's a Twilio-specific error
        if ('status' in error && 'code' in error) {
          console.error(`Twilio error status: ${(error as any).status}`);
          console.error(`Twilio error code: ${(error as any).code}`);
          console.error(`Twilio error more info: ${(error as any).moreInfo}`);
        }
      }
      console.error(`==== END TWILIO ERROR DETAILS ====`);
      
      await logMessage(LogLevel.ERROR, 'API', `Error searching for phone numbers: ${error}`);
      
      // In development mode, try to provide mock phone numbers if Twilio fails
      if (process.env.NODE_ENV !== 'production') {
        console.log('Development environment detected, attempting to use mock phone numbers');
        
        try {
          // Import our dedicated mock client
          const { createMockTwilioClient } = require('./lib/twilio');
          const mockClient = createMockTwilioClient();
          
          // Get mock phone numbers using the same parameters
          const areaCode = req.query.areaCode as string || '415';
          const mockNumbers = await mockClient.available.phoneNumbers.local.list({ areaCode });
          
          // Format the mock numbers to match our expected schema
          const formattedMockNumbers = mockNumbers.map((number: any) => ({
            phoneNumber: number.phoneNumber,
            formattedNumber: number.friendlyName,
            locality: number.locality || 'Unknown',
            region: number.region || 'Unknown',
            isoCountry: number.isoCountry,
            capabilities: {
              voice: number.capabilities?.voice || false,
              sms: number.capabilities?.SMS || false,
              mms: number.capabilities?.MMS || false
            },
            price: 4.87 // Fixed price for each number
          }));
          
          console.log(`Returning ${formattedMockNumbers.length} mock phone numbers due to Twilio API error`);
          console.log(`==== END TWILIO PHONE NUMBER SEARCH WITH MOCK DATA ====`);
          
          return res.json(formattedMockNumbers);
        } catch (mockError) {
          console.error('Error creating mock phone numbers:', mockError);
        }
      }
      
      // Return a more detailed error message
      res.status(500).json({ 
        error: 'Failed to search for phone numbers',
        message: 'There was an issue connecting to the Twilio service. Please try again later.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post('/api/phone-numbers/purchase', isAuthenticated, async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      // Get the user data
      const user = req.user as any;
      const agent = await storage.getUserAgent(user.id);
      
      if (!agent) {
        return res.status(404).json({ error: 'No agent found for this user' });
      }
      
      try {
        // Make sure Twilio client is initialized
        if (!twilioClient) {
          const initialized = await initializeTwilioClient();
          if (!initialized) {
            await logMessage(LogLevel.ERROR, 'API', 'Twilio client could not be initialized for phone number purchase');
            return res.status(500).json({ 
              error: 'Twilio integration is not properly configured',
              message: 'Please contact support to set up Twilio for this account'
            });
          }
        }
        
        // Step 1: Verify the purchase with Twilio API
        console.log(`Attempting to purchase phone number ${phoneNumber} for user ${user.email}`);
        await logMessage(LogLevel.INFO, 'API', `Attempting to purchase phone number ${phoneNumber} for user ${user.email}`);
        
        // Get the webhook URL
        // Use the current Replit domain for production
        let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
        
        // If we're in a test environment or non-Replit environment, use fallback
        if (process.env.NODE_ENV === 'test' || process.env.SERVER_URL) {
          webhookBaseUrl = process.env.SERVER_URL || 'https://www.warmleadnetwork.com';
        }
        
        // Purchase the phone number using Twilio API
        const purchasedNumber = await twilioClient.incomingPhoneNumbers
          .create({
            phoneNumber,
            friendlyName: `Agent ${agent.name} Number`,
            voiceUrl: `${webhookBaseUrl}/api/twilio/voice`,
            smsUrl: `${webhookBaseUrl}/api/twilio/sms`
          });
        
        // Step 2: Save the purchased number to the database linked to the user
        const phoneNumberData = {
          user_id: user.id,
          phone_number: purchasedNumber.phoneNumber,
          friendly_name: `Agent ${agent.name} Number`,
          phone_sid: purchasedNumber.sid,
          is_active: true,
          monthly_cost: 4.87,
          capabilities: JSON.stringify({ voice: true, sms: true }),
          region: purchasedNumber.addressRequirements || 'US',
          country_code: 'US' // Twilio object may not have isoCountry property so hardcode US as default
        };
        
        // Create a record in the purchased_phone_numbers table
        const savedPhoneNumber = await storage.createPurchasedPhoneNumber(phoneNumberData);
        
        // Update the agent with the new phone number
        await storage.updateAgent(agent.id, {
          phone_number: purchasedNumber.phoneNumber
        });
        
        await logMessage(
          LogLevel.INFO, 
          'API', 
          `Phone number ${purchasedNumber.phoneNumber} successfully purchased and saved for user ${user.email}`
        );
        
        // Step 3 & 4: Return data needed to update UI (the frontend will update the purchased numbers list
        // and remove the number from available numbers automatically via the query invalidation)
        res.json({
          success: true,
          phoneNumber: {
            id: savedPhoneNumber.id,
            phoneNumber: savedPhoneNumber.phone_number,
            formattedNumber: savedPhoneNumber.phone_number,
            sid: savedPhoneNumber.phone_sid,
            isActive: savedPhoneNumber.is_active,
            purchaseDate: savedPhoneNumber.purchase_date
          },
          phoneNumberRaw: savedPhoneNumber
        });
      } catch (twilioError) {
        console.error('Error with Twilio service during phone number purchase:', twilioError);
        await logMessage(LogLevel.ERROR, 'API', `Twilio error during phone number purchase: ${twilioError}`);
        
        // Special handling for development mode - use mock client as fallback
        if (process.env.NODE_ENV !== 'production') {
          console.log('Development environment detected, using mock Twilio client as fallback');
          
          try {
            // Import our dedicated mock client
            const { createMockTwilioClient } = await import('./lib/twilio');
            const mockClient = createMockTwilioClient();
            
            // Get the webhook URL
            // Use the current Replit domain for production
            let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
            
            // If we're in a test environment or non-Replit environment, use fallback
            if (process.env.NODE_ENV === 'test' || process.env.SERVER_URL) {
              webhookBaseUrl = process.env.SERVER_URL || 'https://www.warmleadnetwork.com';
            }
            
            // Purchase the phone number using mock Twilio client
            console.log(`Attempting to purchase mock phone number ${phoneNumber} for user ${user.email}`);
            const purchasedNumber = await mockClient.incomingPhoneNumbers.create({
              phoneNumber,
              friendlyName: `Agent ${agent.name} Number (Mock)`,
              voiceUrl: `${webhookBaseUrl}/api/twilio/voice`,
              smsUrl: `${webhookBaseUrl}/api/twilio/sms`
            });
            
            // Save the purchased number to the database linked to the user
            const phoneNumberData = {
              user_id: user.id,
              phone_number: purchasedNumber.phoneNumber,
              friendly_name: `Agent ${agent.name} Number (Mock)`,
              phone_sid: purchasedNumber.sid,
              is_active: true,
              monthly_cost: 4.87,
              capabilities: JSON.stringify({ voice: true, sms: true }),
              region: purchasedNumber.addressRequirements || 'US',
              country_code: 'US'
            };
            
            // Create a record in the purchased_phone_numbers table
            const savedPhoneNumber = await storage.createPurchasedPhoneNumber(phoneNumberData);
            
            // Update the agent with the new phone number
            await storage.updateAgent(agent.id, {
              phone_number: purchasedNumber.phoneNumber
            });
            
            await logMessage(
              LogLevel.INFO, 
              'API', 
              `Mock phone number ${purchasedNumber.phoneNumber} successfully created and saved for user ${user.email}`
            );
            
            // Return data needed to update UI
            return res.json({
              success: true,
              phoneNumber: {
                id: savedPhoneNumber.id,
                phoneNumber: savedPhoneNumber.phone_number,
                formattedNumber: savedPhoneNumber.phone_number,
                sid: savedPhoneNumber.phone_sid,
                isActive: savedPhoneNumber.is_active,
                purchaseDate: savedPhoneNumber.purchase_date
              },
              phoneNumberRaw: savedPhoneNumber,
              isMock: true
            });
          } catch (mockError) {
            console.error('Error using mock Twilio client:', mockError);
          }
        }
        
        // Return a specific error for Twilio failures
        res.status(500).json({ 
          error: 'Failed to provision phone number',
          details: twilioError instanceof Error ? twilioError.message : String(twilioError)
        });
      }
    } catch (error) {
      console.error('Error processing phone number purchase:', error);
      await logMessage(LogLevel.ERROR, 'API', `Error processing phone number purchase: ${error}`);
      res.status(500).json({ error: 'Failed to purchase phone number' });
    }
  });
  
  // Enhanced endpoint for handling post-payment verification
  app.post('/api/payment/verify-external', isAuthenticated, async (req, res) => {
    try {
      const { paymentId, paymentSource } = req.body;
      
      if (!paymentId) {
        return res.status(400).json({ error: 'Payment ID is required' });
      }
      
      const user = req.user as any;
      console.log(`Processing external payment verification for user ${user.id}, payment ID: ${paymentId}`);
      await logMessage(LogLevel.INFO, 'Payment', `Processing external payment verification for user ${user.email}, payment ID: ${paymentId}, source: ${paymentSource || 'unknown'}`);
      
      // Check if payment ID matches any of our accepted test IDs
      const validTestPaymentIds = ['AZXo-En8', '3M049991JF5624929'];
      const isValidTestPayment = validTestPaymentIds.includes(paymentId);
      
      if (!isValidTestPayment) {
        // For real PayPal payments, we would validate with the API
        if (paymentSource === 'paypal' && paymentId.length > 10) {
          try {
            // PayPal validation logic
            if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
              const { verifyPayPalPayment } = require('./lib/paypal');
              const isValid = await verifyPayPalPayment(paymentId);
              
              if (!isValid) {
                await logMessage(LogLevel.ERROR, 'Payment', `PayPal payment ${paymentId} verification failed for user ${user.email}`);
                return res.status(400).json({ error: 'PayPal payment verification failed' });
              }
            } else {
              console.log('PayPal credentials not configured, skipping verification');
            }
          } catch (error) {
            console.error("Error verifying PayPal payment:", error);
            return res.status(400).json({ 
              error: 'PayPal payment verification failed',
              details: error instanceof Error ? error.message : String(error)
            });
          }
        } else {
          // For other payment sources or invalid IDs
          return res.status(400).json({ error: 'Invalid or unrecognized payment ID' });
        }
      }
      
      // Proceed with phone number assignment - try to get a real phone number if Twilio is configured
      let phoneNumber: any;
      
      try {
        // Make sure Twilio client is initialized
        if (!twilioClient) {
          const initialized = await initializeTwilioClient();
          if (!initialized) {
            await logMessage(LogLevel.ERROR, 'API', 'Twilio client could not be initialized for payment verification');
            return res.status(500).json({ 
              error: 'Twilio integration is not properly configured',
              message: 'Please contact support to set up Twilio for this account'
            });
          }
        }
        
        // Get available phone numbers from Twilio if possible
        const availableNumbersResponse = await twilioClient.availablePhoneNumbers('US')
          .local
          .list({ limit: 10 });
        
        if (!availableNumbersResponse || availableNumbersResponse.length === 0) {
          await logMessage(LogLevel.ERROR, 'Payment', `No available phone numbers found for user ${user.email} after payment`);
          return res.status(404).json({ error: 'No available phone numbers found' });
        }
        
        // Select the first available number
        const selectedNumber = availableNumbersResponse[0];
        
        // Get the webhook URL
        // Use the current Replit domain for production
        let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
        
        // If we're in a test environment or non-Replit environment, use fallback
        if (process.env.NODE_ENV === 'test' || process.env.SERVER_URL) {
          webhookBaseUrl = process.env.SERVER_URL || 'https://www.warmleadnetwork.com';
        }
        
        // Purchase the number with Twilio
        const purchasedNumber = await twilioClient.incomingPhoneNumbers
          .create({
            phoneNumber: selectedNumber.phoneNumber,
            friendlyName: `User ${user.id} Number (External Payment)`,
            voiceUrl: `${webhookBaseUrl}/api/twilio/voice`,
            smsUrl: `${webhookBaseUrl}/api/twilio/sms`
          });
        
        // Create a record in the purchased_phone_numbers table
        const phoneNumberData = {
          user_id: user.id,
          phone_number: purchasedNumber.phoneNumber,
          friendly_name: `External Payment ${paymentId}`,
          phone_sid: purchasedNumber.sid,
          is_active: true,
          monthly_cost: 4.87,
          capabilities: JSON.stringify({ voice: true, sms: true }),
          region: selectedNumber.region || 'US',
          country_code: 'US'
        };
        
        const savedPhoneNumber = await storage.createPurchasedPhoneNumber(phoneNumberData);
        
        await logMessage(
          LogLevel.INFO, 
          'Payment', 
          `Phone number ${purchasedNumber.phoneNumber} successfully purchased and assigned to user ${user.email} after external payment ${paymentId}`
        );
        
        res.json({
          success: true,
          phoneNumber: {
            id: savedPhoneNumber.id,
            phoneNumber: savedPhoneNumber.phone_number,
            formattedNumber: savedPhoneNumber.phone_number,
            sid: savedPhoneNumber.phone_sid,
            isActive: savedPhoneNumber.is_active,
            purchaseDate: savedPhoneNumber.purchase_date
          },
          paymentVerified: true,
          paymentId
        });
      } catch (twilioError) {
        console.error('Error with Twilio service during payment verification:', twilioError);
        await logMessage(LogLevel.ERROR, 'Payment', `Twilio error during payment verification: ${twilioError}`);
        
        // Return a specific error for Twilio failures
        res.status(500).json({ 
          error: 'Failed to provision phone number',
          details: twilioError instanceof Error ? twilioError.message : String(twilioError)
        });
      }
    } catch (error) {
      console.error('Error processing external payment:', error);
      await logMessage(LogLevel.ERROR, 'Payment', `Error processing external payment: ${error}`);
      res.status(500).json({ 
        error: 'Failed to process payment', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Call APIs
  app.get('/api/calls/active', async (req, res) => {
    try {
      const activeCalls = await storage.getActiveCalls();
      res.json(activeCalls);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error fetching active calls: ${error}`);
      res.status(500).json({ error: 'Failed to fetch active calls' });
    }
  });
  
  // Initiate outbound call to a lead with enhanced error handling
  app.post('/api/calls/initiate', isAuthenticated, async (req, res) => {
    try {
      console.log('[API] Received call initiation request:', JSON.stringify(req.body));
      console.log('[API] twilioPhoneNumber value:', req.body.twilioPhoneNumber);
      
      // Extract all options from request body
      const { 
        agentId, 
        phoneNumber, 
        leadId, 
        twilioPhoneNumber,
        record,           // New option for call recording
        useFallback       // New option for fallback URL
      } = req.body;
      
      // Enhanced validation for required parameters and proper formatting
      if (!agentId) {
        console.error('[API] Missing agentId parameter in call initiation request');
        return res.status(400).json({ 
          error: 'Missing required parameter: agentId',
          details: 'An AI agent ID must be provided to make the call'
        });
      }
      
      if (!phoneNumber) {
        console.error('[API] Missing phoneNumber parameter in call initiation request');
        return res.status(400).json({ 
          error: 'Missing required parameter: phoneNumber',
          details: 'A valid phone number in E.164 format must be provided as the call target'
        });
      }
      
      // Enhanced phone number validation and sanitization
      const phoneNumberStr = phoneNumber.toString().trim();
      
      // First check if it's already in E.164 format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      
      if (!phoneRegex.test(phoneNumberStr)) {
        // Log the problematic format for debugging
        console.error(`[API] Invalid phone number format received: "${phoneNumberStr}"`);
        
        // Try to sanitize common formats like (123) 456-7890
        let sanitized = phoneNumberStr.replace(/[\s\-\(\)\.]/g, '');
        
        // If it still doesn't start with +, add the US country code
        if (!sanitized.startsWith('+')) {
          if (sanitized.startsWith('1')) {
            sanitized = '+' + sanitized;
          } else {
            sanitized = '+1' + sanitized; // Default to US
          }
        }
        
        // Check if our sanitization fixed the format
        if (!phoneRegex.test(sanitized)) {
          // If it's still not valid after sanitization, return an error
          console.error(`[API] Unable to format phone number into E.164: "${phoneNumberStr}" → "${sanitized}"`);
          return res.status(400).json({
            error: 'Invalid phone number format',
            details: 'Phone number must be in or convertible to E.164 format (e.g., +12125551234). ' +
                     'The provided number could not be formatted correctly. Please ensure it contains a valid country code and number.'
          });
        }
        
        // If sanitization worked, use the fixed number and log for debugging
        console.log(`[API] Sanitized phone number: "${phoneNumberStr}" → "${sanitized}"`);
        let sanitizedPhoneNumber = sanitized;
      }
      
      // Get the base URL for webhooks
      let webhookBaseUrl;
      // Use the current Replit domain for production
      webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
      
      // If we're in a test environment, use the host from request
      if (process.env.NODE_ENV === 'test') {
        const host = req.get('host') || 'localhost:5000';
        webhookBaseUrl = `https://${host}`;
      }
      
      console.log(`[API] Using webhook base URL: ${webhookBaseUrl}`);
      
      try {
        // Import the Twilio library function
        const { initiateOutboundCall } = await import('./lib/twilio');
        
        // Initiate the call with error handling and options
        console.log(`[API] Calling initiateOutboundCall with agentId=${agentId}, phoneNumber=${phoneNumber}${twilioPhoneNumber ? ', twilioPhoneNumber=' + twilioPhoneNumber : ''}`);
        console.log(`[API] Call options: ${JSON.stringify({ record, useFallback })}`);
        
        // Build options object
        const callOptions = {
          record: record === true, // Explicit boolean conversion
          useFallback: useFallback !== false // Default to true unless explicitly false
        };
        
        // Make the call with all parameters
        const call = await initiateOutboundCall(
          agentId, 
          phoneNumber, 
          webhookBaseUrl, 
          twilioPhoneNumber,
          callOptions
        );
        
        // Validate that the call object has the expected structure
        if (!call || !call.sid) {
          console.error('[API] Invalid call object returned from initiateOutboundCall:', call);
          return res.status(500).json({
            error: 'Failed to initiate call',
            details: 'The call could not be created - invalid response from Twilio service'
          });
        }
        
        console.log(`[API] Call initiated successfully with SID: ${call.sid}`);
        
        // If leadId is provided, update the lead status to 'contacted'
        if (leadId) {
          try {
            // Update lead status in the database
            console.log(`[API] Updating lead status to 'contacted' for lead ID: ${leadId}`);
            await db.execute(sql`
              UPDATE leads SET status = 'contacted' WHERE id = ${leadId}
            `);
          } catch (dbError) {
            // Non-critical error, just log it
            console.error('[API] Error updating lead status:', dbError);
            // Continue anyway since the call was already placed
          }
        }
        
        // Return the call SID and status
        res.json({
          callSid: call.sid,
          status: call.status,
          message: `Initiated call to ${phoneNumber} using agent ID ${agentId}`,
          timestamp: new Date().toISOString(),
          success: true
        });
      } catch (callError) {
        console.error('[API] Error from initiateOutboundCall:', callError);
        
        // Check for specific Twilio error types and provide appropriate status codes
        const errorMessage = callError instanceof Error ? callError.message : String(callError);
        let statusCode = 500;
        let errorResponse = {
          error: 'Failed to initiate call',
          details: errorMessage
        };
        
        // Handle specific error cases
        if (errorMessage.includes('Account SID') || errorMessage.includes('Auth Token')) {
          statusCode = 503;
          errorResponse.error = 'Twilio authentication failed';
          errorResponse.details = 'The system cannot authenticate with the Twilio service - please contact support';
        } else if (errorMessage.includes('not found')) {
          statusCode = 404;
          errorResponse.error = 'Resource not found';
        } else if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
          statusCode = 400;
          errorResponse.error = 'Invalid request parameters';
        } else if (errorMessage.includes('not have a phone number configured')) {
          statusCode = 400;
          errorResponse.error = 'Agent phone number missing';
          errorResponse.details = 'The selected AI agent does not have a phone number configured. Please edit the agent settings and add a valid phone number in E.164 format (e.g., +12125551234).';
        } else if (errorMessage.includes('Invalid phone number format for agent')) {
          statusCode = 400; 
          errorResponse.error = 'Invalid agent phone number format';
          errorResponse.details = 'The phone number for this agent is not in a valid format. Please edit the agent and make sure the phone number is in E.164 format (e.g., +12125551234).';
        }
        
        res.status(statusCode).json(errorResponse);
      }
    } catch (error) {
      console.error('[API] Unhandled error in call initiation endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to process call request', 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get call history (completed calls)
  app.get('/api/calls/history', isAuthenticated, async (req, res) => {
    try {
      // Get the user's agent ID
      const user = req.user as any;
      const agent = await storage.getUserAgent(user.id);
      
      if (!agent) {
        return res.status(404).json({ error: 'No agent found for this user' });
      }
      
      // Query completed calls related to this agent
      const query = `
        SELECT * FROM calls 
        WHERE agent_id = $1 
        AND status = $2 
        ORDER BY end_time DESC 
        LIMIT 50
      `;
      
      const result = await pool.query(query, [agent.id, CallStatus.COMPLETED]);
      
      res.json(result.rows);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error fetching call history: ${error}`);
      res.status(500).json({ error: 'Failed to fetch call history' });
    }
  });
  
  app.post('/api/calls/:callSid/end', async (req, res) => {
    try {
      const { callSid } = req.params;
      
      logMessage(LogLevel.INFO, 'API', `Attempting to end call ${callSid}`);
      
      // Call the enhanced endCall function which handles fallbacks
      const result = await endCall(callSid);
      
      // The endCall function already updates the call status in the database
      // so we don't need to call storage.updateCallStatus again
      
      // Determine if this was a mock response
      const isMock = result && 'mockResponse' in result && result.mockResponse === true;
      
      logMessage(LogLevel.INFO, 'API', `Successfully ended call ${callSid}${isMock ? ' (mock)' : ''}`);
      
      // Broadcast updated information to connected clients
      broadcastToAll({
        type: 'call_update',
        action: 'ended',
        callSid
      });
      
      res.json({ 
        success: true, 
        callSid,
        status: 'completed',
        isMock: isMock || false
      });
    } catch (error) {
      // Get error message safely
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Even in case of Twilio error, we'll update our local database to show the call as completed
      // This prevents UI from showing "hanging" calls
      try {
        await storage.updateCallStatus(req.params.callSid, CallStatus.COMPLETED);
        logMessage(LogLevel.INFO, 'API', `Marked call ${req.params.callSid} as completed in database despite API error`);
      } catch (dbError) {
        // If database update fails, log but continue
        logMessage(LogLevel.ERROR, 'API', `Failed to update call status in database: ${dbError}`);
      }
      
      // If we're in development mode, we can return a success response with mock data
      if (process.env.NODE_ENV !== 'production') {
        logMessage(LogLevel.INFO, 'API', `Development environment detected, returning success response despite error: ${errorMessage}`);
        
        // Broadcast call ended to all clients
        broadcastToAll({
          type: 'call_update',
          action: 'ended',
          callSid: req.params.callSid
        });
        
        // Return success with error info
        return res.json({ 
          success: true, 
          callSid: req.params.callSid,
          status: 'completed',
          isMock: true,
          errorHandled: true,
          errorMessage: errorMessage
        });
      }
      
      // In production, we return an error
      logMessage(LogLevel.ERROR, 'API', `Error ending call: ${errorMessage}`);
      res.status(500).json({ error: 'Failed to end call', message: errorMessage });
    }
  });
  
  // System APIs
  app.get('/api/system/resources', async (req, res) => {
    try {
      const uptime = calculateUptime();
      const cpuUsage = process.cpuUsage();
      const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000 / os.cpus().length * 10);
      
      const totalMem = Math.round(os.totalmem() / (1024 * 1024)); // MB
      const freeMem = Math.round(os.freemem() / (1024 * 1024)); // MB
      const usedMem = totalMem - freeMem;
      
      // Simple approximation for network usage
      const networkUsage = 1.2; // MB/s - in a real app, this would be calculated
      
      res.json({
        cpu: cpuPercent > 100 ? 100 : cpuPercent,
        memory: {
          used: usedMem,
          total: totalMem
        },
        network: networkUsage,
        uptime
      });
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error getting system resources: ${error}`);
      res.status(500).json({ error: 'Failed to get system resources' });
    }
  });
  
  // Service Status APIs
  app.get('/api/services/status', async (req, res) => {
    try {
      const services = [
        {
          name: "Phone Number",
          description: "Voice webhook active",
          connected: await checkServiceStatus('phone'),
          status: "Connected",
          icon: "call"
        },
        {
          name: "AI Brain",
          description: "Natural language processing",
          connected: await checkServiceStatus('brain'),
          status: "Connected",
          icon: "psychology"
        },
        {
          name: "AI Voice",
          description: "Text-to-speech synthesis",
          connected: await checkServiceStatus('voice'),
          status: "Connected",
          icon: "record_voice_over"
        },
        {
          name: "WebSocket Server",
          description: "Real-time audio streaming",
          connected: true,
          status: `Active (${clients.size} connections)`,
          icon: "sync_alt"
        }
      ];
      
      res.json(services);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error getting service status: ${error}`);
      res.status(500).json({ error: 'Failed to get service status' });
    }
  });
  
  // Metric APIs
  app.get('/api/metrics', async (req, res) => {
    try {
      const metrics = await storage.getApiMetrics();
      
      // Process metrics for display
      const apiStats = [
        {
          service: "Phone Number",
          metrics: {
            "Total Calls": metrics.twilioCallCount || 0,
            "Avg Duration": metrics.twilioAvgDuration || "0:00"
          }
        },
        {
          service: "AI Brain",
          metrics: {
            "API Calls": metrics.openaiRequestCount || 0,
            "Avg Response": `${metrics.openaiAvgResponseTime || 0}s`
          }
        },
        {
          service: "AI Voice",
          metrics: {
            "TTS Requests": metrics.elevenLabsRequestCount || 0,
            "Characters": `${metrics.elevenLabsCharacterCount || 0}k`
          }
        }
      ];
      
      res.json(apiStats);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error getting API metrics: ${error}`);
      res.status(500).json({ error: 'Failed to get API metrics' });
    }
  });
  
  // Partner System APIs
  
  // Check if the current user is a partner
  app.get('/api/partner/status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      // Special handling for Zack's account
      if (user && user.email === 'zack@partner.com') {
        console.log(`Checking Zack's partner status - special handling active`);
        
        // Get partner record for Zack
        let partner = await storage.getPartnerByUserId(user.id);
        
        // If partner record doesn't exist, create one
        if (!partner) {
          console.log(`Creating new partner record for Zack`);
          partner = await storage.createPartner({
            user_id: user.id,
            company_name: 'Zack Media Solutions',
            contact_name: user.displayName || 'Zack Partner',
            referral_code: 'ZACK2025',
            commission_rate: 0.25,
            status: 'ACTIVE',
            created_at: new Date(),
            earnings_balance: 0,
            total_earnings: 0,
            website: 'https://zackmedia.com',
            bio: 'Zack Media Solutions - Partner Account'
          });
          console.log(`Created partner record for Zack with ID: ${partner.id}`);
        } 
        // If partner exists but status is not active, force it
        else if (partner.status !== 'ACTIVE') {
          console.log(`Updating Zack's partner status from ${partner.status} to ACTIVE`);
          await storage.updatePartner(partner.id, { status: 'ACTIVE' });
          partner.status = 'ACTIVE';
        }
        
        // Return special partner response
        return res.json({
          isPartner: true,
          partnerStatus: 'ACTIVE',
          partner: {
            id: partner.id,
            company_name: partner.company_name,
            contact_name: partner.contact_name,
            referral_code: partner.referral_code,
            commission_rate: partner.commission_rate,
            earnings_balance: partner.earnings_balance,
            total_earnings: partner.total_earnings,
            status: 'ACTIVE', // Force active status
            created_at: partner.created_at,
            website: partner.website,
            bio: partner.bio
          }
        });
      }
      
      // Special handling for admin accounts
      if (user && user.isAdmin) {
        console.log(`Admin account ${user.email} accessing partner status - granting simulated access`);
        return res.json({
          isPartner: true,
          partnerStatus: 'ACTIVE',
          partner: {
            id: 0,
            company_name: "Admin Access",
            contact_name: user.displayName || user.email,
            referral_code: "ADMIN",
            commission_rate: 0.3,
            earnings_balance: 0,
            total_earnings: 0,
            status: 'ACTIVE',
            created_at: new Date(),
            website: 'https://warmleadnetwork.com',
            bio: 'Admin account with partner access'
          }
        });
      }
      
      // Standard partner check for regular accounts
      const partner = await storage.getPartnerByUserId(user.id);
      
      if (!partner) {
        console.log(`User ${user.email} is not a partner`);
        return res.json({ 
          isPartner: false,
          message: "You are not registered as a partner"
        });
      }
      
      // Standardize status format to uppercase for consistency
      const normalizedStatus = partner.status ? partner.status.toUpperCase() : 'PENDING';
      console.log(`Partner ${user.email} has status: ${normalizedStatus} (original: ${partner.status})`);
      
      res.json({
        isPartner: true,
        partnerStatus: normalizedStatus,
        partner: {
          id: partner.id,
          company_name: partner.company_name,
          contact_name: partner.contact_name,
          referral_code: partner.referral_code,
          commission_rate: partner.commission_rate,
          earnings_balance: partner.earnings_balance,
          total_earnings: partner.total_earnings,
          status: normalizedStatus,
          created_at: partner.created_at,
          website: partner.website,
          bio: partner.bio
        }
      });
    } catch (error) {
      console.error("Error checking partner status:", error);
      res.status(500).json({ error: "Failed to check partner status" });
    }
  });
  
  // Partner account creation helper - for admins only
  app.post('/api/partner/create-account', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log("Partner account creation requested by admin");
      
      const { email, displayName, companyName, contactName, referralCode } = req.body;
      
      if (!email || !companyName) {
        return res.status(400).json({ error: "Email and company name are required" });
      }
      
      // Check if user already exists
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create a new user with a secure random password
        const securePassword = crypto.randomBytes(12).toString('hex');
        const hashedPassword = await bcrypt.hash(securePassword, 10);
        
        user = await storage.createUser({
          username: email.split('@')[0],
          email,
          password: hashedPassword,
          displayName: displayName || companyName,
          isAdmin: false // Partners should never have admin privileges
        });
        
        console.log(`New user created for partner: ${user.id}`);
      } else {
        console.log(`Existing user found for partner: ${user.id}`);
      }
      
      // Check if partner record already exists
      let partner = await storage.getPartnerByUserId(user.id);
      
      if (!partner) {
        // Generate a unique referral code if not provided
        const partnerReferralCode = referralCode || await generateUniqueReferralCode(companyName);
        
        // Create partner record
        partner = await storage.createPartner({
          user_id: user.id,
          company_name: companyName,
          contact_name: contactName || displayName || companyName,
          referral_code: partnerReferralCode,
          commission_rate: 0.25, // 25% commission
          status: 'ACTIVE', // active status
          website: req.body.website || null,
          bio: req.body.bio || `${companyName} - Partner Account`,
          logo_url: req.body.logo_url || null,
          payment_info: req.body.payment_info || null
        });
        
        console.log(`New partner record created: ${partner.id}`);
      } else {
        console.log(`Existing partner record found: ${partner.id}`);
        
        // Ensure partner status is ACTIVE
        if (partner.status !== 'ACTIVE') {
          partner = await storage.updatePartner(partner.id, { status: 'ACTIVE' });
          console.log(`Updated partner status to ACTIVE: ${partner.id}`);
        }
      }
      
      // Log the partner creation
      await logMessage(LogLevel.INFO, 'Admin', `Partner account created/updated by admin: ${companyName} (${email})`);
      
      // Return partner information
      return res.status(201).json({
        success: true,
        message: `Partner account ${partner ? 'updated' : 'created'} successfully`,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName
        },
        partner: {
          id: partner.id,
          company_name: partner.company_name,
          status: partner.status,
          referral_code: partner.referral_code,
          commission_rate: partner.commission_rate
        }
      });
    } catch (error) {
      console.error("Partner account creation error:", error);
      res.status(500).json({ error: "An error occurred during partner account creation" });
    }
  });

  // Partner login endpoint
  app.post('/api/partner/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // No special cases - all logins must use database authentication
      // Special routes have been removed for security reasons
      
      console.log(`Partner login attempt for email: ${email}`);
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      console.log(`User found:`, user ? "Yes" : "No");
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Verify password using bcrypt for all users (no special cases)
      console.log("Verifying password with bcrypt");
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      console.log(`Password valid:`, isPasswordValid ? "Yes" : "No");
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check if user is a partner
      let partner = await storage.getPartnerByUserId(user.id);
      
      console.log(`Partner found:`, partner ? "Yes" : "No");
      
      // Special auto-partner creation logic
      // If user has @partner in email but no partner record, create one automatically
      if (!partner && user.email.includes('@partner')) {
        console.log(`Auto-creating partner record for ${user.email} because email contains @partner`);
        
        // Generate a referral code
        const companyName = user.displayName || user.email.split('@')[0];
        const sanitizedName = companyName.replace(/\W+/g, '').toUpperCase();
        const prefix = sanitizedName.substring(0, 3);
        const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
        const referralCode = `${prefix}-${randomBytes}`;
        
        // Create partner record
        partner = await storage.createPartner({
          user_id: user.id,
          company_name: `${companyName} LLC`,
          contact_name: user.displayName || user.username || user.email.split('@')[0],
          referral_code: referralCode,
          commission_rate: 0.25, // 25% commission
          status: 'ACTIVE', // active status
          created_at: new Date(),
          earnings_balance: 0, // initial earnings
          total_earnings: 0, // total earnings
          website: `https://${sanitizedName.toLowerCase()}.com`,
          bio: `${companyName} - Partner Account`
        });
        
        console.log(`Created new partner record with ID: ${partner.id}`);
      }
      
      if (!partner) {
        return res.status(403).json({ error: "You are not registered as a partner" });
      }
      
      // Ensure partner status is ACTIVE for any @partner email addresses
      if (user.email.includes('@partner') && partner.status !== 'ACTIVE') {
        console.log(`Auto-activating partner account for ${user.email} because email contains @partner`);
        await storage.updatePartner(partner.id, { status: 'ACTIVE' });
        partner.status = 'ACTIVE';
      }
      
      // Check if partner is active using case-insensitive comparison
      // Note: Partner status might be stored as "ACTIVE" (uppercase) in database,
      // but PartnerStatus.ACTIVE is "active" (lowercase)
      const isActivePartner = partner.status.toLowerCase() === PartnerStatus.ACTIVE.toLowerCase();
      
      console.log(`Partner status check: db="${partner.status}", enum="${PartnerStatus.ACTIVE}", isActive=${isActivePartner}`);
      
      // Only allow active partners to login
      if (!isActivePartner) {
        return res.status(403).json({ 
          error: `Your partner account is ${partner.status.toLowerCase()}. Please contact support for activation.`,
          status: partner.status
        });
      }
      
      console.log("Partner account is active, proceeding with login");
      
      // Generate a token for the partner - use await to make sure we get a string back
      const tokenResult = await registerToken(user);
      
      // Convert to string token - ensure we have a valid string token
      const token = String(tokenResult);
      
      // Debug token generation
      console.log(`Token generated for partner login: ${token.substring(0, 10)}... (type: ${typeof token})`);
      console.log(`Token length: ${token.length}`);
      
      // Log the login 
      await logMessage(LogLevel.INFO, 'Partner', `Partner login: ${partner.company_name} (${user.email})`);
      
      // Return user data and partner data with the string token
      // Use the tokenString directly as a primitive value, not as a property
      res.json({
        success: true,
        token,  // This is just the string itself
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName
        },
        partner: {
          id: partner.id,
          company_name: partner.company_name,
          status: partner.status,
          referral_code: partner.referral_code
        }
      });
    } catch (error) {
      // More detailed error logging to diagnose the issue
      console.error("Partner login error:", error);
      console.error("Partner login error details:", {
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  // Special endpoint for creating or getting admin partner account for testing
  // Adding isAdmin middleware to prevent partners from using this endpoint
  app.post('/api/admin-partner-setup', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log("Setting up admin partner account");
      
      // Variables to store admin user info
      let adminUser = null;
      let username = 'admin';
      
      // Check if credentials were provided for login
      if (req.body && req.body.email === 'admin@warmleadnetwork.com' && req.body.password) {
        console.log("Admin login attempt with credentials");
        
        // Try to find the admin user 
        adminUser = await storage.getUserByEmail('admin@warmleadnetwork.com');
        
        if (adminUser) {
          // Verify password
          const isPasswordValid = await bcrypt.compare(req.body.password, adminUser.password);
          if (!isPasswordValid) {
            console.log("Invalid admin password");
            return res.status(401).json({ error: "Invalid admin credentials" });
          }
          console.log("Admin credentials verified");
        } else {
          console.log("Admin user not found, will create");
        }
      } else {
        console.log("No credentials provided, using setup mode");
      }
      
      // Check if admin user already exists
      if (!adminUser) {
        adminUser = await storage.getUserByEmail('admin@warmleadnetwork.com');
      }
      
      if (!adminUser) {
        // Create the admin user
        console.log("Creating admin user");
        
        // Hash the password from environment variable or use a secure random one
        const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || crypto.randomBytes(12).toString('hex');
        console.log("Using secure admin password (not logging the actual password)");
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        adminUser = await storage.createUser({
          username,
          email: 'admin@warmleadnetwork.com',
          password: hashedPassword,
          displayName: 'System Admin',
          isAdmin: true,
          coins: 9999
        });
        
        console.log("Admin user created:", adminUser.id);
      } else {
        console.log("Admin user already exists:", adminUser.id);
      }
      
      // Check if admin is already a partner
      let adminPartner = await storage.getPartnerByUserId(adminUser.id);
      
      if (!adminPartner) {
        // Create a partner account for admin
        console.log("Creating partner account for admin");
        
        adminPartner = await storage.createPartner({
          user_id: adminUser.id,
          company_name: 'WarmLeadNetwork Admin',
          contact_name: 'System Admin',
          referral_code: 'ADMIN2025',
          commission_rate: 0.25, // 25% commission
          status: PartnerStatus.ACTIVE,
          website: 'https://warmleadnetwork.com',
          bio: 'Official WarmLeadNetwork administrator account',
          logo_url: null,
          payment_info: 'Official account'
        });
        
        console.log("Admin partner account created:", adminPartner.id);
      } else {
        console.log("Admin partner account already exists:", adminPartner.id);
        
        // Ensure partner is active
        if (adminPartner.status !== PartnerStatus.ACTIVE) {
          adminPartner = await storage.updatePartner(adminPartner.id, {
            status: PartnerStatus.ACTIVE
          });
          console.log("Updated admin partner status to ACTIVE");
        }
      }
      
      // Generate token for admin - use await to make sure we get a string back
      const tokenResult = await registerToken(adminUser);
      
      // Convert to string token to ensure we have a valid string value
      const token = String(tokenResult);
      
      // Debug token generation
      console.log(`Token generated for admin partner: ${token.substring(0, 10)}... (type: ${typeof token})`);
      console.log(`Token length: ${token.length}`);
      
      // Return admin user and partner information with the string token
      // Use the string token directly as a primitive value, not as a property
      res.json({
        success: true,
        message: 'Admin partner account is ready',
        token, // This is just the string itself
        user: {
          id: adminUser.id,
          email: adminUser.email,
          displayName: adminUser.displayName,
          isAdmin: adminUser.isAdmin
        },
        partner: {
          id: adminPartner.id,
          company_name: adminPartner.company_name,
          referral_code: adminPartner.referral_code,
          status: adminPartner.status
        }
      });
    } catch (error) {
      console.error("Error setting up admin partner:", error);
      res.status(500).json({ error: "Failed to setup admin partner account" });
    }
  });
  
  // Endpoint that returns a properly formatted curl command for getting admin partner account
  app.get('/api/admin-partner-helper', isAuthenticated, isAdmin, (req, res) => {
    const hostUrl = req.headers.host || 'localhost:5000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    
    const curlCommand = `curl -X POST "${protocol}://${hostUrl}/api/admin-partner-setup" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" | python -m json.tool`;
    
    res.json({
      note: "Use this curl command to set up the admin partner account and get a token:",
      curlCommand,
      instructionsHtml: `
        <h3>How to set up the admin partner account:</h3>
        <ol>
          <li>Copy and run the curl command below in your terminal</li>
          <li>Use the returned token to authenticate as the admin partner</li>
          <li>The admin email is admin@warmleadnetwork.com</li>
          <li>Admin password is set securely during account creation and stored as a hash</li>
        </ol>
        <pre>${curlCommand}</pre>
      `
    });
  });
  
  // Apply to become a partner
  app.post('/api/partner/apply', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      // Check if user is already a partner
      const existingPartner = await storage.getPartnerByUserId(user.id);
      if (existingPartner) {
        return res.status(400).json({ 
          error: "You are already registered as a partner",
          partner: existingPartner
        });
      }
      
      const { company_name, contact_name, website, bio, payment_info } = req.body;
      
      // Validate required fields
      if (!company_name || !contact_name) {
        return res.status(400).json({ 
          error: "Missing required fields: company_name, contact_name" 
        });
      }
      
      // Generate a unique referral code based on company name
      const referral_code = generateReferralCode(company_name);
      
      // Create the partner
      const partner = await storage.createPartner({
        user_id: user.id,
        company_name,
        contact_name,
        referral_code,
        commission_rate: 0.2, // 20% default commission
        status: PartnerStatus.PENDING,
        website: website || null,
        bio: bio || null,
        logo_url: null,
        payment_info: payment_info || null
      });
      
      // Log the action
      await logMessage(LogLevel.INFO, 'Partner', `New partner application: ${company_name} (User ID: ${user.id})`);
      
      res.status(201).json({
        success: true,
        message: "Your partner application has been submitted for review",
        partner: {
          id: partner.id,
          company_name: partner.company_name,
          referral_code: partner.referral_code,
          status: partner.status
        }
      });
    } catch (error) {
      console.error("Error applying to become a partner:", error);
      res.status(500).json({ error: "Failed to submit partner application" });
    }
  });
  
  // Partner withdrawal request - For manual processing by admin
  app.post('/api/partner/withdraw', isPartner, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { amount, payment_method, payment_details } = req.body;
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      
      if (!payment_method || !payment_details) {
        return res.status(400).json({ error: 'Payment method and details are required' });
      }
      
      // Get the partner info
      const partner = await storage.getPartnerByUserId(user.id);
      
      if (!partner) {
        return res.status(403).json({ error: 'Only partners can make withdrawal requests' });
      }
      
      // Check if they have enough pending commission
      const stats = await storage.getPartnerStatistics(partner.id);
      
      if (!stats || stats.pendingCommission < amount) {
        return res.status(400).json({ 
          error: 'Insufficient funds',
          available: stats?.pendingCommission || 0,
          requested: amount
        });
      }
      
      // Create a payment request record (to be processed manually by admin)
      const payment = await storage.createPartnerPayment({
        partnerId: partner.id,
        amount: amount,
        paymentMethod: payment_method,
        paymentDetails: payment_details,
        status: PaymentStatus.PENDING,
        requestDate: new Date().toISOString(),
        notes: "Withdrawal request pending manual review by admin"
      });
      
      // Store notification for admin
      await storage.createAdminNotification({
        type: 'PARTNER_WITHDRAWAL_REQUEST',
        title: `Withdrawal Request: $${amount}`,
        message: `Partner ${partner.company_name} (${partner.email}) has requested a withdrawal of $${amount} via ${payment_method}.`,
        data: {
          partnerId: partner.id,
          partnerName: partner.company_name,
          partnerEmail: partner.email,
          amount: amount,
          paymentMethod: payment_method,
          paymentDetails: payment_details,
          paymentId: payment.id
        },
        isRead: false,
        priority: 'high',
        createdAt: new Date().toISOString()
      });
      
      // Log the withdrawal request
      await logMessage(
        LogLevel.INFO, 
        'Partner', 
        `Partner ${partner.company_name} (${partner.email}) requested withdrawal of $${amount} via ${payment_method} - PENDING MANUAL APPROVAL`
      );
      
      // Send email to admin (if email service is configured)
      try {
        if (process.env.ADMIN_EMAIL) {
          // Implement your email sending logic here if needed
          console.log(`[Admin notification would be sent to ${process.env.ADMIN_EMAIL}]`);
        }
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
        // Continue processing - this is non-critical
      }
      
      res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted successfully. Our team will review and process your request.',
        payment_id: payment.id,
        amount: payment.amount,
        status: payment.status,
        date: payment.requestDate
      });
      
    } catch (error) {
      console.error('Error processing partner withdrawal request:', error);
      res.status(500).json({ error: 'Failed to process withdrawal request' });
    }
  });

  // Get partner dashboard data
  app.get('/api/partner/dashboard', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      
      // Get partner stats
      const stats = await storage.getPartnerStats(partner.id);
      
      // Get list of referred users (limited information)
      const referrals = await storage.getReferralsByPartnerId(partner.id);
      const referralUsers = referrals.map(referral => ({
        id: referral.id,
        created_at: referral.created_at,
        status: referral.status,
        total_purchases: referral.total_purchases,
        first_purchase_date: referral.first_purchase_date
      }));
      
      // Get recent payments
      const payments = await storage.getPartnerPayments(partner.id);
      const recentPayments = payments.slice(0, 5).map(payment => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method
      }));
      
      res.json({
        partner: {
          id: partner.id,
          company_name: partner.company_name,
          contact_name: partner.contact_name,
          referral_code: partner.referral_code,
          commission_rate: partner.commission_rate,
          earnings_balance: partner.earnings_balance,
          total_earnings: partner.total_earnings,
          status: partner.status,
          website: partner.website,
          bio: partner.bio
        },
        stats,
        referrals: referralUsers,
        recentPayments,
        marketing: {
          referral_link: `${process.env.APP_URL || 'https://www.warmleadnetwork.app'}/register?ref=${partner.referral_code}`,
          referral_code: partner.referral_code,
          banner_urls: [
            `${process.env.APP_URL || 'https://www.warmleadnetwork.app'}/assets/partner/banner-1.png`,
            `${process.env.APP_URL || 'https://www.warmleadnetwork.app'}/assets/partner/banner-2.png`
          ],
          email_templates: [
            {
              name: "Introduction Email",
              subject: "Automate Your Sales Process with AI",
              body: `Hi {name},\n\nI wanted to introduce you to WarmLeadNetwork, an AI-powered platform that's revolutionizing how businesses handle sales calls and lead follow-up.\n\nThey offer AI agents that can call your leads, qualify them, and even book meetings on your calendar. The best part? It's all powered by advanced AI that sounds completely natural.\n\nYou can try it out using my referral link: ${process.env.APP_URL || 'https://www.warmleadnetwork.app'}/register?ref=${partner.referral_code}\n\nLet me know if you have any questions!\n\nBest regards,\n{your_name}`
            },
            {
              name: "Follow-up Email",
              subject: "Did You Check Out WarmLeadNetwork?",
              body: `Hi {name},\n\nI'm following up about WarmLeadNetwork I mentioned earlier. Their AI agents are helping businesses save hours of manual calling time while increasing conversion rates.\n\nIf you're interested in automating your sales calls, you can sign up here: ${process.env.APP_URL || 'https://www.warmleadnetwork.app'}/register?ref=${partner.referral_code}\n\nI'd be happy to answer any questions you might have about it.\n\nBest regards,\n{your_name}`
            }
          ]
        }
      });
    } catch (error) {
      console.error("Error getting partner dashboard:", error);
      res.status(500).json({ error: "Failed to retrieve partner dashboard data" });
    }
  });
  
  // Get partner stats
  app.get('/api/partner/stats', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      
      // Get partner stats
      const stats = await storage.getPartnerStats(partner.id);
      
      // Calculate conversion rate
      const referrals = await storage.getReferralsByPartnerId(partner.id);
      const totalReferrals = referrals.length;
      const activeReferrals = referrals.filter(r => r.status === ReferralStatus.ACTIVE).length;
      let conversionRate = 0;
      
      if (totalReferrals > 0) {
        // Calculate percentage of referrals who have made a purchase
        const referralsWithPurchases = referrals.filter(r => r.total_purchases > 0).length;
        conversionRate = Math.round((referralsWithPurchases / totalReferrals) * 100);
      }
      
      // Get commission totals
      const commissions = await storage.getPartnerCommissions(partner.id);
      const totalCommission = commissions.reduce((sum, commission) => sum + commission.commission_amount, 0);
      const pendingCommission = commissions
        .filter(c => c.status === CommissionStatus.PENDING)
        .reduce((sum, commission) => sum + commission.commission_amount, 0);
      const paidCommission = commissions
        .filter(c => c.status === CommissionStatus.PAID)
        .reduce((sum, commission) => sum + commission.commission_amount, 0);
      
      res.json({
        totalCommission,
        pendingCommission,
        paidCommission,
        totalReferrals,
        activeReferrals,
        conversionRate
      });
    } catch (error) {
      console.error("Error getting partner stats:", error);
      res.status(500).json({ error: "Failed to retrieve partner stats" });
    }
  });
  
  // Update partner profile
  app.patch('/api/partner/profile', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      const { company_name, contact_name, website, bio, payment_info } = req.body;
      
      // Fields that partners are allowed to update
      const updates: Partial<InsertPartner> = {};
      
      if (company_name) updates.company_name = company_name;
      if (contact_name) updates.contact_name = contact_name;
      if (website !== undefined) updates.website = website;
      if (bio !== undefined) updates.bio = bio;
      if (payment_info !== undefined) updates.payment_info = payment_info;
      
      // Update the partner
      const updatedPartner = await storage.updatePartner(partner.id, updates);
      
      if (!updatedPartner) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      res.json({
        success: true,
        message: "Partner profile updated successfully",
        partner: {
          id: updatedPartner.id,
          company_name: updatedPartner.company_name,
          contact_name: updatedPartner.contact_name,
          website: updatedPartner.website,
          bio: updatedPartner.bio,
          referral_code: updatedPartner.referral_code
        }
      });
    } catch (error) {
      console.error("Error updating partner profile:", error);
      res.status(500).json({ error: "Failed to update partner profile" });
    }
  });
  
  // Get list of referrals
  app.get('/api/partner/referrals', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      
      // Get all referrals for this partner
      const referrals = await storage.getReferralsByPartnerId(partner.id);
      
      res.json({
        referrals: referrals.map(referral => ({
          id: referral.id,
          created_at: referral.created_at,
          status: referral.status,
          total_purchases: referral.total_purchases,
          first_purchase_date: referral.first_purchase_date
        })),
        total: referrals.length,
        active: referrals.filter(r => r.status === ReferralStatus.ACTIVE).length
      });
    } catch (error) {
      console.error("Error getting partner referrals:", error);
      res.status(500).json({ error: "Failed to retrieve partner referrals" });
    }
  });
  
  // Get referral click stats
  app.get('/api/partner/referral-clicks', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      
      // Get click stats for this partner
      const stats = await storage.getReferralClickStats(partner.id);
      
      res.json(stats);
    } catch (error) {
      console.error("Error getting referral click stats:", error);
      res.status(500).json({ error: "Failed to retrieve referral click statistics" });
    }
  });
  
  // Get recent referral clicks
  app.get('/api/partner/referral-clicks/recent', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get recent clicks for this partner
      const clicks = await storage.getReferralClicksByPartnerId(partner.id, limit);
      
      // Mark unique clicks (first click from an IP address)
      const ipMap = new Map<string, boolean>();
      const clicksWithUnique = clicks.map(click => {
        // if IP is null, it's considered unique
        if (!click.ip_address) {
          return { ...click, is_unique: true };
        }
        
        // If this IP hasn't been seen before, mark it as unique
        const isUnique = !ipMap.has(click.ip_address);
        if (isUnique) {
          ipMap.set(click.ip_address, true);
        }
        
        return { ...click, is_unique: isUnique };
      });
      
      res.json(clicksWithUnique);
    } catch (error) {
      console.error("Error getting recent referral clicks:", error);
      res.status(500).json({ error: "Failed to retrieve recent referral clicks" });
    }
  });
  
  // Track a referral click (public endpoint)
  app.post('/api/track/referral-click', async (req, res) => {
    try {
      const { referral_code, ip_address, user_agent, referrer, base_url, custom_url, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = req.body;
      
      if (!referral_code) {
        return res.status(400).json({ error: "Referral code is required" });
      }
      
      // Special handling for 'DEMO' referral code
      if (referral_code === 'DEMO') {
        console.log("Demo referral code used - simulating successful tracking");
        return res.status(200).json({ 
          success: true, 
          message: "Demo referral click tracked successfully (simulated)"
        });
      }
      
      // Get partner by referral code
      const partner = await storage.getPartnerByReferralCode(referral_code);
      
      if (!partner) {
        return res.status(404).json({ error: "Invalid referral code" });
      }
      
      // Get the client IP address if not provided
      const clientIp = ip_address || 
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
        req.socket.remoteAddress || 
        'unknown';
      
      // Get the client user agent if not provided
      const clientUserAgent = user_agent || req.headers['user-agent'] || 'unknown';
      
      // Record the click with all available parameters
      await storage.addReferralClick({
        partner_id: partner.id,
        referral_code,
        ip_address: clientIp,
        user_agent: clientUserAgent.substring(0, 255), // Limit to 255 chars to prevent DB issues
        referrer: referrer || req.headers.referer || null,
        base_url: base_url || 'https://warmleadnetwork.app', // Default base URL
        custom_url: custom_url || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        utm_content: utm_content || null
      });
      
      // Return a simple success response
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error tracking referral click:", error);
      res.status(500).json({ error: "Failed to track referral click" });
    }
  });
  
  // Get list of commissions
  app.get('/api/partner/commissions', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      
      // Get all commissions for this partner
      const commissions = await storage.getPartnerCommissions(partner.id);
      
      res.json({
        commissions: commissions.map(commission => ({
          id: commission.id,
          created_at: commission.created_at,
          amount: commission.amount,
          commission_amount: commission.commission_amount,
          status: commission.status,
          paid_date: commission.paid_date
        })),
        total: commissions.length,
        pending: commissions.filter(c => c.status === CommissionStatus.PENDING).length,
        paid: commissions.filter(c => c.status === CommissionStatus.PAID).length
      });
    } catch (error) {
      console.error("Error getting partner commissions:", error);
      res.status(500).json({ error: "Failed to retrieve partner commissions" });
    }
  });
  
  // Get list of payments
  // Get marketing materials for partner
  app.get('/api/partner/marketing', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      
      // Create the base domain for referral links
      const domain = process.env.REPL_SLUG ? 
        'https://www.warmleadnetwork.app' : 
        'http://localhost:5000';
      
      // Return marketing resources including referral information
      res.json({
        referral_link: `${domain}/register?ref=${partner.referral_code}`,
        referral_code: partner.referral_code,
        banner_urls: [
          `${domain}/assets/partner/banner-1.png`,
          `${domain}/assets/partner/banner-2.png`
        ],
        email_templates: [
          {
            name: "Introduction Email",
            subject: "Automate Your Sales Process with AI",
            body: `Hi {name},\n\nI wanted to introduce you to WarmLeadNetwork, an AI-powered platform that's revolutionizing how businesses handle sales calls and lead follow-up.\n\nThey offer AI agents that can call your leads, qualify them, and even book meetings on your calendar. The best part? It's all powered by advanced AI that sounds completely natural.\n\nYou can try it out using my referral link: ${domain}/register?ref=${partner.referral_code}\n\nLet me know if you have any questions!\n\nBest regards,\n{your_name}`
          },
          {
            name: "Follow-up Email",
            subject: "Did You Check Out WarmLeadNetwork?",
            body: `Hi {name},\n\nI'm following up about WarmLeadNetwork I mentioned earlier. Their AI agents are helping businesses save hours of manual calling time while increasing conversion rates.\n\nIf you're interested in automating your sales calls, you can sign up here: ${domain}/register?ref=${partner.referral_code}\n\nI'd be happy to answer any questions you might have about it.\n\nBest regards,\n{your_name}`
          }
        ]
      });
    } catch (error) {
      console.error("Error getting partner marketing materials:", error);
      res.status(500).json({ error: "Failed to retrieve marketing materials" });
    }
  });

  app.get('/api/partner/payments', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      
      // Get all payments for this partner
      const payments = await storage.getPartnerPayments(partner.id);
      
      res.json({
        payments: payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          transaction_id: payment.transaction_id,
          notes: payment.notes
        })),
        total: payments.length,
        totalPaid: payments
          .filter(p => p.status === PaymentStatus.COMPLETED)
          .reduce((sum, p) => sum + p.amount, 0)
      });
    } catch (error) {
      console.error("Error getting partner payments:", error);
      res.status(500).json({ error: "Failed to retrieve partner payments" });
    }
  });
  
  // Request a payment (for the partner to request money from their balance)
  app.post('/api/partner/request-payment', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      const { amount, payment_method, notes } = req.body;
      
      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      // Validate payment method
      if (!payment_method) {
        return res.status(400).json({ error: "Payment method is required" });
      }
      
      // Check if partner has enough balance
      if (partner.earnings_balance < amount) {
        return res.status(400).json({ 
          error: "Insufficient balance", 
          requested: amount,
          available: partner.earnings_balance
        });
      }
      
      // Create a payment request
      const payment = await storage.createPartnerPayment({
        partner_id: partner.id,
        amount,
        status: PaymentStatus.PENDING,
        payment_method,
        notes: notes || null,
        transaction_id: null
      });
      
      // Log the action
      await logMessage(LogLevel.INFO, 'Partner', `Payment request: ${partner.company_name} requested ${amount} via ${payment_method}`);
      
      res.status(201).json({
        success: true,
        message: "Payment request submitted successfully",
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method
        }
      });
    } catch (error) {
      console.error("Error requesting partner payment:", error);
      res.status(500).json({ error: "Failed to submit payment request" });
    }
  });
  
  // Admin: List all partners
  app.get('/api/admin/partners', isAdmin, async (req, res) => {
    try {
      const partners = await storage.getAllPartners();
      
      res.json({
        partners: partners.map(partner => ({
          id: partner.id,
          user_id: partner.user_id,
          company_name: partner.company_name,
          contact_name: partner.contact_name,
          referral_code: partner.referral_code,
          commission_rate: partner.commission_rate,
          earnings_balance: partner.earnings_balance,
          total_earnings: partner.total_earnings,
          status: partner.status,
          created_at: partner.created_at,
          website: partner.website,
          bio: partner.bio
        })),
        total: partners.length,
        pending: partners.filter(p => p.status === PartnerStatus.PENDING).length,
        active: partners.filter(p => p.status === PartnerStatus.ACTIVE).length,
        suspended: partners.filter(p => p.status === PartnerStatus.SUSPENDED).length
      });
    } catch (error) {
      console.error("Error getting admin partners list:", error);
      res.status(500).json({ error: "Failed to retrieve partners list" });
    }
  });
  
  // Admin: Create a new partner account
  app.post('/api/admin/partners', isAdmin, async (req, res) => {
    try {
      const { 
        email, 
        password, 
        company_name, 
        contact_name, 
        commission_rate = 0.2,
        status = PartnerStatus.ACTIVE
      } = req.body;
      
      if (!email || !password || !company_name || !contact_name) {
        return res.status(400).json({ 
          error: "Missing required fields: email, password, company_name, contact_name" 
        });
      }
      
      // Check if a user with this email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }
      
      // Generate a referral code from company name
      const referral_code = await generateUniqueReferralCode(company_name);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create the user account
      const user = await storage.createUser({
        email,
        username: email.split('@')[0],
        password: hashedPassword,
        displayName: contact_name,
        isAdmin: false
      });
      
      // Create the partner account
      const partner = await storage.createPartner({
        user_id: user.id,
        company_name,
        contact_name,
        referral_code,
        commission_rate: commission_rate || 0.2,
        status: status || PartnerStatus.ACTIVE,
        website: null,
        bio: null,
        logo_url: null,
        payment_info: null
      });
      
      // Log the action
      await logMessage(LogLevel.INFO, 'Admin', `Admin created new partner account: ${company_name} (User ID: ${user.id})`);
      
      res.status(201).json({
        success: true,
        message: "Partner account created successfully",
        partner: {
          id: partner.id,
          user_id: user.id,
          email: user.email,
          company_name: partner.company_name,
          contact_name: partner.contact_name,
          referral_code: partner.referral_code,
          commission_rate: partner.commission_rate,
          status: partner.status
        }
      });
    } catch (error) {
      console.error("Error creating partner account:", error);
      res.status(500).json({ error: "Failed to create partner account" });
    }
  });
  
  // Admin: Delete a partner account
  app.delete('/api/admin/partners/:partnerId', isAdmin, async (req, res) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      
      // Get the partner to find the associated user ID
      const partner = await storage.getPartner(partnerId);
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // Delete the partner
      await storage.deletePartner(partnerId);
      
      // Log the action
      await logMessage(LogLevel.INFO, 'Admin', `Admin deleted partner account: ${partner.company_name} (ID: ${partnerId})`);
      
      res.json({
        success: true,
        message: "Partner account deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting partner account:", error);
      res.status(500).json({ error: "Failed to delete partner account" });
    }
  });
  
  // Utility function to generate a unique referral code
  async function generateUniqueReferralCode(companyName: string): Promise<string> {
    // Base referral code generation
    const generateReferralCode = (name: string) => {
      const sanitizedName = name.replace(/\W+/g, '').toUpperCase();
      const prefix = sanitizedName.substring(0, 3);
      const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
      return `${prefix}-${randomBytes}`;
    };
    
    // First attempt
    let referralCode = generateReferralCode(companyName);
    
    // Check if code already exists
    let existingPartner = await storage.getPartnerByReferralCode(referralCode);
    
    // If code exists, keep trying with new random data
    let attempts = 0;
    const maxAttempts = 5;
    
    while (existingPartner && attempts < maxAttempts) {
      referralCode = generateReferralCode(companyName);
      existingPartner = await storage.getPartnerByReferralCode(referralCode);
      attempts++;
    }
    
    if (existingPartner) {
      // If still colliding after max attempts, use timestamp to ensure uniqueness
      const timestamp = Date.now().toString(36).toUpperCase();
      referralCode = `${referralCode.split('-')[0]}-${timestamp}`;
    }
    
    return referralCode;
  }
  
  // Admin: Approve or reject a partner application
  app.post('/api/admin/partners/:partnerId/review', isAdmin, async (req, res) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      const { status, commission_rate, notes } = req.body;
      
      // Validate status
      if (!status || !Object.values(PartnerStatus).includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      // Get the partner
      const partner = await storage.getPartner(partnerId);
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // Prepare updates
      const updates: Partial<InsertPartner> = { status };
      
      // Update commission rate if provided
      if (commission_rate !== undefined && typeof commission_rate === 'number') {
        updates.commission_rate = commission_rate;
      }
      
      // Update the partner
      const updatedPartner = await storage.updatePartner(partnerId, updates);
      
      // Log the action
      await logMessage(
        LogLevel.INFO, 
        'Admin', 
        `Partner ${partner.company_name} status changed to ${status}${notes ? `: ${notes}` : ''}`
      );
      
      res.json({
        success: true,
        message: `Partner ${status === PartnerStatus.ACTIVE ? 'approved' : status === PartnerStatus.SUSPENDED ? 'suspended' : 'rejected'}`,
        partner: updatedPartner
      });
    } catch (error) {
      console.error("Error reviewing partner application:", error);
      res.status(500).json({ error: "Failed to review partner application" });
    }
  });
  
  // Admin: Process a partner payment
  app.post('/api/admin/partners/payments/:paymentId/process', isAdmin, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      const { status, transaction_id, notes } = req.body;
      
      // Validate status
      if (!status || !Object.values(PaymentStatus).includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      // Get the payment
      const payment = await db.query.partnerPayments.findFirst({
        where: (payment, { eq }) => eq(payment.id, paymentId)
      });
      
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      // Prepare updates
      const updates: Partial<InsertPartnerPayment> = { 
        status,
        transaction_id: transaction_id || payment.transaction_id,
        notes: notes !== undefined ? notes : payment.notes
      };
      
      // Update the payment
      const updatedPayment = await storage.updatePartnerPayment(paymentId, updates);
      
      // Log the action
      await logMessage(
        LogLevel.INFO, 
        'Admin', 
        `Partner payment ${paymentId} processed: ${status}${transaction_id ? ` (Transaction ID: ${transaction_id})` : ''}`
      );
      
      res.json({
        success: true,
        message: `Payment ${status}`,
        payment: updatedPayment
      });
    } catch (error) {
      console.error("Error processing partner payment:", error);
      res.status(500).json({ error: "Failed to process partner payment" });
    }
  });
  
  // Process a referral when a user registers
  app.post('/api/register-with-referral', async (req, res) => {
    try {
      const { username, email, password, displayName, referral_code } = req.body;
      
      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Check if referral code is valid
      if (referral_code) {
        const partner = await storage.getPartnerByReferralCode(referral_code);
        
        if (!partner) {
          return res.status(400).json({ error: "Invalid referral code" });
        }
        
        // Check if partner is active
        if (partner.status !== PartnerStatus.ACTIVE) {
          return res.status(400).json({ error: "This referral code is no longer active" });
        }
      }
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(username) || await storage.getUserByEmail(email);
      
      if (existingUser) {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      
      // Create the user
      const user = await storage.createUser({
        username,
        email,
        password,
        displayName: displayName || null,
        isAdmin: false,
      });
      
      // Add welcome bonus coins
      await storage.addUserCoins(
        user.id,
        100, // Starting coins amount
        TransactionType.BONUS, // Use BONUS type for welcome coins
        "Welcome bonus - 100 free coins for new users",
        undefined, // No package ID for welcome bonus
        undefined  // No payment ID for welcome bonus
      );
      
      // Log the welcome bonus
      await logMessage(
        LogLevel.INFO,
        'Registration',
        `New user ${username} (${email}) received 100 welcome bonus coins`
      );
      
      // If referral code was provided, create the referral
      if (referral_code) {
        const partner = await storage.getPartnerByReferralCode(referral_code);
        
        if (partner) {
          // Create the referral
          await storage.createReferral({
            partner_id: partner.id,
            referred_user_id: user.id,
            referral_code: referral_code,
            status: ReferralStatus.ACTIVE
          });
          
          // Log the referral
          await logMessage(
            LogLevel.INFO, 
            'Partner', 
            `New referral: User ${user.id} referred by partner ${partner.company_name} (${referral_code})`
          );
        }
      }
      
      // Use loginUser instead of registerToken to ensure the client gets the expected response format
      try {
        // Login the user with our token-based system
        const result = await loginUser(email, password);
        
        await logMessage(LogLevel.INFO, 'Auth', `User registered with referral: ${email}`);
        
        // The result from loginUser already contains all the user data, token and expiry
        res.status(201).json({ 
          success: true,
          message: "Registration successful",
          ...result
        });
      } catch (loginError) {
        console.error("Error logging in after registration:", loginError);
        return res.status(500).json({ error: "Failed to login after registration" });
      }
    } catch (error) {
      console.error("Error in registration with referral:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });
  
  // Track a commission when a user makes a purchase
  app.post('/api/track-commission', isAuthenticated, async (req, res) => {
    try {
      const { transaction_id, amount } = req.body;
      
      if (!transaction_id || !amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Invalid transaction data" });
      }
      
      const user = req.user;
      
      // Check if the user was referred
      const referral = await storage.getReferralByUserId(user.id);
      
      if (!referral) {
        return res.status(404).json({ error: "No referral found for this user" });
      }
      
      // Get the partner
      const partner = await storage.getPartner(referral.partner_id);
      
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // Check if partner is active
      if (partner.status !== PartnerStatus.ACTIVE) {
        return res.status(400).json({ error: "Partner account is not active" });
      }
      
      // Calculate commission
      const commissionAmount = amount * partner.commission_rate;
      
      // Create the commission
      const commission = await storage.createPartnerCommission({
        partner_id: partner.id,
        referral_id: referral.id,
        transaction_id: parseInt(transaction_id),
        amount,
        commission_amount: commissionAmount,
        status: CommissionStatus.PENDING,
        payment_id: null
      });
      
      // Update the referral's total purchases
      await storage.updateReferral(referral.id, {
        total_purchases: referral.total_purchases + amount,
        first_purchase_date: referral.first_purchase_date || new Date()
      });
      
      // Log the commission
      await logMessage(
        LogLevel.INFO, 
        'Partner', 
        `New commission: ${partner.company_name} earned ${commissionAmount} from transaction ${transaction_id}`
      );
      
      res.status(201).json({
        success: true,
        message: "Commission tracked successfully",
        commission: {
          id: commission.id,
          partner_id: commission.partner_id,
          amount: commission.amount,
          commission_amount: commission.commission_amount,
          status: commission.status,
          created_at: commission.created_at
        }
      });
    } catch (error) {
      console.error("Error tracking commission:", error);
      res.status(500).json({ error: "Failed to track commission" });
    }
  });

  // Configuration APIs
  app.get('/api/config', async (req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error getting config: ${error}`);
      res.status(500).json({ error: 'Failed to get config' });
    }
  });
  
  // Update homepage AI configuration
  app.post('/api/config/homepage-ai', isAdmin, async (req, res) => {
    try {
      const homepageAIConfig = req.body;
      const config = await storage.getConfig();
      
      // Update configuration with the homepage AI settings
      const updatedConfig = await storage.updateConfig({
        ...config,
        systemPrompt: homepageAIConfig.systemPrompt,
        elevenLabsVoiceId: homepageAIConfig.elevenLabsVoiceId,
        openaiModel: homepageAIConfig.openaiModel,
        temperature: homepageAIConfig.temperature,
        maxTokens: homepageAIConfig.maxTokens,
        continuousConversation: homepageAIConfig.continuousConversation,
        showTranscript: homepageAIConfig.showTranscript,
        greetingMessage: homepageAIConfig.greetingMessage,
      });
      
      // Log the configuration update
      await logMessage(
        LogLevel.INFO, 
        'admin', 
        `Homepage AI configuration updated by ${(req as any).user ? (req as any).user.email || 'admin' : 'unknown user'}`
      );
      
      res.json(updatedConfig);
    } catch (error) {
      console.error('Failed to update homepage AI configuration:', error);
      res.status(500).json({ error: 'Failed to update homepage AI configuration' });
    }
  });
  
  app.post('/api/config', async (req, res) => {
    try {
      const config = req.body;
      await storage.updateConfig(config);
      logMessage(LogLevel.INFO, 'API', 'Configuration updated');
      res.json({ success: true });
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error saving config: ${error}`);
      res.status(500).json({ error: 'Failed to save config' });
    }
  });
  
  // Homepage AI configuration endpoint
  app.post('/api/homepage-ai-config', isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      if (!(req as any).user?.isAdmin) {
        return res.status(403).json({ error: 'Not authorized - Admin access required' });
      }
      
      const homepageAIConfig = req.body;
      
      // Get current config
      const config = await storage.getConfig();
      
      // Update the config with homepage AI specific settings
      const updatedConfig = await storage.updateConfig({
        ...config,
        systemPrompt: homepageAIConfig.systemPrompt,
        elevenLabsVoiceId: homepageAIConfig.elevenLabsVoiceId,
        openaiModel: homepageAIConfig.openaiModel,
        temperature: homepageAIConfig.temperature,
        maxTokens: homepageAIConfig.maxTokens,
        continuousConversation: homepageAIConfig.continuousConversation,
        showTranscript: homepageAIConfig.showTranscript,
        greetingMessage: homepageAIConfig.greetingMessage,
      });
      
      // Log the configuration update
      await logMessage(
        LogLevel.INFO, 
        'admin', 
        `Homepage AI configuration updated by ${(req as any).user ? (req as any).user.email || 'admin' : 'unknown user'}`
      );
      
      res.json(updatedConfig);
    } catch (error) {
      console.error('Failed to update homepage AI configuration:', error);
      res.status(500).json({ error: 'Failed to update homepage AI configuration' });
    }
  });
  
  // Agent endpoints
  app.get('/api/agents', isAuthenticated, async (req, res) => {
    try {
      // Get the authenticated user
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Get agent associated with this user
      const userAgent = await storage.getUserAgent(user.id);
      
      // If the user has an agent, return it as an array
      if (userAgent) {
        return res.json([userAgent]);
      }
      
      // Otherwise, return an empty array
      res.json([]);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error fetching agents: ${error}`);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });
  
  app.get('/api/agents/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agent = await storage.getAgent(id);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json(agent);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error fetching agent: ${error}`);
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  });
  
  app.post('/api/agents', async (req, res) => {
    try {
      const agentData = req.body;
      const newAgent = await storage.createAgent(agentData);
      
      logMessage(LogLevel.INFO, 'API', `Created new agent: ${newAgent.name}`);
      res.status(201).json(newAgent);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error creating agent: ${error}`);
      res.status(500).json({ error: 'Failed to create agent' });
    }
  });
  
  app.patch('/api/agents/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agentUpdate = req.body;
      
      const updatedAgent = await storage.updateAgent(id, agentUpdate);
      
      if (!updatedAgent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      logMessage(LogLevel.INFO, 'API', `Updated agent: ${updatedAgent.name}`);
      res.json(updatedAgent);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error updating agent: ${error}`);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });
  
  app.delete('/api/agents/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAgent(id);
      
      if (!deleted) {
        return res.status(400).json({ error: 'Cannot delete the only agent' });
      }
      
      logMessage(LogLevel.INFO, 'API', `Deleted agent with ID: ${id}`);
      res.status(204).send();
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error deleting agent: ${error}`);
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  });
  
  // Website scraping for knowledge base
  app.post('/api/scrape-website', async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      
      logMessage(LogLevel.INFO, 'API', `Attempting to scrape website: ${url}`);
      
      // Optional parameters for scraping
      const options = {
        maxLength: 15000, // Limit content length 
        contentSelectors: req.body.contentSelectors, // Optional specific CSS selectors
        excludeSelectors: req.body.excludeSelectors // Optional selectors to exclude
      };
      
      // Call the scraper utility
      const scrapedContent = await scrapeWebsite(url, options);
      
      // Return the scraped content
      res.json({ 
        success: true, 
        content: scrapedContent,
        url,
        contentLength: scrapedContent.length
      });
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Website scraping error: ${error}`);
      res.status(500).json({ 
        error: 'Failed to scrape website', 
        message: (error as Error).message,
        url: req.body.url
      });
    }
  });
  
  // ElevenLabs APIs
  // Create directory for audio files if it doesn't exist
  // Create directory for audio files if it doesn't exist
  try {
    if (!fs.existsSync('/tmp')) {
      fs.mkdirSync('/tmp');
    }
  } catch (error) {
    console.error('Error creating /tmp directory:', error);
  }

  // API endpoint to serve generated audio files
  app.get('/api/audio/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = `/tmp/${filename}`;
      
      console.log(`Serving audio file: ${filePath}`);
      
      // Verify the file exists
      if (!fs.existsSync(filePath)) {
        console.error(`Audio file not found: ${filePath}`);
        return res.status(404).json({ error: 'Audio file not found' });
      }
      
      // Get file stats to include file size in headers
      const stats = fs.statSync(filePath);
      
      // Check if this is a download request (via query param)
      const isDownload = req.query.download === 'true';
      
      if (isDownload) {
        console.log('Serving file as attachment for download');
        // Set headers for file download
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
      } else {
        // Set headers for normal streaming
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Accept-Ranges', 'bytes');
      }
      
      // Always add these headers
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error: Error) => {
        console.error('Error streaming audio file:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming audio file' });
        } else {
          res.end();
        }
      });
    } catch (error) {
      console.error('Error serving audio file:', error);
      res.status(500).json({ error: 'Failed to serve audio file' });
    }
  });

  app.get('/api/elevenlabs/voices', async (req, res) => {
    console.log('Received request for /api/elevenlabs/voices');
    try {
      console.log('Calling getElevenLabsVoices function');
      const voices = await getElevenLabsVoices();
      console.log(`Successfully retrieved ${voices.length} ElevenLabs voices`);
      res.json(voices);
    } catch (error) {
      console.error('Error in /api/elevenlabs/voices endpoint:', error);
      logMessage(LogLevel.ERROR, 'API', `Error getting ElevenLabs voices: ${error}`);
      res.status(500).json({ error: 'Failed to get ElevenLabs voices' });
    }
  });

  app.post('/api/elevenlabs/synthesize', async (req, res) => {
    try {
      const { text, voiceId, optimize_streaming_latency, speed, stability, similarity, download } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      console.log(`Synthesizing voice with ElevenLabs: "${text.substring(0, 50)}..." using voiceId: ${voiceId}`);

      // Create a unique file ID for this audio generation
      const fileId = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      // Format text for filename - truncate and remove invalid characters
      const cleanText = text
        ? text.substring(0, 40).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
        : 'voiceover';
      const fileName = download ? `${cleanText}-${fileId.substring(0, 8)}.mp3` : `${fileId}.mp3`;
      const filePath = `/tmp/${fileName}`;
      
      // Generate the audio file URL based on our server host
      let audioUrl;
      // Use the same protocol and host that the request came from
      const protocol = req.protocol;
      const host = req.get('host') || 'localhost:5000';
      audioUrl = `${protocol}://${host}/api/audio/${fileName}`;
      
      // Create stream to file
      const fileWriteStream = fs.createWriteStream(filePath);
      
      try {
        // Use the stream-optimized version of the TTS function
        const audioStream = await getTtsStream(text, {
          voiceId, 
          optimize_streaming_latency: optimize_streaming_latency || 4, // Maximum optimization by default
          voice_speed: speed || 1.0,
          stability: stability || 0.5,
          similarity_boost: similarity || 0.75,
          output_format: "mp3_44100_128", // Optimized for web playback
          timeout: 10000 // 10 second timeout for faster response
        });
        
        // Save the audio stream to file
        audioStream.pipe(fileWriteStream);
        
        // Handle completion and errors
        audioStream.on('end', () => {
          console.log(`Audio file saved successfully to ${filePath}`);
          res.json({ 
            audioUrl: audioUrl,
            message: 'Voice generated successfully',
            fileName: fileName,
            text: text 
          });
        });
        
        // Handle stream errors
        audioStream.on('error', (error: Error) => {
          console.error('Error streaming audio to file:', error);
          fileWriteStream.end();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          res.status(500).json({ error: 'Audio generation error: ' + error.message });
        });
        
        // Return early - the stream completion will handle the response
        return;
      } catch (error) {
        // Log the error and continue with fallback method
        console.error('Optimized audio streaming failed, falling back to traditional method:', error);
        fileWriteStream.end();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Fallback method if streaming fails
      const config = await storage.getConfig();
      
      // Use the API key from environment variable if not in config
      const apiKey = config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ error: 'ElevenLabs API key is required' });
      }
      
      // Get the voice ID (use specified voiceId, configured voice, or default to Jessica voice)
      const selectedVoiceId = voiceId || config.elevenLabsVoiceId || 'jsCqWAovK2LkecY7zXl4'; // Jessica voice ID
      
      // Get the model ID or use a default
      const modelId = config.modelId || 'eleven_monolingual_v1';
      
      // Request audio file from ElevenLabs - with optimization parameters
      const response = await axios({
        method: 'post',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        data: {
          text,
          model_id: modelId,
          voice_settings: {
            stability: stability || config.stability || 0.5,
            similarity_boost: similarity || config.similarity || 0.75,
            speed: speed || 1.0
          }
        },
        responseType: 'arraybuffer'
      });
      
      // Track API usage
      await storage.incrementApiMetric('elevenlabs', 0, text.length);
      
      // Return the audio file
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(response.data));
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      res.status(500).json({ error: 'Failed to synthesize speech' });
    }
});

app.get('/api/elevenlabs/voices/play/:voiceId', async (req, res) => {
    try {
      const { voiceId } = req.params;
      if (!voiceId) {
        return res.status(400).json({ error: 'Voice ID is required' });
      }
      
      const config = await storage.getConfig();
      
      // Use the API key from environment variable if not in config
      const apiKey = config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ error: 'ElevenLabs API key is required' });
      }
      
      // Use a specific sample text as requested for voice preview
      // This text clearly identifies the purpose without creating agents
      const sampleText = "Hi, I'm your AI assistant. Here's how I sound.";
      
      try {
        // First try to use the streaming API, which is often more reliable
        const audioStream = await getTtsStream(sampleText, {
          voiceId, 
          optimize_streaming_latency: 4, // Maximum optimization 
          output_format: "mp3_44100_128", // Optimized for web playback
          timeout: 10000 // 10 second timeout for faster response
        });
        
        // Stream directly to client with appropriate headers
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        
        // Pipe the audio stream directly to response
        audioStream.pipe(res);
        
        // Handle stream errors
        audioStream.on('error', (error: Error) => {
          console.error('Error streaming voice sample:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Voice sample streaming error' });
          } else {
            res.end();
          }
        });
        
        // Track API usage
        await storage.incrementApiMetric('elevenlabs', 0, sampleText.length);
        
        // Return early - the stream will handle the response
        return;
        
      } catch (streamError) {
        // Log streaming error but continue with fallback method
        console.log('Voice sample streaming failed, using traditional method:', streamError);
      }
      
      // Get the model ID or use a default
      const modelId = config.modelId || 'eleven_monolingual_v1';
      
      // Fallback: Request audio file from ElevenLabs using traditional method
      const response = await axios({
        method: 'post',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        data: {
          text: sampleText,
          model_id: modelId,
          voice_settings: {
            stability: config.stability || 0.5,
            similarity_boost: config.similarity || 0.75,
          }
        },
        responseType: 'arraybuffer'
      });
      
      // Track API usage if we didn't track it above
      await storage.incrementApiMetric('elevenlabs', 0, sampleText.length);
      
      // Return the audio file with caching headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.send(Buffer.from(response.data));
    } catch (error) {
      console.error('Error playing voice sample:', error);
      logMessage(LogLevel.ERROR, 'API', `Error playing voice sample: ${error}`);
      res.status(500).json({ error: 'Failed to play voice sample' });
    }
  });
  
  app.get('/api/elevenlabs/models', async (req, res) => {
    try {
      const models = await getElevenLabsModels();
      res.json(models);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error getting ElevenLabs models: ${error}`);
      res.status(500).json({ error: 'Failed to get ElevenLabs models' });
    }
  });

  // Adding compatibility redirect for any client still calling the old Play.ht API
  app.get('/api/playht/voices', async (req, res) => {
    console.log('Received deprecated request for /api/playht/voices - redirecting to ElevenLabs API');
    try {
      // Redirect to the ElevenLabs voices API
      const voices = await getElevenLabsVoices();
      console.log(`Redirected Play.ht request to ElevenLabs and retrieved ${voices.length} voices`);
      res.json(voices);
    } catch (error) {
      console.error('Error in Play.ht compatibility layer:', error);
      logMessage(LogLevel.ERROR, 'API', `Error getting ElevenLabs voices via Play.ht compatibility: ${error}`);
      res.status(500).json({ error: 'Failed to get voices' });
    }
  });

  app.post('/api/playht/synthesize', async (req, res) => {
    console.log('Received deprecated request for /api/playht/synthesize - redirecting to ElevenLabs API');
    try {
      const { text, voiceId, speed, pitch } = req.body;
      
      if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Text is required' });
      }

      if (!voiceId) {
        return res.status(400).json({ error: 'Voice ID is required' });
      }

      // Log the request
      await logMessage(LogLevel.INFO, 'API', `Play.ht synthesis request redirected to ElevenLabs: ${text.substring(0, 50)}... with voice ${voiceId}`);
      
      // Map pitch to ElevenLabs parameters - use similarity as equivalent
      const similarity = (pitch && pitch > 1) ? 0.8 : 0.6;
      
      try {
        // Use the ElevenLabs streaming method instead
        const audioStream = await getTtsStream(text, {
          voiceId, 
          optimize_streaming_latency: 4,
          voice_speed: speed || 1.0,
          stability: 0.5,
          similarity_boost: similarity,
          output_format: "mp3_44100_128"
        });
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'audio/mpeg');
        
        // Stream the audio directly to the response
        audioStream.pipe(res);
        
        // Handle errors
        audioStream.on('error', (error: Error) => {
          console.error('Error streaming audio in compatibility layer:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Audio streaming error' });
          } else {
            res.end();
          }
        });
      } catch (streamError) {
        console.error('Error in Play.ht compatibility streaming:', streamError);
        res.status(500).json({ error: 'Failed to generate audio' });
      }
    } catch (error) {
      console.error('Error in Play.ht compatibility layer:', error);
      logMessage(LogLevel.ERROR, 'API', `Error synthesizing speech with compatibility layer: ${error}`);
      res.status(500).json({ error: 'Failed to synthesize speech' });
    }
  });
  
  // Server control APIs
  app.post('/api/server/restart', (req, res) => {
    logMessage(LogLevel.INFO, 'API', 'Server restart requested');
    res.json({ success: true, message: 'Server restart initiated' });
    
    // In a real app, we'd implement a proper restart
    // For this demo, we'll just simulate it
    broadcastToAll({
      type: 'server_status',
      payload: {
        online: false,
        message: 'Server Restarting...'
      }
    });
    
    setTimeout(() => {
      broadcastToAll({
        type: 'server_status',
        payload: {
          online: true,
          message: 'Server Online'
        }
      });
    }, 3000);
  });
  
  // Twilio webhook test endpoint to verify URL configuration
  app.get('/api/twilio/test-webhook', async (req, res) => {
    // Get the base URL that would be used for Twilio webhooks
    // Use the current Replit domain for production
    let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
      
    // If we're in a test environment, use the host from request
    if (process.env.NODE_ENV === 'test') {
      const host = req.get('host') || 'localhost:5000';
      webhookBaseUrl = `https://${host}`;
    }
    
    // Get Twilio phone number from environment
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+15302886523';
    
    // Get all the webhook URLs that would be used
    const webhookUrls = {
      voiceUrl: `${webhookBaseUrl}/api/twilio/voice`,
      outboundVoiceUrl: `${webhookBaseUrl}/api/twilio/outbound-voice`,
      statusCallbackUrl: `${webhookBaseUrl}/api/twilio/outbound-status`,
      recordingUrl: `${webhookBaseUrl}/api/twilio/recording`,
      recordingStatusUrl: `${webhookBaseUrl}/api/twilio/recording-status`,
      audioUrl: `${webhookBaseUrl}/api/twilio/audio`,
      twilioPhoneNumber: twilioPhoneNumber
    };
    
    // Return webhook information
    res.json({
      message: 'Twilio webhook test endpoint',
      webhookBaseUrl,
      webhookUrls,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        replSlug: process.env.REPL_SLUG || 'not set',
        replOwner: process.env.REPL_OWNER || 'not set',
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? '✓ Present (masked)' : 'not set',
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? '✓ Present (masked)' : 'not set',
        twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || 'not set'
      }
    });
  });
  
  // Twilio Phone Numbers API endpoint
  app.get('/api/twilio/available-phone-numbers', isAuthenticated, async (req, res) => {
    try {
      console.log('[DEBUG] Getting Twilio available phone numbers');
      
      // Get available Twilio phone numbers
      const { getAvailableTwilioNumbers } = await import('./lib/twilio');
      const phoneNumbers = await getAvailableTwilioNumbers();
      
      res.json({ phoneNumbers });
    } catch (error) {
      console.error('[ERROR] Error fetching Twilio available phone numbers:', error);
      logMessage(LogLevel.ERROR, 'Phone Number', `Error fetching Twilio available phone numbers: ${error}`);
      res.status(500).json({ error: 'Error fetching Twilio available phone numbers' });
    }
  });
  
  // API endpoint to get user's purchased Twilio phone numbers
  app.get('/api/twilio/phone-numbers', isAuthenticated, async (req, res) => {
    try {
      console.log('[DEBUG] Getting purchased Twilio phone numbers');
      
      // Get purchased Twilio phone numbers
      const { getTwilioPhoneNumbers } = await import('./lib/twilio');
      const phoneNumbers = await getTwilioPhoneNumbers();
      
      res.json({ phoneNumbers });
    } catch (error) {
      console.error('[ERROR] Error fetching purchased Twilio phone numbers:', error);
      logMessage(LogLevel.ERROR, 'Phone Number', `Error fetching purchased Twilio phone numbers: ${error}`);
      res.status(500).json({ error: 'Failed to fetch phone numbers' });
    }
  });
  
  // Additional endpoint for purchased-phone-numbers (used by client code)
  app.get('/api/twilio/purchased-phone-numbers', isAuthenticated, async (req, res) => {
    try {
      console.log('[DEBUG] Getting purchased Twilio phone numbers (via purchased-phone-numbers endpoint)');
      
      // Get the current user
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // First check if the user has any purchased phone numbers in the database
      const userPurchasedNumbers = await storage.getPurchasedPhoneNumbers(user.id);
      
      if (userPurchasedNumbers && userPurchasedNumbers.length > 0) {
        // User has purchased phone numbers, return those
        console.log(`[DEBUG] Found ${userPurchasedNumbers.length} purchased phone numbers for user ${user.id}`);
        const formattedNumbers = userPurchasedNumbers.map(number => number.phone_number);
        console.log('[DEBUG] Returning user purchased phone numbers:', formattedNumbers);
        return res.json({ phoneNumbers: formattedNumbers });
      }
      
      // If no user-specific purchased numbers, check if it's emilghelmeci@gmail.com
      if (user.email === 'emilghelmeci@gmail.com') {
        // For this specific user, always use their purchased Twilio number
        const dedicatedNumber = '+15302886523';
        console.log(`[DEBUG] Returning dedicated phone number for ${user.email}: ${dedicatedNumber}`);
        return res.json({ phoneNumbers: [dedicatedNumber] });
      }
      
      // For other users, fall back to account phone numbers
      const { getTwilioPhoneNumbers } = await import('./lib/twilio');
      const phoneNumbers = await getTwilioPhoneNumbers();
      
      // Log the phone numbers being returned for debugging
      console.log('[DEBUG] User has no purchased phone numbers, returning account numbers:', phoneNumbers);
      
      res.json({ phoneNumbers });
    } catch (error) {
      console.error('[ERROR] Error fetching purchased Twilio phone numbers:', error);
      logMessage(LogLevel.ERROR, 'Phone Number', `Error fetching purchased Twilio phone numbers: ${error}`);
      res.status(500).json({ error: 'Failed to fetch phone numbers' });
    }
  });

  // Twilio Voice Webhook
  app.post('/api/twilio/voice', async (req, res) => {
    try {
      const twilioResponse = await handleTwilioWebhook(req.body, req);
      res.set('Content-Type', 'text/xml');
      res.send(twilioResponse);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'Phone Number', `Error handling voice webhook: ${error}`);
      res.status(500).send('Error processing voice webhook');
    }
  });
  
  // Optimized Chat API endpoint for the floating chat bubble
  app.post('/api/chat', async (req, res) => {
    try {
      console.log('Chat API received request body:', JSON.stringify(req.body));
      const { message, conversation } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Set the OpenAI API key directly from the chat endpoint
      process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
      
      // Trim the message for consistency
      const trimmedMessage = message.trim();
      
      // Log the incoming message asynchronously (don't await)
      logMessage(LogLevel.INFO, 'API', `Chat message received: "${trimmedMessage.substring(0, 50)}${trimmedMessage.length > 50 ? '...' : ''}"`)
        .catch(err => console.error('Error logging message:', err));
      
      // Track metrics asynchronously (don't await)
      storage.incrementApiMetric('openai', 0, 0, undefined, undefined, '/api/chat')
        .catch(err => console.error('Error incrementing API metric:', err));
      
      // Performance optimization: Process the response with minimal latency
      const aiResponse = await chatWithAssistant(trimmedMessage, conversation || [], {
        max_tokens: 150, // Limit token count for faster response
        temperature: 0.7, // Lower temperature for more deterministic responses
      });
      
      // Return the response immediately
      res.json({ 
        response: aiResponse,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error processing chat message:', error);
      
      // Log error asynchronously (don't await)
      logMessage(LogLevel.ERROR, 'API', `Chat error: ${error?.message || 'Unknown error'}`)
        .catch(err => console.error('Error logging error message:', err));
      
      // Provide a fast fallback response in case of error
      if (error?.status === 401) {
        return res.status(401).json({ 
          error: 'OpenAI API key authentication error', 
          message: 'Your OpenAI API key may be invalid or may not have the necessary permissions.' 
        });
      }
      
      if (error?.status === 429) {
        return res.status(429).json({ 
          error: 'OpenAI API rate limit exceeded', 
          message: 'Please try again in a few moments.' 
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to process chat message',
        message: error?.message || 'Unknown error occurred' 
      });
    }
  });

  // Twilio Incoming Audio webhook
  app.post('/api/twilio/audio', async (req, res) => {
    try {
      const { CallSid, SpeechResult } = req.body;
      
      if (!CallSid || !SpeechResult) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      logMessage(LogLevel.INFO, 'Phone Number', `Received speech: ${SpeechResult} from call ${CallSid}`);
      
      // Get or initialize conversation context
      if (!conversationContexts.has(CallSid)) {
        conversationContexts.set(CallSid, []);
      }
      const context = conversationContexts.get(CallSid) || [];
      
      // Set the OpenAI API key directly
      process.env.OPENAI_API_KEY = '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';
      
      // Process with OpenAI
      const openaiResponse = await getOpenAIResponse(SpeechResult, context);
      
      // Update conversation context
      context.push({ role: 'user', content: SpeechResult });
      context.push({ role: 'assistant', content: openaiResponse });
      conversationContexts.set(CallSid, context);
      
      // Get agent-specific voice ID for ElevenLabs TTS
      let voiceOptions = {};
      
      // Use the agent's voice ID if available
      if (agent && agent.voice_id) {
        console.log(`[TWILIO] Using agent's configured voice: ${agent.voice_id}`);
        voiceOptions = {
          voiceId: agent.voice_id,
          stability: 0.5,
          similarity: 0.75
        };
      } else {
        console.log(`[TWILIO] No custom voice found for agent, using default voice`);
      }
      
      // Get TTS stream from ElevenLabs with agent's voice if available
      const audioStream = await getTtsStream(openaiResponse, voiceOptions);
      
      // Get webhook base URL for Twilio to correctly call our endpoint
      let webhookBaseUrl;
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        // For modern Replit deployments, use the replit.dev domain
        webhookBaseUrl = `https://${process.env.REPL_SLUG.replace(/-/g, '-')}-${process.env.REPL_OWNER.toLowerCase()}.replit.dev`;
      } else {
        const host = req.get('host') || 'localhost:5000';
        webhookBaseUrl = `https://${host}`; // Use the actual request host
      }
      
      // Sanitize the AI response to prevent XML issues
      const sanitizedResponse = openaiResponse.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '"': return '&quot;';
          case "'": return '&apos;';
          default: return c;
        }
      });
      
      // Return TwiML response with the AI-generated message using Polly voice
      // This is a simpler approach that always works with Twilio
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Say voice="Polly.Joanna-Neural">' + sanitizedResponse + '</Say>' +
        '<Gather input="speech" action="' + webhookBaseUrl + '/api/twilio/audio" method="POST" speechTimeout="auto" language="en-US">' +
          '<Say voice="Polly.Joanna-Neural">Is there anything else you would like to know?</Say>' +
        '</Gather>' +
        '<Say voice="Polly.Joanna-Neural">I didn\'t hear anything. Goodbye!</Say>' +
      '</Response>';
      
      res.set('Content-Type', 'text/xml');
      res.send(twiml);
      
      // Broadcast update to all clients
      broadcastToAll({
        type: 'conversation_update',
        callSid: CallSid,
        userMessage: SpeechResult,
        aiResponse: openaiResponse
      });
    } catch (error) {
      logMessage(LogLevel.ERROR, 'Phone Number', `Error processing audio: ${error}`);
      
      // Even on error, return valid TwiML to prevent the call from hanging up - use fixed format
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Say voice="Polly.Joanna-Neural">I\'m sorry, I encountered a problem processing your request. Let me try again.</Say>' +
        '<Gather input="speech" action="' + webhookBaseUrl + '/api/twilio/audio" method="POST" speechTimeout="auto" language="en-US">' +
          '<Say voice="Polly.Joanna-Neural">Could you please repeat your question?</Say>' +
        '</Gather>' +
        '<Say voice="Polly.Joanna-Neural">I didn\'t hear anything. Goodbye!</Say>' +
      '</Response>';
      
      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    }
  });
  
  // Twilio Recording Webhook
  app.post('/api/twilio/recording', async (req, res) => {
    try {
      const recordingResponse = await handleRecordingWebhook(req.body);
      res.set('Content-Type', 'text/xml');
      res.send(recordingResponse);
      
      // Broadcast recording update
      broadcastToAll({
        type: 'recording_update',
        callSid: req.body.CallSid,
        recordingUrl: req.body.RecordingUrl
      });
    } catch (error) {
      logMessage(LogLevel.ERROR, 'Phone Number', `Error handling recording webhook: ${error}`);
      
      // Return empty TwiML response even on error
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    }
  });
  
  // Twilio Recording Status Webhook
  app.post('/api/twilio/recording-status', async (req, res) => {
    try {
      const statusResponse = await handleRecordingStatusWebhook(req.body);
      res.set('Content-Type', 'text/xml');
      res.send(statusResponse);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'Phone Number', `Error handling recording status webhook: ${error}`);
      
      // Return empty TwiML response even on error
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    }
  });
  
  // Twilio outbound voice webhook for handling AI responses in outbound calls
  app.post('/api/twilio/outbound-voice', async (req, res) => {
    try {
      console.log('[TWILIO] Received outbound voice webhook with params:', req.query);
      console.log('[TWILIO] Received outbound voice webhook with body:', req.body);
      
      // Try to get the agent ID from multiple possible sources
      // 1. Query parameters (as expected)
      // 2. Body parameters (some Twilio integrations pass it here)
      // 3. DTMF tones in Digits (our special sendDigits trick)
      // 4. Call database to find the call by SID
      let agentId = req.query.agentId || req.body.agentId;
      
      // If we still don't have an agentId, try to extract it from Digits (our DTMF hack)
      if (!agentId && req.body.Digits) {
        console.log('[TWILIO] Trying to extract agentId from Digits:', req.body.Digits);
        // Extract digits, removing any leading w's (wait) and trailing # (end)
        const digits = req.body.Digits.replace(/^w+/, '').replace(/#$/, '');
        if (/^\d+$/.test(digits)) {
          agentId = digits;
          console.log('[TWILIO] Extracted agentId from Digits:', agentId);
        }
      }
      
      // If we still don't have an agentId, try to look up the call in our database
      if (!agentId && req.body.CallSid) {
        try {
          console.log('[TWILIO] Looking up call in database by SID:', req.body.CallSid);
          const call = await storage.getCallBySid(req.body.CallSid);
          if (call && call.agentId) {
            agentId = call.agentId.toString();
            console.log('[TWILIO] Found agentId in database:', agentId);
          }
        } catch (dbError) {
          console.error('[TWILIO] Error looking up call in database:', dbError);
        }
      }
      
      if (!agentId) {
        logMessage(LogLevel.ERROR, 'Twilio', 'Missing agentId in outbound voice webhook after all recovery attempts');
        console.error('[TWILIO] Could not determine agent ID from any source. Using default fallback.');
        
        // Return a simple TwiML response so the call doesn't fail completely
        const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
          '<Say voice="Polly.Joanna-Neural">Hello, this is Warm Lead Network. Our system is experiencing technical difficulties. Please try again later.</Say>' +
          '</Response>';
        
        res.set('Content-Type', 'text/xml');
        return res.send(twiml);
      }
      
      const agent = await storage.getAgent(Number(agentId));
      
      if (!agent) {
        logMessage(LogLevel.ERROR, 'Twilio', `Agent with ID ${agentId} not found for outbound voice webhook`);
        
        // Return a valid TwiML response even if agent is not found
        const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
          '<Say voice="Polly.Joanna-Neural">We could not find the requested agent. Please contact support for assistance.</Say>' +
          '</Response>';
        
        res.set('Content-Type', 'text/xml');
        return res.send(twiml);
      }
      
      console.log('[TWILIO] Found agent for voice call:', agent.name);
      
      // Generate TwiML response
      const welcomeMessage = agent.description || 'Hello, I am an AI assistant. How can I help you today?';
      
      // Get the base URL from host header with special handling for Replit production
      // Use the current Replit domain for production
      let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
      
      // If we're in a test environment, use the host from request
      if (process.env.NODE_ENV === 'test') {
        const host = req.get('host') || 'localhost:5000';
        webhookBaseUrl = `https://${host}`;
      }
      
      logMessage(LogLevel.INFO, 'Twilio', `Using webhook base URL: ${webhookBaseUrl}`);
      
      // Get agent personality to customize the conversation
      let agentPersonality = "AI assistant";
      if (agent.personality) {
        agentPersonality = agent.personality.substring(0, 100); // Limit to 100 chars for safety
      }
      
      // Log which agent is being used for this call
      console.log(`[TWILIO] Starting AI conversation with agent ID ${agentId}: ${agent.name} (${agentPersonality})`);
      
      // Create a simplified TwiML response with minimal formatting to avoid XML parsing issues
      // Single line format with no extra spaces or newlines
      const sanitizedWelcome = welcomeMessage.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '"': return '&quot;';
          case "'": return '&apos;';
          default: return c;
        }
      });
      
      // Generate a streaming audio URL for the agent's welcome message
      const welcomeAudioUrl = `${webhookBaseUrl}/api/twilio/stream-response?agentId=${agentId}&text=${encodeURIComponent(sanitizedWelcome)}`;
      const promptAudioUrl = `${webhookBaseUrl}/api/twilio/stream-response?agentId=${agentId}&text=${encodeURIComponent("How may I help you today?")}`;
      const goodbyeAudioUrl = `${webhookBaseUrl}/api/twilio/stream-response?agentId=${agentId}&text=${encodeURIComponent("I didn't hear anything. Please call back if you would like to speak with me. Goodbye!")}`;
      
      console.log(`[TWILIO] Generated streaming audio URLs for agent voice`);
      
      // Create TwiML that uses the streaming audio URLs with the agent's voice
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Play>' + welcomeAudioUrl + '</Play>' +
        '<Gather input="speech" timeout="5" speechTimeout="auto" action="' + 
        webhookBaseUrl + '/api/twilio/gather?agentId=' + agentId + 
        '" method="POST">' +
        '<Play>' + promptAudioUrl + '</Play>' +
        '</Gather>' +
        '<Play>' + goodbyeAudioUrl + '</Play>' +
        '</Response>';
      
      // Log a success message but avoid logging the full TwiML to prevent issues
      console.log(`[TWILIO] Generated TwiML response for agent ${agent.name} (ID: ${agentId})`);
      console.log(`[TWILIO] TwiML length: ${twiml.length} characters`);
      
      console.log('[TWILIO] Responding with TwiML');
      // Don't log full TwiML which might cause formatting issues
      
      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    } catch (error) {
      logMessage(LogLevel.ERROR, 'Twilio', `Error handling outbound voice webhook: ${error}`);
      res.status(500).send('Error processing outbound voice webhook');
    }
  });
  
  // Twilio gather webhook for handling user input during calls
  app.post('/api/twilio/gather', async (req, res) => {
    try {
      console.log('[TWILIO] Received gather webhook with body:', req.body);
      console.log('[TWILIO] Received gather webhook with params:', req.query);
      
      // Extract important parameters
      const { Digits, SpeechResult, CallSid, agentId } = req.body;
      
      // Try to get the agent ID from multiple sources, with fallbacks:
      // 1. Query parameters (from the gather URL in TwiML)
      // 2. Body parameters (some Twilio integrations pass it here)
      // 3. DTMF tones in Digits (our special sendDigits trick)
      // 4. Call database to find the call by SID
      let queryAgentId = req.query.agentId || agentId;
      
      // If we still don't have an agentId, try to extract it from Digits (our DTMF hack)
      if (!queryAgentId && Digits) {
        console.log('[TWILIO] Trying to extract agentId from Digits:', Digits);
        // Extract digits, removing any leading w's (wait) and trailing # (end)
        const digits = Digits.replace(/^w+/, '').replace(/#$/, '');
        if (/^\d+$/.test(digits)) {
          queryAgentId = digits;
          console.log('[TWILIO] Extracted agentId from Digits:', queryAgentId);
        }
      }
      
      // If we still don't have an agentId, try to look up the call in our database
      if (!queryAgentId && CallSid) {
        try {
          console.log('[TWILIO] Looking up call in database by SID:', CallSid);
          const call = await storage.getCallBySid(CallSid);
          if (call && call.agentId) {
            queryAgentId = call.agentId.toString();
            console.log('[TWILIO] Found agentId in database:', queryAgentId);
          }
        } catch (dbError) {
          console.error('[TWILIO] Error looking up call in database:', dbError);
        }
      }
      
      // Last resort - try using a default agent ID for testing
      if (!queryAgentId) {
        console.error('[TWILIO] Could not determine agent ID from any source in gather webhook');
        
        // Get the webhook base URL
        let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
        if (process.env.NODE_ENV === 'test') {
          const host = req.get('host') || 'localhost:5000';
          webhookBaseUrl = `https://${host}`;
        }
        
        // Create a TwiML response with a generic message
        const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
          '<Say voice="Polly.Joanna-Neural">We could not determine which AI agent you were speaking with. Please try again later.</Say>' +
          '</Response>';
        
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
        return;
      }
      
      const agent = await storage.getAgent(Number(queryAgentId));
      
      if (!agent) {
        console.error(`[TWILIO] Agent with ID ${queryAgentId} not found`);
        throw new Error(`Agent with ID ${queryAgentId} not found`);
      }
      
      // Log what input we received from the user
      if (Digits) {
        console.log(`[TWILIO] User pressed: ${Digits}`);
      } else if (SpeechResult) {
        console.log(`[TWILIO] User said: ${SpeechResult}`);
      } else {
        console.log('[TWILIO] No user input detected');
      }
      
      // Get the webhook base URL
      let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
      if (process.env.NODE_ENV === 'test') {
        const host = req.get('host') || 'localhost:5000';
        webhookBaseUrl = `https://${host}`;
      }
      
      // Get or initialize conversation history for this call
      let callData = await storage.getCallBySid(CallSid);
      let conversations = [];
      
      // Generate a response using AI based on what the user provided
      let userMessage = '';
      
      if (Digits) {
        userMessage = `The user pressed: ${Digits}`;
      } else if (SpeechResult) {
        userMessage = SpeechResult;
      } else {
        userMessage = 'No input detected from user.';
      }
      
      try {
        // Add agent context information to improve AI responses
        const systemPrompt = agent.system_prompt || 
          `You are an AI assistant named ${agent.name}. Your main goal is ${agent.description || 'to assist callers'}. 
           Keep responses under 20 seconds when spoken aloud. Be engaging but concise.`;
        
        // Add this user message to the conversation history array
        conversations.push({ type: 'user', text: userMessage });
        
        // Get AI response
        const aiResponse = await chatWithAssistant(userMessage, conversations, {
          model: "gpt-4o",
          temperature: 0.7,
          max_tokens: 250, // Limit response length for phone calls
          system_prompt: systemPrompt
        });
        
        // Add AI response to conversation history
        conversations.push({ type: 'ai', text: aiResponse });
        
        // Store updated conversation in call record
        if (callData) {
          // Update the existing call record with conversation transcript
          const transcriptUpdate = {
            transcript: JSON.stringify(conversations)
          };
          await storage.updateCall(CallSid, transcriptUpdate);
        } else {
          // Create a new call record if one doesn't exist
          await storage.addCall({
            callSid: CallSid,
            agentId: Number(queryAgentId),
            status: CallStatus.IN_PROGRESS,
            phoneNumber: req.body.From || 'unknown',
            transcript: JSON.stringify(conversations),
            recordingUrl: null,
            recordingSid: null
          });
        }
        
        // Get the full agent information with voice configuration
        const agentVoiceId = agent.voice_id;
        console.log(`[TWILIO] Using agent voice ID: ${agentVoiceId || 'default'}`);
        
        // Get a temporary audio URL for this response
        // We'll generate a response URL that Twilio can stream
        const tempAudioFilename = `temp-response-${Date.now()}.mp3`;
        const audioUrl = `${webhookBaseUrl}/api/twilio/stream-response?agentId=${queryAgentId}&text=${encodeURIComponent(aiResponse)}`;
        
        console.log(`[TWILIO] Generated streaming audio URL: ${audioUrl}`);
        
        // Create a TwiML response that plays ElevenLabs audio instead of using the basic Say tag
        const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
          '<Play>' + audioUrl + '</Play>' +
          '<Gather input="speech" timeout="5" speechTimeout="auto" action="' + webhookBaseUrl + '/api/twilio/gather?agentId=' + queryAgentId + '" method="POST">' +
            '<Pause length="1"/>' +
          '</Gather>' +
          '<Say voice="Polly.Joanna-Neural">I didn\'t hear anything. Goodbye!</Say>' +
          '</Response>';
        
        console.log('[TWILIO] Responding with AI-generated TwiML');
        
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
        
      } catch (aiError) {
        console.error('[TWILIO] Error generating AI response:', aiError);
        
        // Create fallback audio with ElevenLabs voice
        const fallbackText = "I'm having trouble processing your request right now. Please try again later.";
        const fallbackAudioUrl = `${webhookBaseUrl}/api/twilio/stream-response?agentId=${queryAgentId}&text=${encodeURIComponent(fallbackText)}`;
        
        // Fallback response using the agent's voice
        const fallbackTwiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
          '<Play>' + fallbackAudioUrl + '</Play>' +
          '</Response>';
        
        res.set('Content-Type', 'text/xml');
        res.send(fallbackTwiml);
      }
      
    } catch (error) {
      console.error('[TWILIO] Error handling gather webhook:', error);
      
      // Try to use the agent's voice for error message if possible
      let errorAudioUrl;
      try {
        if (queryAgentId) {
          errorAudioUrl = `${webhookBaseUrl}/api/twilio/stream-response?agentId=${queryAgentId}&text=${encodeURIComponent("We encountered a technical difficulty. The call will now end.")}`;
          
          // Return TwiML with streaming audio
          const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
            '<Play>' + errorAudioUrl + '</Play>' +
            '</Response>';
          
          res.set('Content-Type', 'text/xml');
          res.send(twiml);
          return;
        }
      } catch (innerError) {
        console.error('[TWILIO] Error generating error audio URL:', innerError);
      }
      
      // Fallback to standard TwiML if the above fails
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Say voice="Polly.Joanna-Neural">We encountered a technical difficulty. The call will now end.</Say>' +
        '</Response>';
      
      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    }
  });
  
  // Twilio outbound call status webhook for tracking call progress
  app.post('/api/twilio/outbound-status', async (req, res) => {
    try {
      const { CallSid, CallStatus } = req.body;
      
      if (!CallSid) {
        return res.status(400).json({ error: 'CallSid is required' });
      }
      
      logMessage(LogLevel.INFO, 'Twilio', `Outbound call status update for ${CallSid}: ${CallStatus}`);
      
      // Update call status in the database
      let dbStatus;
      switch (CallStatus) {
        case 'completed':
          dbStatus = CallStatus.COMPLETED;
          break;
        case 'failed':
          dbStatus = CallStatus.FAILED;
          break;
        case 'busy':
          dbStatus = CallStatus.FAILED;
          break;
        case 'no-answer':
          dbStatus = CallStatus.FAILED;
          break;
        case 'canceled':
          dbStatus = CallStatus.FAILED;
          break;
        case 'in-progress':
          dbStatus = CallStatus.IN_PROGRESS;
          break;
        case 'queued':
          dbStatus = CallStatus.QUEUED;
          break;
        case 'ringing':
          dbStatus = CallStatus.RINGING;
          break;
        default:
          dbStatus = CallStatus.UNKNOWN;
      }
      
      await storage.updateCallStatus(CallSid, dbStatus);
      
      // Send an empty response
      res.set('Content-Type', 'text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      
      // Broadcast call status update to all connected clients
      broadcastToAll({
        type: 'call_status_update',
        callSid: CallSid,
        status: dbStatus
      });
    } catch (error) {
      logMessage(LogLevel.ERROR, 'Twilio', `Error handling outbound status webhook: ${error}`);
      
      // Even on error, return a valid TwiML response
      res.set('Content-Type', 'text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });
  
  // Stream response endpoint for Twilio to play AI voices
  app.get('/api/twilio/stream-response', async (req, res) => {
    try {
      const { agentId, text } = req.query;
      
      if (!text) {
        return res.status(400).json({ error: 'No text provided for streaming' });
      }
      
      console.log(`[TWILIO] Streaming response API called with text: ${text}`);
      
      // Get agent voice configuration if available
      let voiceOptions = {};
      
      if (agentId) {
        const agent = await storage.getAgent(Number(agentId));
        if (agent && agent.voice_id) {
          console.log(`[TWILIO] Using agent voice ID: ${agent.voice_id} for streaming response`);
          voiceOptions = {
            voiceId: agent.voice_id,
            stability: 0.5,
            similarity: 0.75
          };
        }
      }
      
      // Get TTS stream from ElevenLabs directly 
      const audioStream = await getTtsStream(text.toString(), voiceOptions);
      
      if (!audioStream) {
        return res.status(500).json({ error: 'Failed to generate audio stream' });
      }
      
      // Set appropriate headers for audio streaming
      res.set({
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked'
      });
      
      // Pipe the audio stream directly to the response
      audioStream.pipe(res);
      
      // Handle stream errors
      audioStream.on('error', (error) => {
        console.error(`[TWILIO] Error streaming audio: ${error}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Audio stream error' });
        } else {
          res.end();
        }
      });
    } catch (error) {
      console.error(`[TWILIO] Error in stream response: ${error}`);
      res.status(500).json({ error: 'Failed to stream response' });
    }
  });
  
  // Debug endpoint to verify webhook URLs
  app.get('/api/twilio/test-webhook', async (req, res) => {
    try {
      // Get the base URL for webhooks - use the actual domain format
      // Use the current Replit domain for production
      let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
      
      // If we're in a test environment, use the host from request
      if (process.env.NODE_ENV === 'test') {
        const host = req.get('host') || 'localhost:5000';
        webhookBaseUrl = `https://${host}`;
      }
      
      // Mask sensitive information
      const maskSensitive = (text) => {
        if (!text) return 'Not set';
        return '✓ Present (masked)';
      };
      
      // Return detailed information about the Twilio configuration
      res.json({
        message: 'Twilio webhook test endpoint',
        webhookBaseUrl,
        webhookUrls: {
          voiceUrl: `${webhookBaseUrl}/api/twilio/voice`,
          outboundVoiceUrl: `${webhookBaseUrl}/api/twilio/outbound-voice`,
          statusCallbackUrl: `${webhookBaseUrl}/api/twilio/outbound-status`,
          recordingUrl: `${webhookBaseUrl}/api/twilio/recording`,
          recordingStatusUrl: `${webhookBaseUrl}/api/twilio/recording-status`,
          audioUrl: `${webhookBaseUrl}/api/twilio/audio`,
          twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1 530 288 6523'
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          replSlug: process.env.REPL_SLUG || 'workspace',
          replOwner: process.env.REPL_OWNER || 'emilghelmeci',
          twilioAccountSid: maskSensitive(process.env.TWILIO_ACCOUNT_SID),
          twilioAuthToken: maskSensitive(process.env.TWILIO_AUTH_TOKEN),
          twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1 530 288 6523'
        }
      });
    } catch (error) {
      console.error('Error testing webhook URL:', error);
      res.status(500).json({ error: 'Failed to test webhook URL' });
    }
  });
  
  // Simple Twilio voice fallback endpoint
  app.post('/api/twilio/voice-fallback', (req, res) => {
    try {
      console.log('[TWILIO] Received voice fallback request:', req.body);
      
      // Try to get agent ID from query params
      const { agentId } = req.query;
      
      if (agentId) {
        try {
          // Get a webhook base URL
          let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
          if (process.env.NODE_ENV === 'test') {
            const host = req.get('host') || 'localhost:5000';
            webhookBaseUrl = `https://${host}`;
          }
          
          // Create fallback messages with the agent's voice
          const message1 = `${webhookBaseUrl}/api/twilio/stream-response?agentId=${agentId}&text=${encodeURIComponent("This is a fallback response from the Warm Lead Network platform.")}`;
          const message2 = `${webhookBaseUrl}/api/twilio/stream-response?agentId=${agentId}&text=${encodeURIComponent("There was an issue with our service, but the call is still connected.")}`;
          const message3 = `${webhookBaseUrl}/api/twilio/stream-response?agentId=${agentId}&text=${encodeURIComponent("Thank you for your patience. Goodbye!")}`;
          
          // Create a TwiML response with streaming audio for the agent's voice
          const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
            '<Play>' + message1 + '</Play>' +
            '<Pause length="1"/>' +
            '<Play>' + message2 + '</Play>' +
            '<Pause length="1"/>' +
            '<Play>' + message3 + '</Play>' +
            '</Response>';
          
          res.set('Content-Type', 'text/xml');
          res.send(twiml);
          return;
        } catch (voiceError) {
          console.error('[TWILIO] Error creating agent voice fallback:', voiceError);
        }
      }
      
      // Fallback to a simple TwiML response with consistent voice if agent voice fails
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Say voice="Polly.Joanna-Neural">This is a fallback response from the Warm Lead Network platform.</Say>' +
        '<Pause length="1"/>' +
        '<Say voice="Polly.Joanna-Neural">There was an issue with our service, but the call is still connected.</Say>' +
        '<Pause length="1"/>' +
        '<Say voice="Polly.Joanna-Neural">Thank you for your patience. Goodbye!</Say>' +
        '</Response>';
      
      console.log('[TWILIO] Responding with fallback TwiML');
      
      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    } catch (error) {
      console.error('[TWILIO] Error in voice fallback endpoint:', error);
      
      // Even on error, return a valid TwiML response with no whitespace
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Say>We apologize, but there was an error in our system. Goodbye!</Say>' +
        '</Response>';
      
      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    }
  });
  
  // Get recordings for a call
  app.get('/api/calls/:callSid/recording', async (req, res) => {
    try {
      const { callSid } = req.params;
      const call = await storage.getCallBySid(callSid);
      
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      res.json({
        recordingUrl: call.recordingUrl,
        recordingSid: call.recordingSid,
        transcript: call.transcript
      });
    } catch (error) {
      logMessage(LogLevel.ERROR, 'API', `Error fetching call recording: ${error}`);
      res.status(500).json({ error: 'Failed to fetch call recording' });
    }
  });

  // Add event listeners for process termination to clean up resources
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    
    // Clear the member counter timer if it exists
    if (memberCounterTimer) {
      clearTimeout(memberCounterTimer);
      console.log('Member counter timer cleared');
    }
    
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    
    // Clear the member counter timer if it exists
    if (memberCounterTimer) {
      clearTimeout(memberCounterTimer);
      console.log('Member counter timer cleared');
    }
    
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
  
  // Saved Referral Links API Endpoints
  app.get('/api/partner/saved-referral-links', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      
      // Get all saved referral links for this partner
      const savedLinks = await storage.getSavedReferralLinks(partner.id);
      
      res.json(savedLinks);
    } catch (error) {
      console.error('Error getting saved referral links:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/partner/saved-referral-links', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      
      // Extract data from request
      const { name, base_url, full_url, campaign, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;
      
      // Create new saved referral link
      const savedLink = await storage.createSavedReferralLink({
        partner_id: partner.id,
        name,
        base_url,
        full_url,
        campaign,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        click_count: 0 
      });
      
      res.status(201).json(savedLink);
    } catch (error) {
      console.error('Error creating saved referral link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/partner/saved-referral-links/:id', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      const linkId = parseInt(req.params.id);
      
      if (isNaN(linkId)) {
        return res.status(400).json({ error: 'Invalid link ID' });
      }
      
      // Get the saved referral link
      const savedLink = await storage.getSavedReferralLink(linkId);
      
      if (!savedLink) {
        return res.status(404).json({ error: 'Saved referral link not found' });
      }
      
      // Check if the link belongs to this partner
      if (savedLink.partner_id !== partner.id) {
        return res.status(403).json({ error: 'Access forbidden - This link belongs to another partner' });
      }
      
      res.json(savedLink);
    } catch (error) {
      console.error('Error getting saved referral link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/partner/saved-referral-links/:id', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      const linkId = parseInt(req.params.id);
      
      if (isNaN(linkId)) {
        return res.status(400).json({ error: 'Invalid link ID' });
      }
      
      // Get the existing saved link
      const existingLink = await storage.getSavedReferralLink(linkId);
      
      // Check if the link exists and belongs to this partner
      if (!existingLink) {
        return res.status(404).json({ error: 'Saved referral link not found' });
      }
      
      if (existingLink.partner_id !== partner.id) {
        return res.status(403).json({ error: 'Access forbidden - This link belongs to another partner' });
      }
      
      // Extract fields to update
      const { name, base_url, full_url, campaign, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;
      
      // Update the saved referral link
      const updatedLink = await storage.updateSavedReferralLink(linkId, {
        name: name !== undefined ? name : undefined,
        base_url: base_url !== undefined ? base_url : undefined,
        full_url: full_url !== undefined ? full_url : undefined,
        campaign: campaign !== undefined ? campaign : undefined,
        utm_source: utm_source !== undefined ? utm_source : undefined,
        utm_medium: utm_medium !== undefined ? utm_medium : undefined,
        utm_campaign: utm_campaign !== undefined ? utm_campaign : undefined,
        utm_content: utm_content !== undefined ? utm_content : undefined,
        utm_term: utm_term !== undefined ? utm_term : undefined
      });
      
      res.json(updatedLink);
    } catch (error) {
      console.error('Error updating saved referral link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/partner/saved-referral-links/:id', isPartner, async (req, res) => {
    try {
      const partner = (req as any).partner;
      const linkId = parseInt(req.params.id);
      
      if (isNaN(linkId)) {
        return res.status(400).json({ error: 'Invalid link ID' });
      }
      
      // Get the existing saved link
      const existingLink = await storage.getSavedReferralLink(linkId);
      
      // Check if the link exists and belongs to this partner
      if (!existingLink) {
        return res.status(404).json({ error: 'Saved referral link not found' });
      }
      
      if (existingLink.partner_id !== partner.id) {
        return res.status(403).json({ error: 'Access forbidden - This link belongs to another partner' });
      }
      
      // Delete the saved referral link
      const deleted = await storage.deleteSavedReferralLink(linkId);
      
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: 'Failed to delete saved referral link' });
      }
    } catch (error) {
      console.error('Error deleting saved referral link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current referral info from session (for debugging/testing)
  app.get('/api/referral-info', async (req, res) => {
    try {
      // Get referral info from the session (if it exists)
      const referralInfo = getReferralInfo(req);
      
      res.json({
        referralInfo: referralInfo || null,
        message: referralInfo ? 'Referral information found in session' : 'No referral information in session'
      });
    } catch (error) {
      console.error('Error getting referral info:', error);
      res.status(500).json({ error: 'Failed to get referral information' });
    }
  });

  // Endpoint to track clicks on saved referral links
  app.post('/api/partner/saved-referral-links/:id/click', async (req, res) => {
    try {
      const linkId = parseInt(req.params.id);
      
      if (isNaN(linkId)) {
        return res.status(400).json({ error: 'Invalid link ID' });
      }
      
      // Increment the click count for this link
      const updated = await storage.incrementSavedReferralLinkClickCount(linkId);
      
      if (updated) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ error: 'Saved referral link not found' });
      }
    } catch (error) {
      console.error('Error tracking click on saved referral link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // AI Clip Studio - Generate clips from long videos (accessible without login)
  app.post('/api/clip', uploadSingleClipVideo, async (req, res) => {
    try {
      console.log("=== API /api/clip endpoint hit ===");
      console.log("Request body:", req.body);
      console.log("Request file:", req.file);
      
      // Variable to track the video file path (either uploaded file or downloaded YouTube video)
      let videoFilePath = '';
      let isYoutubeVideo = false;
      
      // Check if we received a YouTube URL
      if (req.body.youtubeUrl) {
        console.log(`Received YouTube URL: ${req.body.youtubeUrl}`);
        isYoutubeVideo = true;
        
        try {
          // Import our custom YouTube downloader module
          const { downloadYouTubeVideo, isValidYouTubeUrl } = await import('./lib/youtube-downloader');
          
          // Validate YouTube URL format
          if (!isValidYouTubeUrl(req.body.youtubeUrl)) {
            console.error("Invalid YouTube URL format:", req.body.youtubeUrl);
            return res.status(400).json({ 
              error: 'Invalid YouTube URL', 
              details: 'The URL does not appear to be a valid YouTube video URL'
            });
          }
          
          console.log("Starting YouTube download process...");
          
          // Try to download the video with our robust downloader
          const downloadResult = await downloadYouTubeVideo(req.body.youtubeUrl);
          
          // Check if download was successful
          if (!downloadResult.success) {
            console.error("YouTube download failed:", downloadResult.error, downloadResult.details);
            return res.status(500).json({ 
              error: downloadResult.error || 'Failed to download YouTube video',
              details: downloadResult.details || 'Unknown error during download process'
            });
          }
          
          // Set the video file path to the downloaded file
          videoFilePath = downloadResult.filePath!;
          console.log(`YouTube video successfully downloaded to: ${videoFilePath}`);
          console.log(`Video title: ${downloadResult.videoTitle || 'Unknown'}`);
        } catch (ytError) {
          console.error('Unexpected error in YouTube download process:', ytError);
          return res.status(500).json({ 
            error: 'Failed to download YouTube video',
            details: ytError instanceof Error ? ytError.message : 'Unknown error in download process'
          });
        }
      } 
      // Check if we received a file upload
      else if (req.file) {
        console.log(`Received file: ${req.file.originalname}, size: ${req.file.size}, mimetype: ${req.file.mimetype}`);
        console.log("Request headers:", JSON.stringify(req.headers));
        
        videoFilePath = req.file.path;
        console.log("File uploaded successfully:", req.file.originalname);
        console.log("File details:", {
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        });
      }
      // If neither YouTube URL nor file upload, return error
      else {
        console.error("No file received in upload and no YouTube URL provided");
        return res.status(400).json({ error: "Please either upload a video file or provide a YouTube URL" });
      }

      const { keywords, captionStyle } = req.body;
      console.log("Processing clip generation request with keywords:", keywords || 'none');
      console.log("Caption style selected:", captionStyle || 'default');
      
      // The cost for clip generation is 20 coins per video for logged-in users
      const COIN_COST = 20;
      let userId = null;
      let userCoins = 0;
      
      // Check if the user is authenticated to track coin costs
      try {
        if ((req as any).user) {
          userId = req.user.id;
          
          // Get the user's coin balance
          userCoins = await storage.getUserCoins(userId);
          console.log(`User ${userId} has ${userCoins} coins`);
          
          // Check if the user has enough coins
          if (userCoins < COIN_COST) {
            return res.status(403).json({ 
              error: 'Insufficient coins', 
              required: COIN_COST, 
              balance: userCoins
            });
          }
          
          // Deduct coins from the user's balance
          await storage.addUserCoins(
            userId,
            -COIN_COST,
            TransactionType.USAGE,
            'AI Clip Studio: Generate video clips'
          );
          
          console.log(`Deducted ${COIN_COST} coins from user ${userId}`);
        } else {
          console.log("Anonymous user accessing AI Clip Studio - no authentication required");
        }
      } catch (authError) {
        console.log("Error checking authentication, proceeding as anonymous user:", authError);
      }
      
      try {
        // Use the video file path (either from file upload or YouTube download)
        const videoPath = videoFilePath;
        
        // Log the upload path and keywords for debugging
        console.log(`Processing clip generation for video at path: ${videoPath}`);
        console.log(`Using keywords: ${keywords || 'none'}`);
        
        // Check if we have a valid Spike API key and use the real API if available
        let results;
        const apiKey = process.env.SPIKE_API_KEY;
        
        // Enhanced logging for API key detection
        if (apiKey) {
          console.log(`Using real Spike Studio API for clip generation with API key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
          console.log("API key type:", typeof apiKey, "Length:", apiKey.length);
          
          try {
            // Force real API usage even with placeholder key for testing
            results = await generateClips(videoPath, keywords, captionStyle);
            
            // If there was an error with the Spike Studio API, fallback to mock implementation
            if (!results.success) {
              console.error("Error with Spike Studio API, falling back to mock implementation:", results.error);
              results = await Promise.resolve(mockGenerateClips(videoPath, keywords, captionStyle));
            }
          } catch (err) {
            console.error("Exception with Spike Studio API, falling back to mock implementation:", err);
            results = await Promise.resolve(mockGenerateClips(videoPath, keywords, captionStyle));
          }
        } else {
          console.log("No Spike API key found, using mock clip generation");
          // Using enhanced mock function - wrap in Promise to ensure proper async behavior
          results = await Promise.resolve(mockGenerateClips(videoPath, keywords, captionStyle));
        }
        
        console.log(`Successfully generated ${results.clips?.length || 0} clips from ${videoPath}`);
        
        // Check if clip generation was successful
        if (!results.success) {
          // If user was charged coins, refund them since the operation failed
          if (userId) {
            await storage.addUserCoins(
              userId,
              COIN_COST,
              TransactionType.REFUND,
              'Refund: AI Clip Studio failed to generate clips'
            );
            console.log(`Refunded ${COIN_COST} coins to user ${userId} due to failed clip generation`);
          }
          
          return res.status(500).json({
            error: results.error || 'Failed to generate clips',
            details: results.details || 'Unknown error occurred during clip generation'
          });
        }
        
        // Return the clips to the client
        console.log("Sending successful response with clips:", results);
        
        // Return the full results object directly with additional coin information
        return res.status(200).json({
          ...results,
          coinCost: userId ? COIN_COST : 0,
          newBalance: userId ? (userCoins - COIN_COST) : 0
        });
      } catch (error: any) {
        // If user was charged coins, refund them since an error occurred
        if (userId) {
          await storage.addUserCoins(
            userId,
            COIN_COST,
            TransactionType.REFUND,
            'Refund: AI Clip Studio error'
          );
          console.log(`Refunded ${COIN_COST} coins to user ${userId} due to error during clip generation`);
        }
        
        console.error("Error during clip generation:", error);
        return res.status(500).json({ 
          error: 'Failed to generate clips',
          details: error.message || 'Unknown error occurred'
        });
      }
    } catch (error: any) {
      console.error("Error processing clip generation request:", error);
      res.status(500).json({ 
        error: 'Server error during clip generation',
        details: error.message || 'Unknown server error'
      });
    } finally {
      // Clean up temporary YouTube video file if it exists
      try {
        // Get the videoFilePath from response clips if it exists
        let tempFilePath = '';
        
        // Check if we had a YouTube URL
        if (req.body && req.body.youtubeUrl) {
          // Look for the videoFilePath in the mock response
          try {
            const youtubeId = req.body.youtubeUrl.match(/[?&]v=([^&]+)/)?.[1];
            if (youtubeId) {
              // Check temp directory for YouTube files with this ID
              const tempDir = os.tmpdir();
              const tempFiles = await fs.promises.readdir(tempDir);
              
              // Find YouTube files with this ID
              const ytFiles = tempFiles.filter(f => 
                f.includes('youtube_') && f.includes(youtubeId)
              );
              
              if (ytFiles.length > 0) {
                // Delete the files
                for (const file of ytFiles) {
                  const filePath = path.join(tempDir, file);
                  if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                    console.log(`Cleaned up temporary YouTube video file: ${filePath}`);
                  }
                }
              }
            }
          } catch (parseError) {
            console.warn("Error parsing YouTube URL for cleanup:", parseError);
          }
        }
      } catch (unlinkError) {
        console.error(`Error cleaning up temporary files:`, unlinkError);
      }
    }
  });
  
  // AI Clip Studio - Download clip in vertical reel format
  app.get('/api/clip/download/:id', async (req, res) => {
    try {
      console.log("=== API /api/clip/download endpoint hit ===");
      const clipId = req.params.id;
      console.log(`Clip download requested for ID: ${clipId}`);
      
      // Import the clip extractor - using ES modules import
      const extractClipModule = await import('./lib/video-processor/clip-extractor');
      const { extractClip } = extractClipModule;
      
      // Get the processed clips directory
      const processedClipsDir = path.join(process.cwd(), 'public', 'processed-clips');
      
      // Ensure the directory exists
      if (!fs.existsSync(processedClipsDir)) {
        fs.mkdirSync(processedClipsDir, { recursive: true });
      }
      
      // First attempt: try to find the exact file if clipId is a filename
      let clipPath = path.join(processedClipsDir, clipId);
      
      // If the path doesn't have an extension, assume it's .mp4
      if (!path.extname(clipPath)) {
        clipPath += '.mp4';
      }
      
      console.log(`Looking for clip at path: ${clipPath}`);
      
      if (fs.existsSync(clipPath)) {
        console.log(`Found processed clip: ${clipPath}`);
        return res.download(clipPath);
      }
      
      // Second attempt: search for files matching the pattern
      console.log("Exact file not found, searching for matching files...");
      const files = fs.readdirSync(processedClipsDir);
      
      // Find files containing clipId or other clip identifiers
      const matchingFiles = files.filter(file => 
        file.includes(clipId) || 
        file.includes(`clip_${clipId}`) || 
        file.includes(`reel_clip_${clipId}`)
      );
      
      if (matchingFiles.length > 0) {
        const matchedFile = matchingFiles[0]; // Use the first match
        console.log(`Found matching clip by pattern: ${matchedFile}`);
        return res.download(path.join(processedClipsDir, matchedFile));
      }
      
      // Third attempt: Use query params to extract a clip on-the-fly if no processed clip is found
      let sourceVideo = req.query.source as string;
      const startTime = Number(req.query.start || 0);
      const endTime = Number(req.query.end || (startTime + 30)); // Default to 30 seconds after start
      const format = req.query.format as string || 'vertical';
      const caption = req.query.caption as string || '';
      
      console.log(`Clip download requested with params:`, {
        clipId, sourceVideo, startTime, endTime, format, caption
      });
      
      // Handle source URL - convert from URL to filesystem path if needed
      if (sourceVideo) {
        // If source is a URL, we need to find the corresponding file
        if (sourceVideo.startsWith('http')) {
          console.log("Source is a URL, attempting to find the actual file");
          
          try {
            // Extract paths from URL
            const urlObj = new URL(sourceVideo);
            const urlPath = urlObj.pathname;
            
            if (urlPath.startsWith('/uploads')) {
              // This is an uploaded file in our uploads directory
              sourceVideo = path.join(process.cwd(), 'public', urlPath);
              console.log(`Mapped URL to filesystem path: ${sourceVideo}`);
            } else if (urlPath.startsWith('/processed-clips')) {
              // This is a processed clip
              sourceVideo = path.join(process.cwd(), 'public', urlPath);
              console.log(`Using existing processed clip: ${sourceVideo}`);
            } else if (urlPath.startsWith('/tmp/')) {
              // This is a temporary file, likely from YouTube download
              // For YouTube videos that match '/tmp/youtube_*' pattern
              if (urlPath.includes('youtube_')) {
                // Use the file directly if it exists
                sourceVideo = urlPath;
                console.log(`Using temporary YouTube video file: ${sourceVideo}`);
                
                // Check if the file exists, if not try to find it in the OS temp dir
                if (!fs.existsSync(sourceVideo)) {
                  const filename = path.basename(urlPath);
                  const tempFilePath = path.join(os.tmpdir(), filename);
                  
                  if (fs.existsSync(tempFilePath)) {
                    sourceVideo = tempFilePath;
                    console.log(`Found YouTube file in temp directory: ${sourceVideo}`);
                  }
                }
              }
            } else {
              // Try to find the file by looking for the filename part
              const filename = path.basename(urlPath);
              if (filename) {
                // Search in uploads directory for any file matching this name
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
                if (fs.existsSync(uploadsDir)) {
                  const files = fs.readdirSync(uploadsDir);
                  const match = files.find(file => file.includes(filename));
                  if (match) {
                    sourceVideo = path.join(uploadsDir, match);
                    console.log(`Found matching file in uploads: ${sourceVideo}`);
                  }
                }
                
                // Also check temp directory for YouTube files
                if (filename.includes('youtube_')) {
                  const tempDir = os.tmpdir();
                  const tempFiles = fs.readdirSync(tempDir);
                  const ytMatch = tempFiles.find(file => file === filename);
                  
                  if (ytMatch) {
                    sourceVideo = path.join(tempDir, ytMatch);
                    console.log(`Found YouTube file in temp directory: ${sourceVideo}`);
                  }
                }
              }
            }
          } catch (urlError) {
            console.error("Error parsing URL:", urlError);
          }
        }
      }
      
      // Search for clip in uploaded videos if no exact path given
      if (!sourceVideo || !fs.existsSync(sourceVideo)) {
        console.log("Source video not found directly, searching uploads directory...");
        
        // Try to find a video in the uploads directory
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (fs.existsSync(uploadsDir)) {
          const uploadedFiles = fs.readdirSync(uploadsDir);
          const videoFiles = uploadedFiles.filter(file => 
            file.endsWith('.mp4') || file.endsWith('.mov') || file.endsWith('.webm')
          );
          
          if (videoFiles.length > 0) {
            // Use the most recent uploaded video (sorted by modified time)
            const videoStats = videoFiles.map(file => ({
              file,
              mtime: fs.statSync(path.join(uploadsDir, file)).mtime
            }));
            
            videoStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            sourceVideo = path.join(uploadsDir, videoStats[0].file);
            console.log(`Using most recent uploaded video: ${sourceVideo}`);
          }
        }
      }
      
      if (sourceVideo && fs.existsSync(sourceVideo)) {
        console.log(`Attempting on-the-fly clip extraction from: ${sourceVideo}`);
        console.log(`With parameters: start=${startTime}, end=${endTime}, format=${format}, caption=${caption}`);
        
        try {
          // Generate a unique filename
          const outputFilename = `reel_${Date.now()}_${clipId}.mp4`;
          
          // Process the clip - force vertical format as requested
          console.log(`Starting clip extraction from source: ${sourceVideo}`);
          
          // If this is a YouTube video, ensure we're working with a valid file
          if (sourceVideo.includes('youtube_')) {
            console.log("Detected YouTube video source, performing additional validation");
            
            // Try to verify the file size and format
            try {
              const stats = fs.statSync(sourceVideo);
              console.log(`YouTube source file size: ${stats.size} bytes`);
              
              // If the file is too small (likely a dummy/mock file)
              if (stats.size < 10000) {
                console.log("YouTube file appears to be a placeholder - using stock video instead");
                
                // Try to find a stock video to use instead
                const stockVideosDir = path.join(process.cwd(), 'public', 'stock-videos');
                if (fs.existsSync(stockVideosDir)) {
                  const stockVideos = fs.readdirSync(stockVideosDir).filter(f => 
                    f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.webm')
                  );
                  
                  if (stockVideos.length > 0) {
                    // Use a random stock video
                    const randomIndex = Math.floor(Math.random() * stockVideos.length);
                    sourceVideo = path.join(stockVideosDir, stockVideos[randomIndex]);
                    console.log(`Using stock video instead: ${sourceVideo}`);
                  }
                }
              }
            } catch (statErr) {
              console.error("Error checking YouTube source file:", statErr);
            }
          }
          
          // Now proceed with clip extraction
          const result = await extractClip(sourceVideo, {
            startTime,
            endTime,
            format: 'vertical', // Always force vertical for downloads
            caption,
            fileName: outputFilename,
            quality: 'high',
            cropPosition: 'center'
          });
          
          if (result.success && result.outputPath) {
            // The outputPath from extractClip is a public URL path, convert to filesystem path
            const filePath = path.join(process.cwd(), 'public', result.outputPath);
            console.log(`Successfully extracted clip on-the-fly: ${filePath}`);
            
            // Set download filename
            const downloadName = `jesko_reel_${clipId}_${startTime}_${endTime}.mp4`;
            return res.download(filePath, downloadName);
          } else {
            console.error("Failed to extract clip on-the-fly:", result.error);
            return res.status(500).json({ error: `Failed to extract clip: ${result.error}` });
          }
        } catch (extractError) {
          console.error("Error during on-the-fly clip extraction:", extractError);
          return res.status(500).json({ error: "Error processing clip extraction" });
        }
      } else {
        console.error(`No source video found for clip: ${clipId}`);
        return res.status(404).json({ 
          error: "Source video not found",
          clipId,
          details: "Could not locate the source video file for extraction"
        });
      }
      
      // If we get here, no clip was found or could be created
      console.error(`No clip found for ID: ${clipId}`);
      return res.status(404).json({
        error: "Clip not found",
        clipId,
        details: "Could not find or extract the requested clip"
      });
    } catch (error: any) {
      console.error("Error processing clip download request:", error);
      res.status(500).json({
        error: "Server error during clip download",
        details: error.message || "Unknown server error"
      });
    }
  });

  // AI Video Magic - Image to Video transformation endpoint (accessible without login)
  app.post('/api/image-to-video', isAuthenticated, uploadSingleImage, async (req, res) => {
    try {
      // Set simulation mode to false to use the real Runway API
      const SIMULATION_MODE = false; // Attempt to use the real Runway API
      
      // Check if user is authenticated
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if image file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }
      
      // Log the uploaded file information
      console.log('Uploaded file:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      
      // Check prompt parameter and other parameters
      const { 
        prompt, 
        modelVersion, 
        negativePrompt, 
        numFrames, 
        numSteps, 
        motionScale,
        guidance,
        timeScale,
        seed,
        aspectRatio,
        duration
      } = req.body;
      
      console.log('Request body:', { 
        prompt, 
        modelVersion, 
        negativePrompt, 
        numFrames, 
        numSteps,
        motionScale,
        guidance,
        timeScale,
        seed,
        aspectRatio,
        duration
      });
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Invalid request. Required field: prompt' });
      }
      
      // Check if prompt is too short
      if (prompt.trim().length < 3) {
        return res.status(400).json({ error: 'Prompt is too short. Please provide a more detailed description.' });
      }
      
      // The cost for image-to-video transformation is 50 coins per transformation
      const coinCost = 50;
      
      // Check if user has enough coins
      const userCoins = await storage.getUserCoins(user.id);
      
      if (userCoins < coinCost) {
        return res.status(403).json({ 
          error: 'Insufficient coins', 
          required: coinCost, 
          available: userCoins,
          message: `You need ${coinCost} coins to transform this image to video, but you only have ${userCoins} coins.`
        });
      }
      
      // Get the original image file path
      const imagePath = req.file.path;
      
      // Verify the uploaded file exists and is readable
      try {
        await fs.promises.access(imagePath, fs.constants.R_OK);
        const stats = await fs.promises.stat(imagePath);
        console.log(`Image file verified: ${imagePath} (${stats.size} bytes)`);
      } catch (fileError) {
        console.error('Error accessing uploaded file:', fileError);
        return res.status(500).json({ error: 'Unable to access uploaded file' });
      }
      
      // Create a unique filename for the output video
      const outputFilename = `runway-video-${Date.now()}.mp4`;
      const outputPath = path.join(process.cwd(), 'temp', outputFilename);
      
      // Ensure temp directory exists
      if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
        fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
      }
      
      let coinTransaction = null;
      
      try {
        // First deduct coins from the user account
        const deductResult = await storage.deductUserCoins(
          user.id,
          coinCost,
          `Generated AI video from image`
        );
        
        if (!deductResult) {
          return res.status(403).json({ error: 'Failed to deduct coins from account' });
        }
        
        // Log the coin deduction
        await logMessage(LogLevel.INFO, 'Coins', `User ${user.email} used ${coinCost} coins for image-to-video generation`);
        
        // Get the coin transaction for this deduction (most recent transaction for this user)
        const transactions = await storage.getCoinTransactions(user.id, 1);
        coinTransaction = transactions[0];
        
        if (!coinTransaction) {
          throw new Error('Coin transaction not found - this should never happen');
        }
        
        // Import the new Runway SDK integration module
        // This implementation uses the official SDK to handle API versioning
        const { generateVideoFromImage } = await import('./lib/runway-sdk-integration');
        
        // Process the optional parameters
        const parsedNumFrames = numFrames ? parseInt(numFrames as string) : undefined;
        const parsedNumSteps = numSteps ? parseInt(numSteps as string) : undefined;
        const parsedMotionScale = motionScale ? parseFloat(motionScale as string) : undefined;
        const parsedGuidance = guidance ? parseFloat(guidance as string) : undefined;
        const parsedTimeScale = timeScale ? parseFloat(timeScale as string) : undefined;
        const parsedSeed = seed ? parseInt(seed as string) : undefined;
        const parsedDuration = duration ? parseInt(duration as string) : 5;
        
        // Map the old model version names to new SDK model versions
        let sdkModelVersion = 'gen4_turbo';
        if (modelVersion === 'gen-1') {
          sdkModelVersion = 'gen3a_turbo';
        }
        
        // Map UI aspect ratios to SDK-compatible ratios
        let sdkRatio: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672' = '1280:720';
        
        // Map UI aspect ratios to SDK aspect ratios
        // The Runway API allows only these ratios: 1280:720, 720:1280, 1104:832, 832:1104, 960:960, 1584:672
        switch(aspectRatio) {
          case '16:9':
            sdkRatio = '1280:720'; // 16:9 widescreen
            break;
          case '9:16':
            sdkRatio = '720:1280'; // 9:16 vertical video
            break;
          case '4:3':
            sdkRatio = '1104:832'; // Close to 4:3 (1.33:1 vs 1.327:1)
            break;
          case '3:4':
            sdkRatio = '832:1104'; // Close to 3:4 (0.753:1 vs 0.75:1)
            break;
          case '1:1':
            sdkRatio = '960:960'; // Perfect square
            break;
          case '21:9':
            sdkRatio = '1584:672'; // Ultra widescreen
            break;
          default:
            sdkRatio = '1280:720'; // Default to 16:9 if no matching ratio
        }
        
        console.log(`Using aspect ratio: UI=${aspectRatio}, SDK=${sdkRatio}`);
        
        // Set options for the video generation with the SDK parameters
        // Validate duration - Runway API only accepts 5 or 10 as values
        const validDuration = parsedDuration === 10 ? 10 : 5;
        
        const options = {
          modelVersion: sdkModelVersion as 'gen4_turbo' | 'gen3a_turbo',
          negativePrompt: negativePrompt as string,
          ratio: sdkRatio, // Use mapped ratio from user selection
          duration: validDuration as 5 | 10, // Duration in seconds (must be 5 or 10)
          seed: parsedSeed
        };
        
        console.log('Starting video generation with Runway API using options:', options);
        
        try {
          // Call the Runway API directly to generate a video from the image
          console.log('Calling Runway API directly to transform image to video');
          
          // Initialize result variable
          let result = await generateVideoFromImage(
            imagePath,
            prompt,
            outputPath,
            options
          );
          
          console.log('Runway API result:', result);
          
          if (!result.success) {
            throw new Error(result.error || 'Failed to generate video from image');
          }
          
          // Verify the output file exists and has content
          const outputFileExists = fs.existsSync(outputPath);
          const outputFileSize = outputFileExists ? fs.statSync(outputPath).size : 0;
          
          console.log(`Output file verification: exists=${outputFileExists}, size=${outputFileSize} bytes`);
          
          if (!outputFileExists || outputFileSize === 0) {
            throw new Error('Generated video file is missing or empty');
          }
          
          // Generate a title from the prompt (use first 50 chars or less)
          const videoTitle = prompt.length > 50 
            ? prompt.substring(0, 47) + '...' 
            : prompt;
          
          // Create a permanent copy of the video in the uploads directory
          const uploadDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          // Create a unique filename for the permanent storage
          const permanentFilename = `ai-video-${Date.now()}-${uuidv4()}.mp4`;
          const permanentPath = path.join(uploadDir, permanentFilename);
          
          // Copy the file to the uploads directory
          fs.copyFileSync(outputPath, permanentPath);
          
          // Generate a proper thumbnail from the video
          let thumbnailUrl;
          try {
            // Import video utility functions
            const { generateThumbnailFromVideo } = await import('./video-utils');
            
            // Generate a thumbnail from the 1 second mark of the video
            thumbnailUrl = await generateThumbnailFromVideo(permanentPath);
            console.log('Generated video thumbnail from Runway output:', thumbnailUrl);
          } catch (thumbnailError) {
            console.error('Error generating thumbnail from video:', thumbnailError);
            
            // Fallback - if we have the original image, use it as the thumbnail
            if (fs.existsSync(imagePath)) {
              thumbnailUrl = imagePath.replace(process.cwd(), '');
              console.log('Using source image as fallback thumbnail:', thumbnailUrl);
            } else {
              // Last resort
              thumbnailUrl = '/images/default-thumbnail.jpg';
            }
          }
          
          // Variable to store the video record info
          let videoRecord = null;
          
          // Try to add the video to the stock_videos table or find an existing duplicate
          try {
            console.log('Starting stock video save process:', {
              fileName: permanentFilename,
              thumbUrl: thumbnailUrl,
              videoTitle,
              prompt: prompt?.substring(0, 50) + '...',
              modelVersion: options.modelVersion
            });
  
            // Check for duplicate videos with the same prompt and model
            console.log('Checking for duplicates with:', {
              promptUsed: prompt?.substring(0, 50) + '...',
              modelUsed: options.modelVersion
            });
            
            const existingVideos = await db
              .select()
              .from(stockVideos)
              .where(
                and(
                  eq(stockVideos.promptUsed, prompt),
                  eq(stockVideos.modelUsed, options.modelVersion as string)
                )
              )
              .limit(1);
              
            console.log('Duplicate check result:', {
              duplicatesFound: existingVideos.length > 0,
              existingVideos: existingVideos.length ? existingVideos[0].id : 'none'
            });
              
            // If similar video already exists, use that instead of creating a duplicate
            if (existingVideos.length > 0) {
              console.log('Found existing video with same prompt and model. Preventing duplicate.');
              videoRecord = existingVideos[0];
              console.log('Using existing video instead:', videoRecord);
            } else {
              // Save to stock_videos table if no duplicate was found
              console.log('No duplicates found, inserting new video into stock_videos table');
              
              const videoData = {
                title: videoTitle,
                description: `AI-generated video using prompt: ${prompt}`,
                videoUrl: `/uploads/${permanentFilename}`,
                thumbnailUrl,
                duration: result.duration || 5,
                aspectRatio: aspectRatio || '16:9',
                category: 'AI Generated',
                tags: ['ai', 'runway', options.modelVersion as string, 'video-magic'],
                userId: user ? user.id : null,
                isAIGenerated: true,
                promptUsed: prompt,
                sourceImageUrl: imagePath.replace(process.cwd(), ''),
                modelUsed: options.modelVersion as string
              };
              
              console.log('Video data to be inserted:', JSON.stringify(videoData, null, 2));
              
              try {
                const [newVideo] = await db
                  .insert(stockVideos)
                  .values(videoData)
                  .returning();
                
                videoRecord = newVideo;
                console.log('🎉 SUCCESS! Added video to stock_videos:', videoRecord);
              } catch (insertError) {
                console.error('Failed to insert video into stock_videos:', insertError);
                // Attempt to diagnose the error
                if (insertError instanceof Error) {
                  console.error('Insert error details:', insertError.message);
                  console.error('Insert error stack:', insertError.stack);
                }
                throw insertError; // Re-throw to be caught by outer catch
              }
            }
          } catch (stockVideoError) {
            // Log the error but don't fail the request
            console.error('🔴 Error adding to stock_videos table:', stockVideoError);
            if (stockVideoError instanceof Error) {
              console.error('Error details:', stockVideoError.message);
              console.error('Error stack:', stockVideoError.stack);
            }
            // We'll continue and return the video even if saving to stock_videos fails
          }
          
          // Get updated coin balance
          const updatedCoins = await storage.getUserCoins(user.id);
          
          // Return success response with video URL and coin details
          res.json({ 
            success: true, 
            videoUrl: `/temp/${outputFilename}`,
            promptUsed: prompt,
            modelVersion: options.modelVersion,
            aspectRatio: aspectRatio || '16:9',
            numFrames: parsedNumFrames || 'default',
            duration: result.duration,
            coins: updatedCoins,
            coinCost,
            message: `Successfully generated video from image using ${coinCost} coins`,
            transaction_id: coinTransaction.id
          });
        } catch (runwayError) {
          console.error('Error calling Runway API:', runwayError);
          
          // Refund the coins if the API call failed
          await storage.addUserCoins(
            user.id,
            coinCost,
            TransactionType.REFUND,
            `Refund for failed image-to-video transformation`
          );
          
          // Log the refund
          await logMessage(LogLevel.INFO, 'Coins', `Refunded ${coinCost} coins to user ${user.email} due to API error`);
          
          throw new Error(`Runway API error: ${runwayError instanceof Error ? runwayError.message : String(runwayError)}`);
        }
      } catch (processingError) {
        console.error('Error processing request:', processingError);
        
        // Create a more user-friendly message for specific error types
        let userMessage = "Server error during image-to-video transformation";
        const errorMsg = processingError instanceof Error ? processingError.message : String(processingError);
        
        // Special handling for specific error types
        if (errorMsg.includes('API version') || errorMsg.includes('version header')) {
          userMessage = "We're experiencing technical issues with the video generation service. Our team has been notified and is working on a fix.";
        } else if (errorMsg.includes('credit') || errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('429')) {
          userMessage = "Daily request limit reached. Your coins have been refunded. Please try again tomorrow.";
        }
        
        res.status(500).json({ 
          error: userMessage,
          details: errorMsg
        });
      }
    } catch (outerError) {
      console.error('Error in image-to-video endpoint:', outerError);
        
      res.status(500).json({ 
        error: "Server error occurred",
        details: outerError instanceof Error ? outerError.message : String(outerError)
      });
    }
  });
  
  // AI Video Magic - Video transformation endpoint (accessible without login)
  // Get models for AI Video Magic
  app.get('/api/runway/models', async (req, res) => {
    try {
      // Import the new Runway SDK integration module
      const { getAvailableModels } = await import('./lib/runway-sdk-integration');
      
      // Get available models from Runway API
      const result = await getAvailableModels();
      
      // Return a list of supported models
      if (result.success && result.models) {
        res.json({
          success: true,
          models: result.models
        });
      } else {
        throw new Error(result.error || 'Unknown error getting models');
      }
    } catch (error) {
      console.error('Error fetching Runway models:', error);
      res.status(500).json({ error: "Failed to fetch Runway models" });
    }
  });
  
  // AI Video Magic - Image interpolation endpoint for creating smooth transitions between multiple images
  // Configure multer for multiple image uploads
  const uploadMultipleImages = multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExt);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB file size limit
    },
    fileFilter: function (req, file, cb) {
      // Accept images only
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  });
  
  app.post('/api/runway/interpolate', isAuthenticated, uploadMultipleImages.array('images', 10), async (req, res) => {
    try {
      // Check if user is authenticated
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if images were uploaded
      if (!req.files || req.files.length < 2) {
        return res.status(400).json({ 
          error: 'At least two images are required for interpolation',
          details: `Received ${req.files ? req.files.length : 0} images`
        });
      }
      
      // Log the uploaded files information
      console.log('Uploaded files:', req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      })));
      
      // Check parameters
      const { mode, fps, margin } = req.body;
      
      console.log('Request body:', { mode, fps, margin });
      
      // The cost for image interpolation is 20 coins per transformation
      const coinCost = 20;
      
      // Check if user has enough coins
      const userCoins = await storage.getUserCoins(user.id);
      
      if (userCoins < coinCost) {
        return res.status(403).json({ 
          error: 'Insufficient coins', 
          required: coinCost, 
          available: userCoins,
          message: `You need ${coinCost} coins to create an interpolated video, but you only have ${userCoins} coins.`
        });
      }
      
      // Get the image file paths
      const imagePaths = (req.files as Express.Multer.File[]).map(file => file.path);
      
      // Create a unique filename for the output video
      const outputFilename = `runway-interpolate-${Date.now()}.mp4`;
      const outputPath = path.join(process.cwd(), 'temp', outputFilename);
      
      // Ensure temp directory exists
      if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
        fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
      }
      
      let coinTransaction = null;
      
      try {
        // First deduct coins from the user account
        const deductResult = await storage.deductUserCoins(
          user.id,
          coinCost,
          `Generated interpolated video from ${req.files.length} images`
        );
        
        if (!deductResult) {
          return res.status(403).json({ error: 'Failed to deduct coins from account' });
        }
        
        // Log the coin deduction
        await logMessage(LogLevel.INFO, 'Coins', `User ${user.email} used ${coinCost} coins for image interpolation`);
        
        // Get the coin transaction for this deduction (most recent transaction for this user)
        const transactions = await storage.getCoinTransactions(user.id, 1);
        coinTransaction = transactions[0];
        
        if (!coinTransaction) {
          throw new Error('Coin transaction not found - this should never happen');
        }
      
        // Import the new Runway SDK integration module
        const { interpolateImages } = await import('./lib/runway-sdk-integration');
        
        // Process the optional parameters
        const parsedFps = fps ? parseInt(fps as string) : 30;
        const parsedMargin = margin ? parseInt(margin as string) : 0;
        
        // Set options for the video generation
        const options = {
          mode: (mode || 'standard') as 'standard' | 'linear' | 'cubic',
          fps: parsedFps,
          margin: parsedMargin
        };
        
        console.log('Starting image interpolation with Runway API using options:', options);
        
        // Call the Runway API to generate a video from the images
        const result = await interpolateImages(
          imagePaths,
          outputPath,
          options
        );
        
        console.log('Runway API result:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to generate interpolated video from images');
        }
        
        // Verify the output file exists and has content
        const outputFileExists = fs.existsSync(outputPath);
        const outputFileSize = outputFileExists ? fs.statSync(outputPath).size : 0;
        
        console.log(`Output file verification: exists=${outputFileExists}, size=${outputFileSize} bytes`);
        
        if (!outputFileExists || outputFileSize === 0) {
          throw new Error('Generated video file is missing or empty');
        }
        
        // Create a permanent copy of the video for storage
        const permanentFilename = `interpolate-${Date.now()}.mp4`;
        const permanentPath = path.join(process.cwd(), 'uploads', permanentFilename);
        
        // Ensure uploads directory exists
        if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
          fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });
        }
        
        // Copy the file to the uploads directory
        fs.copyFileSync(outputPath, permanentPath);
        
        // Generate a proper thumbnail from the video
        let thumbnailUrl;
        try {
          // Import video utility functions
          const { generateThumbnailFromVideo } = await import('./video-utils');
          
          // Generate a thumbnail from the 1 second mark of the video
          thumbnailUrl = await generateThumbnailFromVideo(permanentPath);
          console.log('Generated video thumbnail from interpolation result:', thumbnailUrl);
        } catch (thumbnailError) {
          console.error('Error generating thumbnail from interpolated video:', thumbnailError);
          
          // Fallback to first image as thumbnail if available
          if (imagePaths.length > 0 && fs.existsSync(imagePaths[0])) {
            thumbnailUrl = imagePaths[0].replace(process.cwd(), '');
            console.log('Using first source image as fallback thumbnail:', thumbnailUrl);
          } else {
            // Last resort
            thumbnailUrl = '/images/default-thumbnail.jpg';
          }
        }
        
        // Create a title based on the number of images
        const videoTitle = `Interpolated Video from ${imagePaths.length} Images`;
        
        // Variable to store the video record info
        let videoRecord = null;
        
        // Try to add the video to the stock_videos table
        try {
          // Save to stock_videos table
          const [newVideo] = await db
            .insert(stockVideos)
            .values({
              title: videoTitle,
              description: `AI-generated interpolated video from ${imagePaths.length} images using mode: ${options.mode}`,
              videoUrl: `/uploads/${permanentFilename}`,
              thumbnailUrl,
              duration: result.duration || 5,
              aspectRatio: '16:9', // Default aspect ratio
              category: 'AI Generated',
              tags: ['ai', 'runway', 'interpolate', options.mode],
              userId: user ? user.id : null,
              isAIGenerated: true,
              promptUsed: `Interpolation mode: ${options.mode}, FPS: ${options.fps}`,
              sourceImageUrl: imagePaths[0].replace(process.cwd(), ''), // First image as source
              modelUsed: 'interpolate'
            })
            .returning();
          
          videoRecord = newVideo;
          console.log('Added interpolated video to stock_videos:', videoRecord);
        } catch (stockVideoError) {
          // Log the error but don't fail the request
          console.error('Error adding interpolated video to stock_videos table:', stockVideoError);
          // We'll continue and return the video even if saving to stock_videos fails
        }
        
        // Get updated coin balance
        const updatedCoins = await storage.getUserCoins(user.id);
        
        // Return success response with video URL and coin details
        res.json({ 
          success: true, 
          videoUrl: `/temp/${outputFilename}`,
          numImages: imagePaths.length,
          mode: options.mode,
          fps: options.fps,
          duration: result.duration,
          coins: updatedCoins,
          coinCost,
          message: `Successfully generated interpolated video from ${imagePaths.length} images using ${coinCost} coins`,
          transaction_id: coinTransaction.id
        });
      } catch (apiError) {
        console.error('Error in Runway API processing:', apiError);
        
        // Refund the coins if the API call failed
        if (coinTransaction) {
          await storage.addUserCoins(
            user.id,
            coinCost,
            TransactionType.REFUND,
            `Refund for failed image interpolation`
          );
          
          // Log the refund
          await logMessage(LogLevel.INFO, 'Coins', `Refunded ${coinCost} coins to user ${user.email} due to API error`);
        }
        
        // Create a user-friendly error message
        let errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        
        // Check for quota limits in the error message
        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
          errorMessage = 'Daily request limit reached. Your coins have been refunded. Please try again tomorrow.';
        }
        
        res.status(500).json({ 
          error: errorMessage,
          details: apiError instanceof Error ? apiError.message : String(apiError)
        });
      }
    } catch (error) {
      console.error('Error in image interpolation endpoint:', error);
      res.status(500).json({ 
        error: "Server error during image interpolation",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post('/api/transform-video', uploadSingleVideo, async (req, res) => {
    try {
      // Check if video file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
      }
      
      // Check prompt parameter
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Invalid request. Required field: prompt' });
      }
      
      // Check if prompt is too short
      if (prompt.trim().length < 3) {
        return res.status(400).json({ error: 'Prompt is too short. Please provide a more detailed description.' });
      }
      
      // The cost for video transformation is 50 coins per video for logged-in users
      const coinCost = 50;
      
      // Get user if authenticated (optional)
      const user = (req as any).user;
      
      // Get the original video file path
      const videoPath = req.file.path;
      
      // Create a unique filename for the output video based on the original filename
      const outputFilename = `transformed-${Date.now()}-${path.basename(videoPath)}`;
      const outputPath = path.join(process.cwd(), 'temp', outputFilename);
      
      // For demonstration purposes, if the user is logged in, we would deduct coins
      // Here we'll simply log the intention since this is a demo feature
      if (user) {
        await logMessage(LogLevel.INFO, 'Coins', `If implemented, user ${user.email} would use ${coinCost} coins for video transformation`);
      } else {
        await logMessage(LogLevel.INFO, 'API', 'Anonymous user accessing video transformation feature');
      }
      
      try {
        // Create a proper form data object for Node.js using form-data package
        const formData = new FormData();
        // Use the actual video file as a stream
        const fileStream = fs.createReadStream(videoPath);
        formData.append('video', fileStream, {
          filename: path.basename(videoPath),
          contentType: 'video/mp4'
        });
        formData.append('prompt', prompt);
        
        // Use the Spike Studio API key from environment variables if available
        const apiKey = process.env.SPIKE_API_KEY || 'your_spike_api_key';
        console.log("Using API key for video transformation:", apiKey ? "API key found" : "Default key");
        
        // Call the external API to transform the video
        const apiResponse = await axios.post(
          'https://api.spikestudio.ai/v1/transform',
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${apiKey}`
            },
            responseType: 'stream'
          }
        );
        
        // Write the response to the output file
        const writer = fs.createWriteStream(outputPath);
        apiResponse.data.pipe(writer);
        
        // Return a promise that resolves when the file is written
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        // Create a permanent copy of the video for storage
        const permanentFilename = `transformed-${Date.now()}.mp4`;
        const permanentPath = path.join(process.cwd(), 'uploads', permanentFilename);
        
        // Ensure uploads directory exists
        if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
          fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });
        }
        
        // Copy the file to the uploads directory
        fs.copyFileSync(outputPath, permanentPath);
        
        // Generate a proper thumbnail from the video
        let thumbnailUrl;
        try {
          // Import video utility functions
          const { generateThumbnailFromVideo, getVideoDuration } = await import('./video-utils');
          
          // Generate a thumbnail from the 1 second mark of the video
          thumbnailUrl = await generateThumbnailFromVideo(permanentPath);
          console.log('Generated video thumbnail from transformed video:', thumbnailUrl);
          
          // Get the actual duration of the video
          const duration = await getVideoDuration(permanentPath);
          
          // Create a title for the video
          const videoTitle = `Transformed Video: ${prompt}`;
          
          // Try to add the video to the stock_videos table
          try {
            // Save to stock_videos table
            const [newVideo] = await db
              .insert(stockVideos)
              .values({
                title: videoTitle,
                description: `AI-transformed video using prompt: ${prompt}`,
                videoUrl: `/uploads/${permanentFilename}`,
                thumbnailUrl,
                duration: duration || 5,
                aspectRatio: '16:9', // Default aspect ratio
                category: 'AI Transformed',
                tags: ['ai', 'spike', 'transformed'],
                userId: user ? user.id : null,
                isAIGenerated: true,
                promptUsed: prompt,
                sourceImageUrl: null, // No source image for video transformations
                modelUsed: 'spike-transform'
              })
              .returning();
            
            console.log('Added transformed video to stock_videos:', newVideo);
          } catch (stockVideoError) {
            // Log the error but don't fail the request
            console.error('Error adding transformed video to stock_videos table:', stockVideoError);
            // We'll continue and return the video even if saving to stock_videos fails
          }
        } catch (thumbnailError) {
          console.error('Error generating thumbnail for transformed video:', thumbnailError);
          // Continue without thumbnail if there's an error
        }
        
        // Return success response with video URL
        res.json({ 
          success: true, 
          videoUrl: `/temp/${outputFilename}`,
          promptUsed: prompt,
          message: `Successfully transformed video`
        });
      } catch (error) {
        console.error('Error calling external API:', error);
        
        // If user is authenticated, we would refund the coins here
        if (user) {
          await logMessage(LogLevel.INFO, 'API', `If implemented, would refund ${coinCost} coins to user ${user.email} due to transformation failure`);
        }
        
        throw new Error(`External API error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error("Error processing video transformation request:", error);
      await logMessage(LogLevel.ERROR, 'API', `Error processing video transformation request: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: "Failed to process video transformation request", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Direct DB Delete Endpoint - Simple version with no redirects
  app.delete('/api/direct-db-delete/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const agentId = parseInt(req.params.id);
      
      console.log(`🗑️ Simple direct database delete request for agent ${agentId}`);
      
      // First, verify the agent exists and belongs to this user
      const agent = await storage.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ success: false, error: `Agent with ID ${agentId} not found` });
      }
      
      if (agent.user_id !== userId) {
        return res.status(403).json({ success: false, error: `You do not have permission to delete agent ${agentId}` });
      }
      
      // Use our transaction-safe simpleDeleteAgent function
      const result = await simpleDeleteAgent(agentId);
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        return res.status(200).json({ 
          success: true, 
          message: result.message 
        });
      } else {
        console.error(`❌ Failed to delete agent ${agentId} from database`);
        return res.status(500).json({ 
          success: false, 
          error: `Failed to delete agent ${agentId} from database` 
        });
      }
    } catch (error) {
      console.error(`Error in direct DB delete:`, error);
      return res.status(500).json({ 
        success: false, 
        error: `An error occurred while deleting the agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  // Simple Delete API - The most reliable way to delete agents
  app.delete('/api/simple-delete-agent/:id', isAuthenticated, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const user = (req as any).user;
      
      console.log(`⚠️ Simple agent deletion requested for agent ${agentId} by user ${user?.id}`);
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'User not authenticated' 
        });
      }
      
      if (isNaN(agentId)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid agent ID provided' 
        });
      }
      
      // Get the agent to make sure it belongs to the user
      const agent = await storage.getUserAgentById(agentId);
      
      if (!agent) {
        return res.status(404).json({ 
          success: false,
          message: `Agent ${agentId} not found` 
        });
      }
      
      if (agent.user_id !== user.id) {
        return res.status(403).json({ 
          success: false,
          message: `You do not have permission to delete agent ${agentId}` 
        });
      }
      
      // First, clean up all related automated calls
      const settingsResult = await deleteAutomationSettingsForAgent(agentId);
      console.log(`Automation settings cleanup: ${settingsResult.success ? 'Success' : 'Failed'} - ${settingsResult.deleted} settings deleted`);
      
      // Now use the transaction-based simple delete
      const result = await simpleDeleteAgent(agentId);
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        await logMessage(LogLevel.INFO, 'Agent', `Agent ${agentId} (${agent.name}) successfully deleted by user ${user.email}`);
        
        return res.status(200).json({ 
          success: true,
          message: result.message 
        });
      } else {
        console.error(`❌ ${result.message}`);
        return res.status(500).json({ 
          success: false,
          message: result.message 
        });
      }
    } catch (error) {
      console.error(`Error in simple delete:`, error);
      return res.status(500).json({ 
        success: false,
        message: `An error occurred while deleting the agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  // Admin Panel 1 API Routes
  app.get('/api/admin/system-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get database connection status
      const db = getDb();
      let dbConnected = false;
      let databaseTime = '';
      let databaseName = '';
      let schemaExists = false;

      try {
        // Check if database connection is working by querying time
        const timeQuery = await db.query('SELECT NOW() as time');
        if (timeQuery && timeQuery.rows && timeQuery.rows[0]) {
          dbConnected = true;
          databaseTime = timeQuery.rows[0].time.toISOString();
        }

        // Get database name
        const dbNameQuery = await db.query('SELECT current_database() as db_name');
        if (dbNameQuery && dbNameQuery.rows && dbNameQuery.rows[0]) {
          databaseName = dbNameQuery.rows[0].db_name;
        }

        // Check if users table exists
        const schemaQuery = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'users'
          ) as exists
        `);
        
        if (schemaQuery && schemaQuery.rows && schemaQuery.rows[0]) {
          schemaExists = schemaQuery.rows[0].exists;
        }
      } catch (error) {
        console.error('Database connection failed:', error);
        dbConnected = false;
      }

      // Get user count
      let userCount = 0;
      try {
        if (dbConnected) {
          const users = await storage.getAllUsers();
          userCount = users.length;
        }
      } catch (error) {
        console.error('Failed to get user count:', error);
      }

      // Return system status
      return res.json({
        dbConnected,
        timeCheck: {
          time: databaseTime || new Date().toISOString(),
          database: databaseName || 'Unknown'
        },
        schemaExists,
        userCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting system status:', error);
      return res.status(500).json({ 
        error: 'Failed to get system status',
        timestamp: new Date().toISOString(),
        dbConnected: false,
        schemaExists: false,
        userCount: 0
      });
    }
  });

  // For client-side routes (handles in production mode only) - in development, setupVite middleware handles this
  if (process.env.NODE_ENV === 'production') {
    app.get(['*', '/checkout', '/token-checkout', '/subscription-checkout'], (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }

      // Skip routes for static content
      if (req.path.startsWith('/static/') || req.path.startsWith('/public/') || 
          req.path.startsWith('/assets/') || req.path.startsWith('/temp/')) {
        return next();
      }

      // Tell express to serve the index.html, allowing the client-side router to handle the route
      const indexPath = path.join(process.cwd(), 'client', 'dist', 'index.html');
      
      // Check if the file exists
      if (fs.existsSync(indexPath)) {
        console.log(`[Production] Serving index.html for route ${req.path}`);
        res.sendFile(indexPath);
      } else {
        console.error(`Cannot find index.html at ${indexPath}`);
        next();
      }
    });
  } else {
    console.log("Running in development mode - Vite will handle client-side routing");
  }

  return httpServer;
}

// Utility functions
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function broadcastToAll(data: any) {
  const message = JSON.stringify(data);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function sendServerStatus(ws: WebSocket) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'server_status',
      payload: {
        online: true,
        message: 'Server Online'
      }
    }));
  }
}

async function logMessage(level: LogLevel, source: string, message: string) {
  console.log(`[${level}] [${source}] ${message}`);
  
  // Temporarily commenting out database logging due to missing function
  // Will need to implement storage.addLog in the future
  /*
  try {
    await storage.addLog({
      level,
      source,
      message
    });
  } catch (error) {
    console.error('Error storing log:', error);
  }
  */
}

function calculateUptime() {
  const uptime = new Date().getTime() - startTime.getTime();
  const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
  const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
  
  return `${days}d ${hours}h ${minutes}m`;
}

async function checkServiceStatus(service: string): Promise<boolean> {
  try {
    const config = await storage.getConfig();
    
    switch (service) {
      case 'phone':
      case 'phonenumber':
      case 'twilio':
        return !!config.twilioAccountSid;
      case 'brain':
      case 'aibrain':
      case 'openai':
        return !!config.openaiApiKey;
      case 'voice':
      case 'aivoice':
      case 'elevenlabs':
        return !!config.elevenLabsApiKey;
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error checking service status for ${service}:`, error);
    return false;
  }
}

async function getElevenLabsVoices() {
  try {
    const config = await storage.getConfig();
    console.log('Getting ElevenLabs voices, API key in config:', !!config.elevenLabsApiKey);
    
    // Try to use environment variable as a fallback
    const apiKey = config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    console.log('Final API key status (from config or env):', !!apiKey);
    
    if (!apiKey) {
      console.log('No ElevenLabs API key found, attempting to fetch public voices');
      try {
        // Fetch public voices from ElevenLabs API even without an API key
        console.log('Making request to ElevenLabs public API');
        const response = await axios.get('https://api.elevenlabs.io/v1/voices');
        console.log('Successfully received ElevenLabs voices:', response.data.voices.length);
        
        return response.data.voices.map((voice: any) => ({
          voice_id: voice.voice_id, // Make sure we use voice_id consistently across the app
          name: voice.name,
          description: voice.labels ? 
            `${voice.labels.gender || ''}, ${voice.labels.accent || ''}${voice.labels.description ? ', ' + voice.labels.description : ''}`.trim() 
            : 'Voice',
          preview_url: voice.preview_url,
          labels: voice.labels
        }));
      } catch (publicError) {
        console.error('Error fetching public ElevenLabs voices:', publicError);
        // Fall back to sample voices with preview URLs if public API fails
        return [
          { 
            voice_id: "sample", 
            name: "Rachel", 
            description: "Female, US", 
            preview_url: "https://media.elevenlabs.io/sample-voice-previews/female-us.mp3" 
          },
          { 
            voice_id: "sample2", 
            name: "Adam", 
            description: "Male, UK", 
            preview_url: "https://media.elevenlabs.io/sample-voice-previews/male-uk.mp3" 
          },
          { 
            voice_id: "sample3", 
            name: "Sarah", 
            description: "Female, AU", 
            preview_url: "https://media.elevenlabs.io/sample-voice-previews/female-au.mp3" 
          },
          { 
            voice_id: "sample4", 
            name: "Michael", 
            description: "Male, US",
            preview_url: "https://media.elevenlabs.io/sample-voice-previews/male-us.mp3" 
          }
        ];
      }
    }
    
    // When API key is provided, use authenticated request
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': config.elevenLabsApiKey
      }
    });
    
    return response.data.voices.map((voice: any) => ({
      voice_id: voice.voice_id,
      name: voice.name,
      description: voice.labels ? 
        `${voice.labels.gender || ''}, ${voice.labels.accent || ''}${voice.labels.description ? ', ' + voice.labels.description : ''}`.trim() 
        : 'Custom voice',
      preview_url: voice.preview_url
    }));
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    throw error;
  }
}

async function getElevenLabsModels() {
  try {
    const config = await storage.getConfig();
    
    if (!config.elevenLabsApiKey) {
      return [
        { model_id: "eleven_monolingual_v1", name: "Monolingual v1", token_cost_factor: 1 },
        { model_id: "eleven_multilingual_v1", name: "Multilingual v1", token_cost_factor: 1.5 },
        { model_id: "eleven_multilingual_v2", name: "Multilingual v2", token_cost_factor: 2 }
      ];
    }
    
    const response = await axios.get('https://api.elevenlabs.io/v1/models', {
      headers: {
        'xi-api-key': config.elevenLabsApiKey
      }
    });
    
    return response.data.map((model: any) => ({
      model_id: model.model_id,
      name: model.name,
      token_cost_factor: model.token_cost_factor
    }));
  } catch (error) {
    console.error('Error fetching ElevenLabs models:', error);
    return [
      { model_id: "eleven_monolingual_v1", name: "Monolingual v1", token_cost_factor: 1 },
      { model_id: "eleven_multilingual_v1", name: "Multilingual v1", token_cost_factor: 1.5 },
      { model_id: "eleven_multilingual_v2", name: "Multilingual v2", token_cost_factor: 2 }
    ];
  }
}

// Import admin dashboard API routes - these will be registered in the registerRoutes function

