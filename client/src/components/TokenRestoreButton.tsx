import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Token Restore Button
 * 
 * A utility component that can be used by admin users to restore
 * authentication tokens from the database to memory when
 * authentication issues occur.
 */
export function TokenRestoreButton({ variant = "default", size = "default" }) {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Don't show the button for non-admin users
  if (!user?.is_admin) {
    return null;
  }
  
  const handleRestoreTokens = async () => {
    setIsPending(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login first.');
      }
      
      const response = await fetch('/api/auth/restore-tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: Failed to restore tokens`);
      }
      
      const data = await response.json();
      
      toast({
        title: "Tokens Restored",
        description: `Successfully restored ${data.activeTokensCount} active tokens from database.`,
        variant: "success",
      });
    } catch (error) {
      console.error('Token restoration error:', error);
      
      toast({
        title: "Token Restore Failed",
        description: error.message || "Failed to restore authentication tokens.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <Button
      onClick={handleRestoreTokens}
      variant={variant} 
      size={size}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Restoring...
        </>
      ) : (
        <>
          <ShieldAlert className="mr-2 h-4 w-4" />
          Restore Auth Tokens
        </>
      )}
    </Button>
  );
}

/**
 * Token Status Button
 * 
 * A utility component that displays the status of the token system.
 */
export function TokenStatusButton({ variant = "outline", size = "sm" }) {
  const [status, setStatus] = useState<{
    activeTokensCount?: number;
    authenticated?: boolean;
    user?: any;
  } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Don't show the button for non-admin users
  if (!user?.is_admin) {
    return null;
  }
  
  const checkTokenStatus = async () => {
    setIsPending(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login first.');
      }
      
      const response = await fetch('/api/auth/token-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: Failed to check token status`);
      }
      
      const data = await response.json();
      setStatus(data);
      
      toast({
        title: "Token Status",
        description: `Active tokens: ${data.activeTokensCount || 'N/A'}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Token status check error:', error);
      
      toast({
        title: "Check Failed",
        description: error.message || "Failed to check token status.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <Button
      onClick={checkTokenStatus}
      variant={variant} 
      size={size}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Shield className="mr-2 h-4 w-4" />
          {status?.activeTokensCount ? `${status.activeTokensCount} Active Tokens` : 'Check Token Status'}
        </>
      )}
    </Button>
  );
}