import { loadStripe, Stripe } from '@stripe/stripe-js';
import { apiRequest } from './queryClient';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    // Check for Stripe public key in environment
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      console.error('Missing Stripe public key: VITE_STRIPE_PUBLIC_KEY');
      return null;
    }
    
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);
  }
  return stripePromise;
};

// API helper for Payment Intents
export const createTokenPaymentIntent = async (amount: number, package_id: string, token_amount: number) => {
  try {
    // Use apiRequest which handles authentication and CSRF tokens
    const response = await apiRequest(
      'POST',
      '/api/stripe/create-token-payment-intent',
      { amount, package_id, token_amount }
    );
    
    return await response.json();
  } catch (error) {
    console.error('Error creating token payment intent:', error);
    throw error;
  }
};

// API helper for Subscription Payment Intents
export const createSubscriptionPaymentIntent = async (package_id: string) => {
  try {
    // Use apiRequest which handles authentication and CSRF tokens
    const response = await apiRequest(
      'POST',
      '/api/stripe/create-subscription-payment-intent',
      { package_id }
    );
    
    return await response.json();
  } catch (error) {
    console.error('Error creating subscription payment intent:', error);
    throw error;
  }
};

// API helper for Payment Verification
export const verifyPayment = async (paymentIntentId: string) => {
  try {
    // Use apiRequest which handles authentication and CSRF tokens
    const response = await apiRequest(
      'POST',
      '/api/stripe/verify-payment',
      { paymentIntentId }
    );
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};