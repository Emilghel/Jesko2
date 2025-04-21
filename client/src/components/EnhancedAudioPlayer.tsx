import { useState, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

interface EnhancedAudioPlayerProps {
  voiceId: string | null;
  onPlaybackComplete: () => void;
  onError: (error: any) => void;
}

export default function EnhancedAudioPlayer({ 
  voiceId, 
  onPlaybackComplete,
  onError
}: EnhancedAudioPlayerProps) {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Clean up on unmount
    return () => {
      cleanup();
    };
  }, []);
  
  useEffect(() => {
    if (voiceId) {
      playAudio(voiceId);
    } else {
      cleanup();
    }
    
    return () => {
      cleanup();
    };
  }, [voiceId]);
  
  const cleanup = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch (e) {
        console.error("Error during audio cleanup:", e);
      }
    }
    setIsPlaying(false);
    setIsLoaded(false);
  };
  
  const playAudio = async (id: string) => {
    // Clean up any existing audio
    cleanup();
    
    try {
      console.log("Enhanced player: Playing voice ID:", id);
      
      // Add cache-busting parameter and timestamp for fresh request
      const timestamp = new Date().getTime();
      const audioUrl = `/api/elevenlabs/voices/play/${id}?t=${timestamp}`;
      console.log("Enhanced player: Audio URL:", audioUrl);
      
      // Create a new audio element
      const audio = new Audio();
      audioRef.current = audio;
      
      // Set up event handlers BEFORE setting src
      audio.onloadstart = () => {
        console.log("Enhanced player: Audio loading started");
      };
      
      audio.oncanplaythrough = () => {
        console.log("Enhanced player: Audio can play through");
        setIsLoaded(true);
        
        // Start playback once loaded
        try {
          audio.play()
            .then(() => {
              console.log("Enhanced player: Audio playback started successfully");
              setIsPlaying(true);
            })
            .catch(playError => {
              handlePlayError(playError);
            });
        } catch (playError) {
          handlePlayError(playError);
        }
      };
      
      audio.onended = () => {
        console.log("Enhanced player: Audio playback ended");
        setIsPlaying(false);
        onPlaybackComplete();
      };
      
      audio.onerror = (e) => {
        console.error("Enhanced player: Error playing audio:", e);
        console.error("Enhanced player: Audio error code:", audio.error?.code);
        console.error("Enhanced player: Audio error message:", audio.error?.message);
        
        // Reset state
        setIsPlaying(false);
        setIsLoaded(false);
        
        // Report error
        onError(audio.error || new Error("Audio playback failed"));
      };
      
      // Set source and load
      audio.src = audioUrl;
      audio.preload = "auto";  // Force preloading
      audio.load();
      
      // Set a timeout to detect if loading takes too long
      const timeoutID = setTimeout(() => {
        if (!isLoaded && audioRef.current === audio) {
          console.warn("Enhanced player: Audio loading timeout");
          toast({
            title: "Loading taking longer than expected",
            description: "The voice sample is taking a while to load. Please wait or try again.",
            variant: "default",
          });
        }
      }, 5000);
      
      // Cleanup timeout on success or unmount
      return () => clearTimeout(timeoutID);
      
    } catch (error) {
      console.error("Enhanced player: Error setting up audio:", error);
      onError(error);
    }
  };
  
  const handlePlayError = (error: any) => {
    console.error("Enhanced player: Error during playback:", error);
    
    // Reset state
    setIsPlaying(false);
    
    // Handle different error types
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        toast({
          title: "Playback not allowed",
          description: "Browser requires user interaction before playing audio. Please click again.",
          variant: "default",
        });
      } else {
        onError(error);
      }
    } else {
      onError(new Error("Unknown playback error"));
    }
  };
  
  // Component doesn't render anything visible
  return null;
}