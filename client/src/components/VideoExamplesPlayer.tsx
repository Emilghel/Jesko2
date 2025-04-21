import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";

interface VideoExamplesPlayerProps {
  videos: { videoUrl: string; prompt: string }[];
  onSelectVideo?: (video: { videoUrl: string; prompt: string }) => void;
}

export default function VideoExamplesPlayer({
  videos,
  onSelectVideo
}: VideoExamplesPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Switch to the next video after current one ends
  useEffect(() => {
    const handleVideoEnd = () => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length);
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('ended', handleVideoEnd);
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('ended', handleVideoEnd);
      }
    };
  }, [currentIndex, videos.length]);

  // When video source changes, load and play the new video
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      const playVideo = () => {
        videoElement.play().catch(err => {
          console.error("Failed to autoplay video:", err);
        });
      };

      videoElement.load();
      playVideo();
    }
  }, [currentIndex]);

  return (
    <Card className="overflow-hidden border-gray-700 bg-black/40 rounded-xl shadow-xl">
      <div className="aspect-video relative overflow-hidden">
        <video 
          ref={videoRef}
          muted 
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={videos[currentIndex].videoUrl} type="video/mp4" />
          Your browser doesn't support videos.
        </video>
        
        {/* Small unobtrusive progress dots at bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center space-x-1 pb-1">
          {videos.map((_, index) => (
            <div 
              key={index}
              className={`h-1 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-purple-500/50 w-4' 
                  : 'bg-gray-400/20 w-2'
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}