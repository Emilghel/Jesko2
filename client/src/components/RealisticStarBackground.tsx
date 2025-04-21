import React, { useEffect } from 'react';

/**
 * A realistic starry background with improved depth and density
 * Uses a combination of CSS-only stars for better performance
 */
const RealisticStarBackground: React.FC = () => {
  useEffect(() => {
    // Generate star field on mount
    generateStarField();
    
    // Clean up star field on unmount
    return () => {
      const starContainer = document.getElementById('realistic-star-container');
      if (starContainer) {
        while (starContainer.firstChild) {
          starContainer.removeChild(starContainer.firstChild);
        }
      }
    };
  }, []);
  
  // Generate a realistic star field with depth
  const generateStarField = () => {
    const starContainer = document.getElementById('realistic-star-container');
    if (!starContainer) return;
    
    // Clear any existing stars
    while (starContainer.firstChild) {
      starContainer.removeChild(starContainer.firstChild);
    }
    
    // Star colors based on real star types (no red)
    const colors = [
      '#ffffff', // White main sequence
      '#f8f8ff', // White with slight blue tint
      '#f0f8ff', // Alice Blue (white with blue tint)
      '#e6f0ff', // Very pale blue
      '#ccd9ff', // Pale blue
      '#adc2eb', // Light blue
      '#a5bdff', // Sky blue
      '#33C3BD', // Teal/cyan
      '#0075FF', // Blue
      '#A482FF'  // Purple 
    ];
    
    // Total number of stars
    const totalStars = 800;
    
    // Create stars with different layers and properties
    for (let i = 0; i < totalStars; i++) {
      const star = document.createElement('div');
      star.className = 'realistic-star';
      
      // Determine star layer (distance) - far, mid, near
      const layer = Math.random() < 0.6 ? 'far' : (Math.random() < 0.7 ? 'mid' : 'near');
      star.classList.add(`star-${layer}`);
      
      // Assign random position
      star.style.top = `${Math.random() * 100}%`;
      star.style.left = `${Math.random() * 100}%`;
      
      // Apply size based on layer
      let size;
      let opacity;
      let colorIndex;
      let animationDuration;
      
      // Far stars: smaller, dimmer, mostly white/blue
      if (layer === 'far') {
        size = Math.random() * 1 + 0.5; // 0.5-1.5px
        opacity = Math.random() * 0.4 + 0.4; // 0.4-0.8
        colorIndex = Math.floor(Math.random() * 4); // First 4 colors (whites/pale blues)
        animationDuration = Math.random() * 3 + 5; // 5-8s
      } 
      // Mid stars: medium size, medium brightness, varied colors
      else if (layer === 'mid') {
        size = Math.random() * 1.5 + 1.2; // 1.2-2.7px
        opacity = Math.random() * 0.3 + 0.6; // 0.6-0.9
        colorIndex = Math.floor(Math.random() * colors.length); // Any color
        animationDuration = Math.random() * 4 + 3; // 3-7s
      } 
      // Near stars: larger, brighter, more colorful
      else {
        size = Math.random() * 2 + 2; // 2-4px
        opacity = Math.random() * 0.2 + 0.8; // 0.8-1.0
        colorIndex = Math.floor(Math.random() * colors.length); // Any color
        animationDuration = Math.random() * 5 + 2; // 2-7s
      }
      
      // Apply the calculated properties
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.backgroundColor = colors[colorIndex];
      star.style.opacity = opacity.toString();
      
      // Add glow effect based on layer
      const glowSize = layer === 'near' ? size * 2.5 : (layer === 'mid' ? size * 1.5 : size);
      star.style.boxShadow = `0 0 ${glowSize}px ${glowSize / 2}px ${colors[colorIndex]}`;
      
      // Set random animation delay and duration
      star.style.animationDelay = `${Math.random() * 10}s`;
      star.style.animationDuration = `${animationDuration}s`;
      
      // Add to container
      starContainer.appendChild(star);
    }
    
    // Add shooting stars
    for (let i = 0; i < 5; i++) {
      const shootingStar = document.createElement('div');
      shootingStar.className = 'realistic-shooting-star';
      
      // Position at different heights
      shootingStar.style.top = `${10 + (i * 16)}%`;
      shootingStar.style.animationDelay = `${i * 4.2}s`;
      
      // Vary shooting star sizes
      const size = Math.random() * 1.5 + 1;
      shootingStar.style.height = `${size}px`;
      
      // Tail glow effect
      const tail = document.createElement('div');
      tail.className = 'shooting-star-tail';
      
      shootingStar.appendChild(tail);
      starContainer.appendChild(shootingStar);
    }
  };
  
  return (
    <div className="absolute inset-0 overflow-hidden bg-black z-0">
      {/* Static background gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-[#090723] via-[#0C0B33] to-[#090723] z-0"
        style={{ opacity: 0.9 }}
      ></div>
      
      {/* Distant galaxy glow */}
      <div className="absolute inset-0 z-1">
        <div 
          className="absolute w-full h-full bg-gradient-radial from-[#0B0651] to-transparent opacity-40"
          style={{ 
            top: '10%', 
            left: '40%', 
            width: '70%', 
            height: '70%', 
            transform: 'translate(-50%, -50%) rotate(5deg)',
            filter: 'blur(80px)'
          }}
        ></div>
        
        <div 
          className="absolute bg-gradient-radial from-[#0B174F] to-transparent opacity-20"
          style={{ 
            top: '60%', 
            left: '70%', 
            width: '50%', 
            height: '50%', 
            transform: 'translate(-50%, -50%) rotate(-10deg)',
            filter: 'blur(100px)'
          }}
        ></div>
      </div>
      
      {/* Star containers */}
      <div id="realistic-star-container" className="absolute inset-0 z-2"></div>
      
      {/* Dynamic CSS styles */}
      <style>{`
        /* Base star styling */
        .realistic-star {
          position: absolute;
          border-radius: 50%;
          animation: twinkle-realistic infinite ease-in-out alternate;
        }
        
        /* Layer-specific effects */
        .star-far {
          z-index: 2;
        }
        
        .star-mid {
          z-index: 3;
        }
        
        .star-near {
          z-index: 4;
        }
        
        /* Realistic twinkling animation */
        @keyframes twinkle-realistic {
          0%, 100% { 
            transform: scale(1);
            filter: blur(0px);
          }
          50% { 
            transform: scale(1.15);
            filter: blur(0.2px);
          }
        }
        
        /* Shooting star styling */
        .realistic-shooting-star {
          position: absolute;
          left: -200px;
          width: 150px;
          transform: rotate(-45deg);
          z-index: 5;
          overflow: visible;
          animation: realistic-shooting 10s linear infinite;
        }
        
        /* Shooting star tail */
        .shooting-star-tail {
          position: absolute;
          top: 0;
          right: 0;
          width: 140px;
          height: 1.5px;
          background: linear-gradient(
            to left, 
            rgba(255, 255, 255, 1) 0%, 
            rgba(170, 220, 255, 0.9) 10%,
            rgba(100, 200, 255, 0.7) 20%,
            rgba(200, 230, 255, 0.5) 30%,
            rgba(255, 255, 255, 0.3) 60%,
            rgba(230, 240, 255, 0) 100%
          );
          border-radius: 50px;
          transform: translateY(-50%);
          box-shadow: 
            0 0 10px 1px rgba(255, 255, 255, 1),
            0 0 20px 2px rgba(200, 230, 255, 0.7),
            0 0 30px 3px rgba(170, 220, 255, 0.3);
          filter: blur(0.2px);
          mix-blend-mode: screen;
        }
        
        /* Shooting star animation */
        @keyframes realistic-shooting {
          0% {
            transform: translateX(0) translateY(0) rotate(-45deg);
            opacity: 0;
          }
          3% {
            opacity: 1;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translateX(calc(100vw + 200px)) translateY(calc(100vh + 200px)) rotate(-45deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default RealisticStarBackground;