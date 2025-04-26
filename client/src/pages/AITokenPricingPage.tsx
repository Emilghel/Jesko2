import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Check, Sparkles, Zap, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import CoinBalance from '@/components/CoinBalance';

// Keyframes for the floating animation
const floatingKeyframes = `
@keyframes floating {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}
`;

// Keyframes for the shine effect
const shineKeyframes = `
@keyframes shine {
  0% { background-position: -100px; }
  40%, 100% { background-position: 300px; }
}
`;

// Sparkle animation
const sparkleKeyframes = `
@keyframes sparkle {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: scale(1) rotate(180deg); opacity: 0; }
}
`;

// Token package options
const packages = [
  {
    id: '100',
    name: 'Basic',
    coins: 100,
    price: 4.87,
    features: ['100 AI tokens', 'Generate ~100 words'],
    icon: <Coins className="h-12 w-12 mb-2 text-yellow-500" />,
    color: 'from-yellow-400 to-yellow-600',
    recommended: false
  },
  {
    id: '500',
    name: 'Standard',
    coins: 500,
    price: 9.87,
    features: ['500 AI tokens', 'Generate ~500 words', 'Best value'],
    icon: <Zap className="h-12 w-12 mb-2 text-cyan-500" />,
    color: 'from-cyan-400 to-blue-600',
    recommended: true
  },
  {
    id: '5000',
    name: 'Pro',
    coins: 5000,
    price: 28.87,
    features: ['5000 AI tokens', 'Generate ~5000 words', 'Save 71%'],
    icon: <Star className="h-12 w-12 mb-2 text-violet-500" />,
    color: 'from-purple-400 to-violet-600',
    recommended: false
  }
];

const AITokenPricingPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Check if there's a saved package selection after login
  useEffect(() => {
    // Only run this if the user is logged in
    if (user) {
      const savedPackage = localStorage.getItem('selectedTokenPackage');
      if (savedPackage) {
        // Clear the saved selection
        localStorage.removeItem('selectedTokenPackage');
        
        // Show notification instead of redirecting to checkout
        console.log(`AITokenPricingPage: Found saved package ${savedPackage}, but checkout is disabled`);
        toast({
          title: "Previous Token Package",
          description: `You previously selected the ${savedPackage} token package. Checkout features have been removed.`,
          duration: 5000,
        });
      }
    }
  }, [user, toast]);

  const handlePurchase = async (packageId: string) => {
    console.log(`AITokenPricingPage: Purchase initiated for package ${packageId}`);
    
    if (!user) {
      // Store the package ID in localStorage so we can redirect back after login
      console.log(`AITokenPricingPage: User not logged in, redirecting to auth`);
      localStorage.setItem('selectedTokenPackage', packageId);
      toast({
        title: "Login Required",
        description: "Please login to continue",
        variant: "destructive"
      });
      
      // Use direct navigation for consistent behavior
      window.location.href = "/auth";
      
      // Fallback in case direct navigation doesn't work immediately
      setTimeout(() => {
        console.log("AITokenPricingPage: Using router navigation to auth as fallback");
        setLocation('/auth');
      }, 100);
      
      return;
    }

    setSelectedPackage(packageId);
    setIsPurchasing(true);

    try {
      // Find the selected package details
      const selectedPkg = packages.find(pkg => pkg.id === packageId);
      const packageName = selectedPkg ? selectedPkg.name : packageId;
      
      // Redirect to the token checkout page
      console.log(`AITokenPricingPage: User logged in, redirecting to token checkout for package ID: ${packageId}`);
      
      toast({
        title: "Checkout Ready",
        description: `Taking you to checkout for the ${packageName} package (${packageId} tokens)...`,
        duration: 3000,
      });
      
      // Redirect to token checkout page with the selected package
      setLocation(`/token-checkout?package=${packageId}`);
      
      // Reset the purchasing state
      setTimeout(() => {
        setIsPurchasing(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error in purchase process:', error);
      toast({
        title: "Process Failed",
        description: "There was an error. Please try again or contact support.",
        variant: "destructive"
      });
      setIsPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-gray-100 pb-16">
      <style>
        {floatingKeyframes}
        {shineKeyframes}
        {sparkleKeyframes}
      </style>
      
      {/* Hero section */}
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="stars-container fixed inset-0">
            <div className="stars"></div>
            <div className="stars2"></div>
            <div className="stars3"></div>
          </div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
              AI Tokens
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Power your AI voice generation with tokens. Each token lets you generate one word in AI-generated voiceovers.
            </p>
            
            {user && (
              <div className="mt-8 flex justify-center">
                <div className="bg-gray-800/50 rounded-full px-6 py-3 flex items-center gap-3">
                  <span className="text-gray-300">Current Balance:</span>
                  <CoinBalance showLabel={true} iconSize={20} />
                </div>
              </div>
            )}
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {packages.map((pkg) => (
              <div 
                key={pkg.id}
                className={`relative ${pkg.recommended ? 'transform -translate-y-4 md:scale-110' : ''}`}
                style={pkg.recommended ? { animation: 'floating 3s ease-in-out infinite' } : undefined}
              >
                {pkg.recommended && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                      RECOMMENDED
                    </div>
                  </div>
                )}
                <Card className={`overflow-hidden bg-gray-800/60 border-gray-700 h-full flex flex-col ${pkg.recommended ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/20' : ''}`}>
                  <CardHeader>
                    <div className="flex flex-col items-center">
                      {pkg.icon}
                      <CardTitle className="text-xl mb-1">{pkg.name}</CardTitle>
                      <div className="mt-4 relative">
                        <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${pkg.color} opacity-20 blur-xl`}></div>
                        <div className={`relative bg-gradient-to-r ${pkg.color} text-white font-bold px-4 py-1 rounded-full`}>
                          {pkg.coins} Tokens
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-center text-gray-400">
                      {pkg.price.toFixed(2)} USD
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-2">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="h-5 w-5 mr-2 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full bg-gradient-to-r ${pkg.color} hover:opacity-90 transition-all relative overflow-hidden`}
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={isPurchasing}
                      style={{
                        boxShadow: pkg.recommended ? '0 0 15px rgba(51, 195, 189, 0.5)' : undefined,
                      }}
                    >
                      <div 
                        className="absolute top-0 -left-[100px] w-[35px] h-full bg-white opacity-20 transform rotate-12"
                        style={{ animation: pkg.recommended ? 'shine 3s infinite' : undefined }}
                      ></div>
                      {isPurchasing && selectedPackage === pkg.id ? 'Processing...' : 'Buy Now'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>

          {/* Information section */}
          <div className="max-w-3xl mx-auto mt-20 bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
              How Tokens Work
            </h2>
            <div className="space-y-4 text-gray-300">
              <p>1. Each token allows you to generate one word with our AI voice technology.</p>
              <p>2. Tokens are used when you create a voiceover using our AI Voice Generation feature.</p>
              <p>3. Your current token balance is displayed in the navigation bar at all times.</p>
              <p>4. New accounts start with 100 free tokens to try the service.</p>
              <p>5. Tokens never expire and can be used anytime.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITokenPricingPage;