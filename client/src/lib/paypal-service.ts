/**
 * PayPal API Service
 * 
 * Provides integration with PayPal's API for payment verification and transactions
 */

import { apiRequest } from '@/lib/queryClient';

/**
 * PayPal transaction interface
 */
export interface PayPalTransaction {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'FAILED';
  amount: {
    value: string;
    currency_code: string;
  };
  create_time: string;
  update_time: string;
  payee: {
    email_address: string;
    merchant_id?: string;
  };
  payer: {
    email_address: string;
  };
  custom_id?: string;
  reference_id?: string;
}

/**
 * PayPal webhook event interface
 */
export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  create_time: string;
  resource_type: string;
  resource: PayPalTransaction;
  summary: string;
}

/**
 * PayPal balance interface
 */
export interface PayPalBalance {
  available: {
    currency: string;
    value: string;
  }[];
  pending: {
    currency: string;
    value: string;
  }[];
}

/**
 * PayPal service for interacting with the PayPal API
 */
export const paypalService = {
  /**
   * Get transactions from PayPal
   * @param start_date Start date for transaction search (ISO format)
   * @param end_date End date for transaction search (ISO format)
   */
  async getTransactions(start_date?: string, end_date?: string): Promise<PayPalTransaction[]> {
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    
    const response = await apiRequest(
      'GET', 
      `/api/paypal/transactions?${params.toString()}`
    );
    const data = await response.json();
    return data.transaction_details || [];
  },
  
  /**
   * Get account balance from PayPal
   */
  async getBalance(): Promise<PayPalBalance> {
    const response = await apiRequest('GET', '/api/paypal/balance');
    return await response.json();
  },
  
  /**
   * Verify if a specific payment was received
   * @param transaction_id The transaction ID to verify
   */
  async verifyPayment(transaction_id: string): Promise<{
    verified: boolean;
    message: string;
    transaction?: PayPalTransaction;
  }> {
    const response = await apiRequest(
      'GET', 
      `/api/paypal/verify-payment/${transaction_id}`
    );
    return await response.json();
  },
  
  /**
   * Register to receive webhook notifications for a partner
   * @param partner_id The partner ID to register webhooks for
   */
  async registerWebhooks(partner_id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest(
      'POST', 
      '/api/paypal/register-webhooks',
      { partner_id }
    );
    return await response.json();
  }
};