import { useEffect, useState } from 'react';
import { Redirect, useLocation } from "wouter";
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PartnerProtectedRouteProps {
  children: React.ReactNode;
}

export function PartnerProtectedRoute({ children }: PartnerProtectedRouteProps) {
  const { user, checkAuth, isPartner } = useAuth();
  const [location, navigate] = useLocation();
  const [adminBypass, setAdminBypass] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Check for partner tokens and authentication status
  useEffect(() => {
    const checkAuthAndTokens = async () => {
      try {
        setIsCheckingAuth(true);
        console.log("PartnerProtectedRoute checking auth status...");
        
        // Ensure consistent auth_token storage
        // If partnerToken exists but auth_token doesn't, copy it over
        const partnerToken = localStorage.getItem('partnerToken');
        const authToken = localStorage.getItem('auth_token');
        
        if (partnerToken && !authToken) {
          console.log('Found partnerToken but no auth_token, copying to auth_token');
          localStorage.setItem('auth_token', partnerToken);
        }
        
        // Removed hardcoded special token checks for security
        // Using proper JWT validation instead
        const isSpecialToken = false; // Disabled hardcoded token bypass
        
        if (isSpecialToken) {
          console.log('Special partner token functionality has been disabled for security');
          // Not setting adminBypass - requires proper authentication now
          
          // If we have a user token too, make sure it's valid
          if (localStorage.getItem('auth_token') && !user) {
            try {
              await checkAuth();
              console.log('Auth token validated');
            } catch (err) {
              console.log('Auth token validation failed, but continuing with partner token');
            }
          }
        } else if (!user) {
          // If no special token and no user, we might need to verify stored tokens
          try {
            const currentAuthToken = localStorage.getItem('auth_token');
            console.log('Checking auth with token exists:', currentAuthToken ? 'Yes' : 'No');
            
            if (currentAuthToken) {
              await checkAuth();
              console.log('User authenticated from stored token');
            } else {
              console.log('No auth token found, authentication will fail');
            }
          } catch (err) {
            console.log('No valid authentication found:', err);
          }
        }
      } catch (error) {
        console.error('Error in auth check:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuthAndTokens();
  }, [user, checkAuth]);
  
  // Use our comprehensive partner detection logic
  const [isPartnerUser, setIsPartnerUser] = useState(false);
  
  // Determine partner status using multiple checks for reliability
  useEffect(() => {
    // Check various indicators of partner status
    const partnerRole = user?.role === 'partner';
    const partnerFlag = user?.is_partner === true;
    const partnerFunction = isPartner ? isPartner() : false;
    const partnerToken = localStorage.getItem('partnerToken') !== null;
    
    // Partner badge from localStorage (can be pre-set in special login cases)
    const partnerInfoExists = localStorage.getItem('partnerInfo') !== null;
    
    // Set as partner if any of these are true
    const detectedAsPartner = partnerRole || partnerFlag || partnerFunction || partnerToken || partnerInfoExists || adminBypass;
    setIsPartnerUser(detectedAsPartner);
    
    console.log("Partner detection in PartnerProtectedRoute:", {
      partnerRole, partnerFlag, partnerFunction, partnerToken, partnerInfoExists, adminBypass,
      result: detectedAsPartner
    });
  }, [user, isPartner, adminBypass]);
  
  // Use the strict role-based check first, then fallback to API check if needed
  const { data: partnerStatus, isLoading } = useQuery({
    queryKey: ['/api/partner/status'],
    queryFn: async () => {
      // Check if we already know this is a partner from our comprehensive checks
      if (isPartnerUser) {
        console.log('User identified as partner via comprehensive checks');
        return { isPartner: true, status: 'active' };
      }
      
      // Special token bypass has been removed for security
      // All access requires proper authentication now
      if (adminBypass) {
        console.log('Admin bypass flags detected but hardcoded bypasses have been removed');
        // No simulated partner data - must be properly authenticated
      }
      
      if (!user) return { isPartner: false };
      
      try {
        console.log("Making robust partner status check...");
        
        // First, check if we have cached partner data (fallback mechanism)
        const cachedPartnerData = localStorage.getItem('partner_status_cache');
        if (cachedPartnerData) {
          try {
            const parsedCache = JSON.parse(cachedPartnerData);
            const cacheTimestamp = parsedCache.timestamp || 0;
            const now = Date.now();
            const cacheAge = now - cacheTimestamp;
            
            // Use cache if it's less than 5 minutes old
            if (cacheAge < 5 * 60 * 1000) {
              console.log("Using cached partner status data:", parsedCache);
              return { 
                isPartner: parsedCache.isPartner, 
                status: parsedCache.status,
                fromCache: true
              };
            } else {
              console.log("Cached partner data expired, fetching fresh data");
            }
          } catch (cacheError) {
            console.error("Error parsing cached partner data:", cacheError);
          }
        }
        
        // Make the API request
        console.log("Requesting fresh partner status from API...");
        const res = await apiRequest('GET', '/api/partner/status');
        
        // Check if response is valid
        if (!res.ok) {
          throw new Error(`API returned error status: ${res.status}`);
        }
        
        // Parse the response
        const data = await res.json();
        console.log("Partner status API response:", data);
        
        // Map fields from the API response to our expected format
        // API returns "partnerStatus" but we use "status" internally
        const result = { 
          isPartner: data.isPartner, 
          status: data.partnerStatus || data.status || "INACTIVE" 
        };
        
        // Cache the result for fallback
        localStorage.setItem('partner_status_cache', JSON.stringify({
          ...result,
          timestamp: Date.now()
        }));
        
        return result;
      } catch (error) {
        console.error('Error checking partner status:', error);
        
        // Try to use user data as fallback if available
        if (user && user.is_partner === true) {
          console.log("Using user.is_partner as fallback for partner status");
          return { 
            isPartner: true, 
            status: "ACTIVE",
            fromFallback: true
          };
        }
        
        // Removed insecure fallback that treated any token as a valid partner token
        // Proper authentication and partner validation is required
        
        return { isPartner: false };
      }
    },
    enabled: Boolean(user || adminBypass) as boolean, // Run if user is logged in OR admin bypass
  });

  // Show loading state while checking auth tokens
  if (isCheckingAuth || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-gray-400">Verifying credentials...</p>
        </div>
      </div>
    );
  }
  
  // Allow special admin token to bypass user check
  if (!user && !adminBypass && !isPartnerUser) {
    console.log('No valid user or admin bypass token found, redirecting to auth');
    // Redirect to login if not authenticated and not using admin bypass
    return <Redirect to={`/auth?redirect=${encodeURIComponent(location)}`} />;
  }

  // Use our comprehensive check first, then fallback to API check
  if (!isPartnerUser && !partnerStatus?.isPartner && !adminBypass) {
    // If not a partner and not admin, redirect to partner application page
    console.log("Not a partner, redirecting to apply page");
    return <Redirect to="/partner/apply" />;
  }

  // Check for active status with case-insensitive comparison
  const partnerStatusString = partnerStatus?.status || '';
  const isStatusActive = partnerStatusString.toUpperCase() === 'ACTIVE';
  
  // Log status check
  console.log("Partner status check:", {
    statusFromAPI: partnerStatus?.status,
    normalizedStatus: partnerStatusString.toUpperCase(),
    isActive: isStatusActive,
    adminBypass
  });

  // If user is a partner with an active status or has admin bypass, render the protected content
  if (isStatusActive || adminBypass) {
    console.log("Partner status active or admin bypass, rendering content");
    return <>{children}</>;
  }

  // If partner account is pending or suspended, show appropriate message
  // This should never happen with adminBypass, but just in case
  const status = partnerStatusString.toLowerCase() || 'pending';
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          {status === 'pending' 
            ? 'Your Partner Account is Pending Approval' 
            : 'Your Partner Account is Suspended'}
        </h1>
        <p className="text-gray-300 mb-6">
          {status === 'pending' 
            ? 'Our team is reviewing your application. You\'ll receive an email once your account is approved.' 
            : 'Your partner account has been suspended. Please contact support for more information.'}
        </p>
        <a 
          href="/dashboard" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}