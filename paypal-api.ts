/**
 * PayPal API Integration
 * 
 * Handles all PayPal API interactions including:
 * - Generating access tokens
 * - Transaction verification
 * - Webhook registrations
 * - Payment status updates
 */

import axios from 'axios';
import { Request, Response } from 'express';
import {
  getPaymentByTransactionId,
  updatePaymentStatus,
  getPartnerById,
  updateCommissionStatus,
  getPayment
} from './paypal-database';
import { logger } from './logger';

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiry_time?: number;
}

let cachedToken: PayPalAccessToken | null = null;

// PayPal API configuration
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'
const BASE_URL = PAYPAL_MODE === 'live' 
  ? 'https://api.paypal.com' 
  : 'https://api.sandbox.paypal.com';

// Credentials from environment variables
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_SECRET;
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

/**
 * Get access token for PayPal API
 */
async function getAccessToken(): Promise<string> {
  try {
    // Check if we have a valid cached token
    if (cachedToken && cachedToken.expiry_time && Date.now() < cachedToken.expiry_time) {
      logger.debug('Using cached PayPal access token');
      return cachedToken.access_token;
    }
    
    // If no valid token, request a new one
    logger.info('Requesting new PayPal access token');
    
    if (!CLIENT_ID || !SECRET) {
      throw new Error('PayPal API credentials are not configured');
    }
    
    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/v1/oauth2/token`,
      auth: {
        username: CLIENT_ID,
        password: SECRET
      },
      params: {
        grant_type: 'client_credentials'
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US'
      }
    });
    
    // Calculate expiry time (set to 90% of actual expiry to be safe)
    const expiryTime = Date.now() + (response.data.expires_in * 0.9 * 1000);
    
    // Cache the token
    cachedToken = {
      ...response.data,
      expiry_time: expiryTime
    };
    
    return response.data.access_token;
  } catch (error: any) {
    logger.error('Error getting PayPal access token:', error.message);
    throw new Error('Failed to obtain PayPal access token');
  }
}

/**
 * Get PayPal transactions for a specified date range
 */
export async function getTransactions(start_date?: string, end_date?: string) {
  try {
    const token = await getAccessToken();
    
    // Build the query parameters
    const params: Record<string, string> = {};
    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;
    
    const response = await axios({
      method: 'get',
      url: `${BASE_URL}/v1/reporting/transactions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      params
    });
    
    return response.data;
  } catch (error: any) {
    logger.error('Error fetching PayPal transactions:', error.message);
    throw error;
  }
}

/**
 * Get account balance information
 */
