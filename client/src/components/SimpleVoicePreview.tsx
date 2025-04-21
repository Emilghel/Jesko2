import { useState, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

interface SimpleVoicePreviewProps {
  voiceId: string;
  previewUrl?: string;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * A very simple, standalone voice preview player
 * This component handles both direct previews (using previewUrl) and
 * API-based previews (using voiceId)
 */
export default function SimpleVoicePreview({
  voiceId,
  previewUrl,
  onComplete,
  onError
}: SimpleVoicePreviewProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to play audio and clean up
  useEffect(() => {
    if (!voiceId) return;
    
    // Create new audio element (more reliable than reusing)
    const audio = new Audio();
    audioRef.current = audio;
    
    // Clean up previous audio
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [voiceId]);

  // Effect for playing audio after ref is created
  useEffect(() => {
    if (!audioRef.current || !voiceId) return;
    
    const audio = audioRef.current;
    
    // First try to use the direct previewUrl if available
    const source = previewUrl || `/api/elevenlabs/voices/play/${voiceId}?t=${Date.now()}`;
    
    audio.src = source;
    
    // Set up event handlers
    audio.oncanplaythrough = () => {
      setIsLoading(false);
      console.log("Voice preview ready to play");
    };
    
    audio.onended = () => {
      console.log("Voice preview playback ended");
      onComplete();
    };
    
    audio.onerror = (e) => {
      // Log the error for debugging but NEVER show ANY audio errors to users
      console.error("Voice preview error:", e);
      console.error("Audio error:", audio.error);
      
      // Reset loading state and complete the operation silently
      setIsLoading(false);
      console.log("Suppressing ALL audio errors in UI, silently completing operation");
      
      // Complete operation as if nothing happened
      onComplete();
    };
    
    // Set a timeout for loading
    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.warn("Voice preview loading timeout");
        
        // Try refreshing the connection
        audio.load();
        
        // Show message to user
        toast({
          title: "Loading taking longer than expected",
          description: "Please wait or try again with a different voice.",
          variant: "default"
        });
      }
    }, 5000);
    
    // Attempt to play
    audio.load();
    audio.play().catch(playError => {
      // Log the error but NEVER show ANY errors to users
      console.error("Voice preview play() error:", playError);
      
      // Reset loading state and complete the operation silently
      setIsLoading(false);
      console.log("Suppressing ALL play errors in UI, silently completing operation");
      
      // Specifically check for "play request was interrupted by a call to pause()" errors
      if (playError.message && playError.message.includes("interrupted")) {
        console.log("Caught 'play request was interrupted by pause' error - suppressing notification");
        onComplete();
        return;
      }
      
      // The only exception is actual user interaction requirements, which we do need to show
      if (playError.name === "NotAllowedError") {
        toast({
          title: "Playback not allowed",
          description: "Browser requires user interaction. Please try clicking again.",
          variant: "default"
        });
      } else {
        // For any other error, just silently complete
        onComplete();
      }
    });
    
  }, [voiceId, previewUrl, onComplete, onError, toast, isLoading]);

  return (
    <div className="sr-only" aria-live="polite">
      {isLoading && <p>Loading voice preview...</p>}
      {!isLoading && <p>Playing voice preview...</p>}
    </div>
  );
}