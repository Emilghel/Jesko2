import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight } from "lucide-react";
import { ChatDebug } from "@/components/ChatDebug";
import AnimatedChat from "@/components/AnimatedChat";
import VideoBackground from "@/components/VideoBackground";
import '@/styles/ai-animations.css';

// Define Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal?: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Declare global window property for debounce
declare global {
  interface Window {
    lastToggleTime?: number;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: any;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  readyState?: string; // Add readyState property
  abort(): void;
  start(): void;
  stop(): void;
}

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Define conversation message type
type ConversationMessage = {
  type: 'user' | 'ai';
  text: string;
};

// Demo responses for fallback mode
const demoResponses = [
  "Hello! How can I assist you today with Jesko?",
  "I'm here to help you understand our AI voice communication platform. What would you like to know?",
  "Our platform provides intelligent, secure, and adaptive conversational experiences with robust voice recognition.",
  "Jesko helps you automate customer interactions, schedule appointments, and handle support tickets 24/7.",
  "You can customize your AI agent's personality, voice, and behavior to match your brand's identity.",
  "The platform integrates seamlessly with your existing systems through our API and webhooks.",
  "Would you like me to explain more about our pricing plans or perhaps schedule a demo?",
  "That's a great question. Our technology uses advanced neural networks for natural-sounding conversations.",
  "I understand your concerns. Security and privacy are our top priorities, and all data is encrypted end-to-end.",
  "I'd be happy to explain that in more detail or answer any other questions you might have."
];

// Section components
const HeroSection = () => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [useFallback, setUseFallback] = useState<boolean>(true); // Default to fallback mode
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  // Store conversation history
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  // Reference to the speech recognition object
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAudioPlaying = useRef<boolean>(false);

  // Function to safely start speech recognition
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      console.log("Starting speech recognition...");
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
    }
  }, []);

  // Function to safely stop speech recognition
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      console.log("Stopping speech recognition...");
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
  }, []);

  // Initialize speech recognition on component mount
  useEffect(() => {
    // Check if the browser supports speech recognition
    if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
      console.error('Speech recognition is not supported in this browser');
      return;
    }

    // Create speech recognition instance
    const SpeechRecognitionConstructor = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognitionConstructor();

    // Configure the speech recognition
    recognitionRef.current.continuous = true; // Enable continuous mode for smoother conversation flow
    recognitionRef.current.interimResults = true; // Allow interim results
    recognitionRef.current.lang = 'en-US';

    // Store reference to the recognition instance
    const recognitionInstance = recognitionRef.current;

    // Set up all event handlers for the recognition instance
    if (recognitionInstance) {
      // Handle results
      recognitionInstance.onresult = async (event: SpeechRecognitionEvent) => {
        try {
          // Get transcript from the last result
          const resultIndex = event.resultIndex;
          const transcript = event.results[resultIndex][0].transcript;
          const isFinal = event.results[resultIndex].isFinal;

          console.log('Speech recognized:', transcript, 'Final:', isFinal);

          // Update the current transcript as we go
          setTranscript(transcript);

          // Only process final results
          if (isFinal && transcript.trim().length > 0) {
            // Process the speech with AI and get a voice response
            setIsProcessing(true);
            // Keep listening active for continuous conversation

            try {
              // Add user message to conversation history
              const userMessage = { type: 'user' as const, text: transcript.trim() };
              const updatedHistory = [...conversationHistory, userMessage];
              setConversationHistory(updatedHistory);

              // Debug log
              console.log('Sending message to API:', JSON.stringify({
                message: userMessage.text,
                conversation: updatedHistory.map(msg => ({
                  type: msg.type,
                  text: msg.text
                }))
              }));

              let aiResponse;

              // Use fallback demo responses when enabled
              if (useFallback) {
                // Use a random demo response
                const randomIndex = Math.floor(Math.random() * demoResponses.length);
                aiResponse = demoResponses[randomIndex];
                console.log('Using demo response:', aiResponse);
              } else {
                // Get AI response from the chat API
                const chatResponse = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    message: userMessage.text,
                    // Pass the conversation history for context - but only the text and type properties
                    conversation: updatedHistory.map(msg => ({
                      type: msg.type,
                      text: msg.text
                    }))
                  }),
                });

                if (!chatResponse.ok) {
                  throw new Error(`Failed to get AI response: ${chatResponse.statusText}`);
                }

                const chatData = await chatResponse.json();
                aiResponse = chatData.response;
              }

              console.log('AI response received:', aiResponse);

              // Set the text response
              setResponse(aiResponse);

              // Add AI response to conversation history
              setConversationHistory([...updatedHistory, { type: 'ai' as const, text: aiResponse }]);

              // Stop recognition while playing audio
              stopListening();

              // Start audio synthesis request immediately with minimal delay
              let audioRequested = false;
              const audioRequestPromise = fetch('/api/elevenlabs/synthesize', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: aiResponse,
                  // Use Jessica's voice ID or let the API use the default
                  voiceId: 'jsCqWAovK2LkecY7zXl4',
                  optimize_streaming_latency: 4, // Maximum optimization for lowest latency
                }),
              });

              // Flag that audio has been requested
              audioRequested = true;

              // Process the audio as soon as it's available
              try {
                const response = await audioRequestPromise;

                if (response.ok) {
                  // Use a performance optimization to start processing the audio earlier
                  const audioStream = response.body;
                  const reader = audioStream?.getReader();

                  if (reader) {
                    // Create a new audio context for lower latency playback
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const chunks: Uint8Array[] = [];

                    // Process chunks as they arrive
                    const processChunks = async () => {
                      let done = false;

                      while (!done) {
                        const { value, done: isDone } = await reader.read();
                        done = isDone;

                        if (value) {
                          chunks.push(value);
                        }
                      }

                      // Combine all chunks
                      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                      const audioData = new Uint8Array(totalLength);
                      let offset = 0;

                      for (const chunk of chunks) {
                        audioData.set(chunk, offset);
                        offset += chunk.length;
                      }

                      // Create and play audio
                      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
                      const audioUrl = URL.createObjectURL(audioBlob);

                      // Create new audio element with optimized settings
                      const audio = new Audio(audioUrl);
                      audio.playbackRate = 1.0; // Normal speed, you can adjust if needed
                      audioRef.current = audio;
                      isAudioPlaying.current = true;

                      // Track when audio starts playing
                      audio.onplay = () => {
                        isAudioPlaying.current = true;
                        console.log("Audio playback started");
                      };

                      // Play with minimal delay
                      audio.play().catch(error => {
                        console.error("Audio playback error:", error);
                        isAudioPlaying.current = false;
                        setTimeout(startListening, 100); // Faster recovery
                      });

                      // When audio ends, restart listening with minimal delay
                      audio.onended = () => {
                        console.log("Audio playback finished, restarting speech recognition");
                        URL.revokeObjectURL(audioUrl);
                        isAudioPlaying.current = false;
                        audioRef.current = null;

                        // Restart listening immediately
                        startListening();
                      };
                    };

                    // Start processing the chunks
                    processChunks().catch(error => {
                      console.error("Error processing audio chunks:", error);
                      isAudioPlaying.current = false;
                      startListening(); // Resume listening on error
                    });
                  } else {
                    // Fallback to traditional blob method if reader isn't available
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);

                    // Create new audio element
                    const audio = new Audio(audioUrl);
                    audioRef.current = audio;
                    isAudioPlaying.current = true;

                    // Track when audio starts playing
                    audio.onplay = () => {
                      isAudioPlaying.current = true;
                      console.log("Audio playback started");
                    };

                    // Play with minimal delay
                    await audio.play();

                    // When audio ends, restart listening with minimal delay
                    audio.onended = () => {
                      console.log("Audio playback finished, restarting speech recognition");
                      URL.revokeObjectURL(audioUrl);
                      isAudioPlaying.current = false;
                      audioRef.current = null;

                      // Start listening immediately
                      startListening();
                    };
                  }
                } else {
                  const errorText = await response.text();
                  console.error('Failed to get voice response:', errorText);

                  // Show error message to user and continue listening
                  setConversationHistory(prev => [
                    ...prev, 
                    { 
                      type: 'ai' as const, 
                      text: "I'm sorry, I encountered an issue generating the voice response. Let me try again in a moment." 
                    }
                  ]);

                  // Restart listening after error with a delay
                  setTimeout(() => {
                    startListening();
                    console.log("Restarting recognition after error");
                  }, 2000);
                }
              } catch (error) {
                console.error('Error processing audio request:', error);

                // Show error message to user and continue listening
                setConversationHistory(prev => [
                  ...prev, 
                  { 
                    type: 'ai' as const, 
                    text: "I'm sorry, I encountered an issue generating the voice response. Let me try again in a moment." 
                  }
                ]);

                // Restart listening after error with a delay
                setTimeout(() => {
                  startListening();
                  console.log("Restarting recognition after error");
                }, 2000);
              }
            } catch (error) {
              console.error('Error playing voice response:', error);
            } finally {
              setIsProcessing(false);
            }
          }
        } catch (error) {
          console.error('Error processing speech result:', error);
        }
      };

      // Handle errors
      recognitionInstance.onerror = (event: Event) => {
        console.error('Speech recognition error:', (event as any).error);

        // Stop listening properly on error
        stopListening();

        // Attempt to restart after a short delay if not during audio playback
        if (!isAudioPlaying.current) {
          console.log("Attempting to recover from speech recognition error");
          setTimeout(() => {
            startListening();
          }, 1000);
        }
      };

      // Handle end of speech recognition
      recognitionInstance.onend = () => {
        console.log("Speech recognition ended");

        // If we're still in listening state but not during audio playback,
        // it means recognition stopped unexpectedly. Restart it.
        if (isListening && !isAudioPlaying.current) {
          console.log("Recognition ended unexpectedly, restarting...");
          // Wait a moment before restarting to avoid rapid restart loops
          setTimeout(() => {
            startListening();
          }, 300);
        }
      };
    }

    return () => {
      // Clean up
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, conversationHistory, startListening, stopListening] as const); // Re-run this effect when dependencies change

  // Toggle listening state and control speech recognition
  const toggleListening = useCallback(() => {
    try {
      // Debug logging
      console.log("Toggle button clicked. Current state:", {
        isListening,
        isAudioPlaying: isAudioPlaying.current,
        recognitionRef: !!recognitionRef.current
      });

      // Check if audio is currently playing, don't allow toggle during playback
      if (isAudioPlaying.current) {
        console.log("Can't toggle listening during audio playback");
        return;
      }

      // Check if speech recognition is available
      if (!recognitionRef.current) {
        console.error('Speech recognition is not supported in this browser');
        return;
      }

      // Add a time-based debounce to prevent rapid toggling
      const now = Date.now();
      if (window.lastToggleTime && now - window.lastToggleTime < 1000) {
        console.log("Toggling too fast, ignoring");
        return;
      }
      window.lastToggleTime = now;

      if (!isListening) {
        // Clear current transcript but keep conversation history
        setTranscript("");
        setIsListening(true);
        // Use a longer delay to prevent race conditions
        setTimeout(() => {
          startListening();
        }, 300);
      } else {
        setIsListening(false);
        setTimeout(() => {
          stopListening();
        }, 300);
      }
    } catch (error) {
      console.error("Error toggling speech recognition:", error);
      // Reset state in case of error
      setIsListening(false);
    }
  }, [isListening, startListening, stopListening]);

  return (
    <section className="min-h-screen flex flex-col justify-center relative overflow-hidden bg-[#0A0F16] pt-20 pb-16">
      {/* Video Background */}
      <VideoBackground 
        videoUrl="https://video.wixstatic.com/video/ee3656_b17e8b70de3a4fc9ba7dd73fc240c411/1080p/mp4/file.mp4" 
      />



      <div className="container mx-auto px-6 md:px-12 z-10 flex flex-col items-center">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-6 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
            Build With AI. Scale With Intelligence.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Jesko's AI platform helps you automate, scale, and sell — using the most advanced conversational AI on the market.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90 transition-opacity text-white font-medium px-8">
                Try the AI
              </Button>
            </Link>
            <Link href="/own-your-ai">
              <Button size="lg" variant="outline" className="border-[#33C3BD] text-[#33C3BD] hover:bg-[#33C3BD]/10">
                Start Your AI Business
              </Button>
            </Link>
            <Link href="/partner/direct-access">
              <Button size="lg" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10">
                Partner Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Floating AI Voice Bot */}
        <div className="relative w-full max-w-md mx-auto mt-24">
          <div className="absolute -top-[160px] left-1/2 transform -translate-x-1/2 w-64 h-64">
            <div className="relative w-full h-full">
              {/* SVG Animation with transparent background */}
              <object 
                type="image/svg+xml" 
                data="/bubble-animation.svg" 
                className="w-full h-full object-contain relative z-10"
                aria-label="AI Visualization"
              />
            </div>
          </div>


        </div>


      </div>
    </section>
  );
};