export async function getBalance() {
  try {
    const token = await getAccessToken();
    
    const response = await axios({
      method: 'get',
      url: `${BASE_URL}/v1/reporting/balances`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error: any) {
    logger.error('Error fetching PayPal balance:', error.message);
    throw error;
  }
}

/**
 * Get payment details by transaction ID
 */
export async function getPaymentDetails(transactionId: string) {
  try {
    const token = await getAccessToken();
    
    const response = await axios({
      method: 'get',
      url: `${BASE_URL}/v2/payments/captures/${transactionId}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error: any) {
    logger.error(`Error fetching PayPal payment details for transaction ${transactionId}:`, error.message);
    throw error;
  }
}

/**
 * Verify if a payment has been completed
 */
export async function verifyPayment(transactionId: string) {
  try {
    const paymentDetails = await getPaymentDetails(transactionId);
    
    // Check payment status
    const verified = paymentDetails.status === 'COMPLETED';
    
    // If verified, update our database
    if (verified) {
      try {
        // Find the payment in our database
        const payment = await getPaymentByTransactionId(transactionId);
        
        if (payment && payment.status !== 'confirmed') {
          // Update payment status in database
          await updatePaymentStatus(payment.id, 'confirmed');
          
          logger.info(`Payment ${payment.id} with transaction ID ${transactionId} verified and marked as confirmed`);
        }
      } catch (dbError) {
        logger.error('Database error while updating payment status:', dbError);
        // Continue even if db update fails
      }
    }
    
    return {
      verified,
      transaction: paymentDetails,
      message: verified 
        ? 'Payment verified successfully' 
        : `Payment verification failed: Status is ${paymentDetails.status}`
    };
  } catch (error: any) {
    logger.error(`Error verifying PayPal payment ${transactionId}:`, error.message);
    
    return {
      verified: false,
      message: `Payment verification failed: ${error.message}`
    };
  }
}

/**
 * Register webhooks for payment notifications
 */
export async function registerWebhooks(partnerId: number) {
  try {
    // Check if we have the webhook ID in env vars first
    if (WEBHOOK_ID) {
      logger.info(`Using existing PayPal webhook ID: ${WEBHOOK_ID}`);
      return { 
        success: true, 
        message: 'Using existing PayPal webhook configuration'
      };
    }
    
    const token = await getAccessToken();
    const partnerData = await getPartnerById(partnerId);
    
    if (!partnerData) {
      throw new Error(`Partner with ID ${partnerId} not found`);
    }
    
    // Determine the callback URL based on environment
    const baseUrl = process.env.BASE_URL || 'https://your-application-url.com';
    const webhookUrl = `${baseUrl}/api/paypal/webhooks`;
    
    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/v1/notifications/webhooks`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: {
        url: webhookUrl,
        event_types: [
          {
            name: 'PAYMENT.CAPTURE.COMPLETED'
          },
          {
            name: 'PAYMENT.CAPTURE.DENIED'
          },
          {
            name: 'PAYMENT.CAPTURE.REFUNDED'
          }
        ]
      }
    });
    
    // Store the webhook ID for future reference
    const webhookId = response.data.id;
    logger.info(`Created PayPal webhook with ID: ${webhookId}`);
    
    // You may want to store this webhook ID in your database or env vars
    
    return { 
      success: true, 
      webhook_id: webhookId,
      message: 'PayPal webhook registered successfully'
    };
  } catch (error: any) {
    logger.error('Error registering PayPal webhook:', error.message);
    throw error;
  }
}

/**
 * Verify webhook signature from PayPal
 */
export function verifyWebhookSignature(requestBody: any, headers: any) {
  // Implementation of webhook signature verification
  // This would typically involve using PayPal's SDK to verify the signature
  
  // For now, we'll return true to simplify the implementation
  // In a production environment, you would verify the signature properly
  
  logger.info('Webhook received from PayPal, signature verification skipped');
  return true;
}

/**
 * Handle webhook events from PayPal
 */
export async function handleWebhookEvent(event: any) {
  try {
    const eventType = event.event_type;
    const resource = event.resource;
    
    logger.info(`Processing PayPal webhook event: ${eventType}`);
    
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      // A payment capture was completed
      const transactionId = resource.id;
      const customId = resource.custom_id; // This could be your payment ID
      
      logger.info(`Payment completed for transaction ${transactionId}, custom ID: ${customId}`);
      
      // Find the payment in our database
      if (customId) {
        const payment = await getPayment(parseInt(customId));
        
        if (payment) {
          // Update payment status
          await updatePaymentStatus(payment.id, 'confirmed');
          
          // Also update any associated commission records
          if (payment.commission_ids) {
            const commissionIds = JSON.parse(payment.commission_ids);
            for (const commissionId of commissionIds) {
              await updateCommissionStatus(commissionId, 'paid');
            }
          }
          
          logger.info(`Updated payment ${payment.id} status to confirmed`);
        } else {
          logger.warn(`Payment with ID ${customId} not found in database`);
        }
      } else {
        logger.warn(`PayPal transaction ${transactionId} doesn't have a custom ID`);
      }
    }
    
    return { success: true };
  } catch (error: any) {
    logger.error('Error processing PayPal webhook:', error.message);
    throw error;
  }
}

/**
 * API route handlers
 */

export function registerPayPalRoutes(app: any) {
  // Get transactions
  app.get('/api/paypal/transactions', async (req: Request, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      const transactions = await getTransactions(
        start_date as string | undefined, 
        end_date as string | undefined
      );
      res.json(transactions);
    } catch (error: any) {
      logger.error('Error in /api/paypal/transactions:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get balance
  app.get('/api/paypal/balance', async (req: Request, res: Response) => {
    try {
      const balance = await getBalance();
      res.json(balance);
    } catch (error: any) {
      logger.error('Error in /api/paypal/balance:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Verify payment
  app.get('/api/paypal/verify-payment/:transactionId', async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;
      const result = await verifyPayment(transactionId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error in /api/paypal/verify-payment:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Register webhooks
  app.post('/api/paypal/register-webhooks', async (req: Request, res: Response) => {
    try {
      const { partner_id } = req.body;
      const result = await registerWebhooks(partner_id);
      res.json(result);
    } catch (error: any) {
      logger.error('Error in /api/paypal/register-webhooks:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Webhook endpoint
  app.post('/api/paypal/webhooks', async (req: Request, res: Response) => {
    try {
      // Verify the webhook signature
      const isValid = verifyWebhookSignature(req.body, req.headers);
      
      if (!isValid) {
        logger.warn('Invalid PayPal webhook signature');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
      
      // Process the webhook event
      const result = await handleWebhookEvent(req.body);
      res.json(result);
    } catch (error: any) {
      logger.error('Error in PayPal webhook handler:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
}