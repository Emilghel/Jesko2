/**
 * Stripe Database Integration
 * 
 * This module handles the database operations related to Stripe payments and partner commissions.
 */

import { pool } from './db';
import { 
  PaymentStatus, 
  CommissionStatus, 
  PaymentType,
  LogLevel
} from '@shared/schema';
import { logger } from './logger';

/**
 * Log a message to the console and database
 * @param level Log level
 * @param source Source of the log
 * @param message Message to log
 */
async function logMessage(level: LogLevel, source: string, message: string): Promise<void> {
  // Log to console based on level
  switch(level) {
    case LogLevel.INFO:
      logger.info(`[${source}] ${message}`);
      break;
    case LogLevel.WARNING:
      logger.warn(`[${source}] ${message}`);
      break;
    case LogLevel.ERROR:
      logger.error(`[${source}] ${message}`);
      break;
    default:
      logger.debug(`[${source}] ${message}`);
  }
  
  // Database logging can be added here if needed
}

/**
 * Record a new Stripe payment and attribute commission to the partner
 * @param userId User ID making the purchase
 * @param amount Total amount of the purchase
 * @param partnerId Partner ID to attribute the commission to
 * @param stripePaymentIntentId Stripe payment intent ID
 * @param description Description of the purchase
 */
export async function recordStripePayment(
  data: {
    userId: number,
    amount: number,
    description: string,
    paymentMethod: string,
    paymentIntentId: string,
    tokensGranted: number,
    partnerId?: number | null,
  }
): Promise<boolean> {
  const { userId, amount, description, paymentMethod, paymentIntentId, tokensGranted, partnerId = null } = data;
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Record the payment in the database
    const paymentResult = await client.query(
      `INSERT INTO payments (
        user_id, 
        amount, 
        payment_type, 
        status, 
        transaction_id, 
        description, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
      [
        userId, 
        amount, 
        paymentMethod, 
        PaymentStatus.COMPLETED, 
        paymentIntentId, 
        description
      ]
    );
    
    const paymentId = paymentResult.rows[0].id;
    
    // If a partner is attributed to this payment, record the commission
    if (partnerId) {
      // Get the partner's commission rate
      const partnerResult = await client.query(
        'SELECT commission_rate FROM partners WHERE id = $1',
        [partnerId]
      );
      
      if (partnerResult.rows.length > 0) {
        const commissionRate = partnerResult.rows[0].commission_rate;
        const commissionAmount = amount * (commissionRate / 100);
        
        // Record the commission
        await client.query(
          `INSERT INTO partner_commissions (
            partner_id, 
            payment_id, 
            amount, 
            status, 
            created_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [
            partnerId, 
            paymentId, 
            commissionAmount, 
            CommissionStatus.PENDING
          ]
        );
        
        // Update the partner's earnings
        await client.query(
          `UPDATE partners 
           SET earnings_balance = earnings_balance + $1 
           WHERE id = $2`,
          [commissionAmount, partnerId]
        );
        
        await logMessage(
          LogLevel.INFO, 
          'StripeDatabase', 
          `Recorded commission of $${commissionAmount} for partner ${partnerId} from payment ${paymentId}`
        );
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Add the tokens to the user's account
    await pool.query(
      'UPDATE users SET coins = coins + $1 WHERE id = $2',
      [tokensGranted, userId]
    );
    
    // Log the successful transaction
    await logMessage(
      LogLevel.INFO, 
      'StripeDatabase', 
      `Recorded payment of $${amount} for user ${userId} (${paymentIntentId}), granted ${tokensGranted} tokens`
    );
    
    return true;
  } catch (error) {
    // Rollback the transaction on error
    await client.query('ROLLBACK');
    
    await logMessage(
      LogLevel.ERROR, 
      'StripeDatabase', 
      `Error recording Stripe payment: ${error instanceof Error ? error.message : String(error)}`
    );
    
    return false;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

/**
 * Record a partner payment made through Stripe
 * @param partnerId ID of the partner being paid
 * @param amount Amount of the payment
 * @param stripeTransferId Stripe transfer ID
 * @param notes Optional notes about the payment
 */
export async function recordPartnerPayment(
  partnerId: number, 
  amount: number, 
  stripeTransferId: string, 
  notes: string = ''
): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Record the payment in the database
    await client.query(
      `INSERT INTO partner_payments (
        partner_id, 
        amount, 
        payment_type, 
        status, 
        transaction_id, 
        notes, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        partnerId, 
        amount, 
        PaymentType.STRIPE, 
        PaymentStatus.COMPLETED, 
        stripeTransferId, 
        notes
      ]
    );
    
    // Update the partner's balance
    await client.query(
      `UPDATE partners 
       SET earnings_balance = earnings_balance - $1,
           total_earnings = total_earnings + $1 
       WHERE id = $2`,
      [amount, partnerId]
    );
    
    // Mark associated commissions as paid
    // This will mark pending commissions as paid, up to the paid amount
    await client.query(
      `WITH commissions_to_update AS (
         SELECT id, amount 
         FROM partner_commissions 
         WHERE partner_id = $1 AND status = $2 
         ORDER BY created_at 
         LIMIT (
           SELECT 
             CASE 
               WHEN SUM(amount) <= $3 THEN COUNT(*) 
               ELSE (
                 SELECT COUNT(*) 
                 FROM (
                   SELECT id, amount, 
                     SUM(amount) OVER (ORDER BY created_at) AS running_total 
                   FROM partner_commissions 
                   WHERE partner_id = $1 AND status = $2 
                   ORDER BY created_at
                 ) AS subq 
                 WHERE running_total <= $3
               ) 
             END 
           FROM partner_commissions 
           WHERE partner_id = $1 AND status = $2
         )
       )
       UPDATE partner_commissions 
       SET status = $4 
       WHERE id IN (SELECT id FROM commissions_to_update)`,
      [partnerId, CommissionStatus.PENDING, amount, CommissionStatus.PAID]
    );
    
    // Commit the transaction
    await client.query('COMMIT');
    
    await logMessage(
      LogLevel.INFO, 
      'StripeDatabase', 
      `Recorded partner payment of $${amount} to partner ${partnerId} (${stripeTransferId})`
    );
    
    return true;
  } catch (error) {
    // Rollback the transaction on error
    await client.query('ROLLBACK');
    
    await logMessage(
      LogLevel.ERROR, 
      'StripeDatabase', 
      `Error recording partner payment: ${error instanceof Error ? error.message : String(error)}`
    );
    
    return false;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

/**
 * Update the Stripe account ID for a partner
 * @param partnerId Partner ID
 * @param stripeAccountId Stripe connected account ID
 */
export async function updatePartnerStripeAccount(
  partnerId: number, 
  stripeAccountId: string
): Promise<boolean> {
  try {
    await pool.query(
      'UPDATE partners SET stripe_account_id = $1 WHERE id = $2',
      [stripeAccountId, partnerId]
    );
    
    await logMessage(
      LogLevel.INFO, 
      'StripeDatabase', 
      `Updated Stripe account ID for partner ${partnerId} to ${stripeAccountId}`
    );
    
    return true;
  } catch (error) {
    await logMessage(
      LogLevel.ERROR, 
      'StripeDatabase', 
      `Error updating partner Stripe account: ${error instanceof Error ? error.message : String(error)}`
    );
    
    return false;
  }
}

/**
 * Get the Stripe customer ID for a user, or null if not set
 * @param userId User ID
 */
export async function getUserStripeCustomerId(userId: number): Promise<string | null> {
  try {
    const result = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0].stripe_customer_id;
  } catch (error) {
    await logMessage(
      LogLevel.ERROR, 
      'StripeDatabase', 
      `Error getting user Stripe customer ID: ${error instanceof Error ? error.message : String(error)}`
    );
    
    return null;
  }
}

/**
 * Update the Stripe customer ID for a user
 * @param userId User ID
 * @param stripeCustomerId Stripe customer ID
 */
export async function updateUserStripeCustomerId(
  userId: number, 
  stripeCustomerId: string
): Promise<boolean> {
  try {
    await pool.query(
      'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
      [stripeCustomerId, userId]
    );
    
    await logMessage(
      LogLevel.INFO, 
      'StripeDatabase', 
      `Updated Stripe customer ID for user ${userId} to ${stripeCustomerId}`
    );
    
    return true;
  } catch (error) {
    await logMessage(
      LogLevel.ERROR, 
      'StripeDatabase', 
      `Error updating user Stripe customer ID: ${error instanceof Error ? error.message : String(error)}`
    );
    
    return false;
  }
}

/**
 * Get pending commission total for a partner
 * @param partnerId Partner ID
 */
export async function getPartnerPendingCommissionTotal(partnerId: number): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM partner_commissions 
       WHERE partner_id = $1 AND status = $2`,
      [partnerId, CommissionStatus.PENDING]
    );
    
    return parseFloat(result.rows[0].total);
  } catch (error) {
    await logMessage(
      LogLevel.ERROR, 
      'StripeDatabase', 
      `Error getting partner pending commission total: ${error instanceof Error ? error.message : String(error)}`
    );
    
    return 0;
  }
}

/**
 * Update the Stripe customer and subscription IDs for a user
 * @param userId User ID
 * @param data Object containing stripeCustomerId and stripeSubscriptionId
 */
export async function updateUserStripeInfo(
  userId: number, 
  data: { stripeCustomerId: string, stripeSubscriptionId: string }
): Promise<boolean> {
  try {
    await pool.query(
      'UPDATE users SET stripe_customer_id = $1, stripe_subscription_id = $2 WHERE id = $3',
      [data.stripeCustomerId, data.stripeSubscriptionId, userId]
    );
    
    await logMessage(
      LogLevel.INFO, 
      'StripeDatabase', 
      `Updated Stripe info for user ${userId}: customer=${data.stripeCustomerId}, subscription=${data.stripeSubscriptionId}`
    );
    
    return true;
  } catch (error) {
    await logMessage(
      LogLevel.ERROR, 
      'StripeDatabase', 
      `Error updating user Stripe info: ${error instanceof Error ? error.message : String(error)}`
    );
    
    return false;
  }
}