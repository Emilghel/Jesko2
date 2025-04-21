import { Request, Response, Router } from 'express';
import { createPayPalOrder, capturePayPalPayment, verifyPayPalPayment, testPayPalCredentials, createPayPalSubscription } from './paypal';
import { log } from '../vite';
import { storage } from '../storage';
import { LogLevel } from '@shared/schema';

// Create a router
const router = Router();

// Route to create a PayPal order
router.post('/create-order', async (req: Request, res: Response) => {
  try {
    // Extract plan details from request body
    const { amount, planId } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // Clean amount value (remove currency symbol and commas)
    const cleanAmount = amount.toString().replace(/[^0-9.]/g, '');
    
    // Create order via PayPal API
    const order = await createPayPalOrder(cleanAmount);
    
    // Store order details for verification later
    // TODO: Add order to database with user ID and plan details
    
    // Log the order creation
    await storage.addLog({
      level: LogLevel.INFO,
      source: 'PayPal',
      message: `Created PayPal order for $${cleanAmount}: ${order.id}`
    });
    
    log(`Created PayPal order: ${order.id}`);
    
    // Return the order details to client
    return res.status(201).json({
      id: order.id,
      status: order.status,
      links: order.links,
    });
  } catch (error: any) {
    console.error('Error creating PayPal order:', error);
    
    // Detailed logging for debugging
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
    }
    
    const errorMessage = error.message || 'Unknown error';
    await storage.addLog({
      level: LogLevel.ERROR,
      source: 'PayPal',
      message: `Failed to create PayPal order: ${errorMessage}`
    });
    
    // Log the request body (without sensitive information)
    console.log('Request body:', { 
      amount: req.body.amount, 
      planId: req.body.planId 
    });
    
    return res.status(500).json({ 
      error: 'Failed to create PayPal order',
      message: errorMessage
    });
  }
});

// Route to capture a payment
router.post('/capture-payment', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Capture the payment via PayPal API
    const captureData = await capturePayPalPayment(orderId);
    
    // Log payment capture
    await storage.addLog({
      level: LogLevel.INFO,
      source: 'PayPal',
      message: `Captured payment for order ${orderId}: ${captureData.status}`
    });
    
    // If user is authenticated, save their subscription information
    if (req.user && 'id' in req.user) {
      // TODO: Update user subscription status
      log(`User ${req.user.id} subscription activated: ${orderId}`);
    }
    
    // Return the capture data to client
    return res.status(200).json({
      status: captureData.status,
      orderId: captureData.id,
      captureId: captureData.purchase_units[0]?.payments?.captures[0]?.id,
    });
  } catch (error: any) {
    console.error('Error capturing PayPal payment:', error);
    
    // Detailed logging for debugging
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
    }
    
    const errorMessage = error.message || 'Unknown error';
    await storage.addLog({
      level: LogLevel.ERROR,
      source: 'PayPal',
      message: `Failed to capture payment: ${errorMessage}`
    });
    
    // Log the request
    console.log('Request body:', { orderId: req.body.orderId });
    
    return res.status(500).json({ 
      error: 'Failed to capture payment',
      message: errorMessage
    });
  }
});

// Route to verify payment
router.get('/verify-payment/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Verify the payment via PayPal API
    const isValid = await verifyPayPalPayment(orderId);
    
    return res.status(200).json({
      isValid,
      orderId,
    });
  } catch (error: any) {
    console.error('Error verifying PayPal payment:', error);
    
    // Detailed logging for debugging
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
    }
    
    const errorMessage = error.message || 'Unknown error';
    await storage.addLog({
      level: LogLevel.ERROR,
      source: 'PayPal',
      message: `Failed to verify payment: ${errorMessage}`
    });
    
    // Log the request parameters
    console.log('Request params:', { orderId: req.params.orderId });
    
    return res.status(500).json({ 
      error: 'Failed to verify payment',
      message: errorMessage
    });
  }
});

// Route to handle payment success
router.get('/payment-success', (req: Request, res: Response) => {
  const { token, PayerID } = req.query;
  
  // Redirect to checkout success page with order details
  res.redirect(`/checkout-success?token=${token}&PayerID=${PayerID}`);
});

// Route to handle payment cancellation
router.get('/payment-cancel', (req: Request, res: Response) => {
  res.redirect('/checkout?cancelled=true');
});

// Route to create a PayPal subscription
router.post('/create-subscription', async (req: Request, res: Response) => {
  try {
    // Extract plan ID from request body
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    
    // Create subscription via PayPal API
    const subscription = await createPayPalSubscription(planId);
    
    // Log the subscription creation
    await storage.addLog({
      level: LogLevel.INFO,
      source: 'PayPal',
      message: `Created PayPal subscription for plan ${planId}: ${subscription.id}`
    });
    
    log(`Created PayPal subscription: ${subscription.id}`);
    
    // Return the subscription details to client
    return res.status(201).json({
      id: subscription.id,
      status: subscription.status,
      links: subscription.links,
    });
  } catch (error: any) {
    console.error('Error creating PayPal subscription:', error);
    
    // Detailed logging for debugging
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
    }
    
    const errorMessage = error.message || 'Unknown error';
    await storage.addLog({
      level: LogLevel.ERROR,
      source: 'PayPal',
      message: `Failed to create PayPal subscription: ${errorMessage}`
    });
    
    // Log the request body (without sensitive information)
    console.log('Request body:', { 
      planId: req.body.planId 
    });
    
    return res.status(500).json({ 
      error: 'Failed to create PayPal subscription',
      message: errorMessage
    });
  }
});

// Route to test PayPal credentials - only accessible in non-production
router.get('/test-credentials', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'This endpoint is not available in production' });
  }
  
  try {
    const result = await testPayPalCredentials();
    
    await storage.addLog({
      level: result.isValid ? LogLevel.INFO : LogLevel.ERROR,
      source: 'PayPal',
      message: `PayPal credentials test: ${result.message}`
    });
    
    return res.status(result.isValid ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('Error testing PayPal credentials:', error);
    
    await storage.addLog({
      level: LogLevel.ERROR,
      source: 'PayPal',
      message: `PayPal credentials test failed: ${error.message || 'Unknown error'}`
    });
    
    return res.status(500).json({ 
      isValid: false,
      message: `Error testing credentials: ${error.message || 'Unknown error'}`
    });
  }
});

export default router;