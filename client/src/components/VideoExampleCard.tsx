import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface VideoExampleCardProps {
  videoUrl: string;
  onClick: () => void;
}

export default function VideoExampleCard({
  videoUrl,
  onClick
}: VideoExampleCardProps) {
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer border-gray-700 bg-black/40 hover:bg-black/60" 
      onClick={onClick}
    >
      <div className="h-32 overflow-hidden relative">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser doesn't support videos.
        </video>
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
          <span className="text-white text-sm font-medium">Use this style</span>
        </div>
      </div>
    </Card>
  );
}