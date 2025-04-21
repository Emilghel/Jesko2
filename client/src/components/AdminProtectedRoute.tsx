import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AccessDenied } from "./AdminErrorBoundary";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, isLoading, checkAuth, isPartner } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [authVerificationAttempted, setAuthVerificationAttempted] = useState(false);
  
  // TEMPORARILY DISABLED PARTNER CHECK to allow admin access
  // Use the isPartner helper from useAuth for consistency
  const hasPartnerStatus = false; // isPartner();
  
  useEffect(() => {
    // Log authentication info for debugging
    console.log("AdminProtectedRoute - auth state:", { 
      isLoading, 
      hasUser: !!user, 
      is_admin: user?.is_admin,
      user: user ? { id: user.id, email: user.email, is_admin: user.is_admin } : null
    });
    
    // Get token from local storage
    const token = localStorage.getItem('auth_token');
    console.log("Token from localStorage:", token ? "Found (first 10 chars: " + token.substring(0, 10) + "...)" : "Not found");
    
    // Check if user has a partner token (which would override admin privileges)
    const partnerToken = localStorage.getItem('partnerToken');
    
    // DISABLED PARTNER CHECK to allow admin access regardless of partner status
    // If there's a partner token or the user is identified as a partner, don't allow admin access
    if (false && (partnerToken || hasPartnerStatus)) { // Disabled with false &&
      console.log("Partner status detected, redirecting to partner dashboard");
      toast({
        title: "Access Denied",
        description: "Partners cannot access the admin panel. Please use the Partner Dashboard.",
        variant: "destructive"
      });
      navigate("/partner/dashboard");
      return;
    }
    
    // If we have a token but no user, try to verify authentication
    if (token && !user && !isLoading && !authVerificationAttempted) {
      console.log("Found token but no user, attempting to verify authentication");
      setAuthVerificationAttempted(true);
      
      checkAuth().catch(err => {
        console.error("Auth verification failed:", err);
        // Remove invalid token
        localStorage.removeItem('auth_token');
        
        // Show toast about session expiration
        toast({
          title: "Session expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
        
        // Redirect to login page
        navigate("/auth");
      });
    } else if (!isLoading) {
      if (!user) {
        console.log("No user found, redirecting to auth page");
        navigate("/auth");
      } else if (!user.is_admin) {
        console.log("User is not an admin, showing access denied");
        // No need to redirect - we'll show the AccessDenied component
      }
    }
  }, [isLoading, user, navigate, checkAuth, authVerificationAttempted, toast, hasPartnerStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied message if user is not an admin or if they have a partner status
  if (!user) {
    // If there's no user, let the useEffect redirect to login
    return null;
  }
  
  // If the user exists but is not an admin, show the access denied component
  // TEMPORARILY DISABLED PARTNER CHECK to allow admin access regardless of partner status
  if (!user.is_admin /* || hasPartnerStatus */) {
    console.log("Access denied - user exists but lacks admin rights:", user);
    // Check if we're on one of the stock videos pages
    const isStockVideosPage = window.location.pathname.includes('stock-videos') || 
                              window.location.pathname.includes('free-stock-videos');
    
    return <AccessDenied customMessage={isStockVideosPage ? 
      "The free stock videos section is only available to administrators." : undefined} />;
  }
  
  // Log successful admin access
  console.log("✅ Admin access granted for:", user.email);

  return <>{children}</>;
}