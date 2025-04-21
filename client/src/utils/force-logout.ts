// Force logout by clearing all auth data from localStorage
export function forceLogout(): void {
  // Clear token
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_token_expiry');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('last_successful_auth_endpoint');
  localStorage.removeItem('last_login_timestamp');
  localStorage.removeItem('last_registration_timestamp');
  
  // Reload to reset app state
  window.location.href = '/auth';
}