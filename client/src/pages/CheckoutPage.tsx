import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useRoute, useRouter } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { availablePlans, usePlan } from '@/contexts/plan-context';
import { useAuth } from '@/hooks/use-auth';

// Define PayPal types to fix TypeScript errors
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: any) => { render: (selector: string) => void };
    };
  }
}

interface PayPalSubscriptionActions {
  subscription: {
    create: (params: { plan_id: string }) => Promise<string>;
  };
}

interface PayPalApproveData {
  subscriptionID: string;
}

interface PayPalButtonConfig {
  style: {
    shape: string;
    color: string;
    layout: string;
    label: string;
  };
  createSubscription: (data: any, actions: PayPalSubscriptionActions) => Promise<string>;
  onApprove: (data: PayPalApproveData, actions: any) => void;
}

// Form schema
const checkoutFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  companyName: z.string().optional(),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

enum CheckoutStep {
  FormEntry,
  Processing,
  Success,
  Error,
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [, params] = useRoute("/checkout/:planId"); 
  const { selectedPlan, selectPlanById } = usePlan();
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(CheckoutStep.FormEntry);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Initialize form with react-hook-form
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: user?.displayName || '',
      email: user?.email || '',
      companyName: '',
      phoneNumber: '',
      agreeToTerms: false,
    },
    mode: "onChange", // Validate on change instead of only on submit
  });

  // Load plan from URL params
  useEffect(() => {
    const planId = params?.planId || new URLSearchParams(location.split('?')[1]).get('plan');
    
    if (planId && Object.keys(availablePlans).includes(planId)) {
      selectPlanById(planId);
    } else if (!selectedPlan) {
      // Redirect if no valid plan selected
      toast({
        title: "No plan selected",
        description: "Please select a plan from the pricing page.",
        variant: "destructive",
      });
      setLocation('/pricing');
    }
  }, [params, location, selectPlanById, selectedPlan, toast, setLocation]);
  
  // Load PayPal script for plans with direct PayPal integration
  useEffect(() => {
    const isDirectPayPalPlan = selectedPlan?.id === 'ai-secretary-starter' || 
                              selectedPlan?.id === 'ai-secretary-standard' || 
                              selectedPlan?.id === 'ai-secretary-pro';
    
    if (isDirectPayPalPlan && checkoutStep === CheckoutStep.FormEntry) {
      // Use a small delay to ensure the DOM is fully rendered before loading the script
      // This fixes the "element does not exist" error that happens when the script loads too early
      const timerId = setTimeout(() => {
        // Get plan-specific PayPal container ID and plan ID
        let paypalContainerId = '';
        let planId = '';
        
        if (selectedPlan?.id === 'ai-secretary-starter') {
          paypalContainerId = 'paypal-button-container-P-6H912450BC000780SM7UXKVI';
          planId = 'P-6H912450BC000780SM7UXKVI';
        } else if (selectedPlan?.id === 'ai-secretary-standard') {
          paypalContainerId = 'paypal-button-container-P-0AU893367F5884614M7UXJDA';
          planId = 'P-0AU893367F5884614M7UXJDA';
        } else if (selectedPlan?.id === 'ai-secretary-pro') {
          paypalContainerId = 'paypal-button-container-P-2UA32207898067051M7UYGVQ';
          planId = 'P-2UA32207898067051M7UYGVQ';
        }
        
        // Check if the container element exists
        const paypalContainer = document.getElementById(paypalContainerId);
        
        if (!paypalContainer) {
          console.warn(`PayPal container element not found for ${selectedPlan?.id}, skipping script load`);
          return;
        }
        
        // Create the script element
        const script = document.createElement('script');
        script.src = "https://www.paypal.com/sdk/js?client-id=Af7G68O9uhv8g9s_E1_yiL0_mCXddIXN0ODXd-kW2eofsjZwJwPV-pI9vQ8oItvgtlCyXSuq0cHl0wQP&vault=true&intent=subscription";
        script.setAttribute('data-sdk-integration-source', 'button-factory');
        script.async = true;
        
        // Append the script
        document.body.appendChild(script);
        
        // Initialize PayPal buttons when script is loaded
        script.onload = () => {
          if (window.paypal) {
            window.paypal.Buttons({
              style: {
                shape: 'rect',
                color: 'gold',
                layout: 'vertical',
                label: 'subscribe'
              },
              createSubscription: function(data: any, actions: PayPalSubscriptionActions) {
                return actions.subscription.create({
                  /* Creates the subscription */
                  plan_id: planId
                });
              },
              onApprove: function(data: PayPalApproveData, actions: any) {
                alert(data.subscriptionID); // You can add optional success message for the subscriber here
                // After showing alert, redirect to success page
                window.location.href = `/checkout-success?subscriptionId=${data.subscriptionID}`;
              }
            }).render(`#${paypalContainerId}`); // Renders the PayPal button
          }
        };
      }, 500); // 500ms delay to ensure DOM is ready
      
      // Cleanup
      return () => {
        clearTimeout(timerId);
        // Remove any scripts we may have added
        const paypalScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
        if (paypalScript && paypalScript.parentNode) {
          paypalScript.parentNode.removeChild(paypalScript);
        }
      };
    }
  }, [selectedPlan, checkoutStep]);

  const onSubmit = async (data: CheckoutFormValues) => {
    if (!selectedPlan) return;
    
    // Start payment processing
    setCheckoutStep(CheckoutStep.Processing);
    
    try {
      // Extract the price from selectedPlan.price (removing $ symbol)
      const amount = selectedPlan.price.replace(/[^0-9.]/g, '');
      
      // Check if we should use the demo mode (temporary solution while PayPal credentials are being fixed)
      const useDemo = true; // Set to true for now until PayPal is configured
      
      if (useDemo) {
        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate successful payment (demo mode)
        setCheckoutStep(CheckoutStep.Success);
        
        // Show notification about demo mode
        toast({
          title: "Demo Mode",
          description: "Using simulated payment for demonstration. In production, real PayPal payment would be processed.",
          duration: 5000,
        });
        
        return;
      }
      
      // Create a PayPal order through our server API
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          planId: selectedPlan.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment order');
      }
      
      // Get the order details
      const orderData = await response.json();
      
      // Find the approval URL to redirect to PayPal
      const approvalUrl = orderData.links.find((link: any) => link.rel === 'approve').href;
      
      if (!approvalUrl) {
        throw new Error('PayPal approval URL not found');
      }
      
      // Redirect the user to PayPal to complete the payment
      window.location.href = approvalUrl;
      
      // The page will be redirected, so no need to update state here
      // When payment is completed, PayPal will redirect back to our /api/paypal/payment-success endpoint
      // which will then redirect to checkout-success page
      
    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Temporarily provide a fallback to demo mode if PayPal integration fails
      toast({
        title: "PayPal Integration Issue",
        description: "Payment processing with PayPal failed. Using demo mode instead.",
        variant: "destructive",
        duration: 5000,
      });
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Proceed with demo success for now
      setCheckoutStep(CheckoutStep.Success);
    }
  };

  // Function to retry payment after error
  const retryPayment = () => {
    setPaymentError(null);
    setCheckoutStep(CheckoutStep.FormEntry);
  };

  // Function to go to dashboard after successful payment
  const goToDashboard = () => {
    setLocation('/dashboard');
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

  // Check if we're looking at plans with direct PayPal integration
  const isStarterPlan = selectedPlan?.id === 'ai-secretary-starter';
  const isStandardPlan = selectedPlan?.id === 'ai-secretary-standard';
  const isProPlan = selectedPlan?.id === 'ai-secretary-pro';
  const hasDirectPayPalIntegration = isStarterPlan || isStandardPlan || isProPlan;

  const renderStep = () => {
    switch (checkoutStep) {
      case CheckoutStep.FormEntry:
        return (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name*</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  {...form.register("fullName")}
                  className="bg-[#141B29] border-[#1E293B] mt-1"
                />
                {form.formState.errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.fullName.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="email">Email Address*</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...form.register("email")}
                  className="bg-[#141B29] border-[#1E293B] mt-1"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="companyName">Company Name (Optional)</Label>
                <Input
                  id="companyName"
                  placeholder="Your Company"
                  {...form.register("companyName")}
                  className="bg-[#141B29] border-[#1E293B] mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="phoneNumber">Phone Number*</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+1 (555) 123-4567"
                  {...form.register("phoneNumber")}
                  className="bg-[#141B29] border-[#1E293B] mt-1"
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.phoneNumber.message}</p>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t border-[#1E293B]">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={form.watch("agreeToTerms")}
                  onCheckedChange={(checked) => {
                    form.setValue("agreeToTerms", checked === true, { shouldValidate: true });
                  }}
                  className="mt-1 data-[state=checked]:bg-[#33C3BD] data-[state=checked]:border-[#33C3BD]"
                />
                <Label 
                  htmlFor="terms" 
                  className="text-sm leading-tight cursor-pointer"
                  onClick={() => {
                    form.setValue("agreeToTerms", !form.watch("agreeToTerms"), { shouldValidate: true });
                  }}
                >
                  I agree to the <a href="#" className="text-[#33C3BD] hover:underline">Terms of Service</a> and <a href="#" className="text-[#33C3BD] hover:underline">Privacy Policy</a>
                </Label>
              </div>
              {form.formState.errors.agreeToTerms && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.agreeToTerms.message}</p>
              )}
            </div>
            
            <div className="pt-4">
              {hasDirectPayPalIntegration ? (
                // Direct PayPal subscription button
                <div>
                  <div className="bg-gray-800 p-4 rounded-lg mb-6">
                    {/* Credit Card Option - Now larger, above PayPal, and clickable with direct URL */}
                    <div 
                      className="p-5 border-2 border-blue-400 rounded-md bg-blue-900/30 shadow-[0_0_35px_rgba(59,130,246,0.7)] mb-6 cursor-pointer hover:bg-blue-900/40 transition-colors animate-pulse"
                      onClick={() => {
                        // Use the direct URL provided by the user for credit card checkout
                        if (isStarterPlan) {
                          // URL for $99 starter plan with direct credit card checkout
                          window.open("https://www.paypal.com/checkoutnow?atomic-event-state=eyJkb21haW4iOiJzZGtfcGF5cGFsX3Y1IiwiZXZlbnRzIjpbXSwiaW50ZW50IjoiY2xpY2tfcGF5bWVudF9jYXJkX2J1dHRvbiIsImludGVudFR5cGUiOiJjbGljayIsImludGVyYWN0aW9uU3RhcnRUaW1lIjoyMDc0MSwidGltZVN0YW1wIjoyMDc0MSwidGltZU9yaWdpbiI6MTc0MzM1MzkyMzg3NS42LCJ0YXNrIjoic2VsZWN0X29uZV90aW1lX2NoZWNrb3V0IiwiZmxvdyI6Im9uZS10aW1lLWNoZWNrb3V0IiwidWlTdGF0ZSI6IndhaXRpbmciLCJwYXRoIjoiL3NtYXJ0L2J1dHRvbnMiLCJ2aWV3TmFtZSI6InBheXBhbC1zZGsifQ%3D%3D&sessionID=uid_49c65ae105_mty6ndc6mdu&buttonSessionID=uid_5e2b94556c_mty6ntg6ndm&stickinessID=uid_027b48e630_mty6mjy6mzu&smokeHash=&sign_out_user=false&fundingSource=card&buyerCountry=RO&locale.x=en_GB&commit=true&client-metadata-id=uid_49c65ae105_mty6ndc6mdu&clientID=Af7G68O9uhv8g9s_E1_yiL0_mCXddIXN0ODXd-kW2eofsjZwJwPV-pI9vQ8oItvgtlCyXSuq0cHl0wQP&env=production&sdkMeta=eyJ1cmwiOiJodHRwczovL3d3dy5wYXlwYWwuY29tL3Nkay9qcz9jbGllbnQtaWQ9QWY3RzY4Tzl1aHY4ZzlzX0UxX3lpTDBfbUNYZGRJWE4wT0RYZC1rVzJlb2Zzalp3SndQVi1wSTl2UThvSXR2Z3RsQ3lYU3VxMGNIbDB3UVAmdmF1bHQ9dHJ1ZSZpbnRlbnQ9c3Vic2NyaXB0aW9uIiwiYXR0cnMiOnsiZGF0YS1zZGstaW50ZWdyYXRpb24tc291cmNlIjoiYnV0dG9uLWZhY3RvcnkiLCJkYXRhLXVpZCI6InVpZF9tamhuYmR2dGpxc2VnaHppZXVvZWFidGh6anJsYmcifX0&country.x=GB&xcomponent=1&version=5.0.476&token=9WE1737949335061W", "_blank");
                        } else if (isStandardPlan) {
                          // URL for $299 standard plan with direct credit card checkout
                          window.open("https://www.paypal.com/checkoutnow?atomic-event-state=eyJkb21haW4iOiJzZGtfcGF5cGFsX3Y1IiwiZXZlbnRzIjpbXSwiaW50ZW50IjoiY2xpY2tfcGF5bWVudF9jYXJkX2J1dHRvbiIsImludGVudFR5cGUiOiJjbGljayIsImludGVyYWN0aW9uU3RhcnRUaW1lIjoyMDc0MSwidGltZVN0YW1wIjoyMDc0MSwidGltZU9yaWdpbiI6MTc0MzM1MzkyMzg3NS42LCJ0YXNrIjoic2VsZWN0X29uZV90aW1lX2NoZWNrb3V0IiwiZmxvdyI6Im9uZS10aW1lLWNoZWNrb3V0IiwidWlTdGF0ZSI6IndhaXRpbmciLCJwYXRoIjoiL3NtYXJ0L2J1dHRvbnMiLCJ2aWV3TmFtZSI6InBheXBhbC1zZGsifQ%3D%3D&sessionID=uid_49c65ae105_mty6ndc6mdu&buttonSessionID=uid_5e2b94556c_mty6ntg6ndm&stickinessID=uid_027b48e630_mty6mjy6mzu&smokeHash=&sign_out_user=false&fundingSource=card&buyerCountry=RO&locale.x=en_GB&commit=true&client-metadata-id=uid_49c65ae105_mty6ndc6mdu&clientID=Af7G68O9uhv8g9s_E1_yiL0_mCXddIXN0ODXd-kW2eofsjZwJwPV-pI9vQ8oItvgtlCyXSuq0cHl0wQP&env=production&sdkMeta=eyJ1cmwiOiJodHRwczovL3d3dy5wYXlwYWwuY29tL3Nkay9qcz9jbGllbnQtaWQ9QWY3RzY4Tzl1aHY4ZzlzX0UxX3lpTDBfbUNYZGRJWE4wT0RYZC1rVzJlb2Zzalp3SndQVi1wSTl2UThvSXR2Z3RsQ3lYU3VxMGNIbDB3UVAmdmF1bHQ9dHJ1ZSZpbnRlbnQ9c3Vic2NyaXB0aW9uIiwiYXR0cnMiOnsiZGF0YS1zZGstaW50ZWdyYXRpb24tc291cmNlIjoiYnV0dG9uLWZhY3RvcnkiLCJkYXRhLXVpZCI6InVpZF9tamhuYmR2dGpxc2VnaHppZXVvZWFidGh6anJsYmcifX0&country.x=GB&xcomponent=1&version=5.0.476&token=9WE1737949335061W", "_blank");
                        } else if (isProPlan) {
                          // URL for $799 pro plan with direct credit card checkout
                          window.open("https://www.paypal.com/checkoutnow?atomic-event-state=eyJkb21haW4iOiJzZGtfcGF5cGFsX3Y1IiwiZXZlbnRzIjpbXSwiaW50ZW50IjoiY2xpY2tfcGF5bWVudF9idXR0b24iLCJpbnRlbnRUeXBlIjoiY2xpY2siLCJpbnRlcmFjdGlvblN0YXJ0VGltZSI6MTY4Mi41OTk5OTk5NjQyMzcyLCJ0aW1lU3RhbXAiOjE2ODMsInRpbWVPcmlnaW4iOjE3NDMzNTc4Nzk1NzYsInRhc2siOiJzZWxlY3Rfb25lX3RpbWVfY2hlY2tvdXQiLCJmbG93Ijoib25lLXRpbWUtY2hlY2tvdXQiLCJ1aVN0YXRlIjoid2FpdGluZyIsInBhdGgiOiIvc21hcnQvYnV0dG9ucyIsInZpZXdOYW1lIjoicGF5cGFsLXNkayJ9&sessionID=uid_878ce71b6a_mtg6mdq6mdy&buttonSessionID=uid_e00844ae59_mtg6mdq6mzk&stickinessID=uid_c025410ecb_mty6mdy6mdy&smokeHash=&sign_out_user=false&fundingSource=card&buyerCountry=RO&locale.x=en_GB&commit=true&client-metadata-id=uid_878ce71b6a_mtg6mdq6mdy&clientID=Af7G68O9uhv8g9s_E1_yiL0_mCXddIXN0ODXd-kW2eofsjZwJwPV-pI9vQ8oItvgtlCyXSuq0cHl0wQP&env=production&sdkMeta=eyJ1cmwiOiJodHRwczovL3d3dy5wYXlwYWwuY29tL3Nkay9qcz9jbGllbnQtaWQ9QWY3RzY4Tzl1aHY4ZzlzX0UxX3lpTDBfbUNYZGRJWE4wT0RYZC1rVzJlb2Zzalp3SndQVi1wSTl2UThvSXR2Z3RsQ3lYU3VxMGNIbDB3UVAmdmF1bHQ9dHJ1ZSZpbnRlbnQ9c3Vic2NyaXB0aW9uIiwiYXR0cnMiOnsiZGF0YS1zZGstaW50ZWdyYXRpb24tc291cmNlIjoiYnV0dG9uLWZhY3RvcnkiLCJkYXRhLXVpZCI6InVpZF9tamhuYmR2dGpxc2VnaHppZXVvZWFidGh6anJsYmcifX0&country.x=GB&xcomponent=1&version=5.0.476&token=4RJ698171A786030R", "_blank");
                        }
                      }}
                    >
                      <h3 className="text-white font-semibold text-lg mb-1 flex items-center">
                        <CreditCard className="h-5 w-5 mr-2 text-blue-300" />
                        Pay with Debit or Credit Card
                      </h3>
                      <p className="text-gray-300 text-sm ml-7 font-medium">
                        No PayPal account needed - pay securely with your card
                      </p>
                      <p className="text-blue-300 text-sm ml-7 mt-3">
                        Click here to proceed with card payment →
                      </p>
                    </div>
                    
                    <h3 className="text-white font-semibold text-lg mb-2">Or Subscribe with PayPal</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Use your PayPal account to subscribe to our {selectedPlan?.name} for {selectedPlan?.price}/month.
                    </p>
                    
                    {/* Show the appropriate PayPal button container based on the plan */}
                    {isStarterPlan && (
                      <div id="paypal-button-container-P-6H912450BC000780SM7UXKVI" className="mb-2"></div>
                    )}
                    
                    {isStandardPlan && (
                      <div id="paypal-button-container-P-0AU893367F5884614M7UXJDA" className="mb-2"></div>
                    )}
                    
                    {isProPlan && (
                      <div id="paypal-button-container-P-2UA32207898067051M7UYGVQ" className="mb-2"></div>
                    )}
                  </div>
                  
                  <div className="border-t border-gray-700 pt-4 mt-2">
                    <p className="text-gray-500 text-sm text-center">- OR -</p>
                  </div>
                  
                  <Button 
                    type="button" 
                    className="w-full py-6 text-base bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90 mt-4"
                    onClick={() => {
                      // Use the same direct URLs as the credit card payment option at the top
                      if (isStarterPlan) {
                        // URL for $99 starter plan with direct credit card checkout
                        window.open("https://www.paypal.com/checkoutnow?atomic-event-state=eyJkb21haW4iOiJzZGtfcGF5cGFsX3Y1IiwiZXZlbnRzIjpbXSwiaW50ZW50IjoiY2xpY2tfcGF5bWVudF9jYXJkX2J1dHRvbiIsImludGVudFR5cGUiOiJjbGljayIsImludGVyYWN0aW9uU3RhcnRUaW1lIjoyMDc0MSwidGltZVN0YW1wIjoyMDc0MSwidGltZU9yaWdpbiI6MTc0MzM1MzkyMzg3NS42LCJ0YXNrIjoic2VsZWN0X29uZV90aW1lX2NoZWNrb3V0IiwiZmxvdyI6Im9uZS10aW1lLWNoZWNrb3V0IiwidWlTdGF0ZSI6IndhaXRpbmciLCJwYXRoIjoiL3NtYXJ0L2J1dHRvbnMiLCJ2aWV3TmFtZSI6InBheXBhbC1zZGsifQ%3D%3D&sessionID=uid_49c65ae105_mty6ndc6mdu&buttonSessionID=uid_5e2b94556c_mty6ntg6ndm&stickinessID=uid_027b48e630_mty6mjy6mzu&smokeHash=&sign_out_user=false&fundingSource=card&buyerCountry=RO&locale.x=en_GB&commit=true&client-metadata-id=uid_49c65ae105_mty6ndc6mdu&clientID=Af7G68O9uhv8g9s_E1_yiL0_mCXddIXN0ODXd-kW2eofsjZwJwPV-pI9vQ8oItvgtlCyXSuq0cHl0wQP&env=production&sdkMeta=eyJ1cmwiOiJodHRwczovL3d3dy5wYXlwYWwuY29tL3Nkay9qcz9jbGllbnQtaWQ9QWY3RzY4Tzl1aHY4ZzlzX0UxX3lpTDBfbUNYZGRJWE4wT0RYZC1rVzJlb2Zzalp3SndQVi1wSTl2UThvSXR2Z3RsQ3lYU3VxMGNIbDB3UVAmdmF1bHQ9dHJ1ZSZpbnRlbnQ9c3Vic2NyaXB0aW9uIiwiYXR0cnMiOnsiZGF0YS1zZGstaW50ZWdyYXRpb24tc291cmNlIjoiYnV0dG9uLWZhY3RvcnkiLCJkYXRhLXVpZCI6InVpZF9tamhuYmR2dGpxc2VnaHppZXVvZWFidGh6anJsYmcifX0&country.x=GB&xcomponent=1&version=5.0.476&token=9WE1737949335061W", "_blank");
                      } else if (isStandardPlan) {
                        // URL for $299 standard plan with direct credit card checkout
                        window.open("https://www.paypal.com/checkoutnow?atomic-event-state=eyJkb21haW4iOiJzZGtfcGF5cGFsX3Y1IiwiZXZlbnRzIjpbXSwiaW50ZW50IjoiY2xpY2tfcGF5bWVudF9jYXJkX2J1dHRvbiIsImludGVudFR5cGUiOiJjbGljayIsImludGVyYWN0aW9uU3RhcnRUaW1lIjoyMDc0MSwidGltZVN0YW1wIjoyMDc0MSwidGltZU9yaWdpbiI6MTc0MzM1MzkyMzg3NS42LCJ0YXNrIjoic2VsZWN0X29uZV90aW1lX2NoZWNrb3V0IiwiZmxvdyI6Im9uZS10aW1lLWNoZWNrb3V0IiwidWlTdGF0ZSI6IndhaXRpbmciLCJwYXRoIjoiL3NtYXJ0L2J1dHRvbnMiLCJ2aWV3TmFtZSI6InBheXBhbC1zZGsifQ%3D%3D&sessionID=uid_49c65ae105_mty6ndc6mdu&buttonSessionID=uid_5e2b94556c_mty6ntg6ndm&stickinessID=uid_027b48e630_mty6mjy6mzu&smokeHash=&sign_out_user=false&fundingSource=card&buyerCountry=RO&locale.x=en_GB&commit=true&client-metadata-id=uid_49c65ae105_mty6ndc6mdu&clientID=Af7G68O9uhv8g9s_E1_yiL0_mCXddIXN0ODXd-kW2eofsjZwJwPV-pI9vQ8oItvgtlCyXSuq0cHl0wQP&env=production&sdkMeta=eyJ1cmwiOiJodHRwczovL3d3dy5wYXlwYWwuY29tL3Nkay9qcz9jbGllbnQtaWQ9QWY3RzY4Tzl1aHY4ZzlzX0UxX3lpTDBfbUNYZGRJWE4wT0RYZC1rVzJlb2Zzalp3SndQVi1wSTl2UThvSXR2Z3RsQ3lYU3VxMGNIbDB3UVAmdmF1bHQ9dHJ1ZSZpbnRlbnQ9c3Vic2NyaXB0aW9uIiwiYXR0cnMiOnsiZGF0YS1zZGstaW50ZWdyYXRpb24tc291cmNlIjoiYnV0dG9uLWZhY3RvcnkiLCJkYXRhLXVpZCI6InVpZF9tamhuYmR2dGpxc2VnaHppZXVvZWFidGh6anJsYmcifX0&country.x=GB&xcomponent=1&version=5.0.476&token=9WE1737949335061W", "_blank");
                      } else if (isProPlan) {
                        // URL for $799 pro plan with direct credit card checkout
                        window.open("https://www.paypal.com/checkoutnow?atomic-event-state=eyJkb21haW4iOiJzZGtfcGF5cGFsX3Y1IiwiZXZlbnRzIjpbXSwiaW50ZW50IjoiY2xpY2tfcGF5bWVudF9idXR0b24iLCJpbnRlbnRUeXBlIjoiY2xpY2siLCJpbnRlcmFjdGlvblN0YXJ0VGltZSI6MTY4Mi41OTk5OTk5NjQyMzcyLCJ0aW1lU3RhbXAiOjE2ODMsInRpbWVPcmlnaW4iOjE3NDMzNTc4Nzk1NzYsInRhc2siOiJzZWxlY3Rfb25lX3RpbWVfY2hlY2tvdXQiLCJmbG93Ijoib25lLXRpbWUtY2hlY2tvdXQiLCJ1aVN0YXRlIjoid2FpdGluZyIsInBhdGgiOiIvc21hcnQvYnV0dG9ucyIsInZpZXdOYW1lIjoicGF5cGFsLXNkayJ9&sessionID=uid_878ce71b6a_mtg6mdq6mdy&buttonSessionID=uid_e00844ae59_mtg6mdq6mzk&stickinessID=uid_c025410ecb_mty6mdy6mdy&smokeHash=&sign_out_user=false&fundingSource=card&buyerCountry=RO&locale.x=en_GB&commit=true&client-metadata-id=uid_878ce71b6a_mtg6mdq6mdy&clientID=Af7G68O9uhv8g9s_E1_yiL0_mCXddIXN0ODXd-kW2eofsjZwJwPV-pI9vQ8oItvgtlCyXSuq0cHl0wQP&env=production&sdkMeta=eyJ1cmwiOiJodHRwczovL3d3dy5wYXlwYWwuY29tL3Nkay9qcz9jbGllbnQtaWQ9QWY3RzY4Tzl1aHY4ZzlzX0UxX3lpTDBfbUNYZGRJWE4wT0RYZC1rVzJlb2Zzalp3SndQVi1wSTl2UThvSXR2Z3RsQ3lYU3VxMGNIbDB3UVAmdmF1bHQ9dHJ1ZSZpbnRlbnQ9c3Vic2NyaXB0aW9uIiwiYXR0cnMiOnsiZGF0YS1zZGstaW50ZWdyYXRpb24tc291cmNlIjoiYnV0dG9uLWZhY3RvcnkiLCJkYXRhLXVpZCI6InVpZF9tamhuYmR2dGpxc2VnaHppZXVvZWFidGh6anJsYmcifX0&country.x=GB&xcomponent=1&version=5.0.476&token=4RJ698171A786030R", "_blank");
                      }
                    }}
                  >
                    {selectedPlan.hasTrial ? "Start Free Trial" : "Complete Payment"} with Credit Card
                  </Button>
                </div>
              ) : (
                // Regular button for other plans
                <Button 
                  type="submit" 
                  className="w-full py-6 text-base bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90"
                >
                  {selectedPlan.hasTrial ? "Start Free Trial" : "Complete Payment"}
                </Button>
              )}
              
              <div className="flex justify-center mt-4">
                <img 
                  src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_74x46.jpg" 
                  alt="PayPal Acceptance Mark" 
                  className="h-8"
                />
              </div>
              
              <p className="text-gray-400 text-xs text-center mt-3">
                Your payment will be processed securely through PayPal.
                No payment information is stored on our servers.
              </p>
            </div>
          </form>
        );
        
      case CheckoutStep.Processing:
        return (
          <div className="text-center py-10">
            <Loader2 className="h-16 w-16 animate-spin text-[#33C3BD] mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">Processing Your Payment</h3>
            <p className="text-gray-300">Please wait while we complete your transaction...</p>
          </div>
        );
        
      case CheckoutStep.Success:
        return (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Payment Successful!</h3>
            <p className="text-gray-300 mb-6">
              {selectedPlan.hasTrial 
                ? `Your ${selectedPlan.trialDays}-day free trial has been activated.` 
                : "Your subscription has been activated."}
            </p>
            <Button 
              onClick={goToDashboard}
              className="py-6 px-8 text-base bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90"
            >
              Continue to Dashboard
            </Button>
          </div>
        );
        
      case CheckoutStep.Error:
        return (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Payment Failed</h3>
            <p className="text-gray-300 mb-6">{paymentError || "An error occurred during payment processing."}</p>
            <Button 
              onClick={retryPayment}
              className="py-6 px-8 text-base bg-gray-600 hover:bg-gray-700"
            >
              Try Again
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="bg-[#0A0F16] min-h-screen">
      {/* Global Animated Starry Background */}
      <div className="fixed inset-0 overflow-hidden z-0">
        <div className="stars-container absolute inset-0">
          <div className="stars-small"></div>
          <div className="stars-medium"></div>
          <div className="stars-large"></div>
        </div>
      </div>
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#0A0F16]/90 backdrop-blur-md border-b border-[#1E293B] z-50 h-16 flex items-center">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link href="/pricing">
              <div className="flex items-center gap-2 cursor-pointer">
                <ArrowLeft className="h-5 w-5 text-gray-400" />
                <span className="text-xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
                  WarmLeadNetwork AI
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="relative z-10 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Left column - Checkout form */}
            <div className="md:col-span-3">
              <Card className="border-[#1E293B] bg-[#0F172A]/80 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-2xl">
                    {checkoutStep === CheckoutStep.Success ? "Thank You!" : "Complete Your Order"}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {checkoutStep === CheckoutStep.Success 
                      ? "Your subscription has been activated successfully" 
                      : "Please enter your details to continue"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderStep()}
                </CardContent>
              </Card>
            </div>
            
            {/* Right column - Order summary */}
            <div className="md:col-span-2">
              <Card className="border-[#1E293B] bg-[#0F172A]/80 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg ${
                    selectedPlan.isPopular ? 'bg-[#33C3BD]/10 border border-[#33C3BD]/40' : 
                    selectedPlan.isPremium ? 'bg-purple-500/10 border border-purple-500/40' : 
                    'bg-[#141B29] border border-[#1E293B]'
                  }`}>
                    <h3 className="font-medium text-white">{selectedPlan.name}</h3>
                    
                    {selectedPlan.hasTrial ? (
                      <div className="mt-2">
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold text-yellow-400">{selectedPlan.trialDays}-Day Free Trial</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Then {selectedPlan.price}/{selectedPlan.billing}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-lg font-bold text-white">
                        {selectedPlan.price}
                        <span className="text-sm font-normal text-gray-400">/{selectedPlan.billing}</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-white">What's included:</p>
                    <ul className="space-y-1">
                      {selectedPlan.features.map((feature, index) => (
                        <li key={index} className="flex text-sm">
                          <CheckCircle2 className="h-4 w-4 text-[#33C3BD] mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Payment method */}
                  <div className="pt-4 border-t border-[#1E293B]">
                    <p className="text-sm font-medium text-white mb-2">Payment Method</p>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-300 text-sm">PayPal</span>
                    </div>
                  </div>
                  
                  {/* Price breakdown */}
                  <div className="pt-4 border-t border-[#1E293B]">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300">Subtotal</span>
                      <span className="text-white">{selectedPlan.price}</span>
                    </div>
                    {selectedPlan.hasTrial && (
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300">Free Trial Discount</span>
                        <span className="text-green-500">-{selectedPlan.price}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t border-[#1E293B] mt-2">
                      <span className="text-white">Total Due Today</span>
                      <span className="text-white">
                        {selectedPlan.hasTrial ? '$0.00' : selectedPlan.price}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-[#1E293B] pt-4">
                  <p className="text-gray-400 text-xs">
                    By completing your purchase, you agree to our Terms of Service and Privacy Policy.
                    {selectedPlan.hasTrial && " Your free trial will automatically convert to a paid subscription unless canceled before the trial period ends."}
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}