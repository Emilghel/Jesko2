import React, { useEffect, useRef } from 'react';

interface AdvancedStarryBackgroundProps {
  density?: number;
  enableTAA?: boolean;
  enableSSAO?: boolean;
  enableHDR?: boolean;
  enableBloom?: boolean;
  depth?: number;
  shootingStarFrequency?: number; // How often shooting stars appear (in seconds)
  shootingStarCount?: number;     // How many shooting stars can be visible at once
}

// Optimized version with reduced animation complexity and fewer DOM elements
const AdvancedStarryBackground: React.FC<AdvancedStarryBackgroundProps> = ({
  density = 30, // Significantly reduced from 100
  enableTAA = true,
  enableSSAO = true,
  enableHDR = true,
  enableBloom = true,
  depth = 2,  // Reduced from 3
  shootingStarFrequency = 30, // Seconds between shooting star animations (increased to avoid performance issues)
  shootingStarCount = 1     // Maximum number of shooting stars at once (reduced to avoid freezing)
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Add styles for stars
  useEffect(() => {
    if (!containerRef.current) return;
    
    const styles = document.createElement('style');
    styles.textContent = `
      @keyframes simpleTwinkle {
        0%, 100% { opacity: var(--base-opacity); }
        50% { opacity: var(--max-opacity); }
      }
      
      @keyframes shootingStarMove {
        0% {
          transform: translate(0, 0) scale(0.3);
          opacity: 0;
        }
        2% {
          transform: translate(calc(var(--move-x) * 0.02), calc(var(--move-y) * 0.02)) scale(0.7);
          opacity: calc(var(--star-opacity) * 0.7);
        }
        5% {
          transform: translate(calc(var(--move-x) * 0.05), calc(var(--move-y) * 0.05)) scale(1);
          opacity: var(--star-opacity);
        }
        90% {
          transform: translate(calc(var(--move-x) * 0.9), calc(var(--move-y) * 0.9)) scale(0.9);
          opacity: var(--star-opacity);
        }
        100% {
          transform: translate(var(--move-x), var(--move-y)) scale(0.2);
          opacity: 0;
        }
      }
      
      @keyframes shootingStarTail {
        0% {
          width: 0;
          opacity: 0;
          transform: scaleY(0.5);
        }
        2% {
          width: calc(var(--tail-length) * 0.3);
          opacity: calc(var(--tail-opacity) * 0.5);
          transform: scaleY(0.7);
        }
        5% {
          width: var(--tail-length);
          opacity: var(--tail-opacity);
          transform: scaleY(1);
        }
        80% {
          width: calc(var(--tail-length) * 0.6);
          opacity: calc(var(--tail-opacity) * 0.6);
          transform: scaleY(0.8);
        }
        100% {
          width: 0;
          opacity: 0;
          transform: scaleY(0.2);
        }
      }
      
      @keyframes shootingStarPulse {
        0%, 100% {
          box-shadow: 0 0 var(--glow-size) var(--glow-size) var(--glow-color);
        }
        50% {
          box-shadow: 0 0 calc(var(--glow-size) * 1.5) calc(var(--glow-size) * 1.2) var(--glow-color);
        }
      }
      
      .simple-star {
        position: absolute;
        border-radius: 50%;
        background-color: var(--star-color);
        width: var(--star-size);
        height: var(--star-size);
        animation: simpleTwinkle var(--twinkle-duration) infinite ease-in-out;
        will-change: opacity;
        z-index: calc(var(--layer) * 10);
      }
      
      .with-bloom {
        box-shadow: 0 0 var(--glow-size) var(--glow-size) var(--glow-color);
      }
      
      .star-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
      
      .starry-container {
        position: relative;
        overflow: hidden;
        width: 100%;
        height: 100%;
        background: linear-gradient(to bottom, rgba(8, 15, 30, 0.5), rgba(5, 10, 20, 0.7));
      }
      
      .shooting-star {
        position: absolute;
        width: 5px;
        height: 5px;
        background-color: rgba(255, 255, 255, 1);
        border-radius: 50%;
        animation: shootingStarMove var(--duration) cubic-bezier(0.05, 0.9, 0.1, 1) forwards;
        z-index: 100;
        will-change: transform, opacity, box-shadow;
        filter: blur(0.3px);
      }
      
      .shooting-star::before {
        content: '';
        position: absolute;
        top: 50%;
        right: 2px;
        height: 2.5px;
        width: 0;
        transform: translateY(-50%);
        background: linear-gradient(to left, 
          rgba(255, 255, 255, 0.98), 
          rgba(230, 240, 255, 0.9) 10%, 
          rgba(200, 230, 255, 0.7) 25%,
          rgba(180, 215, 255, 0.5) 50%, 
          rgba(160, 190, 255, 0.2) 75%, 
          rgba(140, 170, 255, 0));
        border-radius: 20px;
        transform-origin: right center;
        animation: shootingStarTail var(--duration) cubic-bezier(0.05, 0.8, 0.3, 0.95) forwards;
        filter: blur(0.2px);
      }
      
      .shooting-star::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 50%;
        animation: shootingStarPulse calc(var(--duration) * 0.5) infinite ease-in-out;
        animation-delay: calc(var(--duration) * 0.1);
      }
    `;
    
    document.head.appendChild(styles);
    
    return () => {
      document.head.removeChild(styles);
    };
  }, []);

  // Create stars with optimized approach
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Clear any existing stars
    container.innerHTML = '';
    
    // Create star layers - limited to fewer layers for better performance
    for (let layerIndex = 0; layerIndex < depth; layerIndex++) {
      const layer = document.createElement('div');
      layer.className = 'star-layer';
      layer.style.setProperty('--layer', `${layerIndex + 1}`);
      
      // Significantly reduced density per layer
      const layerDensity = Math.floor(density * (1 + 0.3 * layerIndex));
      
      // Create simplified stars
      for (let i = 0; i < layerDensity; i++) {
        createSimpleStar(layer, layerIndex, enableHDR, enableBloom);
      }
      
      container.appendChild(layer);
    }
    
    // Apply TAA-like effect with minimal processing
    if (enableTAA && depth > 1) {
      const layers = container.querySelectorAll('.star-layer');
      layers.forEach((layer, index) => {
        if (index > 0) {
          const element = layer as HTMLElement;
          element.style.filter = `blur(${index * 0.7}px)`;
        }
      });
    }
    
    // Create a separate layer for shooting stars
    const shootingStarLayer = document.createElement('div');
    shootingStarLayer.className = 'star-layer';
    shootingStarLayer.style.zIndex = '50';
    container.appendChild(shootingStarLayer);
    
    // Initialize shooting stars if enabled
    if (shootingStarCount > 0) {
      // Initial delay before first shooting star
      setTimeout(() => {
        createSimpleShootingStar(shootingStarLayer, enableHDR, enableBloom);
      }, Math.random() * 5000 + 2000);
      
      // Set up interval to create new shooting stars
      const interval = setInterval(() => {
        // Only create new ones if we're below the limit
        const currentStars = shootingStarLayer.querySelectorAll('.shooting-star');
        if (currentStars.length < shootingStarCount) {
          createSimpleShootingStar(shootingStarLayer, enableHDR, enableBloom);
        }
      }, shootingStarFrequency * 1000);
      
      return () => clearInterval(interval);
    }
  }, [density, depth, enableHDR, enableBloom, enableTAA, shootingStarCount, shootingStarFrequency]);

  // Optimized star creation function
  const createSimpleStar = (parent: HTMLElement, layerIndex: number, enableHDR: boolean, enableBloom: boolean) => {
    const star = document.createElement('div');
    star.className = `simple-star ${enableBloom && enableHDR ? 'with-bloom' : ''}`;
    
    // Simplified star properties
    const size = Math.random() * 2.5 + 0.5; // Smaller size range
    const baseOpacity = 0.3 + Math.random() * 0.4;
    const maxOpacity = Math.min(0.95, baseOpacity + Math.random() * 0.3);
    
    // Random position
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    
    // Simplified animation values (longer durations for less CPU usage)
    const twinkleDuration = Math.random() * 10 + 10; // Much longer animation cycle
    
    // Simplified color calculations
    let color, glowColor, glowSize;
    if (layerIndex === 0) {
      // Front layer stars - brighter
      const base = Math.random() * 55 + 200;
      color = `rgba(${base}, ${base}, ${base}, 1)`;
      glowColor = `rgba(${base}, ${base}, ${base}, 0.3)`;
      glowSize = size * (enableBloom ? 2 : 0);
    } else {
      // Background stars - dimmer and bluer
      color = `rgba(${Math.random() * 50 + 150}, ${Math.random() * 50 + 170}, ${Math.random() * 55 + 200}, 1)`;
      glowColor = `rgba(150, 170, 255, 0.2)`;
      glowSize = size * (enableBloom ? 1.5 : 0);
    }
    
    // Set only the necessary CSS properties
    star.style.setProperty('--star-size', `${size}px`);
    star.style.setProperty('--star-color', color);
    star.style.setProperty('--base-opacity', `${baseOpacity}`);
    star.style.setProperty('--max-opacity', `${maxOpacity}`);
    star.style.setProperty('--twinkle-duration', `${twinkleDuration}s`);
    star.style.setProperty('--glow-color', glowColor);
    star.style.setProperty('--glow-size', `${glowSize}px`);
    
    star.style.left = `${left}%`;
    star.style.top = `${top}%`;
    
    // Stagger animation starts
    star.style.animationDelay = `${Math.random() * 10}s`;
    
    // Append the star to the parent layer
    parent.appendChild(star);
  };

  // Create a fast shooting star with a trail that evaporates
  const createSimpleShootingStar = (parent: HTMLElement, enableHDR: boolean, enableBloom: boolean) => {
    const shootingStar = document.createElement('div');
    shootingStar.className = 'shooting-star';
    
    // Position near top or sides of the screen (more variation)
    const startX = Math.random() * 80 + 5; // % from left
    const startY = Math.random() * 30; // % from top (mostly higher)
    
    // Faster duration (0.7-1.5 seconds) for more realistic swipe effect
    const duration = Math.random() * 0.8 + 0.7;
    
    // Longer travel distance for more dramatic effect
    const moveX = (Math.random() * 60 + 50) * (Math.random() > 0.5 ? 1 : -1); // vw
    const moveY = Math.random() * 40 + 40; // vh (more downward movement)
    
    // Star brightness
    const starOpacity = Math.random() * 0.1 + 0.9; // 0.9-1.0 (brighter)
    
    // Trail properties - longer trail for more dramatic effect
    const tailLength = Math.random() * 60 + 40; // px (40-100px)
    const tailOpacity = Math.random() * 0.3 + 0.7; // 0.7-1.0 (more visible)
    
    // Glow effect
    const glowSize = Math.random() * 3 + 2;
    const glowColor = `rgba(255, 255, 255, ${starOpacity * 0.9})`;
    
    // Set CSS properties for the star
    shootingStar.style.setProperty('--duration', `${duration}s`);
    shootingStar.style.setProperty('--move-x', `${moveX}vw`);
    shootingStar.style.setProperty('--move-y', `${moveY}vh`);
    shootingStar.style.setProperty('--star-opacity', `${starOpacity}`);
    shootingStar.style.setProperty('--tail-length', `${tailLength}px`);
    shootingStar.style.setProperty('--tail-opacity', `${tailOpacity}`);
    shootingStar.style.setProperty('--glow-size', `${glowSize}px`);
    shootingStar.style.setProperty('--glow-color', glowColor);
    
    shootingStar.style.left = `${startX}%`;
    shootingStar.style.top = `${startY}%`;
    
    // Add stronger glow effect for more visibility
    if (enableHDR && enableBloom) {
      shootingStar.style.boxShadow = `0 0 ${glowSize}px ${glowSize}px ${glowColor}`;
    }
    
    // Append to parent
    parent.appendChild(shootingStar);
    
    // Auto-remove after animation is complete
    setTimeout(() => {
      if (parent.contains(shootingStar)) {
        parent.removeChild(shootingStar);
      }
    }, duration * 1000 + 100);
  };

  return (
    <div className="fixed inset-0 z-0">
      {/* Main container for stars - simplified */}
      <div ref={containerRef} className="starry-container w-full h-full"></div>
      
      {/* Simplified SSAO effect */}
      {enableSSAO && (
        <div className="fixed inset-0 z-0 pointer-events-none" 
             style={{
               background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 100%)',
               mixBlendMode: 'multiply'
             }}></div>
      )}
      
      {/* Simplified bloom/HDR effect */}
      {enableHDR && enableBloom && (
        <div className="fixed inset-0 z-0 pointer-events-none" 
             style={{
               background: 'radial-gradient(circle at 50% 50%, rgba(10,20,40,0.2) 0%, rgba(5,10,20,0) 70%)',
               mixBlendMode: 'screen'
             }}></div>
      )}
    </div>
  );
};

export default AdvancedStarryBackground;