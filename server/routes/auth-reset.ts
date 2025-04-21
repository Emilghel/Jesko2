import express from 'express';
import { pool } from '../db';
import { storage } from '../storage';
import { LogLevel } from '../../../shared/schema';
import { logger } from '../logger';

const router = express.Router();

/**
 * Server-side Auth Reset Endpoint
 * 
 * This endpoint provides a way to clear invalid tokens associated with a user's account 
 * when persistent authentication issues occur.
 */
router.post('/reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // 1. Check if the user exists
    const userQuery = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userQuery.rows[0];
    
    // 2. Check if auth_tokens table exists
    const checkTableQuery = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'auth_tokens'
      );
    `);
    
    const authTableExists = checkTableQuery.rows[0].exists;
    
    if (authTableExists) {
      // 3. Delete all tokens for this user if the table exists
      await pool.query('DELETE FROM auth_tokens WHERE user_id = $1', [user.id]);
      
      logger.info(`Auth: Reset auth tokens for user ${user.email} (ID: ${user.id})`);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Authentication reset successful',
        tokens_deleted: true
      });
    } else {
      // If the table doesn't exist, just report success since there's nothing to delete
      logger.info(`Auth: Auth reset requested for user ${user.email} but auth_tokens table doesn't exist`);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Authentication reset successful (no tokens to delete)',
        tokens_deleted: false
      });
    }
    
  } catch (error) {
    console.error('Error in auth reset:', error);
    logger.error(`Auth: Auth reset error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to reset authentication' });
  }
});

export default router;