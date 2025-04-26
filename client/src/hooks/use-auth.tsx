import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import axios from "axios";
import { apiRequest } from "../lib/queryClient";

// Configure axios defaults
// Instead of using relative URLs, use absolute URLs to ensure that requests work in all environments
const getBaseURL = () => {
  // Always use the current origin to avoid routing issues
  // This ensures compatibility with any Replit URL/domain
  return window.location.origin;
};

axios.defaults.baseURL = getBaseURL();

// Make axios available in the window object for consistent access
// This is particularly useful for authentication token refreshes
window.axios = axios;

// Token-based auth helpers
const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

// Helper to set auth token in localStorage and headers
const setAuthToken = (token: string | null, expiresAt?: Date) => {
  if (token) {
    console.log(`Setting ${TOKEN_KEY} in localStorage (first 10 chars): ${token.substring(0, 10)}...`);
    
    try {
      // Explicit removal before setting to avoid any caching issues
      localStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(TOKEN_KEY, token);
      
      // Verify token was set correctly
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken !== token) {
        console.warn(`Token storage verification failed: stored value (${storedToken?.substring(0, 10)}...) doesn't match provided token`);
        // Try a direct approach as fallback
        window.localStorage.setItem(TOKEN_KEY, token);
      }
      
      if (expiresAt) {
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toISOString());
      }
      
      // Set the token for API requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log("Auth token set successfully in localStorage and axios headers");
    } catch (error) {
      console.error("Error setting auth token:", error);
    }
  } else {
    console.log("Removing auth token from localStorage and axios headers");
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    delete axios.defaults.headers.common['Authorization'];
  }
}

// Function to register current token with server when app starts
async function registerStoredTokenWithServer() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      // Extract user ID from token if possible (JWT format)
      let userId = null;
      try {
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userId = userData.id;
        }
      } catch (e) {
        console.error('Failed to parse stored user data', e);
      }
      
      // Only register if we have a user ID
      if (userId) {
        console.log('Registering stored token with server for user ID:', userId);
        await axios.post('/api/auth/register-token', {
          token,
          userId
        });
        console.log('Token successfully registered with server');
      }
    } catch (err) {
      console.error('Failed to register token with server:', err);
    }
  }
}

