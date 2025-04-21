import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, pool } from '../db';
import { users, partners } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { storage } from '../storage';

// Extended request with partner data
export interface PartnerRequest extends Request {
  partner?: any;
  user?: any;
  userId?: number;
}

// Validate token and extract user ID
export async function validateToken(token: string): Promise<number | null> {
  try {
    // Basic input validation
    if (!token || typeof token !== 'string') {
      console.error("Invalid token format provided");
      return null;
    }
    
    // SQL injection protection - limiting token length and character set
    // Tokens should be alphanumeric with some special chars like + and / for base64
    if (token.length > 1000 || !token.match(/^[A-Za-z0-9+/=._-]+$/)) {
      console.error("Token contains invalid characters or is too long");
      return null;
    }
    
    // Check if token exists in auth_tokens table using direct SQL query
    // Use parameterized query for security
    const result = await pool.query(
      'SELECT user_id, expires_at FROM auth_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      console.log("Token not found in database or expired");
      return null;
    }
    
    // Extract user ID from result
    const userId = result.rows[0].user_id;
    
    if (!userId || typeof userId !== 'number') {
      console.error("Invalid user ID in token record:", userId);
      return null;
    }
    
    // Log successful validation
    console.log(`Token validated successfully for user ID: ${userId}`);
    
    return userId;
    
    // Note: We're using database token validation only, not JWT verification
    // If JWT verification is needed in the future, use the JWT_SECRET environment variable with 
    // a proper fallback mechanism like in the jwt.ts module, never a hardcoded string
  } catch (error) {
    console.error("Token validation error:", error);
    return null;
  }
}

// Middleware to authenticate partners
export async function isPartner(req: PartnerRequest, res: Response, next: NextFunction) {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    // No special case handling - all tokens must be validated through the database
    // This improves security by removing hardcoded backdoor tokens

    // Validate the token and get the user ID
    const userId = await validateToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check if the user is a partner
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.user_id, userId));

    if (!partner) {
      return res.status(403).json({ error: "User is not a partner" });
    }

    // Check if the partner is active
    if (partner.status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: "Partner account is not active", 
        status: partner.status
      });
    }

    // Attach user and partner to the request
    req.userId = userId;
    req.user = user;
    req.partner = partner;

    next();
  } catch (error) {
    console.error("Partner authentication error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}

// Middleware to check partner status (doesn't require partner to be active)
export async function checkPartnerStatus(req: PartnerRequest, res: Response, next: NextFunction) {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    // No special case handling - all tokens must be validated through the database
    // This improves security by removing hardcoded backdoor tokens

    // Validate the token and get the user ID
    const userId = await validateToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check if the user is a partner
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.user_id, userId));

    if (!partner) {
      return res.json({ 
        isPartner: false 
      });
    }

    // Return partner status
    return res.json({
      isPartner: true,
      status: partner.status,
      company: partner.company_name,
      referralCode: partner.referral_code,
      partnerId: partner.id
    });
  } catch (error) {
    console.error("Partner status check error:", error);
    return res.status(500).json({ error: "Status check error" });
  }
}