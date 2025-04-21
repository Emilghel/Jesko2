/**
 * Stripe API Route Handlers
 * 
 * This module handles all Stripe-related API routes including payment processing,
 * webhook handling, and partner commission management.
 */

import express, { Request, Response, Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from './lib/request-validator';
import { isAuthenticated } from './lib/auth-simple';
import { isAdmin, isPartner } from './lib/auth-helpers';
import { 
  createPaymentIntent, 
  createCheckoutSession,
  createTransfer,
  verifyWebhookSignature,
  handleWebhookEvent
} from './stripe-api';
import {
  recordStripePayment,
  recordPartnerPayment,
  updatePartnerStripeAccount,
  getUserStripeCustomerId,
  updateUserStripeCustomerId,
  getPartnerPendingCommissionTotal,
  updateUserStripeInfo
} from './stripe-database';
import { User } from '@shared/schema';
import { storage } from './storage';

const router = Router();

// Middleware to verify Stripe is properly initialized
const verifyStripeAvailable = (req: Request, res: Response, next: express.NextFunction) => {
  const { isStripeAvailable } = require('./stripe-api');
  
  if (!isStripeAvailable()) {
    return res.status(503).json({ 
      error: 'Stripe payment processing is temporarily unavailable.' 
    });
  }
  
  next();
};

// Create a payment intent (client-side payment processing)
router.post(
  '/create-payment-intent',
  isAuthenticated,
  verifyStripeAvailable,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('description').isString().optional(),
    body('currency').isString().optional(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const { amount, description = 'Coin purchase', currency = 'usd' } = req.body;
      
      // Create a payment intent
      const paymentIntent = await createPaymentIntent(
        amount, 
        currency,
        {
          userId: user.id.toString(),
          userEmail: user.email || '',
          description
        }
      );
      
      if (!paymentIntent) {
        return res.status(500).json({ error: 'Failed to create payment intent' });
      }
      
      // Return the client secret to the client
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency: currency
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ 
        error: 'Failed to process payment request',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Create a checkout session (Stripe-hosted payment page)
router.post(
  '/create-checkout-session',
  isAuthenticated,
  verifyStripeAvailable,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('successUrl').isURL().withMessage('Valid success URL is required'),
    body('cancelUrl').isURL().withMessage('Valid cancel URL is required'),
    body('description').isString().optional(),
    body('currency').isString().optional(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const { 
        amount, 
        successUrl, 
        cancelUrl, 
        description = 'Coin purchase', 
        currency = 'usd' 
      } = req.body;
      
      // Create a checkout session
      const session = await createCheckoutSession(
        amount, 
        currency,
        successUrl,
        cancelUrl,
        {
          userId: user.id.toString(),
          userEmail: user.email || '',
          description
        }
      );
      
      if (!session) {
        return res.status(500).json({ error: 'Failed to create checkout session' });
      }
      
      // Return the session ID and URL to the client
      res.json({ 
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ 
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe signature header' });
    }
    
    // Verify the webhook signature
    const isValid = verifyWebhookSignature(req.body, signature);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    // Parse the webhook payload
    const event = JSON.parse(req.body.toString());
    
    // Handle the webhook event
    const success = await handleWebhookEvent(event);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to process webhook event' });
    }
    
    // Return a success response to Stripe
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    res.status(500).json({ 
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update Stripe account ID for partners (admin only)
router.post(
  '/partners/:partnerId/update-account',
  isAuthenticated,
  isAdmin,
  [
    body('stripeAccountId').isString().withMessage('Stripe account ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      const { stripeAccountId } = req.body;
      
      if (isNaN(partnerId)) {
        return res.status(400).json({ error: 'Invalid partner ID' });
      }
      
      // Update the partner's Stripe account ID
      const success = await updatePartnerStripeAccount(partnerId, stripeAccountId);
      
      if (!success) {
        return res.status(500).json({ error: 'Failed to update Stripe account ID' });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating partner Stripe account:', error);
      res.status(500).json({ 
        error: 'Failed to update Stripe account',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Pay a partner using Stripe (admin only)
router.post(
  '/partners/:partnerId/pay',
  isAuthenticated,
  isAdmin,
  verifyStripeAvailable,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('notes').isString().optional(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      const { amount, notes = '' } = req.body;
      
      if (isNaN(partnerId)) {
        return res.status(400).json({ error: 'Invalid partner ID' });
      }
      
      // Get the partner details
      const partner = await storage.getPartner(partnerId);
      
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      
      if (!partner.stripe_account_id) {
        return res.status(400).json({ error: 'Partner does not have a Stripe account connected' });
      }
      
      // Create a Stripe transfer
      const transfer = await createTransfer(
        amount, 
        partner.stripe_account_id,
        {
          partnerId: partnerId.toString(),
          partnerEmail: partner.email || ''
        }
      );
      
      if (!transfer) {
        return res.status(500).json({ error: 'Failed to create Stripe transfer' });
      }
      
      // Record the payment in the database
      const success = await recordPartnerPayment(
        partnerId, 
        amount, 
        transfer.id, 
        notes
      );
      
      if (!success) {
        return res.status(500).json({ error: 'Failed to record partner payment' });
      }
      
      res.status(200).json({ 
        success: true,
        transferId: transfer.id
      });
    } catch (error) {
      console.error('Error paying partner via Stripe:', error);
      res.status(500).json({ 
        error: 'Failed to pay partner',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get partner's Stripe account status (partner or admin)
router.get(
  '/partners/:partnerId/account-status',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      const user = req.user as User;
      
      if (isNaN(partnerId)) {
        return res.status(400).json({ error: 'Invalid partner ID' });
      }
      
      // Check if the user is an admin or the partner themselves
      const isUserAdmin = await isAdmin(user.id);
      const isUserPartner = await isPartner(user.id);
      const userPartner = isUserPartner ? await storage.getPartnerByUserId(user.id) : null;
      
      if (!isUserAdmin && (!userPartner || userPartner.id !== partnerId)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      // Get the partner details
      const partner = await storage.getPartner(partnerId);
      
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      
      res.json({
        hasStripeAccount: !!partner.stripe_account_id,
        pendingCommissionTotal: await getPartnerPendingCommissionTotal(partnerId)
      });
    } catch (error) {
      console.error('Error getting partner Stripe account status:', error);
      res.status(500).json({ 
        error: 'Failed to get account status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Special route to create or get a subscription for a user (for recurring payments)
router.post(
  '/get-or-create-subscription',
  isAuthenticated,
  verifyStripeAvailable,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      
      // Check if the user already has a subscription
      if (user.stripe_subscription_id) {
        // Get the Stripe client directly to use in this function
        const { getStripeClient } = require('./stripe-api');
        const stripe = getStripeClient();
        
        if (!stripe) {
          return res.status(503).json({ error: 'Stripe service unavailable' });
        }
        
        // Retrieve the subscription
        const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
        
        // Return subscription details
        return res.status(200).json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret || null
        });
      }
      
      if (!user.email) {
        return res.status(400).json({ error: 'User email is required for subscription' });
      }
      
      // Get the Stripe client directly to use in this function
      const { getStripeClient } = require('./stripe-api');
      const stripe = getStripeClient();
      
      if (!stripe) {
        return res.status(503).json({ error: 'Stripe service unavailable' });
      }
      
      // Create a new customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username || user.email
      });
      
      // Get the price ID
      const priceId = process.env.STRIPE_PRICE_ID;
      
      if (!priceId) {
        return res.status(503).json({ error: 'Subscription price not configured' });
      }
      
      // Create a subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      });
      
      // Update the user's Stripe info
      await updateUserStripeInfo(user.id, {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id
      });
      
      // Return the client secret
      res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret || null
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ 
        error: 'Failed to create subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;