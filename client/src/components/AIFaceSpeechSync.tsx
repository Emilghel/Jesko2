import React, { useState, useEffect, useRef } from 'react';
import AIFace from './AIFace';

interface AIFaceSpeechSyncProps {
  className?: string;
  isPlaying?: boolean; // Whether audio is currently playing
}

const AIFaceSpeechSync: React.FC<AIFaceSpeechSyncProps> = ({ 
  className = '', 
  isPlaying = false 
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Simulate audio visualization based on isPlaying prop
  useEffect(() => {
    if (!isPlaying) {
      setIsSpeaking(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const simulateAudioVisualization = () => {
      // Simulate audio levels when speaking to create natural mouth movement
      if (isPlaying) {
        const newLevel = 0.2 + Math.random() * 0.6; // Randomized levels
        setAudioLevel(newLevel);
        setIsSpeaking(newLevel > 0.3); // Only consider speaking if above threshold
      } else {
        setAudioLevel(0);
        setIsSpeaking(false);
      }

      animationRef.current = requestAnimationFrame(simulateAudioVisualization);
    };

    simulateAudioVisualization();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Add pulse animations to container based on audio level
  const pulseStyle = {
    boxShadow: isSpeaking 
      ? `0 0 ${10 + audioLevel * 20}px ${audioLevel * 10}px rgba(51, 195, 189, ${audioLevel * 0.3})` 
      : 'none',
    transition: 'box-shadow 0.1s ease-in-out'
  };

  return (
    <div 
      className={`relative ${className}`}
      style={pulseStyle}
    >
      <div className="w-full h-full relative">
        {/* Glow effect when speaking */}
        {isSpeaking && (
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(51, 195, 189, ${0.1 + audioLevel * 0.2}) 0%, rgba(0, 117, 255, 0) 70%)`,
              animation: 'pulse 2s infinite ease-in-out'
            }}
          />
        )}
        
        {/* AI Face component */}
        <AIFace speaking={isSpeaking} />
        
        {/* Audio wave visualization (optional) */}
        {isSpeaking && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <div className="audio-wave flex items-center justify-center h-6 gap-[2px]">
              {Array.from({ length: 7 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-[3px] bg-gradient-to-t from-[#33C3BD] to-[#0075FF] rounded-full"
                  style={{ 
                    height: `${10 + Math.sin(Date.now() / 200 + i) * audioLevel * 15}px`,
                    opacity: 0.7 + Math.sin(Date.now() / 300 + i) * 0.3,
                    transition: 'height 0.1s ease'
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
          }
        `
      }} />
    </div>
  );
};

export default AIFaceSpeechSync;