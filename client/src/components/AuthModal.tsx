import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [, navigate] = useLocation();
  
  // Disable scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleClaimTokens = () => {
    navigate('/auth');
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-0 animate-fadeIn">
      {/* Backdrop with blur effect - removed onClick handler to prevent accidental closing */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" 
      />
      
      {/* Modal container */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 shadow-2xl border border-amber-500/20 animate-scaleIn">
        {/* Animated gold glow at the top */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 animate-glow"></div>
        
        <div className="p-6 sm:p-8">
          {/* Close button */}
          <button 
            className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
          
          {/* Header */}
          <div className="text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-white bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
              Create an account and get 100 free gold coins!
            </h3>
            <p className="mt-2 text-gray-300">
              Unlock the full potential of our AI tools
            </p>
          </div>
          
          {/* Gold coins animation container */}
          <div className="relative h-48 my-6 overflow-hidden">
            {/* Animated coins will be created with CSS */}
            <div className="coins-container">
              {/* Main featured spinning coin in the center */}
              <div className="featured-coin">
                <div className="featured-coin-front"></div>
                <div className="featured-coin-edge"></div>
                <div className="featured-coin-shine"></div>
                <div className="featured-coin-emblem">★</div>
              </div>
              
              {/* Background floating coins */}
              {Array.from({ length: 12 }).map((_, index) => (
                <div 
                  key={index}
                  className="coin"
                  style={{
                    left: `${Math.random() * 90}%`,
                    top: `${Math.random() * 70}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${5 + Math.random() * 7}s`,
                    opacity: 0.7 + Math.random() * 0.3,
                    transform: `scale(${0.5 + Math.random() * 0.5})`
                  }}
                >
                  <div className="coin-front"></div>
                  <div className="coin-edge"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* CTA Button */}
          <Button
            onClick={handleClaimTokens}
            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-lg shadow-lg transition-all hover:shadow-amber-500/30 hover:scale-[1.03] relative overflow-hidden group"
          >
            Claim 100 Gold Tokens
            <span className="absolute inset-x-0 -bottom-2 h-1 bg-amber-300 opacity-50 group-hover:opacity-100 transition-opacity" />
            <span className="absolute -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
          </Button>
          
          <p className="mt-4 text-center text-sm text-gray-400">
            Join now and start creating amazing AI content!
          </p>
        </div>
      </div>
      
      {/* CSS Animations for gold coins */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0) rotate(0deg); }
          25% { transform: translateY(-20px) translateX(10px) rotate(90deg); }
          50% { transform: translateY(-10px) translateX(-10px) rotate(180deg); }
          75% { transform: translateY(-30px) translateX(5px) rotate(270deg); }
          100% { transform: translateY(0) translateX(0) rotate(360deg); }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5), 0 0 10px rgba(255, 215, 0, 0.3); }
          50% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.5); }
          100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5), 0 0 10px rgba(255, 215, 0, 0.3); }
        }
        
        @keyframes shine {
          100% { left: 125%; }
        }
        
        @keyframes spin3d {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        
        @keyframes coinshine {
          0% { opacity: 0; transform: translateX(-100%) rotate(30deg); }
          20% { opacity: 0.8; }
          60% { opacity: 0.8; }
          100% { opacity: 0; transform: translateX(100%) rotate(30deg); }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes scaleIn {
          0% { transform: scale(0.9); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        
        .coins-container {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        
        /* Featured 3D coin in the center */
        .featured-coin {
          position: absolute;
          width: 100px;
          height: 100px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          perspective: 800px;
          animation: pulse 4s ease-in-out infinite;
          z-index: 20;
        }
        
        .featured-coin-front {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(45deg, #ffd700, #ffcc00, #ffdb4d, #ffcc00, #ffd700);
          background-size: 400% 400%;
          box-shadow: 
            0 0 15px rgba(255, 215, 0, 0.8),
            0 0 30px rgba(255, 215, 0, 0.4);
          transform: translateZ(2px);
          animation: spin3d 8s linear infinite;
        }
        
        .featured-coin-edge {
          position: absolute;
          width: 94%;
          height: 94%;
          top: 3%;
          left: 3%;
          border-radius: 50%;
          background: radial-gradient(circle at center, #ffd700 0%, #ffcc00 40%, #b8860b 100%);
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.6);
          transform: translateZ(1px);
        }
        
        .featured-coin-shine {
          position: absolute;
          width: 200%;
          height: 100%;
          top: 0;
          left: -50%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(30deg);
          animation: coinshine 5s ease-in-out infinite;
          z-index: 10;
        }
        
        .featured-coin-emblem {
          position: absolute;
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          color: #b8860b;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.6);
          z-index: 5;
        }
        
        /* Background floating coins */
        .coin {
          position: absolute;
          width: 40px;
          height: 40px;
          perspective: 500px;
          animation: float linear infinite, glow 2s infinite;
          z-index: 1;
        }
        
        .coin-front {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(45deg, #ffd700, #ffcc00, #ffdb4d);
          background-size: 200% 200%;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
          transform: translateZ(2px);
          animation: spin3d 5s linear infinite;
        }
        
        .coin-edge {
          position: absolute;
          width: 90%;
          height: 90%;
          top: 5%;
          left: 5%;
          border-radius: 50%;
          background: radial-gradient(circle at center, #ffd700 0%, #ffcc00 30%, #b8860b 100%);
          box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
          transform: translateZ(1px);
        }
        
        .animate-glow {
          animation: glow 2s infinite;
        }
        
        .animate-shine {
          animation: shine 1.5s;
        }
      `}</style>
    </div>
  );
};

export default AuthModal;