import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { User, TransactionType, LogLevel } from '../../shared/schema';
import crypto from 'crypto';
import { pool } from '../db';

// In-memory token store (would be DB-based in a real app)
interface TokenInfo {
  userId: number;
  expiresAt: Date;
}

// Active tokens map
export const activeTokens = new Map<string, TokenInfo>();

// Restore tokens from the database
export async function restoreTokens() {
  try {
    console.log("Attempting to restore tokens from database");
    
    // Clear active tokens from memory first (to avoid duplicate tokens)
    const previousCount = activeTokens.size;
    if (previousCount > 0) {
      console.log(`Clearing ${previousCount} tokens from memory before restoration`);
      activeTokens.clear();
    }
    
    // First, clear any expired tokens from the database
    const result = await pool.query(
      'DELETE FROM auth_tokens WHERE expires_at < NOW() RETURNING token'
    );
    
    if (result.rows.length > 0) {
      console.log(`Cleaned up ${result.rows.length} expired tokens from database`);
    }
    
    // Now load valid tokens
    const { rows } = await pool.query(
      'SELECT token, user_id, expires_at FROM auth_tokens WHERE expires_at >= NOW()'
    );
    
    // Load tokens into memory
    let loadedTokenCount = 0;
    rows.forEach((row: { token: string, user_id: number, expires_at: string }) => {
      try {
        // Make sure the token is valid and the expiration date can be parsed
        if (!row.token || !row.user_id) {
          console.warn(`Skipping invalid token record (missing token or user_id)`);
          return;
        }
        
        const expiresAt = new Date(row.expires_at);
        if (isNaN(expiresAt.getTime())) {
          console.warn(`Skipping token with invalid expiration date: ${row.expires_at}`);
          return;
        }
        
        // Add the token to memory
        activeTokens.set(row.token, {
          userId: row.user_id,
          expiresAt
        });
        loadedTokenCount++;
      } catch (err) {
        console.warn(`Error processing token for user ${row.user_id}:`, err);
      }
    });
    
    console.log(`Restored ${loadedTokenCount} active tokens from database (out of ${rows.length} records)`);
    
    // In development, generate a secure random token for admin if none exists
    const shouldAddTestTokens = process.env.NODE_ENV === 'development' && activeTokens.size === 0;
    
    if (shouldAddTestTokens) {
      console.log("Adding secure development token for first-time setup");
      
      // Check if admin user exists (ID 1)
      const adminCheck = await pool.query('SELECT id FROM users WHERE id = 1 AND is_admin = true');
      
      if (adminCheck.rowCount && adminCheck.rowCount > 0) {
        // Generate a secure random token
        const adminToken = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
        
        activeTokens.set(adminToken, {
          userId: 1, // Admin user ID 1
          expiresAt
        });
        
        // Save to database
        await pool.query(
          'INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET expires_at = $3',
          [adminToken, 1, expiresAt]
        );
        
        console.log(`Generated secure admin token: ${adminToken.substring(0, 10)}...`);
        console.log(`First-time developer setup: Use this token for admin access`);
      } else {
        console.log(`No admin user found with ID 1 - skipping token generation`);
      }
    }
    
    console.log(`Total active tokens in memory: ${activeTokens.size}`);
    
    // Verify admin tokens exist
    const adminTokenCount = await verifyAdminTokens();
    console.log(`Verified ${adminTokenCount} admin tokens are active`);
    
    return activeTokens.size;
  } catch (error) {
    console.error("Error restoring tokens:", error);
    throw error;
  }
}

// Verify that at least one admin token exists and is valid
async function verifyAdminTokens(): Promise<number> {
  try {
    // Find all admin users
    const { rows: admins } = await pool.query(
      'SELECT id FROM users WHERE is_admin = true'
    );
    
    if (admins.length === 0) {
      console.log('No admin users found in the database');
      return 0;
    }
    
    // Get all admin IDs
    const adminIds = admins.map(admin => admin.id);
    console.log(`Found ${adminIds.length} admin users with IDs: ${adminIds.join(', ')}`);
    
    // Count tokens for admin users
    let adminTokenCount = 0;
    activeTokens.forEach((info, token) => {
      if (adminIds.includes(info.userId)) {
        adminTokenCount++;
      }
    });
    
    return adminTokenCount;
  } catch (error) {
    console.error("Error verifying admin tokens:", error);
    return 0;
  }
}

// Register a token from the client
export async function registerToken(tokenOrUser: string | any, userId?: number): Promise<string | boolean> {
  try {
    // If the first argument is a user object, generate a token for that user
    if (typeof tokenOrUser !== 'string') {
      const user = tokenOrUser;
      
      // Generate a token
      const token = generateToken();
      
      // Set a 7-day expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Store the token in memory
      activeTokens.set(token, {
        userId: user.id,
        expiresAt
      });
      
      // Also persist to database
      await pool.query(
        'INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET expires_at = $3, user_id = $2',
        [token, user.id, expiresAt]
      );
      
      console.log(`Generated and registered token for user ${user.id}: ${token.substring(0, 10)}...`);
      console.log(`Token will expire at: ${expiresAt.toISOString()}`);
      console.log(`Current active tokens count: ${activeTokens.size}`);
      
      return token;
    }
    
    // Original functionality: register an existing token for a user
    const token = tokenOrUser;
    
    if (!userId) {
      console.log(`Cannot register token: Missing user ID`);
      return false;
    }
    
    // Validate that the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      console.log(`Cannot register token: User ID ${userId} not found`);
      return false;
    }
    
    // Set a 7-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Store the token in memory
    activeTokens.set(token, {
      userId,
      expiresAt
    });
    
    // Also persist to database
    await pool.query(
      'INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET expires_at = $3, user_id = $2',
      [token, userId, expiresAt]
    );
    
    console.log(`Registered token for user ${userId}: ${token.substring(0, 10)}...`);
    console.log(`Token will expire at: ${expiresAt.toISOString()}`);
    console.log(`Current active tokens count: ${activeTokens.size}`);
    
    return true;
  } catch (error) {
    console.error("Error registering token:", error);
    return false;
  }
}

// No longer need Passport
export function setupPassport() {
  // This is empty now - keeping it to avoid changing imports elsewhere
  console.log('Using token-based authentication instead of Passport');
  
  // Make sure to restore tokens when the server starts
  restoreTokens().then(() => {
    console.log('Token restoration completed during server startup');
  }).catch(err => {
    console.error('Failed to restore tokens during server startup:', err);
  });
}

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(48).toString('base64');
}

// Check token expiration and clean up expired tokens periodically
setInterval(() => {
  const now = new Date();
  // Using forEach instead of for...of to avoid downlevelIteration issues
  activeTokens.forEach((info, token) => {
    if (info.expiresAt < now) {
      activeTokens.delete(token);
    }
  });
}, 60 * 1000); // Check every minute

