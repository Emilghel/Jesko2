import React, { useRef, useEffect, useState } from 'react';

interface VideoBackgroundProps {
  videoUrl: string;
}

/**
 * A full-screen video background component
 * Plays the video as an animated background with continuous looping
 * Uses a fade transition to create a smoother loop experience
 */
const VideoBackground: React.FC<VideoBackgroundProps> = ({ 
  videoUrl
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isNearingEnd, setIsNearingEnd] = useState(false);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Function to add smooth transition near the end of the video
    const handleTimeUpdate = () => {
      if (!video) return;
      
      // Calculate when we're close to the end (last 0.5 seconds)
      const timeLeft = video.duration - video.currentTime;
      
      // When we're near the end, add the fade class for smooth transition
      if (timeLeft < 0.5 && !isNearingEnd) {
        setIsNearingEnd(true);
      } else if (timeLeft > 1.0 && isNearingEnd) {
        setIsNearingEnd(false);
      }
    };
    
    // Listen for page visibility change to restart video when user returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && video) {
        video.play().catch(error => console.error("Error playing video:", error));
      }
    };
    
    // Listen for loop completion to reset the fade state
    const handleLoop = () => {
      setIsNearingEnd(false);
    };
    
    // Register all event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loop', handleLoop);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Start playing the video
    video.play().catch(error => console.error("Error playing video:", error));
    
    // Clean up event listeners
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loop', handleLoop);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isNearingEnd]);
  
  return (
    <div className="absolute inset-0 overflow-hidden bg-black z-0">
      {/* Video element with loop attribute for continuous playback */}
      <video
        ref={videoRef}
        className={`absolute min-w-full min-h-full w-auto h-auto object-cover transition-opacity duration-500 ${isNearingEnd ? 'opacity-70' : 'opacity-100'}`}
        muted
        playsInline
        loop
        preload="auto"
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Optional overlay to darken the video slightly */}
      <div className="absolute inset-0 bg-black bg-opacity-30 z-1"></div>
      
      {/* Fade overlay that appears at the end of the loop */}
      <div 
        className={`absolute inset-0 bg-black z-1 transition-opacity duration-1000 ${isNearingEnd ? 'opacity-30' : 'opacity-0'}`}
      ></div>
    </div>
  );
};

export default VideoBackground;