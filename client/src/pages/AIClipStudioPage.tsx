import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AuthModal from "@/components/AuthModal";
import {
  Scissors,
  Upload,
  Download,
  Video,
  Loader2,
  Share2,
  Star,
  MessageSquare,
  Clock,
  Sparkles,
  Rocket,
  Zap,
  TrendingUp,
  Play,
  Pause
} from "lucide-react";

const AIClipStudioPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [keywords, setKeywords] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clips, setClips] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const demoVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Control for demo video
  const toggleVideoPlayback = () => {
    if (demoVideoRef.current) {
      if (demoVideoRef.current.paused) {
        demoVideoRef.current.play();
        setIsPlaying(true);
      } else {
        demoVideoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };
  
  // Auto-play demo video on loop when component mounts
  useEffect(() => {
    if (demoVideoRef.current) {
      demoVideoRef.current.play().catch(error => {
        console.log("Auto-play prevented:", error);
      });
      setIsPlaying(true);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      // Log the file input element and its files property
      console.log("File input element:", e.target);
      console.log("Files array:", e.target.files);
      
      const selectedFile = e.target.files?.[0];
      
      if (!selectedFile) {
        console.log("No file selected in event");
        return;
      }
      
      console.log("File selected:", selectedFile.name, selectedFile.type, selectedFile.size);
      
      // Accept any file for testing purposes
      // We're relaxing validation to ensure smooth uploads during development
      
      // Inform user of successful file selection
      toast({
        title: "File selected! ✓",
        description: `${selectedFile.name} ready for processing`,
      });
      
      setFile(selectedFile);
      setError(null);
      
      // Make the file selection extra visible in console
      console.log("=============================================");
      console.log("✅ FILE SUCCESSFULLY SET IN STATE:", selectedFile.name);
      console.log("File type:", selectedFile.type || "unknown");
      console.log("File size:", (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB");
      console.log("=============================================");
    } catch (err) {
      console.error("Error in file change handler:", err);
      toast({
        title: "Error selecting file",
        description: "Please try selecting a different file or using the emergency button below.",
        variant: "destructive"
      });
    }
  };
  
  // Enhanced direct submission handler with better debugging
  const handleGenerateClips = async () => {
    console.log("=== GENERATE CLIPS FUNCTION TRIGGERED ===");
    
    // Check if user is authenticated - if not, show auth modal
    if (!user) {
      console.log("User not authenticated - showing auth modal");
      setShowAuthModal(true);
      toast({
        title: "Login Required",
        description: "Create an account and get 100 free coins!",
      });
      return;
    }
    
    if (!file) {
      console.log("Error: No file selected");
      setError('Please upload a video file.');
      toast({
        title: "No video selected",
        description: "Please select a video to process.",
        variant: "destructive"
      });
      return;
    }
    
    console.log(`File ready for upload: ${file.name} (${file.size} bytes, type: ${file.type})`);
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setClips([]);
    
    toast({
      title: "Processing started",
      description: "Your video is being processed. This may take a minute.",
    });
    
    // Progress simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 5 + 2;
      });
    }, 1000);
    
    // Create form data
    const formData = new FormData();
    formData.append('video', file);
    console.log("Added video to FormData");
    
    if (keywords.trim()) {
      formData.append('keywords', keywords.trim());
      console.log(`Added keywords to FormData: "${keywords.trim()}"`);
    }
    
    // No caption style - feature removed
    
    
    try {
      console.log("Preparing to send POST request to /api/clip endpoint...");
      
      // Log request details
      console.log("Request method: POST");
      console.log("Request URL: /api/clip");
      console.log("FormData contains file:", formData.get('video') !== null);
      
      const response = await fetch('/api/clip', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      console.log(`Response received - Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.error(`Server returned error response: ${response.status}`);
        let errorText = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          console.error("Error details:", errorData);
          errorText = errorData.error || errorData.details || errorText;
        } catch (e) {
          console.error("Could not parse error response:", e);
        }
        throw new Error(errorText);
      }
      
      console.log("Response OK, parsing JSON data...");
      const data = await response.json();
      console.log("Parsed response data:", data);
      
      if (!data.clips || !Array.isArray(data.clips)) {
        console.error("Invalid response format - missing clips array:", data);
        throw new Error('Server returned invalid clip data');
      }
      
      console.log(`Successfully received ${data.clips.length} clips`);
      setClips(data.clips);
      setProgress(100);
      
      toast({
        title: "Success!",
        description: `Generated ${data.clips.length} clips from your video.`,
      });
      
      // Scroll to clips section
      setTimeout(() => {
        const section = document.getElementById('clips-section');
        console.log("Scrolling to clips section:", section ? "found" : "not found");
        section?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      const message = err instanceof Error ? err.message : 'Failed to process video';
      console.error("Error generating clips:", err);
      setError(message);
      setProgress(0);
      
      toast({
        title: "Processing failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      console.log("Processing complete, isProcessing set to false");
    }
  };
  
  // Keep the original handleSubmit for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateClips();
  };
  
  const [downloadingClips, setDownloadingClips] = useState<{[key: string]: boolean}>({});
  
  const handleDownloadClip = async (clip: any, index: number) => {
    // Generate a unique ID for this clip download
    const clipId = clip.id || `clip_${index + 1}`;
    
    // Already downloading this clip
    if (downloadingClips[clipId]) {
      toast({
        title: "Download in progress",
        description: "Please wait while we process your clip."
      });
      return;
    }
    
    try {
      // Mark this clip as downloading
      setDownloadingClips(prev => ({ ...prev, [clipId]: true }));
      
      console.log(`Preparing to download clip ${index + 1} as a vertical reel`);
      toast({
        title: "Processing clip",
        description: "Converting to vertical reel format..."
      });
      
      // Build download URL with proper parameters
      const downloadUrl = `/api/clip/download/${clipId}?format=vertical`;
      
      // Add parameters if available in the clip object
      if (clip.startTime !== undefined && clip.endTime !== undefined) {
        const sourceUrl = clip.originalVideoUrl || clip.clipUrl || clip.url;
        const cleanSourceUrl = sourceUrl.startsWith('http') ? sourceUrl : 
          `${window.location.origin}${sourceUrl.startsWith('/') ? sourceUrl : `/${sourceUrl}`}`;
          
        // Use clip timestamp info
        const queryParams = new URLSearchParams({
          source: cleanSourceUrl,
          start: String(clip.startTime || 0),
          end: String(clip.endTime || 30),
          format: 'vertical',
          caption: clip.caption || ''
        });
        
        // Open in new tab with all extraction parameters
        window.open(`${downloadUrl}&${queryParams.toString()}`, '_blank');
      } else {
        // Simple download with just the ID
        window.open(downloadUrl, '_blank');
      }
      
      toast({
        title: "Vertical reel ready",
        description: "Your social-media ready clip is being downloaded."
      });
    } catch (error) {
      console.error("Error downloading clip:", error);
      toast({
        title: "Download failed",
        description: "Could not process clip. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Remove downloading status
      setDownloadingClips(prev => {
        const newState = { ...prev };
        delete newState[clipId];
        return newState;
      });
    }
  };
  
  // Add star animation component
  const StarAnimation = () => {
    const [stars, setStars] = useState<Array<{id: number, x: number, y: number, size: number, opacity: number, delay: number}>>([]);
    
    useEffect(() => {
      // Generate random stars
      const newStars = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        opacity: Math.random() * 0.7 + 0.3,
        delay: Math.random() * 3
      }));
      
      setStars(newStars);
    }, []);
    
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map(star => (
          <div 
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animation: `twinkle 3s infinite ${star.delay}s`
            }}
          />
        ))}
      </div>
    );
  };
  
  // Add glow effect component
  const GlowEffect = ({ color }: { color: string }) => {
    return (
      <div 
        className="absolute rounded-full blur-3xl opacity-20" 
        style={{ 
          background: color,
          width: '40%',
          height: '40%',
          top: '30%',
          left: '30%',
          filter: 'blur(100px)',
          animation: 'pulse 6s infinite alternate'
        }}
      />
    );
  };

  return (
    <div className="container mx-auto py-10 relative min-h-screen">
      {/* Auth Modal for non-logged in users */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
      
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        
        @keyframes pulse {
          0% { opacity: 0.1; transform: scale(0.95); }
          100% { opacity: 0.3; transform: scale(1.05); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes shooting {
          0% {
            transform: translateX(0) translateY(0) rotate(215deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(-500px) translateY(500px) rotate(215deg);
            opacity: 0;
          }
        }
        
        .viral-badge {
          background: linear-gradient(90deg, #ff4d4d, #ff9f4d, #ffcd4d, #4dff77, #4dffff, #4d77ff, #9f4dff, #ff4dff);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
          color: white;
          font-weight: bold;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .glow-text {
          text-shadow: 0 0 10px rgba(255, 0, 255, 0.7), 0 0 20px rgba(255, 0, 255, 0.5), 0 0 30px rgba(255, 0, 255, 0.3);
        }
        
        .floating {
          animation: float 6s ease-in-out infinite;
        }
        
        .rotating-border {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
        }
        
        .rotating-border::before {
          content: "";
          position: absolute;
          inset: -5px;
          background: conic-gradient(from 0deg, transparent, #a855f7, #ec4899, transparent);
          animation: rotate 4s linear infinite;
          border-radius: 20px;
          z-index: -1;
        }
        
        /* Starry Background Styles */
        .stars-container {
          perspective: 500px;
        }
        
        .stars-small, .stars-medium, .stars-large {
          position: absolute;
          width: 100%;
          height: 100%;
          background-position: center;
          background-repeat: repeat;
        }
        
        .stars-small {
          background-image: radial-gradient(1px 1px at 10% 20%, #33C3BD, transparent),
                            radial-gradient(1px 1px at 20% 50%, #33C3BD, transparent),
                            radial-gradient(1px 1px at 30% 70%, #0075FF, transparent),
                            radial-gradient(1px 1px at 40% 30%, white, transparent),
                            radial-gradient(1px 1px at 50% 40%, #33C3BD, transparent),
                            radial-gradient(1px 1px at 60% 60%, #33C3BD, transparent),
                            radial-gradient(1px 1px at 70% 20%, #0075FF, transparent),
                            radial-gradient(1px 1px at 80% 80%, white, transparent),
                            radial-gradient(1px 1px at 90% 10%, #33C3BD, transparent);
          background-size: 200% 200%;
          animation: twinkle 4s ease infinite alternate;
        }
        
        .stars-medium {
          background-image: radial-gradient(1.5px 1.5px at 15% 15%, #33C3BD, transparent),
                            radial-gradient(1.5px 1.5px at 25% 45%, #0075FF, transparent),
                            radial-gradient(1.5px 1.5px at 35% 65%, white, transparent),
                            radial-gradient(1.5px 1.5px at 45% 25%, #33C3BD, transparent),
                            radial-gradient(1.5px 1.5px at 55% 35%, #0075FF, transparent),
                            radial-gradient(1.5px 1.5px at 65% 55%, white, transparent),
                            radial-gradient(1.5px 1.5px at 75% 15%, #33C3BD, transparent),
                            radial-gradient(1.5px 1.5px at 85% 75%, #0075FF, transparent),
                            radial-gradient(1.5px 1.5px at 95% 5%, white, transparent);
          background-size: 200% 200%;
          animation: twinkle 6s ease infinite alternate;
        }
        
        .stars-large {
          background-image: radial-gradient(2px 2px at 5% 25%, white, transparent),
                            radial-gradient(2px 2px at 15% 55%, #33C3BD, transparent),
                            radial-gradient(2px 2px at 25% 75%, #0075FF, transparent),
                            radial-gradient(2px 2px at 35% 5%, white, transparent),
                            radial-gradient(2px 2px at 45% 85%, #33C3BD, transparent),
                            radial-gradient(2px 2px at 55% 15%, #0075FF, transparent),
                            radial-gradient(2px 2px at 65% 45%, white, transparent),
                            radial-gradient(2px 2px at 75% 65%, #33C3BD, transparent),
                            radial-gradient(2px 2px at 85% 95%, #0075FF, transparent),
                            radial-gradient(2px 2px at 95% 35%, white, transparent);
          background-size: 200% 200%;
          animation: twinkle 8s ease infinite alternate;
        }
        
        .shooting-star {
          position: absolute;
          width: 150px;
          height: 1px;
          background: linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,1));
          transform-origin: left;
          animation: shooting 8s infinite;
          opacity: 0;
        }
        
        .shooting-star:nth-child(1) {
          top: 15%;
          left: 70%;
          animation-delay: 1s;
        }
        
        .shooting-star:nth-child(2) {
          top: 35%;
          left: 80%;
          animation-delay: 4s;
        }
        
        .shooting-star:nth-child(3) {
          top: 65%;
          left: 60%;
          animation-delay: 7s;
        }
        
        .shooting-star:nth-child(4) {
          top: 45%;
          left: 90%;
          animation-delay: 10s;
        }
        
        .shooting-star:nth-child(5) {
          top: 85%;
          left: 75%;
          animation-delay: 13s;
        }
        `}}
      />
      
      {/* Starry Background with deep space effect */}
      <div className="fixed inset-0 overflow-hidden z-[-3]">
        <div className="stars-container absolute inset-0">
          <div className="stars-small"></div>
          <div className="stars-medium"></div>
          <div className="stars-large"></div>
          
          {/* Shooting stars for animated effect */}
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
        </div>
      </div>
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-gray-900/30 to-purple-950/20 z-[-2]"></div>
      <StarAnimation />
      <GlowEffect color="radial-gradient(circle, rgba(236,72,153,1) 0%, rgba(168,85,247,1) 100%)" />
      
      <div className="flex flex-col lg:flex-row gap-8 relative z-10">
        {/* Demo video on the right for desktop */}
        <div className="hidden lg:block lg:w-1/3 xl:w-1/4 sticky top-20 h-fit">
          <div className="rotating-border p-[0.5px] rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-700/20 via-pink-600/10 to-purple-800/20 animate-pulse"></div>
            <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl overflow-hidden relative z-10 border border-purple-800/30 shadow-xl shadow-purple-900/40 hover:shadow-purple-700/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-fuchsia-900/10 to-pink-900/20"></div>
              
              {/* Floating stars and particles in background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 mix-blend-screen">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-purple-500"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      opacity: Math.random() * 0.5 + 0.3,
                      animation: `twinkle ${2 + Math.random() * 4}s infinite ${Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
              
              <div className="relative">
                <video 
                  ref={demoVideoRef}
                  src="https://assets.klap.app/web-assets/landing/klap-demo-shorts.mp4"
                  className="w-full aspect-[9/16] object-cover"
                  loop
                  muted
                  playsInline
                />
                
                {/* Video controls */}
                <button 
                  className="absolute bottom-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/20 border border-purple-500/30 z-20"
                  onClick={toggleVideoPlayback}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                
                {/* Fancy overlay */}
                <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 via-purple-900/30 to-transparent backdrop-blur-sm z-10">
                  <p className="text-sm font-semibold text-white text-center bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-300 bg-clip-text text-transparent glow-text">See it in action</p>
                </div>
                
                {/* Glowing effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 to-pink-600/10 opacity-0 hover:opacity-40 transition-opacity duration-500"></div>
              </div>
              
              <div className="p-4 text-center relative z-10">
                <p className="text-gray-200 text-sm font-medium">Create viral clips in minutes with AI</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Label beneath video */}
          <div className="mt-4 text-center">
            <div className="inline-block bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-purple-900/50 backdrop-blur-md p-2 px-4 rounded-xl border border-purple-700/30 shadow-lg shadow-purple-900/20">
              <span className="text-xs text-gray-300">Powered by <span className="text-purple-300 font-medium">Jesko</span></span>
            </div>
          </div>
        </div>
        
        <div className="max-w-3xl relative z-10 flex-1">
          <div className="text-center mb-8 relative">
            <div className="rotating-border inline-block p-[5px] mb-4">
              <div className="bg-gray-900 p-3 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20"></div>
                <div className="absolute -inset-1 blur-md bg-purple-500/10 animate-pulse"></div>
                <Scissors className="h-12 w-12 text-purple-400 mx-auto mb-1 relative z-10" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent glow-text relative">
              AI Clip Studio
            </h1>
            <p className="text-gray-300 max-w-xl mx-auto bg-gray-900/50 backdrop-blur-sm p-3 rounded-xl">
              <span className="font-medium">Transform</span> your long-form videos into <span className="text-purple-400">viral-ready</span> clips for social media with AI-powered editing magic.
            </p>
            
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="h-5 w-5 fill-amber-400" />
                <span className="text-sm font-medium">Viral Optimization</span>
              </div>
              <div className="flex items-center gap-1 text-green-400">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-medium">Fast Processing</span>
              </div>
              <div className="flex items-center gap-1 text-blue-400">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium">AI-Powered</span>
              </div>
            </div>
          </div>
          
          <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800 shadow-xl relative overflow-hidden mb-8">
            {/* Card shimmer effect */}
            <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-purple-500 to-transparent" 
                 style={{ backgroundSize: '200% 100%', animation: 'shimmer 8s infinite' }}></div>
            
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-6 w-6 text-purple-400" />
                Create Social Media Clips
              </CardTitle>
              <CardDescription>
                Upload your video and let AI find the most engaging moments.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="video-upload">Upload Video (MP4/MOV, max 2GB)</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-800/30 transition-colors ${
                      file ? 'border-purple-600/50 bg-purple-900/20' : 'border-gray-700'
                    } relative`}
                    onClick={() => {
                      console.log("Upload area clicked, triggering file input click");
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      } else {
                        console.error("fileInputRef is null");
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.add('border-purple-500');
                      e.currentTarget.classList.add('bg-purple-900/10');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-purple-500');
                      e.currentTarget.classList.remove('bg-purple-900/10');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("File dropped");
                      e.currentTarget.classList.remove('border-purple-500');
                      e.currentTarget.classList.remove('bg-purple-900/10');
                      
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const droppedFile = e.dataTransfer.files[0];
                        console.log("Dropped file:", droppedFile.name, droppedFile.type);
                        if (droppedFile.type.startsWith('video/')) {
                          setFile(droppedFile);
                          setError(null);
                          toast({
                            title: "File dropped",
                            description: `${droppedFile.name} ready for processing`,
                          });
                        } else {
                          setError('Please upload a valid video file (MP4, MOV, etc.)');
                          toast({
                            title: "Invalid file format",
                            description: "Please upload a video file.",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                  >
                    {/* Pulsing animation for better visibility */}
                    <div className="absolute inset-0 bg-purple-600/5 rounded-lg animate-pulse pointer-events-none"></div>
                    
                    <Upload className={`mx-auto h-12 w-12 mb-2 ${file ? 'text-purple-500' : 'text-gray-500'} relative z-10`} />
                    <input
                      ref={fileInputRef}
                      id="video-upload"
                      type="file"
                      accept="video/mp4,video/quicktime,video/*,.mp4,.mov,.avi,.mkv"
                      onChange={handleFileChange}
                      className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                      style={{ top: 0, left: 0, cursor: 'pointer' }}
                    />
                    {file ? (
                      <p className="text-purple-400 font-medium">{file.name} selected</p>
                    ) : (
                      <>
                        <p className="text-purple-400 font-medium mb-1">Click to upload or drag and drop</p>
                        <p className="text-gray-400 text-sm">Supports MP4 and MOV formats</p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="keywords">Optional Keywords or Topic (helps AI find relevant moments)</Label>
                  <Textarea
                    id="keywords"
                    placeholder="E.g., motivation, real estate, fitness tips, product demo"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="min-h-16 bg-gray-800/60 border-gray-700"
                  />
                </div>
                
                {/* Caption style selector removed - now fixed to 'minimal' by default */}
                
                {error && (
                  <div className="p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                {/* Simple div button with direct click handler */}
                <div 
                  role="button"
                  onClick={handleGenerateClips}
                  className={`
                    w-full py-2 px-4 rounded-md flex items-center justify-center 
                    transition-all duration-300 shadow-lg select-none cursor-pointer
                    ${isProcessing || !file 
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-70' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white hover:shadow-xl'
                    }
                  `}
                  style={{pointerEvents: isProcessing || !file ? 'none' : 'auto'}}
                >
                  {isProcessing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin border-2 border-white border-opacity-20 border-t-white rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Scissors className="mr-2 h-4 w-4" />
                      Generate Clips
                    </>
                  )}
                </div>
                
                {/* Additional standalone button as fallback */}
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={handleGenerateClips}
                    disabled={isProcessing || !file}
                    className={`
                      py-2 px-6 rounded-md text-sm font-medium text-white
                      ${isProcessing || !file 
                        ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                        : 'bg-purple-600 hover:bg-purple-700'
                      }
                    `}
                  >
                    {isProcessing ? 'Processing...' : 'Click here if button above is not working'}
                  </button>
                </div>
                
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Processing video...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-gray-800" />
                    <p className="text-xs text-gray-500 text-center italic">
                      This may take a few minutes depending on video length
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Cost and info card */}
          <div className="my-6 p-4 bg-gradient-to-r from-purple-900/30 to-amber-900/20 border border-amber-500/30 rounded-lg shadow-lg relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-amber-600/5 to-purple-600/10 animate-pulse rounded-lg"></div>
            <h3 className="text-lg font-bold text-amber-300 mb-2 relative">💰 PREMIUM AI FEATURE 💰</h3>
            
            <div className="bg-gray-800/80 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white mb-2">Cost: <span className="font-bold text-lg text-amber-300">20 coins per clip generation</span></p>
                  <p className="text-gray-300 text-sm">AI will analyze your video and extract the most engaging clips</p>
                </div>
                
                <Link href="/get-coins">
                  <button
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-md shadow-md transition-colors"
                  >
                    Get Coins
                  </button>
                </Link>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-gray-300 text-sm mb-2">Not logged in? Create an account and get 100 free coins!</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-amber-300 hover:text-amber-200 underline text-sm inline-flex items-center"
              >
                <span>Create Account</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* ULTRA EMERGENCY PURE HTML BUTTON */}
          <div className="my-6 p-4 bg-red-900/30 border-2 border-red-500/50 rounded-lg shadow-lg text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-yellow-600/5 to-red-600/10 animate-pulse rounded-lg"></div>
            <h3 className="text-lg font-bold text-yellow-300 mb-2 relative">⚠️ LAST RESORT OPTION ⚠️</h3>
            <p className="text-white mb-4 relative">If none of the other buttons work, try this ultra-simplified pure HTML button.</p>
            
            {/* Pure HTML button with inline onclick handler */}
            <div 
              id="pure-html-button"
              style={{
                backgroundColor: file ? '#ef4444' : '#6b7280',
                color: 'white',
                padding: '15px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: file ? 'pointer' : 'not-allowed',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                margin: '0 auto',
                maxWidth: '300px',
                textAlign: 'center',
                position: 'relative'
              }}
              onClick={() => {
                console.log("PURE HTML BUTTON CLICKED");
                if (file) {
                  // Manually handle the upload process instead of using handleGenerateClips
                  try {
                    console.log("Manually processing file:", file.name);
                    setIsProcessing(true);
                    setProgress(0);
                    setError(null);
                    setClips([]);
                    
                    // Create a FormData object
                    const formData = new FormData();
                    formData.append('video', file);
                    if (keywords) formData.append('keywords', keywords);
                    
                    // Set up progress updates
                    const progressInterval = setInterval(() => {
                      setProgress(prev => {
                        if (prev >= 95) {
                          clearInterval(progressInterval);
                          return prev;
                        }
                        return prev + Math.random() * 5 + 2;
                      });
                    }, 1000);
                    
                    // Manual fetch request
                    fetch('/api/clip', {
                      method: 'POST',
                      body: formData,
                    })
                    .then(response => {
                      clearInterval(progressInterval);
                      console.log("Raw response received:", response);
                      if (!response.ok) {
                        throw new Error(`Error ${response.status}: ${response.statusText}`);
                      }
                      return response.json();
                    })
                    .then(data => {
                      console.log("Response data:", data);
                      if (data.clips && Array.isArray(data.clips)) {
                        setClips(data.clips);
                        setProgress(100);
                        alert(`Success! Generated ${data.clips.length} clips from your video.`);
                      } else {
                        throw new Error("Invalid response format");
                      }
                    })
                    .catch(err => {
                      console.error("Error:", err);
                      setError(err.message);
                      setProgress(0);
                      alert("Error: " + err.message);
                    })
                    .finally(() => {
                      setIsProcessing(false);
                    });
                  } catch (err: any) {
                    console.error("Error in click handler:", err);
                    alert("Error: " + (err.message || "Unknown error"));
                  }
                } else {
                  alert("Please upload a video first");
                }
              }}
            >
              {file ? '🔴 GENERATE CLIPS - EMERGENCY BUTTON 🔴' : 'UPLOAD A VIDEO FIRST'}
            </div>
            
            {file && (
              <p className="mt-4 text-sm text-white relative">Selected: <span className="font-bold">{file.name}</span></p>
            )}
          </div>
          

          
          {clips.length > 0 && (
            <div id="clips-section" className="space-y-6">
              <div className="text-center relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                </div>
                <h2 className="relative inline-block px-6 py-2 bg-gray-900 text-2xl font-bold text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-6 w-6 text-yellow-500" />
                    <span className="bg-gradient-to-r from-yellow-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Your Amazing AI-Generated Clips</span>
                    <Sparkles className="h-6 w-6 text-yellow-500" />
                  </div>
                </h2>
              </div>
              
              {/* Small floating animation at the top */}
              <div className="relative h-16 mb-2">
                <div className="absolute left-1/2 transform -translate-x-1/2 top-0 flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.9s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '1.2s' }}></div>
                </div>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {clips.map((clip, index) => (
                  <Card 
                    key={index} 
                    className="bg-gray-900/60 backdrop-blur-sm border-gray-800 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-purple-900/30 hover:shadow-2xl relative group"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                    
                    <div className="relative z-10">
                      <div className="relative">
                        <div className={`video-container mx-auto ${clip.type === 'reel' ? 'reel-format bg-black rounded-xl overflow-hidden border border-purple-900/30' : ''}`} 
                          style={{ 
                            maxWidth: clip.type === 'reel' ? '320px' : 'none',
                            boxShadow: clip.type === 'reel' ? '0 8px 32px rgba(0,0,0,0.5)' : 'none'
                          }}>
                          {/* If it's a reel, use an iframe to get proper vertical formatting */}
                          {clip.type === 'reel' ? (
                            <div className="relative pt-[177.78%]">
                              <iframe 
                                src={clip.url}
                                className="absolute inset-0 w-full h-full"
                                frameBorder="0"
                                allowFullScreen
                                loading="lazy"
                                title={`Vertical Reel Clip ${clip.clipNumber || (index + 1)}`}
                              />
                              <div className="absolute inset-0 pointer-events-none opacity-0 bg-purple-500/10 hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                          ) : (
                            <video 
                              src={clip.originalVideoUrl || clip.url}
                              className="w-full aspect-video object-cover"
                              controls
                              crossOrigin="anonymous"
                              onError={(e) => {
                                console.error("Video failed to load:", e);
                                // Try to reload with a different type
                                const video = e.target as HTMLVideoElement;
                                video.poster = "/images/error-fallback.jpg";
                                
                                // Add an error message overlay
                                const parent = video.parentElement?.parentElement;
                                if (parent) {
                                  const errorDiv = document.createElement('div');
                                  errorDiv.className = "absolute inset-0 flex items-center justify-center bg-black/80 text-white p-4 text-center";
                                  errorDiv.innerHTML = `
                                    <div>
                                      <p class="mb-2 font-bold">Video temporarily unavailable</p>
                                      <a href="${clip.url}" target="_blank" class="text-purple-400 underline">Open directly in browser</a>
                                    </div>
                                  `;
                                  parent.appendChild(errorDiv);
                                }
                              }}
                              playsInline
                              preload="metadata"
                            />
                          )}
                          {clip.type === 'reel' && (
                            <div className="reel-badge">
                              <Sparkles className="h-3 w-3 text-yellow-400" />
                              <span className="text-xs">Reel Format</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Fancy viral score badge */}
                        <div className="absolute top-2 right-2 viral-badge group-hover:scale-110 transition-transform duration-300">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-white" />
                            <span>Viral Score: {clip.viralScore || (85 + index * 3)}%</span>
                          </div>
                        </div>
                        
                        {/* Clip number badge */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold p-1 px-2 rounded-md backdrop-blur-sm">
                          Clip {index + 1}
                        </div>
                      </div>
                      
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-gray-300 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-blue-400" />
                              <span>Timestamp: {clip.timestamp || `${index * 1.5}:${(index * 27) % 60}`}</span>
                            </div>
                            <div className="text-xs font-medium text-gray-300 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-green-400" />
                              <span>Engagement: {clip.engagement || 'High'}</span>
                            </div>
                          </div>
                          <div className="px-2 py-1 bg-purple-900/30 rounded-md border border-purple-800/50 text-xs font-medium text-purple-300">
                            {clip.duration || '~30sec'}
                          </div>
                        </div>
                        
                        <div className="mb-4 bg-gray-900/70 p-4 rounded-md border border-purple-900/30 text-sm relative overflow-hidden">
                          {/* Subtle gradient background */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-pink-900/5"></div>
                          
                          <div className="relative flex items-start gap-3">
                            <MessageSquare className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-medium text-purple-300 mb-1">AI Generated Caption:</h4>
                              <p className="text-gray-300">{clip.caption || "This engaging clip highlights the key points from your video, perfect for social sharing and growing your audience quickly."}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`flex-1 ${downloadingClips[clip.id || `clip_${index + 1}`] ? 'bg-purple-900/20' : 'bg-transparent'} border-gray-700 hover:bg-gray-800 hover:border-purple-500/50 transition-colors`}
                            onClick={() => handleDownloadClip(clip, index)}
                            disabled={downloadingClips[clip.id || `clip_${index + 1}`]}
                          >
                            {downloadingClips[clip.id || `clip_${index + 1}`] ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Download Reel
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 shadow-lg hover:shadow-purple-900/30"
                            onClick={() => {
                              // Copy video URL to clipboard - use the original video URL when available
                              const videoUrl = clip.originalVideoUrl || clip.url;
                              const clipUrl = videoUrl.startsWith('http') 
                                ? videoUrl 
                                : `${window.location.origin}${videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}`;
                              
                              navigator.clipboard.writeText(clipUrl).then(() => {
                                toast({
                                  title: "Link copied!",
                                  description: "Video URL copied to clipboard",
                                });
                              }).catch(err => {
                                console.error("Failed to copy URL:", err);
                                toast({
                                  title: "Copy failed",
                                  description: "Could not copy link to clipboard",
                                  variant: "destructive"
                                });
                              });
                            }}
                          >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </Button>
                        </div>
                        
                        {/* Social platform icons */}
                        <div className="flex justify-center gap-4 mt-3">
                          <button 
                            className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold hover:scale-110 transition-transform cursor-pointer"
                            onClick={() => {
                              const videoUrl = clip.originalVideoUrl || clip.url;
                              const clipUrl = videoUrl.startsWith('http') ? videoUrl : `${window.location.origin}${videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}`;
                              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(clipUrl)}`, '_blank', 'width=600,height=400');
                            }}
                            aria-label="Share on Facebook"
                          >f</button>
                          <button 
                            className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-xs text-white font-bold hover:scale-110 transition-transform cursor-pointer"
                            onClick={() => {
                              const videoUrl = clip.originalVideoUrl || clip.url;
                              window.open(videoUrl, '_blank');
                              toast({
                                title: "Instagram Ready",
                                description: "Save the video from the new tab, then share on Instagram",
                              });
                            }}
                            aria-label="Share on Instagram"
                          >i</button>
                          <button 
                            className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-xs text-white font-bold hover:scale-110 transition-transform cursor-pointer"
                            onClick={() => {
                              const videoUrl = clip.originalVideoUrl || clip.url;
                              const clipUrl = videoUrl.startsWith('http') ? videoUrl : `${window.location.origin}${videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}`;
                              const text = clip.caption || "Check out this viral clip I created with AI!";
                              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(clipUrl)}`, '_blank', 'width=600,height=400');
                            }}
                            aria-label="Share on Twitter"
                          >t</button>
                          <button 
                            className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs text-white font-bold hover:scale-110 transition-transform cursor-pointer"
                            onClick={() => {
                              const videoUrl = clip.originalVideoUrl || clip.url;
                              window.open(videoUrl, '_blank');
                              toast({
                                title: "YouTube Ready",
                                description: "Save the video from the new tab, then upload to YouTube",
                              });
                            }}
                            aria-label="Share on YouTube"
                          >y</button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* Footer action */}
              <div className="mt-8 text-center">
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-2 h-auto"
                  onClick={() => {
                    // Clear form and scroll to top to create new clips
                    setFile(null);
                    setKeywords('');
                    setProgress(0);
                    setError(null);
                    
                    // Scroll to top of the form
                    const formElement = document.querySelector('form');
                    if (formElement) {
                      formElement.scrollIntoView({ behavior: 'smooth' });
                    }
                    
                    toast({
                      title: "Ready for more",
                      description: "Upload a new video to generate more viral clips!",
                    });
                  }}
                >
                  <Rocket className="mr-2 h-5 w-5" />
                  <span>Generate More Viral Content</span>
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-16 mb-8 text-center relative">
            {/* Star divider */}
            <div className="flex items-center justify-center mb-6">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-purple-500/50"></div>
              <div className="mx-4">
                <div className="relative">
                  <Star className="h-8 w-8 text-purple-400 animate-pulse" />
                  <div className="absolute inset-0 blur-sm bg-purple-500/50 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-purple-500/50"></div>
            </div>
            
            <div className="text-gray-400 text-sm max-w-2xl mx-auto px-6 py-4 bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800">
              <p className="mb-2"><span className="text-purple-400 font-semibold">Powered by Advanced AI</span> • Viral-ready clips in minutes</p>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
                <span>Upload limit: 300MB</span>
                <span>•</span>
                <span>Supported formats: MP4, MOV</span>
                <span>•</span>
                <span>15 coins per generation</span>
              </div>
            </div>
            
            {/* Space theme bottom decoration */}
            <div className="mt-12 opacity-20 relative h-16 overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
              <div className="absolute left-1/4 bottom-4 w-1 h-1 rounded-full bg-blue-400"></div>
              <div className="absolute left-1/3 bottom-8 w-2 h-2 rounded-full bg-purple-400"></div>
              <div className="absolute left-2/3 bottom-2 w-1.5 h-1.5 rounded-full bg-pink-400"></div>
              <div className="absolute left-1/2 bottom-6 w-1 h-1 rounded-full bg-yellow-400"></div>
              <div className="absolute right-1/4 bottom-10 w-1 h-1 rounded-full bg-green-400"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AIClipStudioPageWrapper() {
  return <AIClipStudioPage />;
}