/**
 * Discount Code System
 * 
 * This module provides functionality for managing and applying discount codes
 * to coin purchases within the platform.
 */

// Types of discount
type DiscountType = 'percentage' | 'fixed';

// Interface for discount code
interface DiscountCode {
  code: string;
  type: DiscountType;
  amount: number;  // For percentage, this is a value between 0-100. For fixed, it's the coin amount.
  expiryDate: Date | null;  // null means no expiry
  active: boolean;
  usageLimit: number | null;  // null means unlimited uses
  currentUses: number;
}

// Static list of available discount codes
// In a production app, this would be fetched from a database
const discountCodes: DiscountCode[] = [
  {
    code: 'WELCOME10',
    type: 'percentage',
    amount: 10, // 10% off
    expiryDate: new Date('2025-12-31'), // Valid until end of 2025
    active: true,
    usageLimit: 1, // One-time use per user
    currentUses: 0
  },
  {
    code: 'SUMMER2025',
    type: 'percentage',
    amount: 15, // 15% off
    expiryDate: new Date('2025-08-31'), // Valid until end of summer 2025
    active: true,
    usageLimit: null, // Unlimited uses
    currentUses: 0
  },
  {
    code: 'VIDEOFEST',
    type: 'fixed',
    amount: 50, // 50 free coins
    expiryDate: new Date('2025-07-31'),
    active: true,
    usageLimit: 1,
    currentUses: 0
  },
  {
    code: 'MAGIC10',
    type: 'percentage',
    amount: 10, // 10% off
    expiryDate: null, // Never expires
    active: true,
    usageLimit: null, // Unlimited uses
    currentUses: 0
  },
  {
    code: 'NEWACC20',
    type: 'percentage',
    amount: 20, // 20% off
    expiryDate: null, // Never expires
    active: true,
    usageLimit: 1, // One-time use
    currentUses: 0
  }
];

/**
 * Validate and apply a discount code
 * @param code The discount code to apply
 * @param baseAmount The base coin amount to apply the discount to
 * @returns Object containing success status, discounted amount, and message
 */
export function applyDiscountCode(code: string, baseAmount: number) {
  // Make sure the code is uppercase for consistency
  const upperCode = code.toUpperCase();
  
  // Find the discount code
  const discount = discountCodes.find(dc => dc.code === upperCode);
  
  // If code doesn't exist
  if (!discount) {
    return {
      success: false,
      message: 'Invalid discount code',
      amount: baseAmount,
      discount: 0
    };
  }
  
  // Check if the code is active
  if (!discount.active) {
    return {
      success: false,
      message: 'This discount code is no longer active',
      amount: baseAmount,
      discount: 0
    };
  }
  
  // Check if the code has expired
  if (discount.expiryDate && new Date() > discount.expiryDate) {
    return {
      success: false,
      message: 'This discount code has expired',
      amount: baseAmount,
      discount: 0
    };
  }
  
  // Check if the code has reached its usage limit
  if (discount.usageLimit !== null && discount.currentUses >= discount.usageLimit) {
    return {
      success: false,
      message: 'This discount code has reached its usage limit',
      amount: baseAmount,
      discount: 0
    };
  }
  
  // Calculate the discounted amount
  let finalAmount: number;
  let discountAmount: number;
  
  if (discount.type === 'percentage') {
    // For percentage discounts, calculate the amount to deduct
    discountAmount = Math.round((discount.amount / 100) * baseAmount);
    finalAmount = baseAmount - discountAmount;
  } else {
    // For fixed discounts, subtract the fixed amount
    discountAmount = discount.amount;
    finalAmount = baseAmount + discountAmount; // Adding because it's free coins
  }
  
  // Prevent negative amounts (in case of very high fixed discounts)
  finalAmount = Math.max(finalAmount, 0);
  
  // Increment usage counter
  discount.currentUses++;
  
  // Generate appropriate message based on discount type
  let message = '';
  if (discount.type === 'percentage') {
    message = `${discount.amount}% discount applied`;
  } else {
    message = `${discount.amount} free coins added`;
  }
  
  return {
    success: true,
    message,
    amount: finalAmount, 
    discount: discountAmount
  };
}

/**
 * Check if a discount code is valid without applying it
 * @param code The discount code to check
 * @returns Information about the discount code
 */
export function checkDiscountCode(code: string) {
  // Make sure the code is uppercase for consistency
  const upperCode = code.toUpperCase();
  
  // Find the discount code
  const discount = discountCodes.find(dc => dc.code === upperCode);
  
  // If code doesn't exist
  if (!discount) {
    return {
      success: false,
      message: 'Invalid discount code',
      valid: false
    };
  }
  
  // Check if the code is active
  if (!discount.active) {
    return {
      success: false,
      message: 'This discount code is no longer active',
      valid: false
    };
  }
  
  // Check if the code has expired
  if (discount.expiryDate && new Date() > discount.expiryDate) {
    return {
      success: false,
      message: 'This discount code has expired',
      valid: false
    };
  }
  
  // Check if the code has reached its usage limit
  if (discount.usageLimit !== null && discount.currentUses >= discount.usageLimit) {
    return {
      success: false,
      message: 'This discount code has reached its usage limit',
      valid: false
    };
  }
  
  // Generate description based on discount type
  let description = '';
  if (discount.type === 'percentage') {
    description = `${discount.amount}% discount on your purchase`;
  } else {
    description = `${discount.amount} free coins`;
  }
  
  return {
    success: true,
    message: 'Valid discount code',
    valid: true,
    description,
    type: discount.type,
    amount: discount.amount
  };
}