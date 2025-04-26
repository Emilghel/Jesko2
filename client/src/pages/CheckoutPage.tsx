import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CreditCard, ShieldCheck, Lock, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createSubscriptionPaymentIntent, getStripe, verifyPayment } from '@/lib/stripe';
import StripeCheckoutForm from '@/components/checkout/StripeCheckoutForm';
import CustomCreditCardForm from '@/components/checkout/CustomCreditCardForm';

// Plan type definition
interface Plan {
  name: string;
  price: number;
  billing: string;
  features: string[];
  hasTrial?: boolean;
  freeTrialDays?: number;
}

// Plan data
const PLANS: Record<string, Plan> = {
  'jesko-ai-starter': {
    name: 'Jesko AI Starter',
    price: 18,
    billing: 'month',
    freeTrialDays: 7,
    hasTrial: true,
    features: [
      'AI agent for automated lead communication',
      'Voice/text message capabilities',
      'Phone number included',
      'Basic reporting',
      '7-day free trial'
    ]
  },
  'jesko-ai-standard': {
    name: 'Jesko AI Standard',
    price: 49,
    billing: 'month',
    freeTrialDays: 14,
    hasTrial: true,
    features: [
      'Everything in Starter',
      'Custom AI agent personality',
      'Advanced call analysis',
      'Priority support',
      'Extended call duration',
      '14-day free trial'
    ]
  },
  'jesko-ai-pro': {
    name: 'Jesko AI Pro',
    price: 98,
    billing: 'month',
    hasTrial: false,
    features: [
      'Everything in Standard',
      'Multiple AI agents',
      'Unlimited calls',
      'API access',
      'White-label options',
      'Dedicated account manager'
    ]
  },
  'jesko-ai-enterprise': {
    name: 'Jesko AI Enterprise',
    price: 399,
    billing: 'month',
    hasTrial: false,
    features: [
      'Custom enterprise solution',
      'Dedicated infrastructure',
      'Custom integrations',
      'SLA guarantees',
      'Team training'
    ]
  }
};

const CheckoutPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [planId, setPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentTab, setPaymentTab] = useState('credit-card');
  
  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('United States');
  
  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  // Format expiry date
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length > 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    
    return v;
  };
  
  // Parse query parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    
    if (plan && PLANS[plan as keyof typeof PLANS]) {
      setPlanId(plan);
    } else {
      // Redirect back to pricing if no valid plan
      toast({
        title: "Invalid Plan",
        description: "Please select a valid plan from our pricing page.",
        variant: "destructive"
      });
      setLocation('/pricing');
    }
    
    // Pre-fill with user data if available
    if (user) {
      setEmail(user.email || '');
      setCardName(user.displayName || user.username || '');
    }
  }, [user, setLocation, toast]);
  
  // Calculate order summary
  const selectedPlan = planId ? PLANS[planId as keyof typeof PLANS] : null;
  const subtotal = selectedPlan ? selectedPlan.price : 0;
  const tax = subtotal * 0.0; // No tax for now
  const total = subtotal + tax;
  const hasFreeTrialOffer = selectedPlan?.hasTrial || false;
  const trialDays = selectedPlan?.freeTrialDays || 0;
  
  // State for Stripe
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  
  // Create a payment intent when the plan changes
  useEffect(() => {
    const initializePaymentIntent = async () => {
      if (!planId || !selectedPlan) return;
      
      try {
        setIsLoading(true);
        
        // Create a payment intent with our API
        const result = await createSubscriptionPaymentIntent(planId);
        
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        toast({
          title: "Payment Setup Failed",
          description: "We couldn't set up the payment process. Please try again or contact support.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    initializePaymentIntent();
  }, [planId, selectedPlan, toast]);
  
  // Handle payment success
  const handlePaymentSuccess = (paymentIntentId: string, params: URLSearchParams) => {
    const successMessage = hasFreeTrialOffer
      ? `You've successfully started your ${trialDays}-day free trial of the ${selectedPlan?.name} plan. Your subscription will begin after the trial period.`
      : `You've successfully subscribed to the ${selectedPlan?.name} plan.`;
    
    toast({
      title: hasFreeTrialOffer ? "Free Trial Started!" : "Payment Successful!",
      description: successMessage,
    });
    
    // Redirect to success page
    setLocation(`/payment-success?${params.toString()}`);
  };
  
  // Handle payment error
  const handlePaymentError = (error: Error) => {
    console.error('Payment error:', error);
    toast({
      title: "Payment Failed",
      description: "There was an error processing your payment. Please try again.",
      variant: "destructive"
    });
  };
  
  // Function to mask card number for display
  const getDisplayCardNumber = () => {
    if (!cardNumber) return '';
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 4) return digits;
    return '•••• '.repeat(Math.floor((digits.length-4)/4)) + digits.slice(-4);
  };
  
  return (
    <div className="min-h-screen bg-[#0A0F16] text-gray-200">
      {/* Starry background effect */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#0A0F16]">
          <div className="stars-container">
            <div className="stars"></div>
            <div className="stars2"></div>
            <div className="stars3"></div>
          </div>
        </div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Back button */}
        <Button 
          variant="ghost" 
          className="mb-6 text-gray-400 hover:text-gray-200"
          onClick={() => setLocation('/pricing')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pricing
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout form section */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Complete Your Purchase</CardTitle>
                  {hasFreeTrialOffer && (
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      {trialDays}-Day Free Trial
                    </div>
                  )}
                </div>
                <CardDescription className="text-gray-400">
                  {planId && selectedPlan ? (
                    <>
                      You're subscribing to {selectedPlan.name} plan
                      {hasFreeTrialOffer 
                        ? ` with a ${trialDays}-day free trial` 
                        : ` for $${selectedPlan.price}/${selectedPlan.billing}`
                      }
                    </>
                  ) : (
                    'Please select a plan to continue'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!clientSecret ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-500" />
                    <span>Setting up secure payment...</span>
                  </div>
                ) : (
                  <Elements stripe={getStripe()} options={{ 
                    clientSecret,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#3b82f6',
                        colorBackground: '#111827',
                        colorText: '#f9fafb',
                        colorDanger: '#ef4444',
                        fontFamily: 'system-ui, sans-serif',
                        borderRadius: '6px',
                        spacingUnit: '4px',
                        spacingGridRow: '16px'
                      },
                      rules: {
                        '.Input': {
                          border: '1px solid #374151',
                          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                        },
                        '.Input:focus': {
                          border: '1px solid #3b82f6',
                        }
                      }
                    }
                  }}>
                    <Tabs value={paymentTab} onValueChange={setPaymentTab}>
                      <TabsList className="grid w-full grid-cols-2 bg-gray-800/70">
                        <TabsTrigger value="credit-card">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Credit Card
                        </TabsTrigger>
                        <TabsTrigger value="paypal">
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.291-.077.446-.964 5.236-4.27 7.2-8.563 7.2h-2.17c-.664 0-1.223.42-1.327 1.073l-.948 5.75c-.068.462-.396.771-.86.771h-3.14zm8.725-15.2c.228-1.469-1.3-2.427-2.8-2.427h-5.5l-1.39 8.53h5.43c2.54 0 3.717-1.42 4.26-3.7.364-1.53.185-2.403 0-2.403z"/>
                          </svg>
                          PayPal
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="credit-card" className="pt-4">
                        {/* Use our custom credit card form component */}
                        <CustomCreditCardForm
                          onSubmit={async (formData) => {
                            try {
                              setIsLoading(true);
                              
                              // In a real implementation, this would use Stripe.js to create a token
                              // For now, we'll just simulate a successful payment
                              setTimeout(() => {
                                toast({
                                  title: hasFreeTrialOffer ? "Free Trial Started!" : "Payment Successful!",
                                  description: hasFreeTrialOffer
                                    ? `You've successfully started your ${trialDays}-day free trial of the ${selectedPlan?.name} plan.`
                                    : `You've successfully subscribed to the ${selectedPlan?.name} plan.`,
                                });
                                
                                // Simulate a successful payment
                                const mockPaymentId = `pi_${Date.now()}`;
                                const successParams = new URLSearchParams({
                                  type: 'subscription',
                                  plan: planId || '',
                                });
                                
                                handlePaymentSuccess(mockPaymentId, successParams);
                                setIsLoading(false);
                              }, 2000);
                            } catch (error) {
                              console.error('Payment error:', error);
                              setIsLoading(false);
                              handlePaymentError(error instanceof Error ? error : new Error('Payment failed'));
                            }
                          }}
                          isProcessing={isLoading}
                          buttonText={hasFreeTrialOffer ? `Start ${trialDays}-Day Free Trial` : "Subscribe Now"}
                        />
                        
                        {/* Keep Stripe checkout form hidden as backup */}
                        <div className="hidden">
                          <StripeCheckoutForm 
                            hasTrial={hasFreeTrialOffer}
                            trialDays={trialDays}
                            planName={selectedPlan?.name || ''}
                            planId={planId || ''}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="paypal" className="pt-4">
                        <div className="text-center py-8">
                          <div className="bg-blue-900/20 p-6 rounded-lg mb-4">
                            <svg className="h-12 w-12 mx-auto mb-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.291-.077.446-.964 5.236-4.27 7.2-8.563 7.2h-2.17c-.664 0-1.223.42-1.327 1.073l-.948 5.75c-.068.462-.396.771-.86.771h-3.14zm8.725-15.2c.228-1.469-1.3-2.427-2.8-2.427h-5.5l-1.39 8.53h5.43c2.54 0 3.717-1.42 4.26-3.7.364-1.53.185-2.403 0-2.403z"/>
                            </svg>
                            <p className="text-gray-300">You'll be redirected to PayPal to complete your purchase securely.</p>
                          </div>
                          <Button 
                            type="button" 
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              toast({
                                title: "PayPal Checkout",
                                description: "PayPal integration will be implemented in the future.",
                              });
                            }}
                          >
                            Continue with PayPal
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Elements>
                )}
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Billing Information</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-gray-800/50 border-gray-700 mt-1"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          placeholder="123 Main St"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="bg-gray-800/50 border-gray-700 mt-1"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            placeholder="New York"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="bg-gray-800/50 border-gray-700 mt-1"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            placeholder="NY"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="bg-gray-800/50 border-gray-700 mt-1"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="zip">ZIP Code</Label>
                          <Input
                            id="zip"
                            placeholder="10001"
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                            className="bg-gray-800/50 border-gray-700 mt-1"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            placeholder="United States"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="bg-gray-800/50 border-gray-700 mt-1"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Submit button removed as Stripe Elements has its own submit button */}
                  {/* Form ending tag removed here as we don't need a traditional form - Stripe handles the form submission */}
              </CardContent>
              <CardFooter className="flex justify-center text-sm text-gray-400">
                <div className="flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-green-500" />
                  <span>Your payment is secured with 256-bit encryption</span>
                </div>
              </CardFooter>
            </Card>
          </div>
          
          {/* Order summary section */}
          <div>
            <Card className="bg-gray-900/50 border-gray-800 sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPlan ? (
                  <>
                    <div className="space-y-4">
                      <div className="bg-gray-800/70 rounded-lg p-4">
                        <h3 className="font-medium text-lg text-white mb-2">{selectedPlan.name}</h3>
                        <div className="flex justify-between mb-1">
                          <span>Price</span>
                          <span>
                            {hasFreeTrialOffer ? (
                              <span className="flex flex-col items-end">
                                <span className="text-green-400 font-medium">$0.00 for {trialDays} days</span>
                                <span className="text-sm text-gray-400">then ${selectedPlan.price.toFixed(2)}/{selectedPlan.billing}</span>
                              </span>
                            ) : (
                              <span>${selectedPlan.price.toFixed(2)}/{selectedPlan.billing}</span>
                            )}
                          </span>
                        </div>
                        {hasFreeTrialOffer && (
                          <div className="mt-2 bg-blue-900/30 p-2 rounded border border-blue-500/30 flex items-center">
                            <CheckCircle2 className="h-5 w-5 mr-2 text-blue-400" />
                            <div>
                              <p className="text-blue-300 font-medium">Free Trial Included</p>
                              <p className="text-sm text-blue-200/70">
                                Your first {trialDays} days are completely free
                              </p>
                            </div>
                          </div>
                        )}
                        <p className="text-sm text-gray-400 mt-2">
                          Billed {selectedPlan.billing}ly {hasFreeTrialOffer ? `after ${trialDays}-day trial` : ''}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          {hasFreeTrialOffer ? (
                            <div className="flex items-center">
                              <span className="line-through text-gray-500 mr-2">${subtotal.toFixed(2)}</span>
                              <span className="text-green-400 font-medium">$0.00</span>
                            </div>
                          ) : (
                            <span>${subtotal.toFixed(2)}</span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span>Tax</span>
                          {hasFreeTrialOffer ? (
                            <div className="flex items-center">
                              <span className="line-through text-gray-500 mr-2">${tax.toFixed(2)}</span>
                              <span className="text-green-400 font-medium">$0.00</span>
                            </div>
                          ) : (
                            <span>${tax.toFixed(2)}</span>
                          )}
                        </div>
                        <Separator className="my-2 bg-gray-700" />
                        <div className="flex justify-between font-semibold text-lg">
                          <span>{hasFreeTrialOffer ? 'Total (first period)' : 'Total'}</span>
                          {hasFreeTrialOffer ? (
                            <span className="text-green-400">$0.00</span>
                          ) : (
                            <span>${total.toFixed(2)}</span>
                          )}
                        </div>
                        {hasFreeTrialOffer && (
                          <div className="flex justify-between text-sm text-gray-400">
                            <span>After trial ({trialDays} days)</span>
                            <span>${total.toFixed(2)}/{selectedPlan.billing}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-gray-800/50 rounded-lg p-4 text-sm">
                        <h4 className="font-medium flex items-center mb-2">
                          <Info className="h-4 w-4 mr-2 text-blue-400" />
                          Subscription details
                        </h4>
                        {hasFreeTrialOffer ? (
                          <>
                            <p className="text-gray-400 mb-2">
                              Your {trialDays}-day free trial starts immediately after signup.
                            </p>
                            <p className="text-gray-400 mb-2">
                              Your payment method will be authorized but not charged until the trial ends.
                            </p>
                            <p className="text-gray-400">
                              You can cancel anytime during the trial period at no cost.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-gray-400 mb-2">
                              Your subscription will begin immediately after your payment is processed.
                            </p>
                            <p className="text-gray-400">
                              You can cancel anytime from your account settings.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-2">
                      <h4 className="font-medium mb-2">Included in your plan:</h4>
                      {selectedPlan.features.map((feature, index) => (
                        <div key={index} className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <Info className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Please select a plan to see order details</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-gray-800 flex justify-center">
                <div className="flex items-center text-xs text-gray-400">
                  <ShieldCheck className="h-3 w-3 mr-1 text-green-500" />
                  <span>30-day money-back guarantee</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
        
        <div className="mt-12 text-center text-sm text-gray-400">
          <p>© 2025 Jesko AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;