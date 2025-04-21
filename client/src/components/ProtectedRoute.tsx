import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [pathname] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Add more detailed debugging
  useEffect(() => {
    console.log("ProtectedRoute - current state:", { 
      pathname, 
      isLoading, 
      userExists: !!user,
      user: user ? { id: user.id, username: user.username } : null,
      isAuthenticated
    });

    // Only proceed when loading is complete
    if (!isLoading) {
      if (user) {
        console.log("ProtectedRoute - User authenticated, allowing access to:", pathname);
        setIsAuthenticated(true);
      } else {
        console.log("ProtectedRoute - User not authenticated, redirecting to /auth from:", pathname);
        setIsAuthenticated(false);
        // Small delay to ensure state updates complete before redirect
        setTimeout(() => navigate("/auth"), 50);
      }
    }
  }, [isLoading, user, navigate, pathname]);

  if (isLoading || isAuthenticated === null) {
    console.log("ProtectedRoute - Showing loading state...");
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0F1D] to-[#162033] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-4 border-[#33C3BD] border-solid rounded-full animate-spin"></div>
          <p className="mt-4 text-[#33C3BD]">Verifying authentication...</p>
          <p className="mt-2 text-sm text-gray-400">Please wait while we prepare your experience</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("ProtectedRoute - Rendering null while redirect happens");
    return null; // The useEffect will handle the redirect
  }

  console.log("ProtectedRoute - Rendering protected content for:", pathname);
  return <>{children}</>;
}