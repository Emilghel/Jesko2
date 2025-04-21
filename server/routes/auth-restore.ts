import express from 'express';
import { restoreTokens, activeTokens } from '../lib/auth-simple';
import { isAdmin, isAuthenticated } from '../lib/auth-simple';
import { logger } from '../logger';
import { LogLevel } from '@shared/schema';
import { pool } from '../db';

const router = express.Router();

/**
 * Auth Token Restoration Endpoint
 * 
 * This endpoint provides a way to restore tokens from the database to memory when
 * authentication issues occur.
 */
router.post('/restore-tokens', isAuthenticated, isAdmin, async (req, res) => {
  try {
    logger.info('Auth token restoration requested by admin', { 
      userId: (req as any).user?.id,
      email: (req as any).user?.email
    });

    // Log the current state
    logger.info(`Current active tokens count before restoration: ${activeTokens.size}`);
    
    // Attempt to restore tokens
    await restoreTokens();
    
    logger.info(`Auth tokens restored successfully. New active tokens count: ${activeTokens.size}`);
    
    // Return success response with count of active tokens
    return res.status(200).json({
      success: true,
      message: 'Auth tokens restored successfully',
      activeTokensCount: activeTokens.size
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`Auth token restoration error: ${errorMessage}`, {
      level: LogLevel.ERROR,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({ 
      error: 'Failed to restore auth tokens',
      message: errorMessage
    });
  }
});

/**
 * Auth Token Status Endpoint
 * 
 * This endpoint provides a way to check the status of authentication tokens
 */
router.get('/token-status', isAuthenticated, async (req, res) => {
  try {
    // Only admin users can see global token status
    const isAdminUser = (req as any).user?.is_admin === true;
    
    const response: any = {
      success: true,
      authenticated: true,
      user: {
        id: (req as any).user?.id,
        email: (req as any).user?.email,
        username: (req as any).user?.username,
        isAdmin: (req as any).user?.is_admin || false
      }
    };
    
    // Include global token info only for admins
    if (isAdminUser) {
      response.activeTokensCount = activeTokens.size;
      
      // For debugging purposes, include a sample of token keys (first 10 chars only)
      response.tokenSamples = Array.from(activeTokens.keys())
        .slice(0, 5)
        .map(token => `${token.substring(0, 10)}...`);
    }
    
    return res.status(200).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Auth token status error: ${errorMessage}`);
    res.status(500).json({ error: 'Failed to get auth token status' });
  }
});

/**
 * Emergency Token Restore Endpoint
 * 
 * This endpoint is a special version that doesn't require authentication
 * but uses a special key provided in the query parameter to prevent unauthorized access.
 * This is useful when all authentication tokens are invalid and you need to restore them.
 */
router.post('/emergency-restore', async (req, res) => {
  try {
    // Get the emergency key from the request
    const { emergency_key } = req.body;
    
    if (!emergency_key) {
      logger.warn('Emergency token restore attempted without key');
      return res.status(400).json({ error: 'Emergency key is required' });
    }
    
    // Check if any admin exists in the database
    const adminResult = await pool.query(
      'SELECT id, email FROM users WHERE is_admin = true LIMIT 1'
    );
    
    if (adminResult.rowCount === 0) {
      logger.error('No admin users found in the database for emergency restore');
      return res.status(500).json({ error: 'No admin users found' });
    }
    
    // Get the admin's email
    const adminEmail = adminResult.rows[0].email;
    
    // Create an emergency key based on admin email (simplified for security)
    const emailParts = adminEmail.split('@');
    const expectedKey = `${emailParts[0]}-${new Date().toISOString().slice(0, 10)}`;
    
    // Validate the emergency key
    if (emergency_key !== expectedKey) {
      logger.warn(`Emergency token restore attempted with invalid key: ${emergency_key}`);
      return res.status(403).json({ error: 'Invalid emergency key' });
    }
    
    // Log the current state
    logger.info(`Emergency token restoration initiated. Current active tokens count: ${activeTokens.size}`);
    
    // Attempt to restore tokens
    await restoreTokens();
    
    logger.info(`Emergency token restoration successful. New active tokens count: ${activeTokens.size}`);
    
    // Return success response with count of active tokens
    return res.status(200).json({
      success: true,
      message: 'Emergency token restoration successful',
      activeTokensCount: activeTokens.size
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Emergency token restoration error: ${errorMessage}`, {
      level: LogLevel.ERROR,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({ 
      error: 'Failed to restore auth tokens in emergency mode',
      message: errorMessage
    });
  }
});

export default router;