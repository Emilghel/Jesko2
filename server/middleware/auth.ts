import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { storage } from '../storage';

/**
 * Middleware to verify authentication for routes that require a logged-in user
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Verify the token
        const payload = await verifyToken(token);
        if (payload && payload.userId) {
          // Get user from database
          const user = await storage.getUser(payload.userId);
          if (user) {
            // Set the authenticated user on the request object
            req.user = user;
            return next();
          }
        }
      } catch (error) {
        console.error('Token verification error:', error);
      }
    }

    // If we reach here, we already checked session in getAuthUser middleware in routes.ts
    // If user is present from that, we can proceed
    if (req.user) {
      return next();
    }

    // No valid authentication was found
    return res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to verify admin privileges
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if the user has admin privileges
  if (req.user.isAdmin !== true) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Middleware to verify partner privileges
 */
export const partnerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if the user has partner privileges
  if (!req.user.is_partner) {
    return res.status(403).json({ error: 'Partner access required' });
  }

  next();
};