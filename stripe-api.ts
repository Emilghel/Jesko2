/**
 * Stripe API Integration
 * 
 * This module handles communication with the Stripe API for payments and partner commission processing.
 */

import Stripe from 'stripe';
import { logger } from './logger';
import { LogLevel } from '@shared/schema';

// Private Stripe client instance
let stripeClient: Stripe | null = null;

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
 * Initialize the Stripe client with proper error handling
 */
export function initializeStripe(): boolean {
  try {
    // Ensure we have a secret key
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      console.error('Missing required environment variable: STRIPE_SECRET_KEY');
      return false;
    }
    
    // Create the Stripe client
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });
    
    // Test the client by making a simple request
    stripeClient.balance.retrieve()
      .then(() => {
        console.log('Stripe client initialized successfully');
      })
      .catch((error) => {
        console.error('Failed to initialize Stripe client:', error.message);
        stripeClient = null;
      });
    
    return true;
  } catch (error) {
    console.error('Error initializing Stripe client:', error instanceof Error ? error.message : String(error));
    stripeClient = null;
    return false;
  }
}

/**
 * Get the Stripe client instance
 * If not initialized, attempts to initialize it first
 */
export function getStripeClient(): Stripe | null {
  if (!stripeClient) {
    initializeStripe();
  }
  
  return stripeClient;
}

/**
 * Check if Stripe is available
 */
export function isStripeAvailable(): boolean {
  return stripeClient !== null;
}

/**
 * Create a payment intent for a one-time payment
 * @param amount Amount in dollars (will be converted to cents)
 * @param currency Currency code (defaults to USD)
 * @param metadata Additional metadata to store with the payment
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent | null> {
  try {
    const stripe = getStripeClient();
    
    if (!stripe) {
      await logMessage(LogLevel.ERROR, 'StripeAPI', 'Stripe client not initialized');
      return null;
    }
    
    // Convert dollar amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      metadata: metadata,
    });
    
    await logMessage(LogLevel.INFO, 'StripeAPI', `Created payment intent for $${amount} (${paymentIntent.id})`);
    
    return paymentIntent;
  } catch (error) {
    await logMessage(LogLevel.ERROR, 'StripeAPI', `Error creating payment intent: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Create a Stripe Checkout session for a one-time payment
 * @param amount Amount in dollars
 * @param currency Currency code (defaults to USD)
 * @param successUrl URL to redirect to on successful payment
 * @param cancelUrl URL to redirect to on cancelled payment
 * @param metadata Additional metadata to store with the session
 */
export async function createCheckoutSession(
  amount: number,
  currency: string = 'usd',
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Checkout.Session | null> {
  try {
    const stripe = getStripeClient();
    
    if (!stripe) {
      await logMessage(LogLevel.ERROR, 'StripeAPI', 'Stripe client not initialized');
      return null;
    }
    
    // Convert dollar amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);
    
    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Warm Lead Network Coins',
              description: 'Purchase coins to use on Warm Lead Network',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
    });
    
    await logMessage(LogLevel.INFO, 'StripeAPI', `Created checkout session for $${amount} (${session.id})`);
    
    return session;
  } catch (error) {
    await logMessage(LogLevel.ERROR, 'StripeAPI', `Error creating checkout session: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Create a Stripe Transfer to a connected account (for partner payments)
 * @param amount Amount in dollars
 * @param destinationAccountId Stripe connected account ID of the recipient
 * @param metadata Additional metadata to store with the transfer
 */
export async function createTransfer(
  amount: number,
  destinationAccountId: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Transfer | null> {
  try {
    const stripe = getStripeClient();
    
    if (!stripe) {
      await logMessage(LogLevel.ERROR, 'StripeAPI', 'Stripe client not initialized');
      return null;
    }
    
    // Convert dollar amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);
    
    // Create a transfer
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: destinationAccountId,
      metadata: metadata,
    });
    
    await logMessage(LogLevel.INFO, 'StripeAPI', `Created transfer for $${amount} to ${destinationAccountId} (${transfer.id})`);
    
    return transfer;
  } catch (error) {
    await logMessage(LogLevel.ERROR, 'StripeAPI', `Error creating transfer: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Verify a Stripe webhook signature
 * @param payload The raw webhook payload
 * @param signature The Stripe-Signature header value
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
  try {
    const stripe = getStripeClient();
    
    if (!stripe) {
      console.error('Stripe client not initialized');
      return false;
    }
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Missing required environment variable: STRIPE_WEBHOOK_SECRET');
      return false;
    }
    
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    
    return !!event;
  } catch (error) {
    console.error('Error verifying webhook signature:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Handle a Stripe webhook event
 * @param event The parsed Stripe event
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<boolean> {
  try {
    await logMessage(LogLevel.INFO, 'StripeAPI', `Handling webhook event: ${event.type} (${event.id})`);
    
    // Process the event based on its type
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        await logMessage(LogLevel.INFO, 'StripeAPI', `Payment successful: ${(event.data.object as Stripe.PaymentIntent).id}`);
        break;
        
      case 'payment_intent.payment_failed':
        // Handle failed payment
        await logMessage(LogLevel.WARNING, 'StripeAPI', `Payment failed: ${(event.data.object as Stripe.PaymentIntent).id}`);
        break;
        
      case 'checkout.session.completed':
        // Handle completed checkout session
        await logMessage(LogLevel.INFO, 'StripeAPI', `Checkout completed: ${(event.data.object as Stripe.Checkout.Session).id}`);
        break;
        
      case 'transfer.created':
        // Handle transfer creation
        await logMessage(LogLevel.INFO, 'StripeAPI', `Transfer created: ${(event.data.object as Stripe.Transfer).id}`);
        break;
        
      case 'transfer.failed':
        // Handle failed transfer
        await logMessage(LogLevel.WARNING, 'StripeAPI', `Transfer failed: ${(event.data.object as Stripe.Transfer).id}`);
        break;
        
      default:
        // Log unhandled event type
        await logMessage(LogLevel.INFO, 'StripeAPI', `Unhandled event type: ${event.type}`);
        break;
    }
    
    return true;
  } catch (error) {
    await logMessage(LogLevel.ERROR, 'StripeAPI', `Error handling webhook event: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}