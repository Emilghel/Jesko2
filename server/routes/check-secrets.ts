/**
 * API endpoint for checking if secrets exist
 * This endpoint allows clients to check if specific secrets are configured
 * without exposing the actual values
 */

import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { secretKeys } = req.body;
    
    if (!Array.isArray(secretKeys)) {
      return res.status(400).json({ 
        error: 'Invalid request: secretKeys must be an array' 
      });
    }
    
    // Check if each secret exists in the environment
    const secrets = secretKeys.map(key => ({
      key,
      exists: !!process.env[key] && process.env[key]!.trim() !== ''
    }));
    
    logger.info(`Checked existence of ${secretKeys.length} secrets`);
    
    return res.json({ secrets });
  } catch (error) {
    logger.error(`Error in check-secrets endpoint: ${error}`);
    return res.status(500).json({ 
      error: 'Failed to check secrets' 
    });
  }
});

export default router;