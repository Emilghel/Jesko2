import { Request, Response, NextFunction } from 'express';
import { isAuthenticated, isAdmin as checkAdmin } from './lib/auth-simple';

/**
 * Middleware that ensures the user is authenticated
 * Delegates to the existing auth-simple.ts implementation
 */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  // Use the existing authentication system
  return isAuthenticated(req, res, next);
}

/**
 * Middleware that ensures the user is an admin
 * First authenticates the user, then checks admin status
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First authenticate the user using the existing system
  isAuthenticated(req, res, (err) => {
    if (err) return next(err);
    
    // Then check admin status
    checkAdmin(req, res, next);
  });
}