{/* Red Carpet Section */}
const JeskoAISection = () => {
  // Create a reference to the video element
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  // Set up video to start and loop only the last 5 seconds
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Disable native looping as we'll handle it with precise timing
    video.loop = false;
    
    const handleEnded = () => {
      // When the video ends, immediately set it back to 5 seconds before the end
      if (video.duration) {
        console.log("Video ended, restarting 5 seconds before end");
        video.currentTime = video.duration - 5;
        video.play().catch(err => console.error("Error replaying video after end:", err));
      }
    };
    
    const handleTimeUpdate = () => {
      // Additional safety check - if we somehow pass the end, jump back
      const duration = video.duration;
      if (duration && video.currentTime >= duration - 0.1) {
        console.log("Video nearly at end, jumping to 5 seconds before end");
        video.currentTime = duration - 5;
      }
    };
    
    const handleLoadedMetadata = () => {
      console.log("Video metadata loaded, duration:", video.duration);
      // Jump directly to 5 seconds before the end when the video loads
      if (video.duration) {
        console.log("Setting initial position to last 5 seconds");
        video.currentTime = video.duration - 5;
        
        // Ensure the video is playing
        video.play().catch(err => console.error("Error playing video:", err));
      }
    };
    
    // Add event listeners
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Also try to set the initial position if the video is already loaded
    if (video.readyState >= 2 && video.duration) {
      console.log("Video already loaded, setting initial position to last 5 seconds");
      video.currentTime = video.duration - 5;
      video.play().catch(err => console.error("Error playing video:", err));
    }
    
    return () => {
      // Clean up event listeners
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);
  
  return (
    <section className="pt-10 pb-16 bg-[#0A0F16]">
      <div className="container mx-auto px-4 md:px-8">
        {/* Title with gradient text and glow effect */}
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
          <span className="relative inline-block">
            <span className="relative z-20 bg-gradient-to-r from-[#33C3BD] via-[#0075FF] to-[#FF3366] bg-clip-text text-transparent">
              License Jesko — Own Your AI. Operate From Anywhere.
            </span>
            {/* Subtle tech glow - thin border with glow */}
            <span className="absolute inset-0 -m-[1px] rounded-md border border-[#33C3BD]/30 shadow-[0_0_2px_#33C3BD,0_0_4px_#0075FF] animate-tech-glow z-10"></span>
          </span>
        </h2>
        
        {/* Full-width content layout */}
        <div className="flex flex-col justify-center max-w-4xl mx-auto">
          {/* Content - taking the full width of the section */}
          <div className="w-full flex flex-col justify-center">
            {/* Enhanced Description text */}
            <div className="mb-8">
              <p className="text-gray-200 text-base md:text-lg leading-relaxed text-center max-w-3xl mx-auto">
                Experience the ultimate AI solution with Jesko: <span className="font-bold text-white">5 premium AI models in one</span> powerful system. Jesko combines the intelligence of <span className="bg-gradient-to-r from-[#33C3BD] via-[#0075FF] to-[#FF3366] bg-clip-text text-transparent font-bold">all these 5 AIs into one unified brain</span>, giving you unprecedented capabilities with a single interface.
              </p>
            </div>
            
            {/* AI Models Grid - now larger and centered */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
              {/* GPT4 AI Brain */}
              <div className="bg-gradient-to-br from-[#33C3BD]/10 to-[#0075FF]/10 border border-[#33C3BD]/20 rounded-lg p-4 transform transition-transform hover:scale-105 hover:shadow-glow-sm hover:shadow-[#33C3BD]/30">
                <div className="text-center">
                  <div className="h-14 w-14 mx-auto mb-2 text-[#33C3BD] relative">
                    <img 
                      src="/images/brain-svg/gpt-brain.svg" 
                      alt="GPT4 AI" 
                      className="w-full h-full object-contain brain-pulse brain-glow"
                    />
                  </div>
                  <p className="text-white font-bold text-base">GPT4</p>
                  <p className="text-sm text-gray-300">Advanced reasoning</p>
                </div>
              </div>
              
              {/* DEEPSEEK AI Brain */}
              <div className="bg-gradient-to-br from-[#0075FF]/10 to-[#8A2BE2]/10 border border-[#0075FF]/20 rounded-lg p-4 transform transition-transform hover:scale-105 hover:shadow-glow-sm hover:shadow-[#0075FF]/30">
                <div className="text-center">
                  <div className="h-14 w-14 mx-auto mb-2 text-[#9C4DFF] relative">
                    <img 
                      src="/images/brain-svg/deepseek-brain.svg" 
                      alt="Deepseek AI" 
                      className="w-full h-full object-contain brain-pulse brain-circuit"
                    />
                  </div>
                  <p className="text-white font-bold text-base">DEEPSEEK</p>
                  <p className="text-sm text-gray-300">Technical expertise</p>
                </div>
              </div>
              
              {/* CLAUDE AI Brain */}
              <div className="bg-gradient-to-br from-[#8A2BE2]/10 to-[#FF3366]/10 border border-[#8A2BE2]/20 rounded-lg p-4 transform transition-transform hover:scale-105 hover:shadow-glow-sm hover:shadow-[#8A2BE2]/30">
                <div className="text-center">
                  <div className="h-14 w-14 mx-auto mb-2 text-[#8A2BE2] relative">
                    <img 
                      src="/images/brain-svg/claude-brain.svg" 
                      alt="Claude AI" 
                      className="w-full h-full object-contain brain-pulse brain-neurons"
                    />
                  </div>
                  <p className="text-white font-bold text-base">CLAUDE</p>
                  <p className="text-sm text-gray-300">Creative writing</p>
                </div>
              </div>
              
              {/* GEMINI AI Brain */}
              <div className="bg-gradient-to-br from-[#FF3366]/10 to-[#FF8C42]/10 border border-[#FF3366]/20 rounded-lg p-4 transform transition-transform hover:scale-105 hover:shadow-glow-sm hover:shadow-[#FF3366]/30">
                <div className="text-center">
                  <div className="h-14 w-14 mx-auto mb-2 text-[#1DB954] relative">
                    <img 
                      src="/images/brain-svg/gemini-brain.svg" 
                      alt="Gemini AI" 
                      className="w-full h-full object-contain brain-circuit brain-flash"
                    />
                  </div>
                  <p className="text-white font-bold text-base">GEMINI</p>
                  <p className="text-sm text-gray-300">Multimodal analysis</p>
                </div>
              </div>
              
              {/* GROK AI Brain */}
              <div className="bg-gradient-to-br from-[#FF8C42]/10 to-[#33C3BD]/10 border border-[#FF8C42]/20 rounded-lg p-4 transform transition-transform hover:scale-105 hover:shadow-glow-sm hover:shadow-[#FF8C42]/30">
                <div className="text-center">
                  <div className="h-14 w-14 mx-auto mb-2 text-[#FF6B00] relative">
                    <img 
                      src="/images/brain-svg/grok-brain.svg" 
                      alt="Grok AI" 
                      className="w-full h-full object-contain brain-pulse brain-neurons"
                    />
                  </div>
                  <p className="text-white font-bold text-base">GROK</p>
                  <p className="text-sm text-gray-300">Real-time synthesis</p>
                </div>
              </div>
            </div>
            
            {/* Call to Action Button - Enhanced */}
            <div className="w-full max-w-md mx-auto mt-6">
              <a href="/own-your-ai" className="relative group overflow-hidden inline-block w-full">
                {/* Button background with animated gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF3366] via-[#0075FF] to-[#33C3BD] group-hover:via-[#33C3BD] group-hover:to-[#FF3366] bg-size-200 animate-gradient-x"></div>
                
                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-white blur-md transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {/* Button content */}
                <div className="relative py-4 px-8 bg-[#0A0F16]/10 backdrop-blur-sm border border-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg tracking-wide">OWN YOUR AI</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                
                {/* Button glow effect */}
                <div className="absolute -inset-1 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-[#FF3366]/20 via-[#0075FF]/20 to-[#33C3BD]/20 blur-xl transition-opacity duration-500"></div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};



const ConversationalAISection = () => {
  return (
    <section className="pt-8 pb-24 bg-[#0F172A]">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 mb-12 lg:mb-0 lg:pr-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
              Talk to Your Future
            </h2>
            <p className="text-gray-300 mb-8 text-lg">
              Experience AI conversations indistinguishable from human interactions. Our advanced technology understands context, remembers previous interactions, and delivers natural responses.
            </p>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mr-4 shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium text-lg">24/7 human-like conversations</h3>
                  <p className="text-gray-400">Always available to engage with your audience, no matter the time zone.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mr-4 shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium text-lg">Real-time responses, context-aware</h3>
                  <p className="text-gray-400">Our AI remembers previous interactions and maintains consistent conversations.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mr-4 shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium text-lg">Fully automated support and interaction</h3>
                  <p className="text-gray-400">Handle customer inquiries, schedule appointments, and more without human intervention.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2">
            <AnimatedChat />
          </div>
        </div>
      </div>
    </section>
  );
};

const AICloneSection = () => {
  return (
    <section className="py-24 bg-[#0A0F16]">
      <div className="container mx-auto px-6 md:px-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center">
          <span className="relative inline-block">
            <span className="relative z-20 bg-gradient-to-r from-[#33C3BD] via-[#0075FF] to-[#8A2BE2] bg-clip-text text-transparent">
              Jesko AI
            </span>
            {/* Subtle tech glow - thin border with glow */}
            <span className="absolute inset-0 -m-[1px] rounded-md border border-[#33C3BD]/30 shadow-[0_0_2px_#33C3BD,0_0_4px_#0075FF] animate-tech-glow z-10"></span>
            {/* Very faint highlight - almost imperceptible */}
            <span className="absolute inset-0 blur-[2px] bg-gradient-to-r from-[#33C3BD]/10 via-[#0075FF]/10 to-[#8A2BE2]/10 z-0"></span>
          </span>
          {" "}
          <span className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
            Works For You
          </span>
        </h2>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Left Side - Feature Boxes */}
          <div className="w-full lg:w-3/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="feature-box bg-[#141B29] rounded-xl border border-[#1E293B] p-6 transition-transform hover:scale-105 duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-xl mb-3">Scheduling & Calendar</h3>
                <p className="text-gray-400">Automatically handles appointment scheduling, sends reminders, and manages your calendar.</p>
              </div>

              <div className="feature-box bg-[#141B29] rounded-xl border border-[#1E293B] p-6 transition-transform hover:scale-105 duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-xl mb-3">Email Communication</h3>
                <p className="text-gray-400">Drafts, sends, and responds to emails on your behalf, based on your communication style.</p>
              </div>

              <div className="feature-box bg-[#141B29] rounded-xl border border-[#1E293B] p-6 transition-transform hover:scale-105 duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-xl mb-3">Customer Support</h3>
                <p className="text-gray-400">Handles common customer inquiries, troubleshooting, and support tickets 24/7.</p>
              </div>

              <div className="feature-box bg-[#141B29] rounded-xl border border-[#1E293B] p-6 transition-transform hover:scale-105 duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-xl mb-3">Voice & Text Input</h3>
                <p className="text-gray-400">Interact naturally with your AI clone through both voice and text inputs across all devices.</p>
              </div>

              <div className="feature-box bg-[#141B29] rounded-xl border border-[#1E293B] p-6 transition-transform hover:scale-105 duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-xl mb-3">Cross-Platform</h3>
                <p className="text-gray-400">Works seamlessly across web, mobile, and popular messaging platforms like Slack and Teams.</p>
              </div>

              <div className="feature-box bg-[#141B29] rounded-xl border border-[#1E293B] p-6 transition-transform hover:scale-105 duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-xl mb-3">Task Management</h3>
                <p className="text-gray-400">Creates to-do lists, follows up on tasks, and sends reminders to keep you on track.</p>
              </div>
            </div>
          </div>

          {/* Right Side - Video */}
          <div className="w-full lg:w-2/5 mt-8 lg:mt-0">
            <div className="relative rounded-xl overflow-hidden shadow-2xl border border-[#1E293B] bg-[#0A0F16]">
              {/* Background pattern/texture */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZGVmcz4KICA8cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgIDxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiMxRTI5M0IiIHN0cm9rZS13aWR0aD0iMSIvPgogIDwvcGF0dGVybj4KPC9kZWZzPgo8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIiAvPgo8L3N2Zz4=')] opacity-5 z-0"></div>
                          
              {/* Multiple gradient overlays for better blending */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0F16]/90 via-[#141B29]/40 to-[#1E293B]/30 pointer-events-none z-10"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#33C3BD]/5 to-[#0075FF]/5 pointer-events-none z-10"></div>
              
              {/* Container with aspect ratio to make video taller */}
              <div className="pt-[180%] relative"> {/* Much taller aspect ratio (was 125%) */}
                {/* Video element */}
                <video 
                  src="https://video.wixstatic.com/video/ee3656_0e7837fcc0bf45c09f5cce43ce304994/720p/mp4/file.mp4"
                  className="absolute inset-0 w-full h-full object-cover rounded-xl z-20"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>

              {/* Overlay gradients for blending */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#0A0F16] to-transparent pointer-events-none z-30"></div>
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0F16] to-transparent pointer-events-none z-30"></div>
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0A0F16] to-transparent pointer-events-none z-30"></div>
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0A0F16] to-transparent pointer-events-none z-30"></div>
              
              {/* Subtle glowing effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] opacity-10 blur-xl rounded-xl z-0"></div>
              
              {/* "Powered by Jesko" watermark */}
              <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full z-40">
                <p className="text-xs text-white/80 font-medium">Powered by Jesko</p>
              </div>
            </div>

            {/* Full-width CTA button */}
            <div className="mt-12 w-full">
              <button className="w-full relative group overflow-hidden">
                {/* Button background with animated gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#33C3BD] via-[#0075FF] to-[#8A2BE2] group-hover:via-[#8A2BE2] group-hover:to-[#33C3BD] bg-size-200 animate-gradient-x"></div>
                
                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white blur-sm transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {/* Button content */}
                <div className="relative py-5 px-6 bg-[#0A0F16]/10 backdrop-blur-sm border border-white/10 rounded-lg flex items-center justify-center">
                  <div className="flex items-center justify-center text-white text-xl font-bold">
                    <span className="mr-2">See Jesko in Action</span>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ml-2">
                      <Play className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                
                {/* Button glow effect */}
                <div className="absolute inset-0 -z-10 opacity-50 blur-md bg-gradient-to-r from-[#33C3BD] to-[#0075FF] transform scale-110"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const LicenseSection = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Get canvas element and context
    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log("Matrix digital rain animation initialized");

    // Get 2D context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to fill parent
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };

    // Initial size
    resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    // Define characters and colors
    const matrixChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
    const colors = ['#33C3BD', '#0075FF', '#FFFFFF'];  // Cyan, Blue, White

    // Matrix column data
    type Column = {
      x: number;
      chars: string[];
      opacities: number[];
      speed: number;
      head: number;
      delay: number;
      color: string;
      charSize: number;
    };

    // Create columns
    const columns: Column[] = [];
    const createColumns = () => {
      const columnWidth = 35; // Increased width between columns to reduce density
      const columnCount = Math.ceil(canvas.width / columnWidth);

      // Clear existing columns
      columns.length = 0;

      for (let i = 0; i < columnCount; i++) {
        // Only create a column with 60% probability to reduce density
        if (Math.random() > 0.4) {
          // Create a new column
          const column: Column = {
            x: i * columnWidth + (Math.random() * 10 - 5), // Add slight x-position variation
            chars: [],
            opacities: [],
            speed: 1 + Math.random() * 2,
            head: -Math.random() * 100,
            delay: Math.floor(Math.random() * 200), // More varied start times
            color: colors[Math.random() < 0.9 ? (Math.random() < 0.5 ? 0 : 1) : 2], // Mostly cyan/blue
            charSize: 14 + Math.floor(Math.random() * 4)
          };

          // Generate random characters
          const length = 5 + Math.floor(Math.random() * 15);
          for (let j = 0; j < length; j++) {
            column.chars.push(matrixChars[Math.floor(Math.random() * matrixChars.length)]);
            column.opacities.push(0); // Start invisible
          }

          columns.push(column);
        }
      }
    };

    // Initial column creation
    createColumns();

    // Animation variables
    let flashOpacity = 0;

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return;
      
      // Fade out previous frame with semi-transparent black
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Handle flash effect
      if (flashOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashOpacity -= 0.01;
      }

      // Random chance for a flash
      if (Math.random() < 0.0005) {
        flashOpacity = 0.15;
      }

      // Update and draw columns
      if (!ctx || !canvas) return;
      
      columns.forEach(column => {
        // Skip if still delayed
        if (column.delay > 0) {
          column.delay--;
          return;
        }

        // Move head position down
        column.head += column.speed;

        // Reset column if it's gone offscreen
        if (column.head > canvas.height + 50) {
          column.head = -30 - Math.random() * 50;
          column.speed = 1 + Math.random() * 2;

          // Randomize characters
          for (let i = 0; i < column.chars.length; i++) {
            if (Math.random() < 0.3) {
              column.chars[i] = matrixChars[Math.floor(Math.random() * matrixChars.length)];
            }
          }
        }

        // Set font for this column
        ctx.font = `${column.charSize}px monospace`;

        // Update and draw each character
        for (let i = 0; i < column.chars.length; i++) {
          const y = column.head - (i * column.charSize * 1.2);

          // Skip if out of view
          if (y < -20 || y > canvas.height + 20) continue;

          // Update opacity based on position
          const charPos = column.head - (i * column.charSize * 1.2);

          // Fade in when character enters screen
          if (charPos > 0 && column.opacities[i] < 1) {
            column.opacities[i] = Math.min(1, column.opacities[i] + 0.05);
          }

          // Fade out when character exits screen
          if (charPos > canvas.height && column.opacities[i] > 0) {
            column.opacities[i] = Math.max(0, column.opacities[i] - 0.02);
          }

          const opacity = column.opacities[i];
          if (opacity <= 0) continue;

          // Lead character glow effect
          if (i === 0) {
            ctx.shadowColor = column.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          } else {
            ctx.shadowBlur = 0;
            const fadeEffect = Math.max(0, 1 - (i / column.chars.length) * 0.8);
            ctx.fillStyle = `${column.color}${Math.floor(opacity * fadeEffect * 255).toString(16).padStart(2, '0')}`;
          }

          // Draw the character
          ctx.fillText(column.chars[i], column.x, y);

          // Reset shadow
          if (i === 0) {
            ctx.shadowBlur = 0;
          }

          // Occasionally change characters (glitch effect)
          if (Math.random() < 0.002) {
            column.chars[i] = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          }
        }
      });

      // Check if we need to add or remove columns on resize
      if (Math.ceil(canvas.width / 35) !== columns.length * 1.7) { // Adjusted for 60% density
        createColumns();
      }

      // Continue animation
      requestAnimationFrame(animate);
    }

    // Start animation
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <section className="py-24 bg-[#0F172A] relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0F172A] transform rotate-3 scale-110">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZGVmcz4KICA8cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgIDxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiMxRTI5M0IiIHN0cm9rZS13aWR0aD0iMSIvPgogIDwvcGF0dGVybj4KPC9kZWZzPgo8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIiAvPgo8L3N2Zz4=')] opacity-10 z-0"></div>
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        />
      </div>

      <div className="container mx-auto px-6 md:px-12 relative z-20">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
            License the Tech. Launch Your Empire.
          </h2>
          <p className="text-gray-300 text-lg">
            Transform your business with our AI technology. Become a licensed partner and offer cutting-edge AI solutions under your own brand.
          </p>
        </div>

        <div className="bg-gradient-to-b from-[#141B29] to-[#0A0F16] rounded-2xl border border-[#1E293B] shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8 md:p-12">
              <h3 className="text-2xl font-bold text-white mb-6">Partner Benefits</h3>

              <div className="space-y-5">
                <div className="flex items-start">
                  <div className="mr-4 text-[#33C3BD]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">White-Label Platform</h4>
                    <p className="text-gray-400 text-sm">Fully customizable AI solution with your branding, voice, and styling.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-4 text-[#33C3BD]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Comprehensive Training</h4>
                    <p className="text-gray-400 text-sm">Full onboarding and technical training for you and your team.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-4 text-[#33C3BD]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Technical Support</h4>
                    <p className="text-gray-400 text-sm">24/7 dedicated technical support and regular system updates.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-4 text-[#33C3BD]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Marketing Materials</h4>
                    <p className="text-gray-400 text-sm">Ready-to-use sales decks, marketing templates, and promotional assets.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-4 text-[#33C3BD]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Recurring Revenue</h4>
                    <p className="text-gray-400 text-sm">Sustainable subscription-based business model with excellent margins.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/own-your-ai">
                <Button size="lg" className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90 transition-opacity text-white font-medium w-full">
                  Become a Licensee <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              </div>
            </div>

            <div className="bg-[#0A0F16] p-8 md:p-12 flex items-center">
              <div>
                <h3 className="text-2xl font-bold text-white mb-8">Partner Dashboard Preview</h3>

                <div className="bg-[#141B29] rounded-xl border border-[#1E293B] overflow-hidden shadow-lg">
                  <div className="bg-[#0F172A] p-4 border-b border-[#1E293B] flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-gray-400 text-xs">Partner Analytics Dashboard</div>
                    <div></div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className="text-white font-medium">Monthly Revenue</h4>
                        <p className="text-2xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">$24,856.00</p>
                      </div>
                      <div className="text-[#33C3BD] text-sm font-medium px-2 py-1 bg-[#33C3BD]/10 rounded">
                        +18.2%
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] rounded-full"></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>0</span>
                        <span>Target: $30,000</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-[#0A0F16] p-4 rounded-lg">
                        <h5 className="text-gray-400 text-xs mb-1">Active Clients</h5>
                        <p className="text-white font-bold text-xl">128</p>
                      </div>
                      <div className="bg-[#0A0F16] p-4 rounded-lg">
                        <h5 className="text-gray-400 text-xs mb-1">Avg. MRR</h5>
                        <p className="text-white font-bold text-xl">$194</p>
                      </div>
                    </div>

                    <div className="relative h-32 mb-2">
                      <div className="absolute bottom-0 left-0 w-1/12 h-1/6 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[8.33%] w-1/12 h-1/4 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[16.66%] w-1/12 h-1/3 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[25%] w-1/12 h-1/2 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[33.33%] w-1/12 h-1/3 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[41.66%] w-1/12 h-3/5 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[50%] w-1/12 h-2/3 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[58.33%] w-1/12 h-1/2 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[66.66%] w-1/12 h-4/5 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[75%] w-1/12 h-5/6 bg-[#33C3BD]/30 rounded-sm"></div>
                      <div className="absolute bottom-0 left-[83.33%] w-1/12 h-full bg-gradient-to-t from-[#33C3BD] to-[#0075FF] rounded-sm"></div>
                      <div className="absolute bottom-0 left-[91.66%] w-1/12 h-4/5 bg-[#33C3BD]/30 rounded-sm"></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May</span>
                      <span>Jun</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-[#0A0F16]">
      <div className="container mx-auto px-6 md:px-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
          What Our Partners Say
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-[#141B29] rounded-xl border border-[#1E293B] p-6 relative">
            <div className="absolute -top-6 left-6">
              <div className="w-12 h-12 rounded-full bg-[#0F172A] border-4 border-[#0A0F16] flex items-center justify-center">
                <span className="text-[#33C3BD] text-2xl">"</span>
              </div>
            </div>
            <div className="pt-6">
              <p className="text-gray-300 mb-6">
                Jesko has transformed our customer service operations. The AI handles over 80% of inquiries without human intervention, saving us thousands each month.
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-600 mr-3 flex items-center justify-center text-white font-medium">
                  JD
                </div>
                <div>
                  <h4 className="text-white font-medium">James Donovan</h4>
                  <p className="text-gray-400 text-sm">CEO, TechSolutions Inc.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#141B29] rounded-xl border border-[#1E293B] p-6 relative">
            <div className="absolute -top-6 left-6">
              <div className="w-12 h-12 rounded-full bg-[#0F172A] border-4 border-[#0A0F16] flex items-center justify-center">
                <span className="text-[#33C3BD] text-2xl">"</span>
              </div>
            </div>
            <div className="pt-6">
              <p className="text-gray-300 mb-6">
                As a licensed partner, we've been able to offer cutting-edge AI to our clients under our own brand. The support team has been incredible throughout the process.
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-600 mr-3 flex items-center justify-center text-white font-medium">
                  MS
                </div>
                <div>
                  <h4 className="text-white font-medium">Maria Santos</h4>
                  <p className="text-gray-400 text-sm">Founder, InnovateAI</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#141B29] rounded-xl border border-[#1E293B] p-6 relative">
            <div className="absolute -top-6 left-6">
              <div className="w-12 h-12 rounded-full bg-[#0F172A] border-4 border-[#0A0F16] flex items-center justify-center">
                <span className="text-[#33C3BD] text-2xl">"</span>
              </div>
            </div>
            <div className="pt-6">
              <p className="text-gray-300 mb-6">
                The voice quality and natural conversation flow is unlike anything I've experienced. Our clients are amazed that they're talking to an AI and not a human.
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-600 mr-3 flex items-center justify-center text-white font-medium">
                  RK
                </div>
                <div>
                  <h4 className="text-white font-medium">Robert Kim</h4>
                  <p className="text-gray-400 text-sm">CTO, FutureTech</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 text-center">
          <h3 className="text-2xl font-bold text-white mb-8">Trusted By Industry Leaders</h3>
          <div className="flex flex-wrap justify-center gap-8 opacity-60">
            <div className="w-32 h-12 bg-white/5 rounded flex items-center justify-center">
              <div className="text-white font-bold">ACME Corp</div>
            </div>
            <div className="w-32 h-12 bg-white/5 rounded flex items-center justify-center">
              <div className="text-white font-bold">TechGiant</div>
            </div>
            <div className="w-32 h-12 bg-white/5 rounded flex items-center justify-center">
              <div className="text-white font-bold">InnovateCo</div>
            </div>
            <div className="w-32 h-12 bg-white/5 rounded flex items-center justify-center">
              <div className="text-white font-bold">FutureTech</div>
            </div>
            <div className="w-32 h-12 bg-white/5 rounded flex items-center justify-center">
              <div className="text-white font-bold">GlobalAI</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-[#0F172A] border-t border-[#1E293B] pt-16 pb-8">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent mb-4">
              Jesko
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Building the future of intelligent communication with advanced AI technology that sounds and responds like a human.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 16h-2v-6h2v6zm-1-6.891c-.607 0-1.1-.496-1.1-1.109 0-.612.492-1.109 1.1-1.109s1.1.497 1.1 1.109c0 .613-.493 1.109-1.1 1.109zm8 6.891h-1.998v-2.861c0-1.881-2.002-1.722-2.002 0v2.861h-2v-6h2v1.093c.872-1.616 4-1.736 4 1.548v3.359z"></path>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">AI Voice Assistant</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Natural Conversations</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Automated Support</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Integrations</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">API</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Licensing</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Partner Program</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">White Label Solutions</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Success Stories</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Become a Licensee</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Partner Support</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Contact</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#33C3BD] transition-colors">Press</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1E293B] pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-500 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} Jesko. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-500 hover:text-[#33C3BD] text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-500 hover:text-[#33C3BD] text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-[#33C3BD] text-sm transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function HomePage() {
  // Load effects scripts
  useEffect(() => {
    // Add feature box particle effects
    const particleScript = document.createElement('script');
    particleScript.src = '/feature-particle-effects.js';
    particleScript.async = true;
    document.body.appendChild(particleScript);

    // Add UFO motion effects
    const ufoMotionScript = document.createElement('script');
    ufoMotionScript.src = '/ufo-motion.js';
    ufoMotionScript.async = true;
    document.body.appendChild(ufoMotionScript);

    // Add space battle animation for the license section
    const spaceBattleScript = document.createElement('script');
    spaceBattleScript.src = '/space-battle-animation.js';
    spaceBattleScript.async = true;
    document.body.appendChild(spaceBattleScript);

    return () => {
      document.body.removeChild(particleScript);
      document.body.removeChild(ufoMotionScript);
      document.body.removeChild(spaceBattleScript);
    };
  }, []);

  return (
    <div className="min-h-screen text-white relative">
      {/* Starry background */}
      <div className="stars-container">
        <div className="stars-small"></div>
        <div className="stars-medium"></div>
        <div className="stars-large"></div>
        <div className="shooting-star"></div>
        <div className="shooting-star"></div>
        <div className="shooting-star"></div>
        <div className="shooting-star"></div>
        <div className="shooting-star"></div>
      </div>
      
      {HeroSection()}
      <JeskoAISection />
      <ConversationalAISection />
      <AICloneSection />
      <LicenseSection />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}