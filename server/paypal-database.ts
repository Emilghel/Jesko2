/**
 * PayPal Database Integration
 * 
 * Database methods for PayPal payment verification and status tracking
 */

import { eq } from 'drizzle-orm';
import { db } from './db';
import {
  partners, partnerPayments, partnerCommissions, 
  PaymentStatus, CommissionStatus
} from '@shared/schema';
import { logger } from './logger';

/**
 * Get payment by transaction ID
 */
export async function getPaymentByTransactionId(transactionId: string) {
  try {
    const [payment] = await db
      .select()
      .from(partnerPayments)
      .where(eq(partnerPayments.transaction_id, transactionId));
    return payment;
  } catch (error) {
    logger.error(`Error getting payment by transaction ID ${transactionId}:`, error);
    return undefined;
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(paymentId: number, status: PaymentStatus) {
  try {
    const [payment] = await db
      .update(partnerPayments)
      .set({ 
        status,
        updated_at: new Date()
      })
      .where(eq(partnerPayments.id, paymentId))
      .returning();
    return payment;
  } catch (error) {
    logger.error(`Error updating payment status for payment ${paymentId}:`, error);
    return undefined;
  }
}

/**
 * Get partner by ID
 */
export async function getPartnerById(partnerId: number) {
  try {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, partnerId));
    return partner;
  } catch (error) {
    logger.error(`Error getting partner by ID ${partnerId}:`, error);
    return undefined;
  }
}

/**
 * Update commission status
 */
export async function updateCommissionStatus(commissionId: number, status: CommissionStatus) {
  try {
    const [commission] = await db
      .update(partnerCommissions)
      .set({ 
        status,
        updated_at: new Date()
      })
      .where(eq(partnerCommissions.id, commissionId))
      .returning();
    return commission;
  } catch (error) {
    logger.error(`Error updating commission status for commission ${commissionId}:`, error);
    return undefined;
  }
}

/**
 * Get payment by ID
 */
export async function getPayment(paymentId: number) {
  try {
    const [payment] = await db
      .select()
      .from(partnerPayments)
      .where(eq(partnerPayments.id, paymentId));
    return payment;
  } catch (error) {
    logger.error(`Error getting payment by ID ${paymentId}:`, error);
    return undefined;
  }
}