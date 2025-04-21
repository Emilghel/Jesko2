import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Phone, ArrowRight, CreditCard } from 'lucide-react';
import { SiPaypal } from 'react-icons/si';

/**
 * Phone number type returned from the API
 */
interface VerifiedPhoneNumber {
  id: number;
  phoneNumber: string;
  formattedNumber?: string;
  phone_number?: string;
  friendly_name?: string;
  sid?: string;
  isActive?: boolean;
  purchaseDate?: string;
}

/**
 * Various payment sources that can be verified
 */
export type PaymentSource = 'external' | 'paypal' | 'stripe' | 'credit_card';

/**
 * Props for the PaymentVerification component
 */
interface PaymentVerificationProps {
  paymentId?: string;
  paymentSource?: PaymentSource;
  onSuccess?: (phoneNumber: VerifiedPhoneNumber) => void;
  onError?: (error: Error) => void;
}

/**
 * A component that verifies external payments and assigns a phone number
 */
export default function PaymentVerification({ 
  paymentId = 'AZXo-En8',  // Default to the payment ID from the external link
  paymentSource = 'external', 
  onSuccess,
  onError
}: PaymentVerificationProps) {
  const [verificationStep, setVerificationStep] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [purchasedPhoneNumber, setPurchasedPhoneNumber] = useState<VerifiedPhoneNumber | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to determine which payment icon to show
  const getPaymentIcon = () => {
    switch (paymentSource) {
      case 'paypal':
        return <SiPaypal className="h-5 w-5 text-blue-500" />;
      case 'stripe':
      case 'credit_card':
        return <CreditCard className="h-5 w-5 text-purple-500" />;
      default:
        return <Phone className="h-5 w-5 text-cyan-400" />;
    }
  };

  // Format a phone number object to ensure all expected properties
  const formatPhoneNumber = (phoneNumber: any): VerifiedPhoneNumber => {
    if (!phoneNumber) return {} as VerifiedPhoneNumber;

    // Handle database-style phone number (purchased_phone_numbers table)
    if (phoneNumber.phone_number) {
      return {
        id: phoneNumber.id,
        phoneNumber: phoneNumber.phone_number,
        formattedNumber: phoneNumber.friendly_name || phoneNumber.phone_number,
        phone_number: phoneNumber.phone_number,
        friendly_name: phoneNumber.friendly_name,
        sid: phoneNumber.phone_sid,
        isActive: phoneNumber.is_active,
        purchaseDate: phoneNumber.purchase_date
      };
    }
    
    // Handle API-style phone number
    return {
      id: phoneNumber.id || 0,
      phoneNumber: phoneNumber.phoneNumber || '',
      formattedNumber: phoneNumber.formattedNumber || phoneNumber.phoneNumber || '',
      sid: phoneNumber.sid || null,
      isActive: true
    };
  };

  // Mutation to verify payment and assign phone number
  const verifyPaymentMutation = useMutation({
    mutationFn: async () => {
      console.log(`Verifying payment ID: ${paymentId} (Source: ${paymentSource})`);
      
      const res = await fetch('/api/payment/verify-external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ 
          paymentId, 
          paymentSource 
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to verify payment');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      const formattedNumber = formatPhoneNumber(data.phoneNumber);
      setPurchasedPhoneNumber(formattedNumber);
      setVerificationStep('success');
      
      const displayNumber = formattedNumber.formattedNumber || formattedNumber.phoneNumber;
      
      toast({
        title: "Payment Verified!",
        description: `Your phone number ${displayNumber} has been assigned to your account.`,
        variant: "default",
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/phone-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(formattedNumber);
      }
    },
    onError: (error: Error) => {
      setVerificationStep('error');
      setErrorMessage(error.message);
      toast({
        title: "Payment Verification Failed",
        description: error.message,
        variant: "destructive",
      });
      
      // Call onError callback if provided
      if (onError) {
        onError(error);
      }
    },
  });

  // Automatically verify payment when component mounts
  useEffect(() => {
    if (paymentId) {
      console.log(`Payment verification started for ID: ${paymentId}`);
      verifyPaymentMutation.mutate();
    } else {
      console.error('No payment ID provided');
      setVerificationStep('error');
      setErrorMessage('No payment ID provided for verification');
    }
  }, [paymentId]);

  return (
    <Card className="w-full max-w-md mx-auto border border-border/60 shadow-lg">
      <CardHeader className="border-b border-border/40 bg-muted/30">
        <CardTitle className="text-xl flex items-center gap-2">
          {getPaymentIcon()}
          {paymentSource === 'paypal' ? 'PayPal' : paymentSource === 'credit_card' ? 'Credit Card' : 'Phone Number'} Payment
        </CardTitle>
        <CardDescription>
          Verifying your payment and assigning a phone number to your account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        {verificationStep === 'verifying' && (
          <div className="flex flex-col items-center py-6">
            <Loader2 className="h-12 w-12 text-cyan-500 animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-2">Verifying Payment</h3>
            <p className="text-center text-muted-foreground mb-4">
              We're processing your payment and assigning a phone number to your account.
              This may take a few moments...
            </p>
            <div className="w-full max-w-xs bg-secondary h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-400 to-cyan-600 h-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            
            {paymentId && (
              <div className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium">Payment ID:</span> {paymentId}
              </div>
            )}
          </div>
        )}
        
        {verificationStep === 'success' && purchasedPhoneNumber && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Payment Successful</h3>
            <p className="text-center text-muted-foreground">
              Your payment has been verified and a phone number has been assigned to your account.
            </p>
            
            <div className="w-full max-w-xs p-4 border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 rounded-lg mt-4">
              <p className="text-center font-semibold text-lg">
                {purchasedPhoneNumber.formattedNumber || purchasedPhoneNumber.phoneNumber}
              </p>
              <p className="text-center text-sm text-muted-foreground mt-1">
                This number has been added to your account
              </p>
            </div>
            
            <div className="mt-4 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md w-full max-w-xs text-center">
              <p className="font-medium">Payment verified successfully</p>
              <p className="text-xs text-muted-foreground mt-1">Reference ID: {paymentId}</p>
            </div>
          </div>
        )}
        
        {verificationStep === 'error' && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Verification Failed</h3>
            <p className="text-center text-muted-foreground mb-4">
              We encountered an issue while verifying your payment.
            </p>
            
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {errorMessage || "An unexpected error occurred during payment verification."}
              </AlertDescription>
            </Alert>
            
            {paymentId && (
              <div className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium">Payment ID:</span> {paymentId}
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t border-border/40 pt-4">
        {verificationStep === 'success' && (
          <Button className="w-full" variant="default" onClick={() => {
            if (onSuccess && purchasedPhoneNumber) onSuccess(purchasedPhoneNumber);
          }}>
            <span className="flex items-center">
              Continue to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          </Button>
        )}
        
        {verificationStep === 'error' && (
          <Button 
            className="w-full" 
            variant="outline" 
            onClick={() => verifyPaymentMutation.mutate()}
            disabled={verifyPaymentMutation.isPending}
          >
            {verifyPaymentMutation.isPending ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </span>
            ) : (
              <span>Try Again</span>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}