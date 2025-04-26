import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, AlertCircle } from 'lucide-react';

const PaymentSuccessPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState<string>('');
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { user, refetchUser } = useAuth();

  // Extract query parameters
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const paymentIntentId = searchParams.get('payment_intent');
  const paymentType = searchParams.get('type') || 'token';
  const redirectStatus = searchParams.get('redirect_status');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentIntentId || redirectStatus !== 'succeeded' || !user) {
        setIsLoading(false);
        setVerificationStatus('error');
        setMessage('Invalid payment information or payment not successful');
        return;
      }

      try {
        setIsLoading(true);
        // Call the backend to verify the payment and update user's tokens or subscription
        const response = await axios.post('/api/stripe/verify-payment', {
          paymentIntentId
        });

        // Refetch user data to update UI with new balance
        await refetchUser();

        setVerificationStatus('success');
        setMessage(response.data.message || 'Payment processed successfully!');
      } catch (err: any) {
        console.error('Error verifying payment:', err);
        
        setVerificationStatus('error');
        setMessage(err.response?.data?.error || err.message || 'Failed to verify payment');
        
        toast({
          title: 'Payment Verification Error',
          description: err.response?.data?.error || err.message || 'Failed to verify payment',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [paymentIntentId, redirectStatus, user, toast, refetchUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            {verificationStatus === 'success' ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            )}
            <div>
              <CardTitle>
                {verificationStatus === 'success' 
                  ? (paymentType === 'subscription' ? 'Subscription Activated!' : 'Tokens Purchased!') 
                  : 'Payment Error'
                }
              </CardTitle>
              <CardDescription>
                {message}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {verificationStatus === 'success' && (
            <div className="text-center text-sm text-muted-foreground">
              {paymentType === 'subscription' ? (
                <p>Your subscription is now active. Enjoy all the premium features!</p>
              ) : (
                <p>Your tokens have been added to your account. Start using them now!</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2 justify-center">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="flex-1"
          >
            Go to Dashboard
          </Button>
          
          {paymentType === 'token' && verificationStatus === 'success' && (
            <Button 
              onClick={() => navigate('/ai-credit-balance')}
              variant="outline"
              className="flex-1"
            >
              View Balance
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;