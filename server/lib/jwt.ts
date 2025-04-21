/**
 * JWT Token Verification Utilities
 * 
 * This module provides functions for verifying JSON Web Tokens
 * used in our token-based authentication system.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from '../storage';

// Get JWT secret from environment variable or generate a secure one
let secretKey: string;

if (process.env.JWT_SECRET) {
  secretKey = process.env.JWT_SECRET;
} else {
  secretKey = crypto.randomBytes(32).toString('hex');
  console.warn('[JWT] WARNING: No JWT_SECRET environment variable set! Using randomly generated secret. All tokens will become invalid when server restarts.');
}

/**
 * JWT Token payload structure
 */
export interface JwtPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify and decode a JWT token
 * 
 * This is a simplified verification method that doesn't check token storage
 * to ensure compatibility with existing authentication system
 * 
 * @param token The JWT token to verify
 * @returns The decoded token payload
 * @throws Error if token verification fails
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    try {
      // Sanitize the token input (basic validation)
      if (!token || typeof token !== 'string' || token.length < 10) {
        console.error('[JWT] Invalid token format provided:', token?.substring(0, 5) + '...');
        reject(new Error('Invalid token format'));
        return;
      }

      // JWT verification options with enhanced security
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: ['HS256'], // Explicitly specify allowed algorithms
        complete: false // We only want the decoded payload
      };
      
      // Verify the token
      let payload: Record<string, any>;
      
      try {
        payload = jwt.verify(token, secretKey, verifyOptions) as Record<string, any>;
      } catch (err) {
        const errorName = (err as Error).name || 'Unknown';
        const errorMessage = (err as Error).message || 'No details';
        console.error(`[JWT] Token verification failed: ${errorName} - ${errorMessage}`);
        
        if (errorName === 'TokenExpiredError') {
          reject(new Error('Token has expired'));
        } else if (errorName === 'JsonWebTokenError') {
          reject(new Error('Invalid token signature'));
        } else {
          reject(new Error('Invalid or expired token'));
        }
        return;
      }
      
      // Check for required fields
      if (!payload?.userId) {
        console.error('[JWT] Missing userId in token payload');
        reject(new Error('Invalid token format: missing userId'));
        return;
      }
      
      // Check userId type (should be a number)
      if (typeof payload.userId !== 'number') {
        console.error('[JWT] userId is not a number:', typeof payload.userId);
        reject(new Error('Invalid token: userId must be a number'));
        return;
      }
      
      // Verify that the JWT expiration (exp) is present
      if (!payload.exp) {
        console.error('[JWT] Missing expiration in token');
        reject(new Error('Invalid token: missing expiration'));
        return;
      }
      
      // Return the validated payload
      resolve({
        userId: payload.userId,
        email: payload.email || '',
        iat: payload.iat,
        exp: payload.exp
      });
    } catch (error) {
      console.error('[JWT] Error in token verification:', error);
      reject(new Error('Token verification failed due to an internal error'));
    }
  });
}

/**
 * Create a new JWT token
 * 
 * @param payload The data to encode in the token
 * @param expiresIn Expiration time (default: '7d')
 * @returns The signed JWT token
 */
export function createToken(payload: JwtPayload, expiresIn: string = '7d'): string {
  // Validate payload (defensive programming)
  if (!payload || typeof payload !== 'object') {
    throw new Error('[JWT] Invalid payload provided for token creation');
  }
  
  if (!payload.userId || typeof payload.userId !== 'number') {
    throw new Error('[JWT] Token payload requires a numeric userId');
  }
  
  // Sanitize the payload to only include allowed fields
  const sanitizedPayload: JwtPayload = {
    userId: payload.userId,
    email: payload.email || '',
  };
  
  // Cast expiresIn to the type that jwt.SignOptions expects
  const expiresInOption = expiresIn as jwt.SignOptions["expiresIn"];
  
  // Configure sign options with enhanced security
  const options: jwt.SignOptions = { 
    expiresIn: expiresInOption,
    algorithm: 'HS256', // Explicitly specify the algorithm
    notBefore: 0, // Token is valid immediately
    jwtid: crypto.randomBytes(8).toString('hex'), // Add a unique identifier for the token
  };
  
  // Add the timestamp when this token was issued
  const token = jwt.sign(sanitizedPayload, secretKey, options);
  
  console.log(`[JWT] Created token for user ${payload.userId}, expires in ${expiresIn}`);
  
  return token;
}