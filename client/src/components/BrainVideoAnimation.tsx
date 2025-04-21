import React from 'react';

interface BrainVideoAnimationProps {
  width?: number;
  height?: number;
}

export default function BrainVideoAnimation({ 
  width = 150, 
  height = 150 
}: BrainVideoAnimationProps) {
  return (
    <div 
      className="relative mx-auto overflow-hidden" 
      style={{ 
        width, 
        height,
        borderRadius: '50%'
      }}
    >
      {/* Video container with scaling to focus on orb */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-[200%] h-[200%] object-cover"
          style={{
            borderRadius: '50%',
            // Center and scale the video to focus on the orb
            transform: 'scale(1.8)',
            transformOrigin: 'center',
            // This will make the video element itself invisible beyond the container boundaries
            objectPosition: 'center',
          }}
        >
          <source 
            src="https://video.wixstatic.com/video/ee3656_37e75dace36a42f9837e43d4e614d7e0/1080p/mp4/file.mp4" 
            type="video/mp4" 
          />
          Your browser does not support the video tag.
        </video>
      </div>
      
      {/* Enhanced glow effect around the orb */}
      <div 
        className="absolute inset-0 rounded-full animate-pulse" 
        style={{ 
          boxShadow: 'inset 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(138, 43, 226, 0.6), 0 0 30px rgba(0, 191, 255, 0.4)',
          animationDuration: '3s',
          pointerEvents: 'none'
        }} 
      />
    </div>
  );
}