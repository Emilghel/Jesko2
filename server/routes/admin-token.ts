import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import crypto from 'crypto';
import { activeTokens } from '../lib/auth-simple';

const router = Router();

/**
 * Admin Token Request Endpoint
 * 
 * This endpoint generates a new admin token for authenticated admin users.
 * Security measures:
 * 1. Requires user to be logged in and have admin privileges
 * 2. Verifies the user exists in the database
 * 3. Generates a secure random token
 * 4. Sets appropriate expiration
 * 5. Stores token in both memory and database for validation
 */
router.post('/request-token', async (req: Request, res: Response) => {
  try {
    // Check if user is already authenticated via session
    if (req.user && req.user.isAdmin) {
      console.log('Admin token requested by authenticated admin user');
      
      // Get the user from database again to verify
      const user = await storage.getUser(req.user.id);
      
      if (!user || !user.isAdmin) {
        console.log('User not found or not admin in database');
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your account does not have administrator privileges'
        });
      }
      
      // Generate a secure token
      const token = crypto.randomBytes(48).toString('base64');
      
      // Set expiration (12 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);
      
      // Register token in memory
      activeTokens.set(token, {
        userId: user.id,
        expiresAt
      });
      
      // Save token to database
      try {
        await storage.saveAuthToken({
          token,
          userId: user.id,
          expiresAt
        });
        
        console.log('Admin token created and stored in database');
      } catch (dbError) {
        console.error('Error saving token to database:', dbError);
        // Continue even if database save fails since we have the token in memory
      }
      
      // Return token info to client
      return res.status(200).json({
        token,
        expiresAt,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: true
        }
      });
    }
    
    // Check if request has authorization header with token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('Admin token requested using existing token');
      
      const existingToken = authHeader.substring(7);
      
      // Validate the existing token
      const tokenInfo = activeTokens.get(existingToken);
      if (!tokenInfo) {
        console.log('Existing token not found or invalid');
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Your token is invalid or expired'
        });
      }
      
      // Check if token is expired
      if (tokenInfo.expiresAt < new Date()) {
        console.log('Existing token expired');
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your authentication token has expired'
        });
      }
      
      // Get the user from the database
      const user = await storage.getUser(tokenInfo.userId);
      if (!user) {
        console.log('User not found for token');
        return res.status(401).json({
          error: 'Invalid user',
          message: 'Could not find user associated with this token'
        });
      }
      
      // Check if user is admin
      if (!user.isAdmin) {
        console.log('Token user is not admin');
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your account does not have administrator privileges'
        });
      }
      
      // Generate a new token
      const newToken = crypto.randomBytes(48).toString('base64');
      
      // Set expiration (12 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);
      
      // Register token in memory
      activeTokens.set(newToken, {
        userId: user.id,
        expiresAt
      });
      
      // Save token to database
      try {
        await storage.saveAuthToken({
          token: newToken,
          userId: user.id,
          expiresAt
        });
      } catch (dbError) {
        console.error('Error saving token to database:', dbError);
        // Continue even if database save fails
      }
      
      // Return the new token
      return res.status(200).json({
        token: newToken,
        expiresAt,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: true
        }
      });
    }
    
    // If neither session auth nor token auth worked
    console.log('Admin token request unauthorized');
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in as an administrator to request a token'
    });
    
  } catch (error) {
    console.error('Error in admin token request:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An unexpected error occurred while processing your request'
    });
  }
});

export default router;