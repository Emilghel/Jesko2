import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { verifyPayment } from '@/lib/stripe';

interface StripeCheckoutFormProps {
  hasTrial: boolean;
  trialDays: number;
  planName: string;
  planId: string;
  onSuccess: (paymentIntentId: string, params: URLSearchParams) => void;
  onError: (error: Error) => void;
}

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({ 
  hasTrial, 
  trialDays, 
  planName, 
  planId,
  onSuccess, 
  onError 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#f9fafb',
        '::placeholder': {
          color: '#9ca3af',
        },
        backgroundColor: '#111827',
      },
    },
    hidePostalCode: true,
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      console.log("Stripe or Elements not loaded yet");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Return URL isn't needed as we're handling the redirect in JavaScript
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Show error to customer
        console.error("Stripe confirmation error:", error);
        setErrorMessage(error.message || 'An error occurred with your payment');
        onError(new Error(error.message || 'Payment failed'));
        return;
      } 
      
      if (!paymentIntent) {
        throw new Error('No payment intent returned');
      }

      console.log("Payment intent status:", paymentIntent.status);

      // Payment succeeded, verify with our backend
      if (paymentIntent.status === 'succeeded') {
        const result = await verifyPayment(paymentIntent.id);
        
        if (result.success) {
          const successParams = new URLSearchParams({
            type: 'subscription',
            plan: planId,
            ...(hasTrial && { trial: 'true', days: trialDays.toString() })
          });
          
          onSuccess(paymentIntent.id, successParams);
        } else {
          throw new Error('Payment verification failed');
        }
      } else if (paymentIntent.status === 'requires_payment_method') {
        setErrorMessage('Your payment was not successful, please try again.');
        onError(new Error('Payment requires payment method'));
      } else if (paymentIntent.status === 'processing') {
        // Payment is processing, we can show a success message with processing state
        const successParams = new URLSearchParams({
          type: 'subscription',
          plan: planId,
          status: 'processing',
          ...(hasTrial && { trial: 'true', days: trialDays.toString() })
        });
        
        onSuccess(paymentIntent.id, successParams);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setErrorMessage(error.message || 'An unexpected error occurred');
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show errors to the user
  useEffect(() => {
    if (errorMessage) {
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [errorMessage, toast]);

  useEffect(() => {
    if (stripe && elements) {
      console.log("Stripe and Elements loaded successfully");
    }
  }, [stripe, elements]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-gray-800/50 rounded-md border border-gray-700">
        <h3 className="text-gray-300 font-medium mb-4 flex items-center">
          <CreditCard className="mr-2 h-4 w-4" />
          Payment Information
        </h3>
        
        {/* First try with CardElement as a fallback */}
        <div className="card-element-container bg-gray-900 rounded-md p-4 border border-gray-700">
          <CardElement options={cardElementOptions} />
        </div>
        
        {/* Then also try with PaymentElement */}
        <div className="mt-4">
          <PaymentElement />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        size="lg" 
        disabled={!stripe || !elements || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : hasTrial ? (
          `Start ${trialDays}-Day Free Trial`
        ) : (
          'Pay Now'
        )}
      </Button>
      
      {errorMessage && (
        <div className="text-red-500 text-sm bg-red-900/20 p-2 rounded-md">
          {errorMessage}
        </div>
      )}
    </form>
  );
};

export default StripeCheckoutForm;