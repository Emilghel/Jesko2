import React, { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import PaymentVerification from '@/components/PaymentVerification';
import type { PaymentSource } from '@/components/PaymentVerification';
import { useAuth } from "@/hooks/use-auth";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

/**
 * Page component for verifying payments and assigning phone numbers
 */
export default function PaymentVerificationPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/payment/verify/:paymentId');
  const { user, isLoading } = useAuth();
  
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Extract payment ID from URL if present - check multiple possible param names
  const paymentId = 
    params?.paymentId || 
    urlParams.get('payment_id') || 
    urlParams.get('paymentId') || 
    urlParams.get('id') ||
    undefined;
  
  // Extract payment source from URL if present
  const paymentSource = (
    urlParams.get('source') || 
    urlParams.get('payment_source') || 
    (urlParams.has('paypal') ? 'paypal' : undefined) ||
    'external'
  ) as 'external' | 'paypal' | 'stripe' | 'credit_card';
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/auth');
    }
  }, [user, isLoading, setLocation]);
  
  // Handle successful payment verification
  const handleVerificationSuccess = () => {
    // Display success message to the user
    console.log('Payment verification successful, redirecting to dashboard...');
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      setLocation('/dashboard');
    }, 1500);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Not logged in - will redirect to login
  if (!user) {
    return null;
  }
  
  return (
    <div className="container px-4 mx-auto py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            className="px-0 text-muted-foreground"
            onClick={() => setLocation('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold mt-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-cyan-600">
            {paymentSource === 'paypal' ? 'PayPal' : 'Payment'} Verification
          </h1>
          <p className="text-muted-foreground mt-2">
            We're verifying your payment and provisioning your new phone number.
          </p>
          {paymentId && (
            <p className="text-sm text-muted-foreground mt-1">
              Payment ID: <span className="font-mono">{paymentId}</span>
            </p>
          )}
        </div>
        
        <PaymentVerification 
          paymentId={paymentId}
          paymentSource={paymentSource}
          onSuccess={handleVerificationSuccess}
        />
      </div>
    </div>
  );
}