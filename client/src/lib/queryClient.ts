import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from './auth';

// Store the CSRF token
let csrfToken: string | null = null;

/**
 * Get CSRF token from the server
 * Fetch a new token if we don't have one or forceRefresh is true
 */
export async function getCsrfToken(forceRefresh = false): Promise<string | null> {
  // Return cached token unless a refresh is requested
  if (csrfToken && !forceRefresh) {
    return csrfToken;
  }
  
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include', // Important for including cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    } else {
      console.error('Failed to fetch CSRF token:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Improved API request function with better error handling and debugging
 * 
 * @param method - HTTP method (GET, POST, PATCH, PUT, DELETE)
 * @param url - API endpoint URL
 * @param data - Optional body data for the request
 * @returns Response object from fetch
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: any,
  customHeaders?: Record<string, string>
): Promise<Response> {
  // Get the auth token from utility function that checks both cookies and localStorage
  const token = getAuthToken();
  
  // Set up headers with authentication
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders || {}) // Merge any custom headers
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // For non-GET requests that modify state, get and add CSRF token
  // Exempt certain paths that don't require CSRF
  const csrfExemptPaths = [
    '/api/webhook',
    '/api/transcription/webhook',
    '/api/external/',
    '/api/public/',
    '/api/open-auth'
  ];
  
  const needsCsrfToken = 
    method !== 'GET' && 
    method !== 'HEAD' && 
    method !== 'OPTIONS' && 
    !csrfExemptPaths.some(path => url.startsWith(path));

  if (needsCsrfToken) {
    const csrf = await getCsrfToken();
    if (csrf) {
      // Add the CSRF token as a header
      headers['X-CSRF-Token'] = csrf;
    } else {
      console.warn('CSRF token not available for', method, url);
    }
  }
  
  // Configure the request options
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };
  
  // Add body for non-GET requests if data is provided
  if (method !== 'GET' && data !== undefined) {
    // If data is FormData, don't stringify it and remove Content-Type
    if (data instanceof FormData) {
      options.body = data;
      delete headers['Content-Type']; 
      
      // If we need CSRF protection, add the token as a FormData field as well
      if (needsCsrfToken) {
        const csrf = await getCsrfToken();
        if (csrf) {
          data.append('_csrf', csrf);
        }
      }
    } else {
      // For JSON data, add the CSRF token to the data object for body parser extraction
      if (needsCsrfToken && typeof data === 'object' && data !== null) {
        const csrf = await getCsrfToken();
        if (csrf) {
          data._csrf = csrf;
        }
      }
      options.body = JSON.stringify(data);
    }
  }
  
  console.log(`Making ${method} request to ${url}`);
  
  try {
    // Make the actual request with debugging
    console.log(`Request options:`, JSON.stringify({
      method,
      headerKeys: Object.keys(headers),
      hasBody: !!options.body,
      url
    }));
    
    const response = await fetch(url, options);
    
    // Check if response is defined
    if (!response) {
      console.error(`Response is undefined for ${method} ${url}`);
      throw new Error('Server returned an undefined response');
    }
    
    // For DELETE requests with 204 status, return immediately
    if (method === 'DELETE' && response.status === 204) {
      console.log(`DELETE request to ${url} successful (204 No Content)`);
      return response;
    }
    
    // Log response status for debugging
    console.log(`Response status for ${method} ${url}: ${response.status}`);
    
    // Return the response object directly
    return response;
  } catch (error) {
    // Log and rethrow network errors with a clear message
    console.error(`Network error in ${method} request to ${url}:`, error);
    // Create a mock response for network errors
    const errorResponse = new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to connect to server' }),
      { status: 0, statusText: 'Network Error' }
    );
    return errorResponse;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the auth token from utility function that checks both cookies and localStorage
    const token = getAuthToken();
    
    // Set up headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Added Authorization header with token:', token.substring(0, 10) + '...');
    } else {
      console.log('No token found in cookie or localStorage');
    }

    console.log('Making request to:', queryKey[0]);
    console.log('With headers:', headers);

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      console.error('Received 401 Unauthorized response');
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
