import React, { useEffect, useState } from 'react';
// Use static paths for deployment
const teamImage1 = "/static/12.jpg";
const teamImage2 = "/static/13.jpg";
const teamImage3 = "/static/15.jpg";

interface TeamMember {
  id: number;
  imagePath: string;
}

export default function TeamCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  
  const teamMembers: TeamMember[] = [
    {
      id: 1,
      imagePath: teamImage1
    },
    {
      id: 2,
      imagePath: teamImage2
    },
    {
      id: 3,
      imagePath: teamImage3
    }
  ];
  
  // Image rotation logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTransitioning(true);
      
      setTimeout(() => {
        // Rotate through images - 0, 1, 2, then back to 0
        setActiveIndex(prev => (prev + 1) % teamMembers.length);
        setTransitioning(false);
      }, 500); // Half of transition time for smooth change
      
    }, 3000); // Rotate every 3 seconds
    
    return () => clearInterval(interval);
  }, [teamMembers.length]);
  
  // Calculate positions for each image
  const getImagePosition = (index: number) => {
    const positions = [
      { zIndex: 30, transform: 'translateZ(100px) scale(1)', opacity: 1 }, // Front
      { zIndex: 20, transform: 'translateX(50%) translateZ(0px) scale(0.8) rotateY(-8deg)', opacity: 0.9 }, // Right side
      { zIndex: 10, transform: 'translateX(-50%) translateZ(0px) scale(0.8) rotateY(8deg)', opacity: 0.9 }, // Left side
    ];
    
    // Calculate relative position based on activeIndex
    const relativePosition = (index - activeIndex + 3) % 3;
    return positions[relativePosition];
  };
  
  return (
    <div className="w-full py-6 relative overflow-hidden bg-[#0A0F16]">
      {/* Animated starry background - match with Own Your AI section */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="stars-container absolute inset-0">
          <div className="stars-small"></div>
          <div className="stars-medium"></div>
          <div className="stars-large"></div>
          
          {/* Enhanced shooting stars (diagonal) */}
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          
          {/* Twinkling stars (static position) */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={`twinkling-${i}`}
              className="twinkling-star"
              style={{
                "--size": `${Math.random() * 1.5 + 1}px`,
                "--base-opacity": `${Math.random() * 0.5 + 0.4}`,
                "--min-opacity": `${Math.random() * 0.2 + 0.1}`,
                "--max-opacity": `${Math.random() * 0.4 + 0.6}`,
                "--twinkle-duration": `${Math.random() * 3 + 2}s`,
                "--twinkle-delay": `${Math.random() * 5}s`,
                "--glow-size": `${Math.random() * 3 + 2}px`,
                "--glow-color": `rgba(${
                  i % 3 === 0 ? "255, 255, 255" : 
                  i % 3 === 1 ? "51, 195, 189" : "0, 117, 255"
                }, ${Math.random() * 0.4 + 0.3})`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              } as React.CSSProperties}
            />
          ))}
          
          {/* Floating stars (moving position) */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div 
              key={`floating-${i}`}
              className="floating-star"
              style={{
                "--size": `${Math.random() * 2 + 1.5}px`,
                "--color": `${
                  i % 3 === 0 ? "#fff" : 
                  i % 3 === 1 ? "#33C3BD" : "#0075FF"
                }`,
                "--float-duration": `${Math.random() * 15 + 20}s`,
                "--float-delay": `${Math.random() * 10}s`,
                "--twinkle-duration": `${Math.random() * 4 + 2}s`,
                "--twinkle-delay": `${Math.random() * 5}s`,
                "--x-distance": "0px",
                "--y-distance": "0px",
                "--x-distance2": "0px",
                "--y-distance2": "0px",
                "--x-distance3": "0px",
                "--y-distance3": "0px",
                "--x-distance4": "0px",
                "--y-distance4": "0px",
                "--glow-size": `${Math.random() * 4 + 3}px`,
                "--glow-color": `rgba(${
                  i % 3 === 0 ? "255, 255, 255" : 
                  i % 3 === 1 ? "51, 195, 189" : "0, 117, 255"
                }, ${Math.random() * 0.5 + 0.3})`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
      
      <div className="text-center mb-3 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
          Meet the Team
        </h2>
        <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-2">
          The experts behind our revolutionary AI technology
        </p>
      </div>
      
      {/* 3D Carousel Container */}
      <div className="relative h-[620px] md:h-[680px] perspective-1000 mx-auto max-w-6xl mb-4 z-10">
        <div className="absolute inset-0 flex items-center justify-center">
          {teamMembers.map((member, index) => {
            const position = getImagePosition(index);
            
            return (
              <div
                key={member.id}
                className={`
                  absolute transition-all duration-1000 ease-in-out 
                  cursor-pointer
                `}
                style={{ 
                  zIndex: position.zIndex,
                  transform: position.transform,
                  opacity: position.opacity,
                }}
                onClick={() => setActiveIndex(index)}
              >
                <div 
                  className={`
                    rounded-xl overflow-hidden shadow-2xl transition-all duration-500
                    ${index === activeIndex ? 'team-card-hover' : ''} 
                    border-2 ${index === activeIndex 
                      ? 'border-purple-500 border-opacity-60' 
                      : 'border-transparent'}
                    bg-transparent
                  `}
                  style={{ 
                    width: index === activeIndex ? '450px' : '320px',
                    height: index === activeIndex ? '600px' : '500px',
                    boxShadow: index === activeIndex 
                      ? '0 15px 30px -10px rgba(139, 92, 246, 0.5)' 
                      : '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <img 
                    src={member.imagePath} 
                    alt={`Team member ${index + 1}`} 
                    className={`
                      w-full h-full object-contain transition-transform duration-700
                      ${index === activeIndex ? 'scale-100' : 'scale-105'}
                      bg-transparent mix-blend-normal
                    `}
                    style={{ objectPosition: 'center' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Navigation Dots */}
      <div className="flex justify-center gap-2 mt-4 relative z-10">
        {teamMembers.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === activeIndex 
                ? 'bg-gradient-to-r from-purple-600 to-blue-500 scale-125' 
                : 'bg-gray-500 opacity-50 hover:opacity-75'
            }`}
            aria-label={`View team member ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}