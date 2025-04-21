import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Coins, Sparkles, ArrowRight, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoinDiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredCoins: number;
  currentCoins: number;
  onApplyDiscount: () => void;
}

export default function CoinDiscountModal({
  open,
  onOpenChange,
  requiredCoins,
  currentCoins,
  onApplyDiscount
}: CoinDiscountModalProps) {
  const { toast } = useToast();
  const discountCode = "MAGIC10";
  const [copied, setCopied] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  
  // Reset copied state when modal opens/closes
  useEffect(() => {
    if (open) {
      // Show sparkles animation when modal opens
      const timer = setTimeout(() => {
        setShowSparkles(true);
      }, 300);
      
      return () => {
        clearTimeout(timer);
        setCopied(false);
        setShowSparkles(false);
      };
    }
  }, [open]);
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(discountCode);
    setCopied(true);
    
    toast({
      title: "Discount code copied!",
      description: "Paste it during checkout to get 10% off.",
      variant: "default"
    });
    
    // Reset copied state after 3 seconds
    setTimeout(() => setCopied(false), 3000);
  };
  
  // Calculate coin difference
  const coinDifference = requiredCoins - currentCoins;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-b from-gray-900 to-black border border-purple-600/50 shadow-[0_0_30px_rgba(168,85,247,0.3)] text-white rounded-lg overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute -inset-[10px] bg-gradient-to-r from-purple-600/10 via-cyan-600/5 to-blue-600/10 blur-xl opacity-30 animate-pulse"></div>
          {showSparkles && (
            <>
              <div className="absolute top-10 left-10 w-1 h-1 rounded-full bg-yellow-400 animate-ping"></div>
              <div className="absolute top-20 right-20 w-1 h-1 rounded-full bg-purple-400 animate-ping" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute bottom-20 left-1/4 w-1 h-1 rounded-full bg-cyan-400 animate-ping" style={{animationDelay: '0.3s'}}></div>
              <div className="absolute bottom-10 right-1/3 w-1 h-1 rounded-full bg-rose-400 animate-ping" style={{animationDelay: '0.7s'}}></div>
            </>
          )}
        </div>
        
        {/* Main content with z-index to stay above the background effects */}
        <div className="relative z-10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="relative">
                <Coins className="h-6 w-6 text-yellow-400 animate-[pulse_3s_ease-in-out_infinite]" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
              </div>
              <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 text-transparent bg-clip-text font-bold">
                You Need More Gold Coins
              </span>
            </DialogTitle>
            <DialogDescription className="text-gray-300 pt-3">
              <div className="flex items-center justify-center gap-4 my-2">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Current</p>
                  <p className="text-2xl font-bold text-yellow-400">{currentCoins}</p>
                </div>
                <ArrowRight className="text-gray-500" />
                <div className="text-center">
                  <p className="text-sm text-gray-400">Required</p>
                  <p className="text-2xl font-bold text-yellow-400">{requiredCoins}</p>
                </div>
                <div className="h-12 w-px bg-gray-700"></div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Need</p>
                  <p className="text-2xl font-bold text-rose-400">+{coinDifference}</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-cyan-900/40 p-6 rounded-xl border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              {/* Animated highlight effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-[shimmer_3s_infinite]" style={{backgroundSize: '200% 100%'}}></div>
              
              <div className="relative flex items-center justify-center mb-4">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-600/20 to-cyan-600/20 blur-lg opacity-70 animate-pulse"></div>
                <Gift className="h-12 w-12 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
              </div>
              
              <h3 className="text-center font-bold text-xl bg-gradient-to-r from-purple-400 via-fuchsia-300 to-purple-400 text-transparent bg-clip-text mb-2">
                Special 10% Discount
              </h3>
              <p className="text-center text-sm text-gray-300 mb-4">
                Use this exclusive code during checkout to get <span className="font-bold text-cyan-300">10% more coins</span> on your next purchase!
              </p>
              
              <div className="group relative mx-auto max-w-xs cursor-pointer" onClick={handleCopyCode}>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg blur opacity-60 group-hover:opacity-90 transition duration-200"></div>
                <div className="relative flex items-center justify-between gap-2 bg-gray-900 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                    <span className="font-mono text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                      {discountCode}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`transition-all duration-300 ${
                      copied 
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 hover:text-green-300' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {copied ? 'Copied!' : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 text-center text-xs text-gray-500">
                <p>Limited time offer. Applies to all coin packages.</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex-1 bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
            <Button 
              className="flex-1 relative overflow-hidden group bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white border-none shadow-lg shadow-purple-900/30 transition-all duration-300"
              onClick={onApplyDiscount}
            >
              <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-45deg] group-hover:animate-[shimmer_1s]" style={{backgroundSize: '200% 100%', left: '-100%'}}></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                Apply Discount & Buy Coins
              </span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}