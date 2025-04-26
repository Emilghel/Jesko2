import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Coins } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// Keyframes for the pulsating glow effect
const pulseKeyframes = `
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(51, 195, 189, 0.7);
    transform: scale(1);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(51, 195, 189, 0);
    transform: scale(1.05);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(51, 195, 189, 0);
    transform: scale(1);
  }
}
`;

// Keyframes for the wiggle animation
const wiggleKeyframes = `
@keyframes wiggle {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg) scale(1.1); }
  50% { transform: rotate(0deg) scale(1.1); }
  75% { transform: rotate(5deg) scale(1.1); }
  100% { transform: rotate(0deg); }
}
`;

// Keyframes for the rotation animation for coin
const rotateKeyframes = `
@keyframes rotate {
  from {
    transform: rotateY(0deg);
  }
  to {
    transform: rotateY(360deg);
  }
}
`;

const BuyTokensButton: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [wiggle, setWiggle] = useState(false);

  // Periodically wiggle the button to draw attention
  useEffect(() => {
    const interval = setInterval(() => {
      setWiggle(true);
      setTimeout(() => setWiggle(false), 1000);
    }, 10000); // Wiggle every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle token purchase - direct to token checkout
  const handleBuyTokens = () => {
    console.log("BuyTokensButton: Buy tokens clicked");
    
    // If not logged in, redirect to auth
    if (!user) {
      console.log("BuyTokensButton: User not logged in, redirecting to auth");
      toast({
        title: "Login Required",
        description: "Please login to continue",
        variant: "destructive"
      });
      setLocation('/auth');
      return;
    }
    
    // Redirect directly to token checkout with default package
    console.log("BuyTokensButton: User logged in, redirecting to token checkout");
    
    toast({
      title: "Checkout Ready", 
      description: "Taking you to the checkout page...",
      duration: 3000,
    });
    
    // Redirect to token checkout with standard package
    setLocation('/token-checkout?package=500');
  };

  return (
    <>
      <style>
        {pulseKeyframes}
        {wiggleKeyframes}
        {rotateKeyframes}
      </style>
      <button
        onClick={handleBuyTokens}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        className={`
          fixed top-5 right-5 z-50
          flex items-center justify-center gap-1.5
          px-2.5 py-1.5 rounded-full
          text-sm font-medium text-white
          bg-gradient-to-r from-[#33C3BD] to-[#0075FF]
          transition-all duration-200
          ${isPressed ? 'scale-95' : isHovered ? 'scale-105' : 'scale-100'}
          animate-pulse
          hover:shadow-lg
        `}
        style={{
          animation: wiggle ? 'wiggle 1s ease-in-out' : 'pulse 2s infinite',
          boxShadow: '0 0 10px 2px rgba(51, 195, 189, 0.3)',
        }}
      >
        <Coins
          className="text-white h-4 w-4"
          style={{ animation: 'rotate 3s infinite linear' }}
        />
        <span className="whitespace-nowrap">Buy Tokens</span>
      </button>
    </>
  );
};

export default BuyTokensButton;