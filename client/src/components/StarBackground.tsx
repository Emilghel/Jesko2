import { useEffect, useRef } from "react";

// Star animation styles
const starAnimationStyles = `
  @keyframes float {
    0% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-100px) translateX(20px) rotate(180deg); opacity: 0; }
  }
  
  .star-particle {
    position: absolute;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    filter: blur(1px);
    pointer-events: none;
    animation: float 4s ease-in-out infinite;
    z-index: 1;
  }
`;

export default function StarBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Create star particles
    const createStars = () => {
      for (let i = 0; i < 30; i++) {
        const star = document.createElement('div');
        star.classList.add('star-particle');
        
        // Randomize size (1-5px)
        const size = Math.random() * 4 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // Randomize position within the container
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        star.style.left = `${left}%`;
        star.style.top = `${top}%`;
        
        // Randomize animation delay
        star.style.animationDelay = `${Math.random() * 4}s`;
        
        // Randomize animation duration (3-7s)
        star.style.animationDuration = `${3 + Math.random() * 4}s`;
        
        container.appendChild(star);
      }
    };
    
    createStars();
    
    return () => {
      const stars = container.querySelectorAll('.star-particle');
      stars.forEach(star => star.remove());
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <style>{starAnimationStyles}</style>
    </div>
  );
}