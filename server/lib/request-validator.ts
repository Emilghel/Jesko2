/**
 * Request Validation Middleware
 * 
 * Helper function to validate request parameters using express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware to validate request data against validation chains
 * Returns 400 Bad Request with validation errors if validation fails
 */
export function validateRequest(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      })) 
    });
  }
  
  next();
}