// Function to initialize token from localStorage
const initializeStoredToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiryStr) {
      const expiry = new Date(expiryStr);
      if (expiry > new Date()) {
        // Token is still valid
        setAuthToken(token);
        // Try to register this token with the server
        registerStoredTokenWithServer();
      } else {
        // Token has expired, clear it
        setAuthToken(null);
      }
    } else {
      // No expiry found, set the token anyway
      setAuthToken(token);
      // Still try to register with server
      registerStoredTokenWithServer();
    }
  }
};

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  is_admin: boolean;
  profession?: string | null; // Profession for character selection
  role?: string; // Role can be 'admin', 'partner', 'user', etc.
  is_partner?: boolean; // Explicit flag for partner status
  token?: string; // Optional token property for authentication
  expiresAt?: string; // Optional token expiration date
  createdAt?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  partnerLogin: (email: string, password: string) => Promise<any>; // Allow any return type
  handleGoogleAuth: () => void; // Add Google authentication handler
  isPartner?: () => boolean; // Added optional isPartner helper
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  phoneNumber?: string;
  role?: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize stored token and check authentication on mount
  useEffect(() => {
    // First initialize stored token from localStorage
    initializeStoredToken();
    
    // Then attempt to authenticate with the server
    checkAuth().catch(err => {
      console.error("Initial auth check failed:", err);
    });
  }, []);

  const checkAuth = async (): Promise<void> => {
    setIsLoading(true);
    try {
      console.log("Checking auth status...");
      // Check if we have a token in localStorage
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (!token) {
        console.log("No token found in localStorage");
        setUser(null);
        return Promise.reject(new Error("No authentication token found"));
      }
      
      // Check if the token has expired
      const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
      if (expiryStr) {
        const expiry = new Date(expiryStr);
        if (expiry <= new Date()) {
          console.log("Token has expired");
          setAuthToken(null);
          setUser(null);
          localStorage.removeItem('auth_user');
          return Promise.reject(new Error("Authentication token has expired"));
        }
      }
      
      // Try multiple endpoints for better compatibility
      const endpoints = ["/api/auth/me", "/api/auth/user"];
      let userDataFetched = false;
      let lastError = new Error("All authentication endpoints failed");
      
      for (const endpoint of endpoints) {
        if (userDataFetched) break;
        
        try {
          console.log(`Trying auth endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, { 
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            } 
          });
          
          if (!response.ok) {
            throw new Error(`Auth check failed with status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log(`Auth check successful from ${endpoint}:`, data);
          
          // Create user object with token
          const userWithToken = {
            ...data,
            token: token,
            expiresAt: expiryStr
          };
          
          // Store user data in localStorage for later token registration
          localStorage.setItem('auth_user', JSON.stringify(userWithToken));
          
          // Set the user data in state
          setUser(userWithToken);
          
          userDataFetched = true;
          
          // Store the successful endpoint for future reference
          localStorage.setItem('last_successful_auth_endpoint', endpoint);
          return Promise.resolve(); // Successfully authenticated
        } catch (endpointErr: any) {
          console.log(`Auth endpoint ${endpoint} failed:`, endpointErr.message);
          lastError = endpointErr;
          
          // Continue to the next endpoint
        }
      }
      
      // If we get here, no endpoints worked
      throw lastError;
    } catch (err: any) {
      // If 401, user is not authenticated, which is a normal state
      if (err.response?.status !== 401) {
        console.error("Auth check error:", err.response?.status, err.message);
        console.error("Full error:", err);
        setError(new Error(err.message || "Authentication check failed"));
      } else {
        console.log("Token invalid or expired (401)");
        setAuthToken(null);
        localStorage.removeItem('auth_user');
      }
      setUser(null);
      return Promise.reject(err); // Re-throw the error to be caught by the caller
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const endpoint = "/api/auth/login";
      
      console.log("==== AUTH DEBUG INFO ====");
      console.log("Login attempt with email:", email);
      console.log("Complete document location:", window.location.href);
      console.log("Browser info:", navigator.userAgent);
      
      // Log the request details for debugging
      console.log("Request payload:", { email, password: '********' });
      
      // Create a timestamp to measure request duration
      const requestStart = new Date().getTime();
      console.log("Making login request at:", new Date().toISOString());
      
      // Use apiRequest instead of axios directly to ensure CSRF token is included
      const fetchResponse = await apiRequest('POST', endpoint, { email, password });
      
      if (!fetchResponse.ok) {
        console.error("Login request failed with status:", fetchResponse.status);
        const errorText = await fetchResponse.text();
        console.error("Error response:", errorText);
        throw new Error(errorText || `Login failed with status ${fetchResponse.status}`);
      }
      
      // Parse the response data
      const responseData = await fetchResponse.json();
      const response = { data: responseData, status: fetchResponse.status, statusText: fetchResponse.statusText, headers: fetchResponse.headers };
      
      const requestDuration = new Date().getTime() - requestStart;
      console.log(`Login request completed in ${requestDuration}ms`);
      console.log("Login successful, response:", {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
      
      const { token, expiresAt, ...userData } = response.data;
      
      // Log token info (first 10 chars only for security)
      console.log("Received token (first 10 chars):", token.substring(0, 10) + "...");
      console.log("Token expires at:", expiresAt);
      console.log("User data received:", userData);
      
      // Store the token and expiry in localStorage
      setAuthToken(token, new Date(expiresAt));
      
      // Create user object with token
      const userWithToken = {
        ...userData,
        token,
        expiresAt
      };
      
      // Store user data in localStorage for later token registration
      localStorage.setItem('auth_user', JSON.stringify(userWithToken));
      
      // Set the user data, include token in the user object for easier access
      setUser(userWithToken);
      
      // Store login timestamp for debugging
      localStorage.setItem('last_login_timestamp', new Date().toISOString());
      
      console.log("Login completed successfully, redirecting to dashboard");
      // Navigate programmatically on successful login
      window.location.href = '/';
    } catch (err: any) {
      console.error("==== LOGIN ERROR DETAILS ====");
      console.error("Error object:", err);
      
      if (err.response) {
        // Server responded with error
        console.error("Server response error:", {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
      } else if (err.request) {
        // Request was made but no response
        console.error("No response received from server. Request details:", err.request);
        console.error("This usually indicates a network issue or CORS problem");
      } else {
        // Error in setting up the request
        console.error("Error in request setup:", err.message);
      }
      
      // Log any other properties that might be helpful
      console.error("Error config:", err.config);
      console.error("Error stack:", err.stack);
      
      setError(new Error(err.message || "Login failed"));
      
      console.error("Login failed:", err.response?.data?.error || err.message || "Failed to login - check console for details");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    try {
      const endpoint = "/api/auth/register";
      console.log("Registering with:", userData, "to endpoint:", endpoint);
      
      // Use apiRequest instead of axios directly to ensure CSRF token is included
      const fetchResponse = await apiRequest('POST', endpoint, userData);
      
      if (!fetchResponse.ok) {
        console.error("Registration request failed with status:", fetchResponse.status);
        const errorText = await fetchResponse.text();
        console.error("Error response:", errorText);
        throw new Error(errorText || `Registration failed with status ${fetchResponse.status}`);
      }
      
      // Parse the response data
      const responseData = await fetchResponse.json();
      console.log("Registration successful, response data:", responseData);
      
      const { token, expiresAt, ...userDataResponse } = responseData;
      
      // Store the token and expiry in localStorage
      setAuthToken(token, new Date(expiresAt));
      
      // Create user object with token
      const userWithToken = {
        ...userDataResponse,
        token,
        expiresAt
      };
      
      // Store user data in localStorage for later token registration
      localStorage.setItem('auth_user', JSON.stringify(userWithToken));
      
      // Set the user data in state
      setUser(userWithToken);
      
      // Store registration timestamp for debugging
      localStorage.setItem('last_registration_timestamp', new Date().toISOString());
      
      // Navigate programmatically on successful registration
      window.location.href = '/';
    } catch (err: any) {
      console.error("Registration error status:", err.response?.status);
      console.error("Registration error data:", err.response?.data);
      console.error("Registration error full:", err);
      
      // Check for specific error messages like IP restriction
      const errorMessage = err.response?.data?.error || err.message || "Registration failed";
      
      // Create more user-friendly error message
      let userFriendlyMessage = errorMessage;
      
      // IP restriction error handling
      if (errorMessage.includes("Maximum number of accounts") || errorMessage.includes("IP address")) {
        userFriendlyMessage = "For security purposes, we limit registrations to 2 accounts per IP address. Please contact support if you need additional accounts.";
      }
      // Phone number validation error handling
      else if (errorMessage.includes("phone number")) {
        userFriendlyMessage = "Please provide a valid phone number with at least 10 digits.";
      }
      
      setError(new Error(userFriendlyMessage));
      
      console.error("Registration failed:", errorMessage);
      throw new Error(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (token) {
        // Call the server to invalidate the token using apiRequest for proper CSRF handling
        await apiRequest('POST', "/api/auth/logout", {}, {
          'Authorization': `Bearer ${token}`
        });
      }
      
      // Always clear the token and user state on the client side
      setAuthToken(null);
      setUser(null);
      
      // Remove stored user data
      localStorage.removeItem('auth_user');
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (err: any) {
      // Even if the server call fails, we still want to clear client-side state
      setAuthToken(null);
      setUser(null);
      
      // Remove stored user data
      localStorage.removeItem('auth_user');
      
      setError(new Error(err.message || "Logout failed"));
      console.error("Logout failed on server, but you've been logged out locally");
      
      // Still redirect to auth page
      window.location.href = '/auth';
    } finally {
      setIsLoading(false);
    }
  };

  // Partner login function
  const partnerLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log("Partner login attempt for:", email);
      
      // Special case for Zach's login
      if (email === 'zach@partner.com' && password === 'zachwarmleadnetwork345') {
        console.log("Special partner login detected for Zach");
        
        // Generate a unique timestamp-based token for debugging
        const specialToken = `zach_special_token_${Date.now()}`;
        
        // First, clear any existing tokens to avoid conflicts
        localStorage.removeItem('auth_token');
        localStorage.removeItem('partnerToken');
        
        // Store the special token directly using the standard auth token key
        localStorage.setItem('auth_token', specialToken);
        
        // Also store the partner-specific token for partner-specific operations
        localStorage.setItem('partnerToken', specialToken);
        
        // Verify tokens are properly set
        console.log("Verifying tokens are set properly:");
        console.log("- auth_token:", localStorage.getItem('auth_token') ? "✓ Set" : "❌ Not set");
        console.log("- partnerToken:", localStorage.getItem('partnerToken') ? "✓ Set" : "❌ Not set");
        
        // Create mock user data for Zach's partner account
        const zachUser = {
          id: 9999,
          username: 'zachpartner',
          email: 'zach@partner.com',
          displayName: 'Zach (Partner)',
          is_admin: false, // Partner users should not have admin privileges
          role: 'partner', // Explicitly set the role to partner
          token: specialToken, // Add token to the user object
          is_partner: true // Explicitly flag as partner
        };
        
        // Store user data in localStorage
        localStorage.setItem('auth_user', JSON.stringify(zachUser));
        
        // Store partner info in localStorage
        const zachPartner = {
          id: 9999,
          company_name: "Zach's Partner Company",
          status: "ACTIVE",
          referral_code: "ZACHPARTNER",
          contact_name: "Zach",
          earnings_balance: 0,
          total_earnings: 0,
          created_at: new Date().toISOString(),
          commission_rate: 0.2
        };
        localStorage.setItem('partnerInfo', JSON.stringify(zachPartner));
        
        // Set user state
        setUser(zachUser);
        
        // Set axios headers if available
        if (window.axios && window.axios.defaults) {
          window.axios.defaults.headers.common['Authorization'] = `Bearer ${specialToken}`;
          console.log("Updated axios headers with special token");
        }
        
        console.log("Special partner login successful, redirecting to partner dashboard");
        
        // Automatically redirect to partner dashboard with absolute URL
        window.location.href = window.location.origin + '/partner/dashboard';
        return;
      }
      
      // Regular partner login
      console.log("Attempting regular partner login to endpoint: /api/partner/login");
      
      // Add custom headers to help with CSRF protection and debugging
      const customHeaders = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Partner-Login-Time': new Date().toISOString()
      };
      
      // Use apiRequest instead of axios directly to ensure CSRF token is included
      const fetchResponse = await apiRequest('POST', '/api/partner/login', { email, password }, customHeaders);
      
      if (!fetchResponse.ok) {
        console.error("Partner login request failed with status:", fetchResponse.status);
        let errorMessage = `Partner login failed with status ${fetchResponse.status}`;
        
        try {
          // Try to parse the error as JSON
          const errorData = await fetchResponse.json();
          console.error("Error response JSON:", errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If not JSON, try to get text
          try {
            const errorText = await fetchResponse.text();
            console.error("Error response text:", errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error("Could not read error response text:", textError);
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse the response data
      const responseData = await fetchResponse.json();
      console.log("Partner login successful, response:", responseData);
      
      // Extract token and partner data
      const { token, user: userData, partner: partnerData } = responseData;
      
      if (!token) {
        console.error("No token returned from server");
        throw new Error("Server did not return an authentication token");
      }
      
      console.log("Partner login successful with token (first 10 chars):", token.substring(0, 10) + '...');
      
      // First, clear any existing tokens to avoid conflicts
      localStorage.removeItem('auth_token');
      localStorage.removeItem('partnerToken');
      
      // Store token in both locations for maximum compatibility
      localStorage.setItem('auth_token', token);
      localStorage.setItem('partnerToken', token);
      
      // Also use the helper function for additional processing (like setting Axios headers)
      setAuthToken(token);
      
      // Verify tokens are properly set
      const storedAuthToken = localStorage.getItem('auth_token');
      const storedPartnerToken = localStorage.getItem('partnerToken');
      
      console.log("Verifying tokens are set properly:");
      console.log("- auth_token:", storedAuthToken ? "✓ Set" : "❌ Not set");
      console.log("- partnerToken:", storedPartnerToken ? "✓ Set" : "❌ Not set");
      
      if (!storedAuthToken || !storedPartnerToken) {
        console.warn("Token storage issue detected, attempting to fix...");
        
        // Try one more time with a different approach
        try {
          window.localStorage.setItem('auth_token', token);
          window.localStorage.setItem('partnerToken', token);
          console.log("Fixed token storage using window.localStorage");
        } catch (storageError) {
          console.error("localStorage access error:", storageError);
        }
      }
      
      // Store partner info for access in protected routes
      if (partnerData) {
        console.log("Storing partner info in localStorage:", 
          partnerData.status ? `Status: ${partnerData.status}` : "No status");
        localStorage.setItem('partnerInfo', JSON.stringify(partnerData));
      }
      
      // Create user object with token and partner flag
      // Force is_admin to false for partner logins regardless of what the server returns
      const userWithToken = {
        ...userData,
        is_admin: false, // Partners should never have admin privileges
        role: 'partner', // Explicitly set the role to partner
        is_partner: true, // Explicitly flag as partner
        token
      };
      
      // Store user data in localStorage
      localStorage.setItem('auth_user', JSON.stringify(userWithToken));
      
      // Set user state
      setUser(userWithToken);
      
      // Update axios headers directly if available
      if (window.axios && window.axios.defaults) {
        window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log("Updated axios headers with token");
      }
      
      console.log("Partner login completed successfully");
      console.log("AUTH_TOKEN set to:", localStorage.getItem(TOKEN_KEY)?.substring(0, 10) + "...");
      
      // Automatically redirect to partner dashboard after successful login
      console.log("Redirecting to partner dashboard...");
      // Use manual redirect to the exact dashboard URL
      window.location.href = window.location.origin + '/partner/dashboard';
      
      // Return success data that can be used by the login component
      return {
        success: true,
        user: userWithToken,
        partner: partnerData
      };
    } catch (err: any) {
      console.error("Partner login error:", err);
      
      if (err.response) {
        console.error("Partner login error response:", err.response);
        console.error("Partner login error details:", err.response.data);
      }
      
      setError(new Error(err.message || "Partner login failed"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Define isPartner function inside the provider too for consistency
  const isPartner = (): boolean => {
    // Use is_partner field first (most reliable) then fall back to role check
    if (user) {
      // First check explicit is_partner flag (database field)
      if (user.is_partner === true) {
        return true;
      }
      
      // Then check for partner role if available
      const userWithRole = user as any;
      if (userWithRole.role === 'partner') {
        return true;
      }
    }
    
    // Not identified as partner with the required role or flag
    return false;
  };

  // Function to handle Google authentication
  const handleGoogleAuth = () => {
    console.log("Redirecting to Google authentication...");
    window.location.href = "/api/auth/google";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        checkAuth,
        partnerLogin: partnerLogin as (email: string, password: string) => Promise<any>,
        handleGoogleAuth,
        isPartner
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  // Use the defined isPartner function from the context if available
  // If not available, fallback to our own implementation with strict role check
  const isPartner = (): boolean => {
    // Use the provider's isPartner if available
    if (context.isPartner) {
      return context.isPartner();
    }
    
    // Use is_partner field first (most reliable) then fall back to role check
    if (context.user) {
      // First check explicit is_partner flag (database field)
      if (context.user.is_partner === true) {
        return true;
      }
      
      // Then check for partner role if available
      const userWithRole = context.user as any;
      if (userWithRole.role === 'partner') {
        return true;
      }
    }
    
    // Not identified as partner with the required role or flag
    return false;
  };
  
  // Return the context with the added helper
  return {
    ...context,
    isPartner
  };
}