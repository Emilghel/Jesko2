/**
 * Authentication Utility Functions
 * 
 * This module provides consistent authentication token handling across the application.
 * It supports both localStorage-based token storage (legacy) and cookie-based token access.
 */

// Token configuration
export const TOKEN_KEY = 'auth_token';
export const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

/**
 * Extracts the authentication token from available sources
 * Prioritizes cookies over localStorage for better security
 * 
 * @returns The authentication token or null if not found
 */
export function getAuthToken(): string | null {
  // First try to get token from cookies (more secure)
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === TOKEN_KEY) {
      return decodeURIComponent(value);
    }
  }
  
  // Fallback to localStorage (legacy support)
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Sets the authentication headers for API requests
 * 
 * @param headers The headers object to modify
 * @returns The updated headers object with authentication if available
 */
export function setAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Stores the authentication token
 * Saves to both localStorage and as a cookie for broader compatibility
 * 
 * @param token The token to store
 * @param expiresAt Optional expiration date
 */
export function storeAuthToken(token: string | null, expiresAt?: Date): void {
  if (token) {
    // Store in localStorage (legacy)
    localStorage.setItem(TOKEN_KEY, token);
    
    if (expiresAt) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toISOString());
      
      // Set cookie with expiration
      document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`;
    } else {
      // Set cookie without explicit expiration (session cookie)
      document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
    }
  } else {
    // Clear token from all storages
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  }
}

/**
 * Checks if the user is authenticated based on token presence
 * 
 * @returns True if an authentication token exists
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Clears all authentication data
 */
export function clearAuthData(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem('auth_user');
  document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}