/**
 * Phone number utility functions for formatting and validation
 */

/**
 * Formats a phone number to E.164 format for Twilio
 * 
 * @param phoneNumber The phone number to format
 * @returns The formatted phone number in E.164 format (+12125551234)
 * @throws Error if the phone number is invalid or cannot be formatted
 */
export function formatPhoneNumberForTwilio(phoneNumber: string): string {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Clean up the number by removing common formatting characters
  let cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '');

  // Validate and format to E.164
  if (cleaned.startsWith('+')) {
    // Number already has a + prefix, validate that it's a valid E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(cleaned)) {
      throw new Error(`Invalid phone number format. The provided number "${phoneNumber}" is not in a valid international format.`);
    }
    // Already formatted correctly
    return cleaned;
  } else {
    // Add the country code for US/Canada if needed
    if (cleaned.length === 10) {
      // 10 digits, likely a US/Canada number without country code
      cleaned = '+1' + cleaned;
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      // 11 digits starting with 1, likely a US/Canada number with country code but missing +
      cleaned = '+' + cleaned;
    } else {
      throw new Error(`Unable to format phone number "${phoneNumber}" to E.164 format. Please ensure it's a valid number.`);
    }
  }

  // Final validation of the formatted number
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(cleaned)) {
    throw new Error(`Failed to format phone number "${phoneNumber}" to E.164 format.`);
  }

  return cleaned;
}

/**
 * Validates if a phone number is in E.164 format
 * 
 * @param phoneNumber The phone number to validate
 * @returns True if the phone number is in E.164 format, false otherwise
 */
export function isValidE164Format(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Formats a phone number for display in UI
 * 
 * @param phoneNumber The phone number to format
 * @returns The formatted phone number for display
 */
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return '';

  // Strip any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Format to (XXX) XXX-XXXX for US numbers
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6)}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // Format to +1 (XXX) XXX-XXXX for US numbers with country code
    return `+1 (${digitsOnly.substring(1, 4)}) ${digitsOnly.substring(4, 7)}-${digitsOnly.substring(7)}`;
  } else if (phoneNumber.startsWith('+')) {
    // It's already an international format, return as is
    return phoneNumber;
  }
  
  // Return the original if we can't format it
  return phoneNumber;
}