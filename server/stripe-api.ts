import Stripe from 'stripe';
import { Request, Response } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Simple type for authenticated user with required fields for payment processing
interface AuthUser {
  id: number | string;
  coins?: number;
  username?: string;
  email?: string;
}

// Extend Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

let stripe: Stripe | null = null;

/**
 * Initialize the Stripe API client
 */
export function initializeStripe(): boolean {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing required Stripe secret: STRIPE_SECRET_KEY');
      return false;
    }
    
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return false;
  }
}

// Initialize Stripe on module load
initializeStripe();

/**
 * Creates a Stripe payment intent for token purchase
 */
export async function createTokenPaymentIntent(req: Request, res: Response) {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe API not initialized' });
    }
    
    const { amount, package_id, token_amount } = req.body;
    
    if (!amount || !token_amount) {
      return res.status(400).json({ error: 'Missing required parameters: amount or token_amount' });
    }

    // Make sure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'You must be logged in to purchase tokens' });
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: 'usd',
      metadata: {
        userId: req.user.id.toString(),
        tokenAmount: token_amount.toString(),
        packageId: package_id || 'custom',
        type: 'token_purchase'
      }
    });

    // Return the client secret to the client
    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Creates a subscription payment intent
 */
export async function createSubscriptionPaymentIntent(req: Request, res: Response) {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe API not initialized' });
    }
    
    const { package_id } = req.body;
    
    if (!package_id) {
      return res.status(400).json({ error: 'Missing required parameter: package_id' });
    }

    // Make sure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'You must be logged in to subscribe to a plan' });
    }

    // Define pricing for each package
    const packagePrices: Record<string, number> = {
      'jesko-ai-starter': 18,
      'jesko-ai-standard': 49,
      'jesko-ai-pro': 98,
      'jesko-ai-enterprise': 499
    };

    const amount = packagePrices[package_id];
    if (!amount) {
      return res.status(400).json({ error: 'Invalid package_id' });
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: 'usd',
      metadata: {
        userId: req.user.id.toString(),
        packageId: package_id,
        type: 'subscription'
      }
    });

    // Return the client secret to the client
    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error: any) {
    console.error('Error creating subscription payment intent:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Verify payment success and add tokens or activate subscription
 */
export async function verifyPayment(req: Request, res: Response) {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe API not initialized' });
    }
    
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing payment intent ID' });
    }

    // Make sure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'You must be logged in to verify payment' });
    }

    // Retrieve the payment intent to verify it's successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment not successful', 
        status: paymentIntent.status 
      });
    }

    // Check if payment is for this user
    if (paymentIntent.metadata.userId !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Unauthorized payment verification' });
    }

    // Check payment type and process accordingly
    if (paymentIntent.metadata.type === 'token_purchase') {
      // Add tokens to user's account
      const tokenAmount = parseInt(paymentIntent.metadata.tokenAmount, 10);
      
      // Update user's token balance
      const [updatedUser] = await db
        .update(users)
        .set({ 
          coins: (req.user.coins || 0) + tokenAmount 
        })
        .where(eq(users.id, req.user.id))
        .returning();

      return res.json({ 
        success: true, 
        message: `Successfully purchased ${tokenAmount} tokens!`,
        newBalance: updatedUser.coins 
      });
    } 
    else if (paymentIntent.metadata.type === 'subscription') {
      // Process subscription
      const packageId = paymentIntent.metadata.packageId;
      
      // Here we would typically update the user's subscription status
      // For now, just return success message
      return res.json({ 
        success: true, 
        message: `Successfully subscribed to ${packageId} plan!` 
      });
    }
    
    return res.status(400).json({ error: 'Unknown payment type' });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Webhook handler for Stripe events
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe API not initialized' });
  }
  
  const sig = req.headers['stripe-signature'];
  
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing stripe signature or webhook secret' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Process successful payment
      console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
      // Here you would add code to update user's tokens or subscription
      break;
    
    case 'payment_intent.payment_failed':
      console.log(`Payment failed: ${event.data.object.id}`);
      break;

    // Add more event handlers as needed

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send({ received: true });
}