// Helper to check if user is authenticated - with enhanced token-based auth and cookie fallback
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const isProductionDeploy = process.env.REPL_SLUG === 'node-ninja-emilghelmeci';
  console.log(`Auth check in environment: ${isProductionDeploy ? 'Production' : 'Development'}`);
  
  // Get the token from Authorization header
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  
  // Try to get token from Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (token) {
      console.log('Auth check - token found in Authorization header:', token.substring(0, 10) + '...');
    }
  }
  
  // If no token in header, try cookie as a fallback
  if (!token) {
    // First check the proper cookie
    if (req.cookies?.auth_token) {
      token = req.cookies.auth_token;
      if (token) {
        console.log('Auth check - token found in auth_token cookie:', token.substring(0, 10) + '...');
      }
    }
    // Then check if it's URL encoded
    else if (req.cookies && Object.keys(req.cookies).some(key => decodeURIComponent(key) === 'auth_token')) {
      const encodedKey = Object.keys(req.cookies).find(key => decodeURIComponent(key) === 'auth_token');
      if (encodedKey) {
        token = req.cookies[encodedKey];
        if (token) {
          console.log('Auth check - token found in URL-encoded auth_token cookie:', token.substring(0, 10) + '...');
        }
      }
    }
    // Finally check if token is embedded in another cookie value
    else if (req.cookies && Object.keys(req.cookies).length > 0) {
      console.log('Checking all cookies for embedded token');
      for (const cookieName of Object.keys(req.cookies)) {
        const cookieValue = req.cookies[cookieName];
        // Try to decode the cookie value if it might be encoded
        try {
          const decodedValue = decodeURIComponent(cookieValue);
          if (decodedValue.includes('auth_token=')) {
            // Extract token from cookie value using regex
            const match = decodedValue.match(/auth_token=([^;]+)/);
            if (match && match[1]) {
              token = match[1];
              console.log(`Auth check - token extracted from ${cookieName} cookie:`, token.substring(0, 10) + '...');
              break;
            }
          }
        } catch (e) {
          // Ignore decoding errors and continue
        }
      }
    }
  }
  
  if (!token) {
    console.log('Auth check - No authentication token found (neither header nor cookie)');
    console.log('Available cookies:', Object.keys(req.cookies || {}));
    console.log('Headers:', JSON.stringify(req.headers));
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if token is valid and not expired
  const tokenInfo = activeTokens.get(token);
  if (!tokenInfo) {
    console.log('Auth check - Invalid token or token not found');
    
    // Additional debug logging for production issues
    console.log('Active tokens count:', activeTokens.size);
    if (activeTokens.size > 0) {
      // Log a few tokens for debugging (just the first 10 chars)
      console.log('Active token keys (first 10 chars):');
      let count = 0;
      activeTokens.forEach((info, key) => {
        if (count < 5) {
          console.log(`- ${key.substring(0, 10)}... (expires: ${info.expiresAt.toISOString()})`);
          count++;
        }
      });
    }
    
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  // Check if token is expired
  if (tokenInfo.expiresAt < new Date()) {
    console.log('Auth check - Token expired');
    console.log('Token expiry:', tokenInfo.expiresAt.toISOString(), 'Current time:', new Date().toISOString());
    activeTokens.delete(token);
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Get the user from the database
  storage.getUser(tokenInfo.userId)
    .then(user => {
      if (!user) {
        console.log('Auth check - User not found for token');
        activeTokens.delete(token);
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Attach the user to the request
      (req as any).user = user;
      console.log('Auth check - User verified:', user.email);
      next();
    })
    .catch(err => {
      console.error('Auth check - Error fetching user:', err);
      res.status(500).json({ error: 'Server error' });
    });
}

// Helper to check if user is an admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user && (req as any).user.is_admin === true) {
    return next();
  }
  
  console.log(`Admin check failed for user: ${JSON.stringify({
    id: (req as any).user?.id,
    email: (req as any).user?.email,
    is_admin: (req as any).user?.is_admin
  })}`);
  
  res.status(403).json({ error: 'Not authorized' });
}

// Register a new user
export async function registerUser(username: string, email: string, password: string, displayName?: string, isAdmin: boolean = false, phoneNumber?: string, ipAddress?: string) {
  try {
    // Check if user with this email already exists
    const existingUserByEmail = await storage.getUserByEmail(email);
    if (existingUserByEmail) {
      throw new Error('Email already in use');
    }

    // Check if user with this username already exists
    const existingUserByUsername = await storage.getUserByUsername(username);
    if (existingUserByUsername) {
      throw new Error('Username already in use');
    }

    // If IP address is provided, check if this IP has reached the limit (max 2 accounts per IP)
    if (ipAddress) {
      // Get count of users with this IP address
      const { rows } = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE registration_ip = $1',
        [ipAddress]
      );
      
      const count = parseInt(rows[0]?.count || '0');
      if (count >= 2) {
        throw new Error('Maximum number of accounts per IP address reached (2)');
      }
      
      console.log(`IP address ${ipAddress} has ${count} existing accounts. Registration allowed.`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username,
      isAdmin,
      lastLogin: new Date(),
      phoneNumber,
      registrationIp: ipAddress,
    });

    // Add a transaction record for the initial 100 coins
    if (user) {
      await storage.addUserCoins(
        user.id,
        100, // Starting coins amount
        TransactionType.BONUS, // Use BONUS type for welcome coins
        "Welcome bonus - 100 free coins for new users",
        undefined, // No package ID for welcome bonus
        undefined  // No payment ID for welcome bonus
      );
      
      // Add log entry
      await storage.addLog({
        level: LogLevel.INFO,
        source: 'Registration',
        message: `New user ${username} (${email}) received 100 welcome bonus coins`,
        timestamp: new Date()
      });
    }

    return user;
  } catch (error) {
    throw error;
  }
}

// Login a user (replaces Passport's authenticate)
export async function loginUser(email: string, password: string) {
  try {
    console.log(`Authenticating user with email: ${email}`);
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.log(`No user found with email: ${email}`);
      throw new Error('Invalid email or password');
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Password mismatch for user ${email}`);
      throw new Error('Invalid email or password');
    }
    
    // Update last login time
    await storage.updateLastLogin(user.id);
    
    console.log(`User ${email} authenticated successfully`);
    
    // Generate and register token
    const token = await registerToken(user);
    
    return { user, token };
  } catch (error) {
    throw error;
  }
}

// Logout a user
export async function logoutUser(token: string) {
  try {
    // Check if token exists in active tokens
    if (!activeTokens.has(token)) {
      return false;
    }
    
    // Remove from memory
    activeTokens.delete(token);
    
    // Remove from database
    await pool.query(
      'DELETE FROM auth_tokens WHERE token = $1',
      [token]
    );
    
    return true;
  } catch (error) {
    console.error("Error during logout:", error);
    return false;
  }
}
