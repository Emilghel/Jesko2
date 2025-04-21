import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { usePlan } from '@/contexts/plan-context';
import { useToast } from '@/hooks/use-toast';

export default function CheckoutSuccessPage() {
  const [location, setLocation] = useLocation();
  const { selectedPlan, clearPlan, selectPlanById } = usePlan();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Process the payment result from the URL
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    
    // Check for PayPal subscription (from direct PayPal button)
    const subscriptionId = params.get('subscriptionId');
    
    // Check for PayPal order (from our create-order flow)
    const token = params.get('token');
    const PayerID = params.get('PayerID');
    
    // If we have a subscription ID, this is from the direct PayPal button
    if (subscriptionId) {
      console.log('Subscription created successfully:', subscriptionId);
      
      // If no plan is selected (direct PayPal integration for starter plan)
      if (!selectedPlan) {
        // Select the starter plan
        selectPlanById('ai-secretary-starter');
      }
      
      // Show success toast
      toast({
        title: "Subscription Activated",
        description: "Your PayPal subscription has been created successfully.",
      });
      
      setIsProcessing(false);
      return;
    }
    
    // If we have token and PayerID, this is from our create-order flow
    if (!token || !PayerID) {
      setError('Missing payment information');
      setIsProcessing(false);
      return;
    }

    // Capture the payment for orders
    const capturePayment = async () => {
      try {
        const response = await fetch('/api/paypal/capture-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            orderId: token,
            PayerID
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to capture payment');
        }

        const captureData = await response.json();
        
        // Log success
        console.log('Payment captured successfully:', captureData);
        
        // Show success toast
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        
        setIsProcessing(false);
      } catch (error) {
        console.error('Payment capture error:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        
        setError(errorMessage);
        setIsProcessing(false);
        
        toast({
          title: "Payment Processing Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    capturePayment();
  }, [location, toast, selectedPlan, selectPlanById]);
  
  // If there's no selected plan and we're not processing anymore, redirect to pricing
  useEffect(() => {
    // Check for subscription ID in URL (direct PayPal button)
    const params = new URLSearchParams(location.split('?')[1]);
    const hasSubscriptionId = params.get('subscriptionId') !== null;
    
    // Only redirect if:
    // 1. We're not processing anymore (to avoid race conditions)
    // 2. There's no selected plan
    // 3. This is not a subscription redirect (which would select the plan)
    if (!isProcessing && !selectedPlan && !hasSubscriptionId) {
      setLocation('/pricing');
    }
    
    // Clear plan selection after user leaves the page
    return () => {
      clearPlan();
    };
  }, [selectedPlan, setLocation, clearPlan, isProcessing, location]);
  
  const handleContinue = () => {
    setLocation('/dashboard');
  };
  
  const handleTryAgain = () => {
    setLocation('/pricing');
  };
  
  if (!selectedPlan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0F16]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#33C3BD] mx-auto mb-4" />
          <p className="text-gray-300">Loading your plan information...</p>
        </div>
      </div>
    );
  }
  
  if (isProcessing) {
    return (
      <div className="bg-[#0A0F16] min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 overflow-hidden z-0">
          <div className="stars-container absolute inset-0">
            <div className="stars-small"></div>
            <div className="stars-medium"></div>
            <div className="stars-large"></div>
          </div>
        </div>
        
        <div className="relative z-10 text-center p-8">
          <Loader2 className="h-16 w-16 animate-spin text-[#33C3BD] mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Finalizing Your Payment</h2>
          <p className="text-gray-300">Please wait while we complete your transaction...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-[#0A0F16] min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 overflow-hidden z-0">
          <div className="stars-container absolute inset-0">
            <div className="stars-small"></div>
            <div className="stars-medium"></div>
            <div className="stars-large"></div>
          </div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-md">
          <Card className="border-[#1E293B] bg-[#0F172A]/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Payment Error
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pb-6">
              <p className="text-gray-300 text-center mb-4">
                {error}
              </p>
              <p className="text-gray-400 text-sm text-center">
                Please try again or contact support if the problem persists.
              </p>
            </CardContent>
            
            <CardFooter className="flex justify-center pt-4 border-t border-[#1E293B]">
              <Button
                onClick={handleTryAgain}
                className="py-6 px-8 text-base bg-gray-700 hover:bg-gray-600"
              >
                Return to Pricing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-[#0A0F16] min-h-screen flex items-center justify-center">
      {/* Global Animated Starry Background */}
      <div className="fixed inset-0 overflow-hidden z-0">
        <div className="stars-container absolute inset-0">
          <div className="stars-small"></div>
          <div className="stars-medium"></div>
          <div className="stars-large"></div>
        </div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-md">
        <Card className="border-[#1E293B] bg-[#0F172A]/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Thank You!
            </CardTitle>
            
            <div className="w-full max-w-xs mx-auto">
              <div className={`p-4 rounded-lg mt-4 ${
                selectedPlan.isPopular ? 'bg-[#33C3BD]/10 border border-[#33C3BD]/40' : 
                selectedPlan.isPremium ? 'bg-purple-500/10 border border-purple-500/40' : 
                'bg-[#141B29] border border-[#1E293B]'
              }`}>
                <h3 className="font-medium text-white text-center">
                  {selectedPlan.name}
                </h3>
                
                {selectedPlan.hasTrial ? (
                  <div className="mt-2 text-center">
                    <p className="text-sm text-gray-300">
                      <span className="font-semibold text-yellow-400">
                        {selectedPlan.trialDays}-Day Free Trial Activated
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Then {selectedPlan.price}/{selectedPlan.billing}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-lg font-bold text-white text-center">
                    {selectedPlan.price}
                    <span className="text-sm font-normal text-gray-400">/{selectedPlan.billing}</span>
                    <span className="block text-sm font-normal text-green-400 mt-1">Active Now</span>
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pb-6">
            <p className="text-gray-300 text-center mb-2">
              {selectedPlan.hasTrial
                ? `Your ${selectedPlan.trialDays}-day free trial has been activated.`
                : "Your subscription has been activated."}
            </p>
            <p className="text-gray-400 text-sm text-center">
              We've sent a confirmation email with all the details to your email address.
            </p>
          </CardContent>
          
          <CardFooter className="flex justify-center pt-4 border-t border-[#1E293B]">
            <Button
              onClick={handleContinue}
              className="py-6 px-8 text-base bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90"
            >
              Continue to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}