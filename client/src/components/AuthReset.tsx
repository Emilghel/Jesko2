import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * AuthReset Component
 * 
 * This component provides a way for users to reset their authentication state
 * when they encounter persistent authentication errors.
 */
const AuthReset = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const { toast } = useToast();

  // Handle reset button click
  const handleReset = () => {
    setIsResetting(true);
    
    // Clear all auth-related items from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token_expiry');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('last_login_timestamp');
    localStorage.removeItem('last_successful_auth_endpoint');
    
    // Set a completion flag to show success message
    setComplete(true);
    
    // Show success toast
    toast({
      title: "Authentication reset complete",
      description: "Your authentication has been reset. You will be redirected to login.",
    });
  };

  // Start countdown after reset is complete
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (complete && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (complete && countdown === 0) {
      // Redirect to login page
      window.location.href = '/auth';
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [complete, countdown]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="text-amber-500" />
          Authentication Reset
        </CardTitle>
        <CardDescription>
          Use this tool to reset your authentication if you're having trouble logging in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!complete ? (
          <div className="space-y-4">
            <p>
              This will log you out of the application and clear all saved authentication data. 
              You'll need to log in again after this process is complete.
            </p>
            <p className="text-sm text-amber-500">
              <strong>Note:</strong> Only use this feature if you're experiencing persistent login issues.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-green-500 font-medium">
              Authentication successfully reset!
            </p>
            <p>
              You will be redirected to the login page in {countdown} seconds...
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!complete ? (
          <Button 
            onClick={handleReset} 
            disabled={isResetting}
            variant="destructive"
            className="w-full"
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Authentication"
            )}
          </Button>
        ) : (
          <Button 
            onClick={() => window.location.href = '/auth'} 
            variant="default"
            className="w-full"
          >
            Go to Login Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default AuthReset;