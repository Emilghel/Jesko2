import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface GlitchySpeechBubbleProps {
  isActive: boolean;
  message?: string;
}

const LINE_COUNT = 300;  // Large number of lines for the sphere grid effect

export function GlitchySpeechBubble({ isActive, message = "Processing your message..." }: GlitchySpeechBubbleProps) {
  const sphereRef = useRef<HTMLDivElement>(null);
  const [animatedMessage, setAnimatedMessage] = useState('');
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [pulseState, setPulseState] = useState(0);
  
  // Create gentle rotation effect
  useEffect(() => {
    if (!isActive) return;
    
    let animationId: number;
    let time = 0;
    
    const animate = () => {
      time += 0.002;
      
      // Apply gentle rotation
      setRotation({
        x: Math.sin(time * 0.5) * 5,
        y: Math.cos(time * 0.3) * 5
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive]);
  
  // Create pulse effect
  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      setPulseState(prev => (prev + 1) % 100);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isActive]);
  
  // Animate message letters appearing
  useEffect(() => {
    if (!isActive || !message) {
      setAnimatedMessage('');
      return;
    }
    
    let currentText = '';
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex >= message.length) {
        clearInterval(interval);
        return;
      }
      
      currentText += message[currentIndex];
      setAnimatedMessage(currentText);
      currentIndex++;
    }, 80); // Speed of text appearing
    
    return () => clearInterval(interval);
  }, [isActive, message]);
  
  return (
    <div className={cn(
      "relative w-full flex flex-col items-center justify-center pt-8 pb-16",
      isActive ? "opacity-100" : "opacity-0",
      "transition-opacity duration-1000"
    )}>
      {/* Main sphere container */}
      <div 
        ref={sphereRef}
        className="relative perspective-[800px]"
        style={{
          width: '320px',
          height: '320px',
        }}
      >
        {/* Rotating sphere */}
        <div 
          className="absolute w-full h-full transform-style-preserve-3d"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          {/* Sphere grid lines */}
          {Array.from({ length: LINE_COUNT }).map((_, i) => {
            // Calculate line positions to form a sphere
            const theta = Math.random() * Math.PI * 2; // Random angle around sphere
            const phi = Math.random() * Math.PI; // Random angle from top to bottom
            
            // Calculate 3D coordinates on sphere surface
            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.sin(phi) * Math.sin(theta);
            const z = Math.cos(phi);
            
            // Line properties
            const length = Math.random() * 30 + 10; // Random line length
            const thickness = Math.random() * 0.5 + 0.1; // Random line thickness
            const opacity = Math.random() * 0.5 + 0.3; // Random opacity
            const hue = Math.random() * 20 + 190; // Blue to cyan color range
            
            return (
              <div 
                key={i}
                className="absolute bg-cyan-400 rounded-full origin-center" 
                style={{
                  width: `${length}px`,
                  height: `${thickness}px`,
                  opacity: opacity,
                  backgroundColor: `hsl(${hue}, 100%, 70%)`,
                  boxShadow: `0 0 4px 1px hsl(${hue}, 100%, 70%)`,
                  transform: `translate3d(${x * 150}px, ${y * 150}px, ${z * 150}px) 
                             rotateX(${Math.random() * 360}deg) 
                             rotateY(${Math.random() * 360}deg)`,
                  filter: 'blur(0.2px)',
                  backfaceVisibility: 'hidden',
                  animationDelay: `${i * 0.01}s`
                }}
              />
            );
          })}
        </div>
        
        {/* Glow effect layers */}
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-[50px] animate-pulse-slow"></div>
        <div className="absolute inset-0 rounded-full bg-blue-500/5 blur-[30px] animate-pulse-slower"></div>
        
        {/* Inner sphere for the core glow */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r from-cyan-500/30 to-blue-500/30",
            "blur-sm",
            isActive ? "animate-pulse-subtle" : ""
          )}
          style={{
            top: '15%',
            left: '15%',
            width: '70%',
            height: '70%',
            filter: 'blur(5px)',
            opacity: 0.7 + (pulseState % 20) / 100, // Subtle pulse
          }}
        ></div>
      </div>
      
      {/* Message text below the sphere */}
      <div className={cn(
        "mt-8 text-center max-w-sm",
        "text-cyan-100 font-light tracking-wide text-sm",
        "transition-all duration-300",
        isActive ? "opacity-100" : "opacity-0"
      )}>
        <div className="relative z-10 bg-black/30 p-4 rounded-xl backdrop-blur-sm">
          {animatedMessage.split('').map((char, index) => (
            <span 
              key={index}
              className={cn(
                "inline-block",
                Math.random() > 0.95 ? "animate-textGlitch" : ""
              )}
              style={{
                textShadow: '0 0 8px rgba(140, 230, 255, 0.8)',
                animationDelay: `${Math.random() * 2}s`
              }}
            >
              {char}
            </span>
          ))}
          <span className="inline-block w-1 h-4 ml-1 bg-cyan-300/70 animate-blink"></span>
        </div>
      </div>
      
      {/* Animation styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        
        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.9; }
        }
        
        @keyframes textGlitch {
          0%, 100% { 
            opacity: 1;
            transform: translateX(0) skew(0);
            filter: brightness(1);
          }
          10%, 30% { 
            opacity: 0.9;
            transform: translateX(-2px) skew(-1deg);
            filter: brightness(1.2);
          }
          20%, 40% { 
            opacity: 0.8;
            transform: translateX(2px) skew(1deg);
            filter: brightness(0.8);
          }
          50%, 70% { 
            opacity: 1;
            transform: translateX(0) skew(0);
            filter: brightness(1);
          }
          60%, 80% { 
            opacity: 0.9;
            transform: translateX(1px) skew(0.5deg);
            filter: brightness(1.1);
          }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s infinite ease-in-out;
        }
        
        .animate-pulse-slower {
          animation: pulse-slower 6s infinite ease-in-out;
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s infinite ease-in-out;
        }
        
        .animate-textGlitch {
          animation: textGlitch 3s infinite;
        }
        
        .animate-blink {
          animation: blink 1s infinite;
        }
        
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
      `}} />
    </div>
  );
}