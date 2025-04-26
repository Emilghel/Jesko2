import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Coins, CreditCard, ShieldCheck, Lock, ArrowLeft, Info, CheckCircle2, Zap, Star, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Elements } from '@stripe/react-stripe-js';
import { createTokenPaymentIntent, getStripe, verifyPayment } from '@/lib/stripe';
import StripeCheckoutForm from '@/components/checkout/StripeCheckoutForm';
import CustomCreditCardForm from '@/components/checkout/CustomCreditCardForm';

// Define package type interface
interface TokenPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  features: string[];
  icon: React.ReactNode;
  color: string;
  recommended?: boolean;
}

// Token packages
const TOKEN_PACKAGES: Record<string, TokenPackage> = {
  '100': {
    id: '100',
    name: 'Basic',
    coins: 100,
    price: 4.87,
    features: ['100 AI tokens', 'Generate ~100 words'],
    icon: <Coins className="h-8 w-8 mb-2 text-yellow-500" />,
    color: 'from-yellow-400 to-yellow-600',
  },
  '500': {
    id: '500',
    name: 'Standard',
    coins: 500,
    price: 9.87,
    features: ['500 AI tokens', 'Generate ~500 words', 'Best value'],
    icon: <Zap className="h-8 w-8 mb-2 text-cyan-500" />,
    color: 'from-cyan-400 to-blue-600',
    recommended: true
  },
  '5000': {
    id: '5000',
    name: 'Pro',
    coins: 5000,
    price: 28.87,
    features: ['5000 AI tokens', 'Generate ~5000 words', 'Save 71%'],
    icon: <Star className="h-8 w-8 mb-2 text-violet-500" />,
    color: 'from-purple-400 to-violet-600',
  }
};

// Custom CSS keyframes for animations
const sparkleKeyframes = `
@keyframes sparkle {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: scale(1) rotate(180deg); opacity: 0; }
}
`;

const TokenCheckoutPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [packageId, setPackageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentTab, setPaymentTab] = useState('credit-card');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  
  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [saveCard, setSaveCard] = useState(false);
  
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
    const packageParam = params.get('package');
    
    if (packageParam && TOKEN_PACKAGES[packageParam as keyof typeof TOKEN_PACKAGES]) {
      setPackageId(packageParam);
    } else {
      // Default to standard package if none specified
      setPackageId('500');
    }
    
    // Pre-fill with user data if available
    if (user) {
      setEmail(user.email || '');
      setCardName(user.displayName || user.username || '');
    }
  }, [user]);
  
  // Apply promo code handler
  const handleApplyPromo = () => {
    if (!promoCode) return;
    
    // For demonstration purposes, just accept any code
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setPromoApplied(true);
      setDiscountPercent(15);
      
      toast({
        title: "Promo Code Applied!",
        description: "You received a 15% discount.",
      });
    }, 1000);
  };
  
  // Calculate order summary
  const selectedPackage = packageId ? TOKEN_PACKAGES[packageId as keyof typeof TOKEN_PACKAGES] : null;
  const subtotal = selectedPackage ? selectedPackage.price : 0;
  const discount = promoApplied ? subtotal * (discountPercent / 100) : 0;
  const total = subtotal - discount;
  
  // State for Stripe
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  
  // Create a payment intent when the package changes
  useEffect(() => {
    const initializePaymentIntent = async () => {
      if (!packageId || !selectedPackage) return;
      
      try {
        setIsLoading(true);
        
        // Create a payment intent with our API for tokens
        const finalAmount = total; // Use the total after any discounts
        const result = await createTokenPaymentIntent(
          finalAmount, 
          packageId, 
          selectedPackage.coins
        );
        
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
  }, [packageId, selectedPackage, total, toast]);
  
  // Handle payment success
  const handlePaymentSuccess = (paymentIntentId: string, params: URLSearchParams) => {
    toast({
      title: "Purchase Successful!",
      description: `You've successfully purchased ${selectedPackage?.coins} tokens!`,
    });
    
    // Redirect to success page
    const successParams = new URLSearchParams({
      type: 'tokens',
      package: packageId || '',
      ...Object.fromEntries(params)
    });
    
    setLocation(`/payment-success?${successParams.toString()}`);
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
  
  return (
    <div className="min-h-screen bg-[#0A0F16] text-gray-200">
      {/* Add custom keyframes for animations */}
      <style>{sparkleKeyframes}</style>
      
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
          onClick={() => setLocation('/ai-tokens')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Token Packages
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout form section */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-2xl">Purchase AI Tokens</CardTitle>
                <CardDescription className="text-gray-400">
                  {packageId && selectedPackage ? 
                    `You're purchasing the ${selectedPackage.name} package with ${selectedPackage.coins} tokens` : 
                    'Please select a token package to continue'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Select Token Package</h3>
                    <RadioGroup 
                      value={packageId || ''} 
                      onValueChange={setPackageId}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      {Object.values(TOKEN_PACKAGES).map((pkg) => (
                        <div key={pkg.id} className={`relative ${pkg.recommended ? 'order-first md:order-none' : ''}`}>
                          {pkg.recommended && (
                            <div className="absolute -top-2 left-0 right-0 flex justify-center">
                              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-xs py-0.5 px-2 rounded-full">
                                RECOMMENDED
                              </span>
                            </div>
                          )}
                          <label
                            htmlFor={`package-${pkg.id}`}
                            className={`
                              flex flex-col p-4 rounded-lg cursor-pointer border border-gray-700
                              ${packageId === pkg.id ? 'bg-gradient-to-br ' + pkg.color + ' bg-opacity-10 border-transparent' : 'bg-gray-800/50 hover:bg-gray-800/80'}
                              transition-all duration-200
                              ${packageId === pkg.id ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-' + (pkg.color.includes('cyan') ? 'cyan' : pkg.color.includes('yellow') ? 'yellow' : 'purple') + '-500' : ''}
                            `}
                          >
                            <div className="flex items-start">
                              <RadioGroupItem 
                                value={pkg.id} 
                                id={`package-${pkg.id}`} 
                                className="mt-1"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    {pkg.icon}
                                    <span className="font-medium ml-2">{pkg.name}</span>
                                  </div>
                                  <span className="font-bold">${pkg.price.toFixed(2)}</span>
                                </div>
                                <div className="mt-2 text-sm bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent font-bold">
                                  {pkg.coins} Tokens
                                </div>
                                <ul className="mt-2 space-y-1 text-sm">
                                  {pkg.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center">
                                      <CheckCircle2 className="h-3 w-3 mr-1.5 flex-shrink-0 text-green-500" />
                                      <span className="text-gray-300">{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
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
                      {clientSecret ? (
                        <>
                          {/* Use our custom credit card form component */}
                          <CustomCreditCardForm
                            onSubmit={async (formData) => {
                              try {
                                setIsLoading(true);
                                
                                // In a real implementation, this would use Stripe.js to create a token
                                // For now, we'll just simulate a successful payment
                                setTimeout(() => {
                                  toast({
                                    title: "Payment Successful",
                                    description: `You've purchased ${selectedPackage?.coins} tokens!`,
                                  });
                                  
                                  // Simulate a successful payment
                                  const mockPaymentId = `pi_${Date.now()}`;
                                  const successParams = new URLSearchParams({
                                    type: 'tokens',
                                    package: packageId || '',
                                    tokens: selectedPackage?.coins.toString() || '0'
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
                            buttonText={`Buy ${selectedPackage?.coins} Tokens`}
                          />
                          
                          {/* Keep the Stripe Elements too in case it starts working */}
                          <div className="hidden">
                            <Elements
                              stripe={getStripe()}
                              options={{
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
                                  }
                                }
                              }}
                            >
                              <StripeCheckoutForm
                                hasTrial={false}
                                trialDays={0}
                                planName={selectedPackage?.name || ''}
                                planId={packageId || ''}
                                onSuccess={handlePaymentSuccess}
                                onError={handlePaymentError}
                              />
                            </Elements>
                          </div>
                        </>
                      ) : (
                        <div className="py-8 flex flex-col items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                          <p className="text-gray-400">Preparing secure payment form...</p>
                        </div>
                      )}
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
                  
                  {/* Button is now inside Stripe form component */}
                </div>
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
                {selectedPackage ? (
                  <>
                    <div className="space-y-4">
                      <div className={`bg-gradient-to-br ${selectedPackage.color} bg-opacity-10 rounded-lg p-4 border border-transparent`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {selectedPackage.icon}
                            <h3 className="font-medium text-lg text-white ml-2">{selectedPackage.name} Package</h3>
                          </div>
                        </div>
                        <div className="flex items-center mb-1">
                          <Coins className="h-4 w-4 mr-1.5 text-yellow-500" />
                          <span className="text-white font-bold">{selectedPackage.coins} Tokens</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-300">
                          1 token = 1 word in AI-generated voiceovers
                        </div>
                      </div>
                      
                      {/* Promo code section */}
                      <div className="bg-gray-800/70 rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-3">Have a promo code?</h4>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Enter promo code"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            className="bg-gray-900/60 border-gray-700"
                            disabled={promoApplied || isLoading}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleApplyPromo}
                            disabled={!promoCode || promoApplied || isLoading}
                          >
                            {isLoading ? 
                              <Loader2 className="h-4 w-4 animate-spin" /> : 
                              promoApplied ? 'Applied' : 'Apply'
                            }
                          </Button>
                        </div>
                        {promoApplied && (
                          <p className="text-green-500 text-xs mt-2 flex items-center">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {discountPercent}% discount applied!
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {promoApplied && (
                          <div className="flex justify-between text-green-500">
                            <span>Discount ({discountPercent}%)</span>
                            <span>-${discount.toFixed(2)}</span>
                          </div>
                        )}
                        <Separator className="my-2 bg-gray-700" />
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      <div className="bg-gray-800/50 rounded-lg p-4 text-sm">
                        <h4 className="font-medium flex items-center mb-2">
                          <Info className="h-4 w-4 mr-2 text-blue-400" />
                          Token Information
                        </h4>
                        <ul className="space-y-2 text-gray-400">
                          <li className="flex items-start">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500 shrink-0 mt-0.5" />
                            <span>Tokens never expire</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500 shrink-0 mt-0.5" />
                            <span>Used for AI voice generation</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500 shrink-0 mt-0.5" />
                            <span>Instant access after purchase</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500 shrink-0 mt-0.5" />
                            <span>Viewable token balance in account</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <Info className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Please select a token package to see order details</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-gray-800 flex justify-center">
                <div className="flex items-center text-xs text-gray-400">
                  <ShieldCheck className="h-3 w-3 mr-1 text-green-500" />
                  <span>Secure, instant token delivery</span>
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

export default TokenCheckoutPage;