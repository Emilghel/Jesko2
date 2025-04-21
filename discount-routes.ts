import express, { Request, Response } from 'express';
import { isAuthenticated } from './lib/auth-simple';
import { applyDiscountCode, checkDiscountCode } from './lib/discount-codes';
import { LogLevel } from './lib/log-utils';
import { storage } from './storage';

// Define transaction types
enum TransactionType {
  PURCHASE = 'PURCHASE',
  USAGE = 'USAGE',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
  REFERRAL = 'REFERRAL'
}

const router = express.Router();

/**
 * Apply a discount code for a coin purchase
 * POST /api/discount/apply
 */
router.post('/apply', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { code, coinAmount } = req.body;
    const user = (req as any).user;
    
    if (!code || !coinAmount || typeof coinAmount !== 'number') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request. Please provide a discount code and coin amount.' 
      });
    }
    
    // Apply the discount code
    const result = applyDiscountCode(code, coinAmount);
    
    if (result.success) {
      // Log success
      console.log(`Discount code ${code} applied successfully for user ${user.email}: ${result.message}`);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error applying discount code:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to apply discount code' 
    });
  }
});

/**
 * Check if a discount code is valid
 * GET /api/discount/check/:code
 */
router.get('/check/:code', isAuthenticated, (req: Request, res: Response) => {
  try {
    const code = req.params.code;
    
    if (!code) {
      return res.status(400).json({ 
        valid: false, 
        message: 'No discount code provided' 
      });
    }
    
    // Check if the discount code is valid
    const result = checkDiscountCode(code);
    
    return res.json(result);
  } catch (error) {
    console.error('Error checking discount code:', error);
    return res.status(500).json({ 
      valid: false, 
      message: 'Failed to check discount code' 
    });
  }
});

/**
 * Apply a discount code to the user's account (when purchasing coins)
 * POST /api/discount/purchase-with-discount
 */
router.post('/purchase-with-discount', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { code, baseAmount, payment_id } = req.body;
    const user = (req as any).user;
    
    if (!code || !baseAmount || typeof baseAmount !== 'number' || !payment_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request. Required fields: code, baseAmount, payment_id' 
      });
    }
    
    // Apply the discount code
    const discountResult = applyDiscountCode(code, baseAmount);
    
    if (!discountResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: discountResult.message 
      });
    }
    
    // Add the discounted coins to the user's account
    const newBalance = await storage.addUserCoins(
      user.id,
      discountResult.amount,
      TransactionType.PURCHASE,
      `Purchased ${baseAmount} coins with discount code: ${code}`,
      'discount',
      payment_id
    );
    
    // Add details of the discount to the transaction description in logs
    await storage.logActivity(LogLevel.INFO, 'Discount', 
      `User ${user.email} applied discount code ${code} for a coin purchase of ${baseAmount} coins, 
       resulting in ${discountResult.amount} coins`);
    
    // Return the success response
    return res.json({ 
      success: true, 
      message: `Successfully purchased ${discountResult.amount} coins with discount: ${discountResult.message}`,
      originalAmount: baseAmount,
      finalAmount: discountResult.amount,
      discount: discountResult.discount,
      newBalance
    });
  } catch (error) {
    console.error('Error purchasing with discount code:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to complete purchase with discount' 
    });
  }
});

export default router;