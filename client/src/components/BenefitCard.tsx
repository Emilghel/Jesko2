import React, { useState, useRef, useEffect } from 'react';

interface BenefitCardProps {
  title: string;
  description: string;
  delay: string;
  colorPrimary?: string;
  colorSecondary?: string;
  soundType: 'income' | 'ownership' | 'freedom' | 'support';
}

export default function BenefitCard({ 
  title, 
  description, 
  delay, 
  colorPrimary, 
  colorSecondary,
  soundType 
}: BenefitCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const starRef = useRef<SVGSVGElement>(null);
  
  // Set default colors based on soundType if not provided
  const getStarColors = () => {
    switch(soundType) {
      case 'income':
        return {
          primary: colorPrimary || 'rgba(255, 193, 7, 1)', // Gold
          secondary: colorSecondary || 'rgba(255, 193, 7, 0.6)'
        };
      case 'ownership':
        return {
          primary: colorPrimary || 'rgba(6, 182, 212, 1)', // Cyan
          secondary: colorSecondary || 'rgba(59, 130, 246, 0.8)'
        };
      case 'freedom':
        return {
          primary: colorPrimary || 'rgba(124, 58, 237, 1)', // Purple
          secondary: colorSecondary || 'rgba(139, 92, 246, 0.8)'
        };
      case 'support':
        return {
          primary: colorPrimary || 'rgba(236, 72, 153, 1)', // Pink
          secondary: colorSecondary || 'rgba(244, 114, 182, 0.8)'
        };
    }
  };

  const colors = getStarColors();

  // Function to play the sound effect
  const playSound = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);

    // Create audio context for the sound
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = context.createGain();
    gainNode.connect(context.destination);
    
    // Different sound profiles for each benefit type
    switch(soundType) {
      case 'income':
        // Cash register/success sound
        playIncomeSound(context, gainNode);
        break;
      case 'ownership':
        // Power-up sound
        playOwnershipSound(context, gainNode);
        break;
      case 'freedom':
        // Light bell/chime sound
        playFreedomSound(context, gainNode);
        break;
      case 'support':
        // Supportive affirming sound
        playSupportSound(context, gainNode);
        break;
    }
  };

  return (
    <div 
      className={`bg-[#141B29] rounded-xl border border-[#1E293B] p-6 shadow-lg hover:shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer ${isAnimating ? 'scale-105' : ''}`}
      onClick={playSound}
    >
      <div className="flex items-start gap-4 mb-4">
        {/* SVG Star with animation and glow */}
        <div 
          className="star-wrapper shrink-0 flex items-center justify-center"
          style={{
            "--delay": delay,
            "--color1": colors.primary,
            "--color2": colors.secondary
          } as React.CSSProperties}
        >
          <svg 
            ref={starRef}
            className="star-svg" 
            width="36" 
            height="36" 
            viewBox="0 0 50 50"
            style={{
              "--delay": delay,
              "--color1": colors.primary,
              "--color2": colors.secondary,
            } as React.CSSProperties}
          >
            {/* Main star shape */}
            <path 
              d="M25 2L31.2 18.3L48.5 18.7L35.5 28.8L39.5 46L25 36.2L10.5 46L14.5 28.8L1.5 18.7L18.8 18.3L25 2Z" 
              fill="currentColor"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="0.5"
            />
            
            {/* Light center core */}
            <circle 
              cx="25" 
              cy="25" 
              r="5" 
              fill="white" 
              opacity="0.3" 
            />
            
            {/* Light rays from points */}
            <path 
              d="M25 2L26 6L25 10L24 6L25 2Z M48.5 18.7L44.5 19.7L40.5 20.7L44.5 21.7L48.5 18.7Z M39.5 46L36.5 42L33.5 38L34.5 42L39.5 46Z M10.5 46L15.5 42L16.5 38L13.5 42L10.5 46Z M1.5 18.7L5.5 21.7L9.5 20.7L5.5 19.7L1.5 18.7Z" 
              fill="white" 
              opacity="0.5" 
            />
            
            {/* Inner gradient */}
            <radialGradient id={`starGradient-${soundType}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="white" stopOpacity="0.7" />
              <stop offset="20%" stopColor="white" stopOpacity="0.2" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
            <circle 
              cx="25" 
              cy="25" 
              r="13" 
              fill={`url(#starGradient-${soundType})`} 
              opacity="0.6" 
            />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

// Helper to create oscillator
function createOscillator(context: AudioContext, frequency: number, type: OscillatorType = 'sine') {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  return oscillator;
}

// 1. Income Sound - Cash register/success sound
function playIncomeSound(context: AudioContext, gainNode: GainNode) {
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.7, context.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.8);

  // Create high pitched "success" tone
  const oscillator1 = createOscillator(context, 1200, 'sine');
  oscillator1.connect(gainNode);
  oscillator1.start(context.currentTime);
  oscillator1.stop(context.currentTime + 0.2);

  // Add secondary "cash" sound
  setTimeout(() => {
    const oscillator2 = createOscillator(context, 800, 'triangle');
    oscillator2.connect(gainNode);
    oscillator2.start(context.currentTime);
    oscillator2.stop(context.currentTime + 0.15);
  }, 150);

  // Add final tone
  setTimeout(() => {
    const oscillator3 = createOscillator(context, 1500, 'sine');
    oscillator3.connect(gainNode);
    oscillator3.start(context.currentTime);
    oscillator3.stop(context.currentTime + 0.1);
  }, 300);
}

// 2. Ownership Sound - Power-up sound (rising pitch)
function playOwnershipSound(context: AudioContext, gainNode: GainNode) {
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.7);

  const oscillator = createOscillator(context, 300, 'sine');
  oscillator.connect(gainNode);
  oscillator.frequency.linearRampToValueAtTime(900, context.currentTime + 0.4);
  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.5);
}

// 3. Freedom Sound - Light chime/bell (airy and pleasant)
function playFreedomSound(context: AudioContext, gainNode: GainNode) {
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.5);

  // Create a chime-like sound 
  const oscillator = createOscillator(context, 1000, 'sine');
  oscillator.connect(gainNode);
  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 1);
  
  // Add harmonic
  setTimeout(() => {
    const oscillator2 = createOscillator(context, 1500, 'sine');
    oscillator2.connect(gainNode);
    oscillator2.start(context.currentTime);
    oscillator2.stop(context.currentTime + 0.7);
  }, 100);
}

// 4. Support Sound - Supportive affirming sound (solid and reassuring)
function playSupportSound(context: AudioContext, gainNode: GainNode) {
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1);

  // Create a solid "support" tone
  const oscillator1 = createOscillator(context, 350, 'triangle');
  oscillator1.connect(gainNode);
  oscillator1.start(context.currentTime);
  oscillator1.stop(context.currentTime + 0.5);
  
  // Add second tone for harmony
  setTimeout(() => {
    const oscillator2 = createOscillator(context, 500, 'sine');
    oscillator2.connect(gainNode);
    oscillator2.start(context.currentTime);
    oscillator2.stop(context.currentTime + 0.3);
  }, 200);
}