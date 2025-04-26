import { Router } from 'express';
import { createTokenPaymentIntent, createSubscriptionPaymentIntent, verifyPayment, handleStripeWebhook } from './stripe-api';
import { isAuthenticated } from './lib/auth-simple';

const router = Router();

// Endpoints requiring authentication
router.post('/create-token-payment-intent', isAuthenticated, createTokenPaymentIntent);
router.post('/create-subscription-payment-intent', isAuthenticated, createSubscriptionPaymentIntent);
router.post('/verify-payment', isAuthenticated, verifyPayment);

// Webhook endpoint (doesn't require authentication)
router.post('/webhook', handleStripeWebhook);

export default router;