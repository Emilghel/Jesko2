import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Link, useLocation, useRouter } from "wouter";
import { Check, Star, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import VideoBackground from "@/components/VideoBackground";
import AdvancedStarryBackground from "@/components/AdvancedStarryBackground";

// Define PayPal type to fix TypeScript errors
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: any) => { render: (selector: string) => void };
    };
  }
}

// Custom navigation component for Pricing page
function CustomNavigation() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-[#0A0F16]/90 backdrop-blur-md p-4 border-b border-[#1E293B] fixed top-0 left-0 right-0 w-full z-50 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/home">
            <span className="text-xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent cursor-pointer">
              Jesko AI
            </span>
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/home">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Homepage</span>
          </Link>
          <Link href="/dashboard">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Dashboard</span>
          </Link>
          <Link href="/test">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Test Voice AI</span>
          </Link>
          <Link href="/pricing">
            <span className="text-cyan-300 hover:text-cyan-400 transition-colors px-3 py-1 text-sm cursor-pointer bg-cyan-900/30 rounded">Pricing</span>
          </Link>
          <Link href="/own-your-ai">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Own Your AI</span>
          </Link>
          {user?.is_admin && (
            <Link href="/admin">
              <span className="text-cyan-300 hover:text-cyan-400 transition-colors px-3 py-1 text-sm cursor-pointer bg-cyan-900/30 rounded">Admin Panel</span>
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3 ml-4">
              <div className="text-sm text-gray-300">
                {user.displayName || user.username}
                {user.is_admin && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-cyan-900/30 text-cyan-400 rounded-full">Admin</span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/auth">
              <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// PricingCard component for reusability
interface PricingCardProps {
  id: string;
  name: string;
  price: string;
  billing: string;
  features: string[];
  hasTrial: boolean;
  trialDays?: number;
  trialIncludes?: string;
  isPopular?: boolean;
  isPremium?: boolean;
  badge?: string;
  buttonText?: string;
}

function PricingCard({
  id,
  name,
  price,
  billing,
  features,
  hasTrial,
  trialDays = 3,
  trialIncludes,
  isPopular = false,
  isPremium = false,
  badge,
  buttonText = "Select Plan",
  buttonClick
}: PricingCardProps & { buttonClick?: () => void }) {
  return (
    <div 
      className={`relative flex flex-col h-full rounded-xl border ${
        isPopular ? 'border-[#33C3BD] shadow-[0_0_15px_rgba(51,195,189,0.3)]' : 
        isPremium ? 'border-[#8B5CF6] bg-gradient-to-b from-[#141B29] to-[#0F172A] shadow-[0_0_20px_rgba(139,92,246,0.25)]' : 
        'border-[#1E293B]'
      } p-6 transition-all duration-200 hover:translate-y-[-4px] hover:shadow-lg`}
    >
      {/* Badge for popular or beginner plan */}
      {(isPopular || badge) && (
        <div className="absolute -top-3 right-6">
          <Badge className={`px-3 py-1 ${isPopular ? 'bg-[#33C3BD] text-black' : 'bg-[#3B82F6] text-white'}`}>
            {isPopular ? 'Most Popular' : badge}
          </Badge>
        </div>
      )}

      {/* Plan header */}
      <div className="mb-6">
        <h3 className={`text-xl font-bold mb-1 ${isPremium ? 'text-white' : 'text-gray-200'}`}>{name}</h3>
        <div className="flex items-end mb-1">
          <span className={`text-3xl font-bold ${
            isPremium ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent' : 
            isPopular ? 'text-[#33C3BD]' : 'text-white'
          }`}>{price}</span>
          <span className="text-gray-400 text-sm ml-1">/{billing.toLowerCase()}</span>
        </div>
        <p className="text-gray-400 text-sm">Billed monthly</p>
      </div>

      {/* Trial information */}
      {hasTrial && (
        <div className="mb-6 p-3 rounded-lg bg-[#141B29]/70 border border-[#1E293B]">
          <div className="flex items-center mb-1">
            <div className="relative mr-2 w-5 h-5">
              {/* Floating Star with Glow Effect */}
              <div className="absolute inset-0 animate-float">
                {/* Outer glow */}
                <div className="absolute inset-[-3px] bg-yellow-300/20 rounded-full blur-md"></div>
                {/* Inner glow */}
                <div className="absolute inset-[-1px] bg-yellow-300/30 rounded-full blur-sm"></div>
                {/* Star SVG */}
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="absolute inset-0 w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                    fill="#FFD700" 
                    stroke="#FFA500" 
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
            <span className="text-white font-medium text-sm">{trialDays}-Day Free Trial</span>
          </div>
          {trialIncludes && (
            <p className="text-gray-400 text-xs">Includes: {trialIncludes}</p>
          )}
        </div>
      )}

      {/* Features list */}
      <div className="flex-grow mb-6">
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start">
              <div className={`mr-2 mt-1 rounded-full p-1 ${
                isPremium ? 'bg-purple-500/20 text-purple-400' : 
                isPopular ? 'bg-[#33C3BD]/20 text-[#33C3BD]' : 
                'bg-blue-500/20 text-blue-400'
              }`}>
                <Check className="h-3 w-3" />
              </div>
              <span className="text-gray-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action button */}
      <div className={`mt-auto ${!hasTrial && 'pt-4'}`}>
        {id === 'jesko-ai-enterprise' ? (
          <a href="https://calendly.com/jeskoai/enterprise-consultation" target="_blank" rel="noopener noreferrer">
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {buttonText}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        ) : buttonClick ? (
          <Button 
            onClick={buttonClick}
            className={`w-full ${
              isPremium ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 
              isPopular ? 'bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90' : 
              'bg-[#3B82F6] hover:bg-[#2563EB]'
            } text-white`}
          >
            {hasTrial ? "Start Free Trial" : buttonText}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={() => {
              console.log(`Plan selected: ${id}, redirecting to checkout`);
              window.location.href = `/checkout?plan=${id}`;
            }}
            className={`w-full ${
              isPremium ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 
              isPopular ? 'bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90' : 
              'bg-[#3B82F6] hover:bg-[#2563EB]'
            } text-white`}
          >
            {hasTrial ? "Start Free Trial" : buttonText}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Debug function to show all buttons are working correctly
function debugPlanSelection(id: string) {
  console.log(`DEBUG: Button click detected for plan: ${id}`);
  const message = document.createElement('div');
  message.style.position = 'fixed';
  message.style.top = '50%';
  message.style.left = '50%';
  message.style.transform = 'translate(-50%, -50%)';
  message.style.backgroundColor = 'rgba(0,0,0,0.8)';
  message.style.color = 'white';
  message.style.padding = '20px';
  message.style.borderRadius = '10px';
  message.style.zIndex = '9999';
  message.innerText = `Button clicked for plan: ${id}. Checkout features have been removed.`;
  document.body.appendChild(message);
  
  // Remove after 3 seconds
  setTimeout(() => {
    document.body.removeChild(message);
  }, 3000);
}

// Helper function to handle plan selection and redirect to checkout
function handlePlanSelection(id: string, user: any, setLocation: (path: string) => void, toast: any) {
  if (!user) {
    toast({
      title: "Login Required",
      description: "Please login to subscribe to a plan",
      variant: "destructive"
    });
    localStorage.setItem('selectedPricingPlan', id);
    setLocation('/auth');
    return;
  }
  
  // Redirect to checkout page with the selected plan
  console.log(`PricingPage: Plan ${id} selected, redirecting to checkout page`);
  setLocation(`/checkout?plan=${id}`);
  
  return true;
}

export default function PricingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Check if there's a stored plan selection after login
  useEffect(() => {
    if (user) {
      const savedPlan = localStorage.getItem('selectedPricingPlan');
      if (savedPlan) {
        // Clear the saved selection
        localStorage.removeItem('selectedPricingPlan');
        
        // Show notification about the previously selected plan
        toast({
          title: "Previous Plan Selection",
          description: `You previously selected the ${savedPlan} plan. Proceeding to checkout.`,
          duration: 5000,
        });
        
        console.log(`PricingPage: Found saved plan ${savedPlan}, redirecting to checkout`);
        
        // Redirect to checkout with the saved plan
        setLocation(`/checkout?plan=${savedPlan}`);
      }
    }
  }, [user, toast, setLocation]);
  
  // Create a wrapper component for PricingCard to handle authentication
  const AuthPricingCard = (props: PricingCardProps) => {
    // For the enterprise plan, we don't need auth check as it goes to Calendly
    if (props.id === 'jesko-ai-enterprise') {
      return <PricingCard {...props} />;
    }
    
    // Create a custom PricingCard with modified link behavior
    return (
      <div className="relative">
        <PricingCard 
          {...props} 
          buttonClick={() => handlePlanSelection(props.id, user, setLocation, toast)}
        />
      </div>
    );
  };
  
  // DirectNavLinks component has been removed

  return (
    <div>
      {/* Add CSS for animations and effects */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulse-slow {
          0% { opacity: 0.5; transform: scale(0.98); }
          50% { opacity: 0.75; transform: scale(1.02); }
          100% { opacity: 0.5; transform: scale(0.98); }
        }
        
        @keyframes dark-pulse {
          0% { opacity: 0.85; transform: scale(0.98); filter: blur(3px); }
          50% { opacity: 1; transform: scale(1.02); filter: blur(2px); }
          100% { opacity: 0.85; transform: scale(0.98); filter: blur(3px); }
        }
        
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-2px) rotate(1deg); }
          50% { transform: translateY(0px) rotate(0deg); }
          75% { transform: translateY(2px) rotate(-1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 5s infinite alternate ease-in-out;
        }
        
        .animate-float {
          animation: float 3s infinite ease-in-out;
        }
      `}} />

      <div className="bg-[#0A0F16] min-h-screen relative">
        {/* Add custom navigation */}
        <CustomNavigation />
        
        {/* Advanced Starry Background with high-quality rendering effects - optimized for performance */}
        <AdvancedStarryBackground 
          density={25}
          enableTAA={true}
          enableSSAO={true} 
          enableHDR={true}
          enableBloom={true}
          depth={2}
        />
        
        {/* Content container with z-index to appear above the background */}
        <div className="relative z-10 pt-28 pb-16">
          <div className="container mx-auto px-4 md:px-8">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
                Choose Your Jesko AI Plan
              </h1>
              <p className="text-gray-300 text-lg">
                Unlock the power of AI automation for your business with our flexible pricing plans.
                All plans include our core AI technology, designed to transform how you interact with your clients.
              </p>
            </div>
            
            {/* Pricing grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
              {/* Plan 1: Jesko AI Starter */}
              <AuthPricingCard
                id="jesko-ai-starter"
                name="Jesko AI Starter"
                price="$18"
                billing="month"
                features={[
                  "1 Conversational Agent",
                  "Book Appointments",
                  "Handle Client Queries",
                  "50 Dials",
                  "CRM",
                  "Automated AI Calls"
                ]}
                hasTrial={true}
                trialDays={7}
                trialIncludes="100 coins"
                badge="Great for Beginners"
              />
              
              {/* Plan 2: Jesko AI Standard */}
              <AuthPricingCard
                id="jesko-ai-standard"
                name="Jesko AI Standard"
                price="$49"
                billing="month"
                features={[
                  "Everything from $18 membership +",
                  "150 dials",
                  "2 languages" 
                ]}
                hasTrial={true}
                trialDays={7}
                trialIncludes="300 coins"
              />
              
              {/* Plan 3: Jesko AI Pro */}
              <AuthPricingCard
                id="jesko-ai-pro"
                name="Jesko AI Pro"
                price="$98"
                billing="month"
                features={[
                  "Everything from previous memberships",
                  "400 dials",
                  "3 languages",
                  "Account manager access"
                ]}
                hasTrial={false}
                isPopular={true}
                buttonText="Select Plan"
              />
              
              {/* Plan 4: Jesko AI Enterprise */}
              <AuthPricingCard
                id="jesko-ai-enterprise"
                name="Jesko AI Enterprise"
                price="Custom"
                billing="month"
                features={[
                  "10 Agents",
                  "Unlimited calls",
                  "Trained on FAQs and URLs",
                  "Speaks 29 languages",
                  "Book Appointments",
                  "Handle Client Queries",
                  "Custom AI Agents",
                  "Dedicated Success Manager",
                  "AI-Powered Objection Handling",
                  "Personalized Onboarding"
                ]}
                hasTrial={false}
                isPremium={true}
                badge="Schedule a Call"
                buttonText="Book Apt"
              />
            </div>
            
            {/* Own Jesko AI Yourself CTA Section */}
            <div className="mt-24 mb-16 relative z-10 max-w-5xl mx-auto">
              <div className="rounded-xl overflow-hidden border border-[#1E293B] shadow-2xl bg-gradient-to-b from-[#141B29] to-[#0A0F16]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left side - Video */}
                  <div className="relative overflow-hidden rounded-lg">
                    {/* MAXIMUM Corner-focused dark glow effect - ULTRA dark corners */}
                    {/* Top-left corner - Ultra black glow */}
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-black blur-3xl opacity-100 z-0 animate-pulse-slow"></div>
                    <div className="absolute -top-20 -left-20 w-52 h-52 bg-black blur-2xl opacity-100 z-0" style={{ animation: 'dark-pulse 7s infinite alternate ease-in-out 0.5s' }}></div>
                    <div className="absolute -top-16 -left-16 w-44 h-44 bg-black blur-xl opacity-95 z-0" style={{ animation: 'dark-pulse 6s infinite alternate ease-in-out 1s' }}></div>
                    <div className="absolute -top-12 -left-12 w-36 h-36 bg-black blur-lg opacity-90 z-0" style={{ animation: 'dark-pulse 5s infinite alternate ease-in-out 1.5s' }}></div>
                    <div className="absolute -top-8 -left-8 w-28 h-28 bg-black blur-md opacity-90 z-0" style={{ animation: 'dark-pulse 4.5s infinite alternate ease-in-out 2s' }}></div>
                    <div className="absolute -top-4 -left-4 w-24 h-24 bg-black blur-sm opacity-80 z-0" style={{ animation: 'dark-pulse 4s infinite alternate ease-in-out 2.5s' }}></div>
                    
                    {/* Top-right corner - Ultra black glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-black blur-3xl opacity-100 z-0 animate-pulse-slow"></div>
                    <div className="absolute -top-20 -right-20 w-52 h-52 bg-black blur-2xl opacity-100 z-0" style={{ animation: 'dark-pulse 6.5s infinite alternate ease-in-out 0.7s' }}></div>
                    <div className="absolute -top-16 -right-16 w-44 h-44 bg-black blur-xl opacity-95 z-0" style={{ animation: 'dark-pulse 5.5s infinite alternate ease-in-out 1.2s' }}></div>
                    <div className="absolute -top-12 -right-12 w-36 h-36 bg-black blur-lg opacity-90 z-0" style={{ animation: 'dark-pulse 4.5s infinite alternate ease-in-out 1.7s' }}></div>
                    <div className="absolute -top-8 -right-8 w-28 h-28 bg-black blur-md opacity-90 z-0" style={{ animation: 'dark-pulse 4s infinite alternate ease-in-out 2.2s' }}></div>
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-black blur-sm opacity-80 z-0" style={{ animation: 'dark-pulse 3.5s infinite alternate ease-in-out 2.7s' }}></div>
                    
                    {/* Bottom-left corner - Ultra black glow */}
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black blur-3xl opacity-100 z-0 animate-pulse-slow"></div>
                    <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-black blur-2xl opacity-100 z-0" style={{ animation: 'dark-pulse 7.5s infinite alternate ease-in-out 0.3s' }}></div>
                    <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-black blur-xl opacity-95 z-0" style={{ animation: 'dark-pulse 6.5s infinite alternate ease-in-out 0.8s' }}></div>
                    <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-black blur-lg opacity-90 z-0" style={{ animation: 'dark-pulse 5.5s infinite alternate ease-in-out 1.3s' }}></div>
                    <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-black blur-md opacity-90 z-0" style={{ animation: 'dark-pulse 5s infinite alternate ease-in-out 1.8s' }}></div>
                    <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-black blur-sm opacity-80 z-0" style={{ animation: 'dark-pulse 4.5s infinite alternate ease-in-out 2.3s' }}></div>
                    
                    {/* Bottom-right corner - Ultra black glow */}
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-black blur-3xl opacity-100 z-0 animate-pulse-slow"></div>
                    <div className="absolute -bottom-20 -right-20 w-52 h-52 bg-black blur-2xl opacity-100 z-0" style={{ animation: 'dark-pulse 8s infinite alternate ease-in-out 0.2s' }}></div>
                    <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-black blur-xl opacity-95 z-0" style={{ animation: 'dark-pulse 7s infinite alternate ease-in-out 0.9s' }}></div>
                    <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-black blur-lg opacity-90 z-0" style={{ animation: 'dark-pulse 6s infinite alternate ease-in-out 1.4s' }}></div>
                    <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-black blur-md opacity-90 z-0" style={{ animation: 'dark-pulse 5.5s infinite alternate ease-in-out 1.9s' }}></div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-black blur-sm opacity-80 z-0" style={{ animation: 'dark-pulse 5s infinite alternate ease-in-out 2.4s' }}></div>
                    
                    {/* Additional corner-specific shadows at 45° angles */}
                    <div className="absolute -top-16 -left-16 w-32 h-32 bg-black rounded-full blur-3xl opacity-100 z-0" style={{ animation: 'dark-pulse 4s infinite alternate ease-in-out' }}></div>
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-black rounded-full blur-3xl opacity-100 z-0" style={{ animation: 'dark-pulse 4.5s infinite alternate ease-in-out 0.5s' }}></div>
                    <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-black rounded-full blur-3xl opacity-100 z-0" style={{ animation: 'dark-pulse 5s infinite alternate ease-in-out 1s' }}></div>
                    <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-black rounded-full blur-3xl opacity-100 z-0" style={{ animation: 'dark-pulse 5.5s infinite alternate ease-in-out 1.5s' }}></div>
                    
                    {/* Central area clear mask - keeps the middle visible */}
                    <div className="absolute top-[15%] left-[15%] right-[15%] bottom-[15%] bg-transparent z-0 shadow-[0_0_30px_30px_rgba(0,0,0,0.2)_inset]"></div>
                    
                    {/* Subtle grid overlay */}
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZGVmcz4KICA8cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgIDxwYXRoIGQ9Ik0gMjAgMCBMIDAgMCAwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9IiMxRTI5M0IiIHN0cm9rZS13aWR0aD0iMSIvPgogIDwvcGF0dGVybj4KPC9kZWZzPgo8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIiAvPgo8L3N2Zz4=')] opacity-20 z-0"></div>
                    
                    {/* Diagonal corner shadow extensions */}
                    <div className="absolute -inset-30 bg-gradient-to-br from-black via-transparent to-black blur-3xl opacity-90 z-0" style={{ animation: 'dark-pulse 9s infinite alternate ease-in-out' }}></div>
                    <div className="absolute -inset-30 bg-gradient-to-tl from-black via-transparent to-black blur-3xl opacity-90 z-0" style={{ animation: 'dark-pulse 8s infinite alternate ease-in-out 0.5s' }}></div>
                    <div className="absolute -inset-30 bg-gradient-to-tr from-black via-transparent to-black blur-3xl opacity-90 z-0" style={{ animation: 'dark-pulse 7s infinite alternate ease-in-out 1s' }}></div>
                    <div className="absolute -inset-30 bg-gradient-to-bl from-black via-transparent to-black blur-3xl opacity-90 z-0" style={{ animation: 'dark-pulse 6s infinite alternate ease-in-out 1.5s' }}></div>
                    
                    {/* Video container with aspect ratio */}
                    <div className="pt-[125%] relative z-10">
                      {/* Semi-transparent overlay for the whole video */}
                      <div className="absolute inset-0 bg-black/20 mix-blend-overlay z-20 pointer-events-none"></div>
                      
                      {/* Video element with new URL */}
                      <video 
                        src="https://video.wixstatic.com/video/ee3656_f7fd96ddd71d455ebe195ef7341031d8/720p/mp4/file.mp4"
                        className="absolute inset-0 w-full h-full object-cover z-10"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                      ></video>
                      
                      {/* Gradient overlays to soften edges and increase text readability */}
                      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#141B29] via-[#141B29]/80 to-transparent pointer-events-none z-30"></div>
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0F16] via-[#0A0F16]/80 to-transparent pointer-events-none z-30"></div>
                      <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-[#141B29]/80 to-transparent pointer-events-none z-30"></div>
                      <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-[#141B29]/80 to-transparent pointer-events-none z-30"></div>
                    </div>
                  </div>
                  
                  {/* Right side - Content */}
                  <div className="flex flex-col justify-center p-8 md:pr-12">
                    <h3 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">Own Your AI Business</h3>
                    <p className="text-gray-300 mb-6">
                      Become our partner and launch your own AI business with our cutting-edge technology. Get full access to our AI platform, marketing materials, and dedicated support.
                    </p>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start">
                        <div className="mr-2 mt-1 rounded-full p-1 bg-[#33C3BD]/20 text-[#33C3BD]">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-gray-300 text-sm">Earn 90% of all revenue generated</span>
                      </li>
                      <li className="flex items-start">
                        <div className="mr-2 mt-1 rounded-full p-1 bg-[#33C3BD]/20 text-[#33C3BD]">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-gray-300 text-sm">Full branding and customization control</span>
                      </li>
                      <li className="flex items-start">
                        <div className="mr-2 mt-1 rounded-full p-1 bg-[#33C3BD]/20 text-[#33C3BD]">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-gray-300 text-sm">Ready-to-use AI agents and dashboards</span>
                      </li>
                      <li className="flex items-start">
                        <div className="mr-2 mt-1 rounded-full p-1 bg-[#33C3BD]/20 text-[#33C3BD]">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-gray-300 text-sm">Detailed analytics and partner dashboard</span>
                      </li>
                      <li className="flex items-start">
                        <div className="mr-2 mt-1 rounded-full p-1 bg-[#33C3BD]/20 text-[#33C3BD]">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-gray-300 text-sm">Expert technical and business support</span>
                      </li>
                    </ul>
                    <Link href="/own-your-ai">
                      <Button className="w-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90 text-white rounded-lg py-3">
                        Learn More
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* FAQ section */}
            <div className="mt-16 max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-white">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div className="bg-[#141B29]/60 border border-[#1E293B] rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-2 text-white">What is Jesko AI?</h3>
                  <p className="text-gray-300">
                    Jesko AI is an intelligent virtual assistant powered by advanced AI technology. It helps businesses handle customer inquiries, book appointments, and manage communications without human intervention, operating 24/7 with access to 5 premium AI models (GPT4, DEEPSEEK, CLAUDE, GEMINI, GROK).
                  </p>
                </div>
                
                <div className="bg-[#141B29]/60 border border-[#1E293B] rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-2 text-white">How does the free trial work?</h3>
                  <p className="text-gray-300">
                    Our free trial gives you full access to your selected plan features for the specified trial period. You'll only be charged when the trial ends, and you can cancel anytime before then with no obligation.
                  </p>
                </div>
                
                <div className="bg-[#141B29]/60 border border-[#1E293B] rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-2 text-white">Can I upgrade my plan later?</h3>
                  <p className="text-gray-300">
                    Yes, you can upgrade your plan at any time. Your billing will be adjusted pro-rata for the remainder of your billing cycle, ensuring you only pay for what you use.
                  </p>
                </div>
                
                <div className="bg-[#141B29]/60 border border-[#1E293B] rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-2 text-white">What does "Trained on FAQs and URLs" mean?</h3>
                  <p className="text-gray-300">
                    This feature allows your Jesko AI assistant to learn from your company's FAQ documents and website content. This way, it can provide accurate, company-specific information to your clients, just like a well-trained human assistant would.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}