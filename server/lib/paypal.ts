import axios from 'axios';

// PayPal API base URLs
// For sandbox testing environment
const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com';
// For production environment 
const PAYPAL_LIVE_URL = 'https://api-m.paypal.com';
// Default to sandbox unless specified otherwise
const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === 'live' ? PAYPAL_LIVE_URL : PAYPAL_SANDBOX_URL;

// Debug flag for detailed logging
const DEBUG_PAYPAL = true;

// Helper function to get the base URL for PayPal redirects
function getBaseUrl(): string {
  // In development, use the Replit URL from environment variable or localhost
  if (process.env.NODE_ENV !== 'production') {
    return process.env.REPLIT_URL 
      ? `https://${process.env.REPLIT_URL}` 
      : 'http://localhost:5000';
  }
  
  // In production, use the configured host URL or default to main domain
  return process.env.HOST_URL || 'https://warmleadnetwork.com';
}

// Function to test PayPal credentials
// Interface for PayPal test result
interface PayPalTestResult {
  isValid: boolean;
  message: string;
  details?: any;
}

export async function testPayPalCredentials(): Promise<PayPalTestResult> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
  const currentUrl = PAYPAL_BASE_URL;
  
  console.log('Testing PayPal credentials...');
  console.log('Client ID length:', clientId ? clientId.length : 'not set');
  console.log('Client Secret length:', clientSecret ? clientSecret.length : 'not set');
  console.log('PayPal mode:', paypalMode);
  console.log('Using API URL:', currentUrl);
  
  if (!clientId || !clientSecret) {
    return {
      isValid: false,
      message: 'PayPal credentials not configured',
      details: {
        clientIdSet: !!clientId,
        clientSecretSet: !!clientSecret,
        paypalMode
      }
    };
  }
  
  try {
    // Mask credentials for logging
    const maskedClientId = clientId.substring(0, 4) + '...' + clientId.substring(clientId.length - 4);
    console.log('Using client ID:', maskedClientId);
    
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );
    
    return {
      isValid: true,
      message: `Successfully authenticated with PayPal (${paypalMode} mode). Token expires in ${response.data.expires_in} seconds.`,
      details: {
        tokenExpiresIn: response.data.expires_in,
        appId: response.data.app_id,
        paypalMode,
        apiUrl: currentUrl
      }
    };
  } catch (error: any) {
    console.error('Error testing PayPal credentials:', error);
    
    // Create an interface to define the error details structure
    interface PayPalErrorDetails {
      paypalMode: string;
      apiUrl: string;
      errorMessage: string;
      status?: number;
      responseData?: any;
    }
    
    let errorDetails: PayPalErrorDetails = {
      paypalMode,
      apiUrl: currentUrl,
      errorMessage: error.message || 'Unknown error'
    };
    
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
      
      errorDetails = {
        ...errorDetails,
        status: error.response.status,
        responseData: error.response.data
      };
      
      // Handle specific error cases
      if (error.response.status === 401) {
        if (error.response.data?.error === 'invalid_client') {
          return {
            isValid: false,
            message: `PayPal authentication failed: Client credentials are invalid for ${paypalMode} mode. Please check your PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.`,
            details: errorDetails
          };
        }
      }
    }
    
    return {
      isValid: false,
      message: `Failed to authenticate with PayPal: ${error.message || 'Unknown error'}`,
      details: errorDetails
    };
  }
}

// Interface for PayPal auth response
interface PayPalAuthResponse {
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  nonce: string;
}

// Interface for order creation
interface PayPalOrderCreationResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

// Get PayPal access token
export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post<PayPalAuthResponse>(
      `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );
    
    return response.data.access_token;
  } catch (error: any) {
    console.error('Error getting PayPal access token:', error);
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
    }
    throw new Error(`Failed to authenticate with PayPal: ${error.message || 'Unknown error'}`);
  }
}

// Create a PayPal order
export async function createPayPalOrder(amount: string, currency: string = 'USD'): Promise<PayPalOrderCreationResponse> {
  const accessToken = await getPayPalAccessToken();
  
  try {
    const response = await axios.post<PayPalOrderCreationResponse>(
      `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount
            }
          }
        ],
        application_context: {
          return_url: `${getBaseUrl()}/api/paypal/payment-success`,
          cancel_url: `${getBaseUrl()}/api/paypal/payment-cancel`
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Error creating PayPal order:', error);
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
    }
    throw new Error(`Failed to create PayPal order: ${error.message || 'Unknown error'}`);
  }
}

// Capture a PayPal payment
export async function capturePayPalPayment(orderId: string): Promise<any> {
  const accessToken = await getPayPalAccessToken();
  
  try {
    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Error capturing PayPal payment:', error);
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
    }
    throw new Error(`Failed to capture PayPal payment: ${error.message || 'Unknown error'}`);
  }
}

// Verify a PayPal payment
export async function verifyPayPalPayment(orderId: string): Promise<boolean> {
  const accessToken = await getPayPalAccessToken();
  
  try {
    const response = await axios.get(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const data = response.data;
    return data.status === 'COMPLETED' || data.status === 'APPROVED';
  } catch (error: any) {
    console.error('Error verifying PayPal payment:', error);
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
    }
    throw new Error(`Failed to verify PayPal payment: ${error.message || 'Unknown error'}`);
  }
}

// Create a subscription
export async function createPayPalSubscription(planId: string): Promise<any> {
  const accessToken = await getPayPalAccessToken();
  
  try {
    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions`,
      {
        plan_id: planId,
        application_context: {
          return_url: `${getBaseUrl()}/api/paypal/payment-success`,
          cancel_url: `${getBaseUrl()}/api/paypal/payment-cancel`
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Error creating PayPal subscription:', error);
    if (error.response) {
      console.error('PayPal API response status:', error.response.status);
      console.error('PayPal API response data:', error.response.data);
    }
    throw new Error(`Failed to create PayPal subscription: ${error.message || 'Unknown error'}`);
  }
}