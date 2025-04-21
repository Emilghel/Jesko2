/**
 * Authentication Helper Functions
 * 
 * Common utilities for user authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { User, PartnerStatus } from '@shared/schema';

/**
 * Check if a user is an admin
 * @param userId User ID to check
 * @returns Promise<boolean> True if the user is an admin
 */
export async function isAdmin(userId: number): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    return user?.is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if a user is a partner
 * @param userId User ID to check
 * @returns Promise<boolean> True if the user is a partner
 */
export async function isPartner(userId: number): Promise<boolean> {
  try {
    const partner = await storage.getPartnerByUserId(userId);
    // Case-insensitive comparison to handle enum values
    return partner !== null && 
           partner.status?.toUpperCase() === PartnerStatus.ACTIVE.toUpperCase();
  } catch (error) {
    console.error('Error checking partner status:', error);
    return false;
  }
}

/**
 * Middleware to check if a user is an admin
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export async function isAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as User;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const admin = await isAdmin(user.id);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Error in admin middleware:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Middleware to check if a user is a partner
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export async function isPartnerMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as User;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const partner = await isPartner(user.id);
    
    if (!partner) {
      return res.status(403).json({ error: 'Partner access required' });
    }
    
    next();
  } catch (error) {
    console.error('Error in partner middleware:', error);
    res.status(500).json({ error: 'Server error' });
  }
}