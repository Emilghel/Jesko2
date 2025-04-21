/**
 * Client-side AJAX utility functions
 */

import { apiRequest } from './queryClient';

/**
 * Check if the specified secrets exist in the server environment
 * This checks for availability without exposing the actual values
 * 
 * @param secretKeys Array of secret keys to check
 * @returns Array of objects with key and exists properties
 */
export async function check_secrets(secretKeys: string[]): Promise<Array<{key: string, exists: boolean}>> {
  try {
    const response = await apiRequest('POST', '/api/check-secrets', { secretKeys });
    const data = await response.json();
    return data.secrets;
  } catch (error) {
    console.error('Error checking secrets:', error);
    // If there's an error, assume secrets don't exist
    return secretKeys.map(key => ({ key, exists: false }));
  }
}