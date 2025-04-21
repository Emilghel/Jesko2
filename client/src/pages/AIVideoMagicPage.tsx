import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ProgressWithTimer } from "@/components/ui/progress-with-timer";
import { LoadingWithTimer } from "@/components/ui/loading-with-timer";
import { Timer } from "@/components/ui/timer";
import { useLoading } from "@/contexts/LoadingContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import AuthModal from "@/components/AuthModal";
import CoinDiscountModal from "@/components/CoinDiscountModal";
import { 
  Loader2, 
  Upload, 
  Download, 
  Sparkles, 
  Image as ImageIcon, 
  Film, 
  Wand2, 
  Coins,
  Trash2,
  Plus,
  Check,
  Info,
  Clock,
  Camera,
  Palette,
  LayoutPanelTop,
  Settings,
  RefreshCw,
  X,
  History,
  PlayCircle,
  ChevronDown
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import BrainVideoAnimation from "@/components/BrainVideoAnimation";
import VideoExamplesPlayer from "@/components/VideoExamplesPlayer";

function Star({ style }: { style?: React.CSSProperties }) {
  return (
    <div 
      className="absolute rounded-full bg-purple-300"
      style={{
        width: '2px',
        height: '2px',
        animation: 'twinkle 3s infinite',
        ...style
      }}
    />
  );
}

interface AnimationStyleCardProps {
  id: string;
  name: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function AnimationStyleCard({
  id,
  name,
  description,
  selected,
  onClick
}: AnimationStyleCardProps) {
  return (
    <div 
      className={`p-3 rounded-lg cursor-pointer transition-all ${
        selected 
          ? 'bg-gradient-to-r from-purple-800/50 to-cyan-800/50 border-2 border-purple-500' 
          : 'bg-gray-800/60 border border-gray-700 hover:bg-gray-800/80'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div 
          className={`w-4 h-4 rounded-full ${
            selected ? 'bg-purple-500' : 'bg-gray-600'
          }`}
        />
        <h3 className="font-medium text-white">{name}</h3>
      </div>
      <p className="text-sm text-gray-400 mt-1 ml-6">{description}</p>
    </div>
  );
}

interface ExampleCardProps {
  title: string;
  description: string;
  imageUrl: string;
  onClick: () => void;
}

function ExampleCard({
  title,
  description,
  imageUrl,
  onClick
}: ExampleCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer border-gray-700 bg-black/40 hover:bg-black/60" onClick={onClick}>
      <div className="h-32 overflow-hidden">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-cover transform hover:scale-105 transition-transform"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium text-white text-lg">{title}</h3>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// Video history type
interface VideoHistoryItemType {
  id: number;
  userId: number;
  videoUrl: string;
  thumbnailUrl: string;
  prompt: string;
  modelVersion: string;
  aspectRatio: string;
  duration: number;
  createdAt: string;
  sourceImageUrl?: string | null;
  isInStockLibrary?: boolean;
  stockVideoId?: number | null;
}

// Video history item component
function VideoHistoryItem({
  video,
  onSelect,
  onDelete,
  onAddToStock
}: {
  video: VideoHistoryItemType;
  onSelect: () => void;
  onDelete: () => void;
  onAddToStock: () => void;
}) {
  return (
    <div className="p-2 rounded-lg border border-gray-700 bg-black/40 hover:bg-black/60 transition-all group">
      <div 
        className="aspect-video relative overflow-hidden rounded-md cursor-pointer"
        onClick={onSelect}
      >
        <img 
          src={video.thumbnailUrl} 
          alt={video.prompt} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <PlayCircle className="w-10 h-10 text-white opacity-80" />
        </div>
      </div>
      <div className="mt-2">
        <p className="text-sm text-white font-medium line-clamp-1">{video.prompt}</p>
        <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
          <span>{video.aspectRatio} • {video.duration}s</span>
          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center justify-between mt-2 gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs hover:bg-red-900/30 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
          
          {!video.isInStockLibrary && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs hover:bg-emerald-900/30 hover:text-emerald-400"
              onClick={(e) => {
                e.stopPropagation();
                onAddToStock();
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              To Stock
            </Button>
          )}
          
          {video.isInStockLibrary && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs bg-emerald-900/20 text-emerald-500 cursor-default"
              disabled
            >
              <Check className="w-3 h-3 mr-1" />
              In Stock
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIVideoMagicPage() {
  // Auth state
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Coin and discount state
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const VIDEO_COST = 50; // Cost in coins to transform an image
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  
  // State variables
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [modelVersion, setModelVersion] = useState('gen-2');
  const [numFrames, setNumFrames] = useState(120);
  const [numSteps, setNumSteps] = useState(30);
  const [motionScale, setMotionScale] = useState(0.6);
  const [guidance, setGuidance] = useState(25);
  const [timeScale, setTimeScale] = useState(1.0);
  const [seed, setSeed] = useState<number | null>(null);
  // Only 5 or 10 seconds are valid durations for the Runway API
  const [duration, setDuration] = useState<5 | 10>(5);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  // Aspect ratio options with emotional descriptions
  const aspectRatioOptions = [
    { value: '16:9', label: '16:9 - Cinematic Widescreen', description: 'Professional film look with dramatic horizontal space' },
    { value: '9:16', label: '9:16 - Vertical Social', description: 'Perfect for mobile storytelling with engaging vertical flow' },
    { value: '1:1', label: '1:1 - Perfect Square', description: 'Balanced and harmonious composition with equal focus' },
    { value: '4:3', label: '4:3 - Classic Display', description: 'Traditional viewing format with comfortable proportions' },
    { value: '3:4', label: '3:4 - Portrait Frame', description: 'Elegant vertical format with dignified presence' },
    { value: '21:9', label: '21:9 - Ultra Widescreen', description: 'Expansive cinematic experience with immersive breadth' }
  ];
  
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [stars, setStars] = useState<{ id: number; x: string; y: string; delay: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { toast } = useToast();
  
  // Runway model options
  const [runwayModels, setRunwayModels] = useState([
    { id: 'gen-2', name: 'Gen-2', description: 'Latest generation for high-quality transformations', type: 'gen-video' },
    { id: 'gen-1', name: 'Gen-1', description: 'First generation model for basic transformations', type: 'gen-video' },
    { id: 'interpolate', name: 'Interpolate', description: 'Create smooth transitions between multiple images', type: 'interpolate' }
  ]);
  
  // Fetch available models from the API
  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/runway/models');
        if (response.ok) {
          const data = await response.json();
          if (data.models && Array.isArray(data.models)) {
            // Transform the API response into our model format
            const formattedModels = data.models.map((model: any) => ({
              id: model.id || model.name,
              name: model.name || model.id,
              description: model.description || `${model.name} model`,
              type: model.type || 'gen-video'
            }));
            
            if (formattedModels.length > 0) {
              setRunwayModels(formattedModels);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch Runway models:', error);
        // Keep using the default models if the API fails
      }
    }
    
    fetchModels();
  }, []);
  
  // Video example data
  const videoExamples = [
    {
      prompt: 'Cinematic zoom effect with lighting changes',
      videoUrl: 'https://video.wixstatic.com/video/ee3656_72ef5c5c58cf4300be9c3611afb4ba19/720p/mp4/file.mp4',
    },
    {
      prompt: 'Slow motion particles with dramatic shadows',
      videoUrl: 'https://video.wixstatic.com/video/ee3656_b17e8b70de3a4fc9ba7dd73fc240c411/1080p/mp4/file.mp4',
    },
    {
      prompt: 'Rotating object with reflective surfaces',
      videoUrl: 'https://video.wixstatic.com/video/ee3656_41a54d5117d54da18b98e6edfafa0843/1080p/mp4/file.mp4',
    },
    {
      prompt: 'Animated portrait with subtle facial expressions',
      videoUrl: 'https://video.wixstatic.com/video/ee3656_f1e2eb1cff7d44e189aff4c7e703c3e3/1080p/mp4/file.mp4',
    },
    {
      prompt: 'Dynamic scene with flowing elements',
      videoUrl: 'https://video.wixstatic.com/video/ee3656_5603ac718ea448909b16f78d4f9fd569/720p/mp4/file.mp4',
    }
  ];
  
  // No need to declare VideoHistoryItemType again, it's already defined above
  
  // State for video history
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItemType[]>([]);
  
  // Fetch video history from API
  useEffect(() => {
    async function fetchVideoHistory() {
      try {
        const response = await fetch('/api/video-history');
        if (response.ok) {
          const data = await response.json();
          if (data.videos && Array.isArray(data.videos)) {
            setVideoHistory(data.videos);
          }
        }
      } catch (error) {
        console.error('Failed to fetch video history:', error);
      }
    }
    
    fetchVideoHistory();
  }, []);
  
  // Fetch user coins when user is authenticated
  useEffect(() => {
    async function fetchUserCoins() {
      if (user) {
        try {
          const response = await fetch('/api/user/coins');
          if (response.ok) {
            const data = await response.json();
            setUserCoins(data.coins);
          }
        } catch (error) {
          console.error('Failed to fetch user coins:', error);
        }
      }
    }
    
    fetchUserCoins();
  }, [user]);

  // Generate stars for the background
  useEffect(() => {
    const newStars = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`
    }));
    setStars(newStars);
  }, []);
  
  // Simulated progress during processing
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    if (isProcessing) {
      setProgress(0);
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 1000);
    }
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isProcessing]);
  
  // Handle file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      return;
    }
    
    // Check if the file is an image
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.).');
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, etc.).",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      toast({
        title: "File too large",
        description: "Image file size must be less than 5MB.",
        variant: "destructive"
      });
      return;
    }
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(selectedFile);
    
    // Clean up the old preview URL if it exists
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    
    setImagePreview(previewUrl);
    setFile(selectedFile);
    setError(null);
  }
  
  // Handle drag and drop
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Check if the file is an image
      if (!droppedFile.type.startsWith('image/')) {
        setError('Please upload an image file (JPEG, PNG, etc.).');
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPEG, PNG, etc.).",
          variant: "destructive"
        });
        return;
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(droppedFile);
      
      // Clean up the old preview URL if it exists
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      
      setImagePreview(previewUrl);
      setFile(droppedFile);
      setError(null);
    }
  }
  
  // Handle applying discount and proceeding to buy coins
  const handleApplyDiscount = async () => {
    setIsApplyingDiscount(true);
    
    try {
      // Check if the discount code is valid
      const response = await fetch(`/api/discount/check/MAGIC10`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          toast({
            title: "Discount code applied!",
            description: `${data.description} will be added to your next coin purchase.`,
          });
          
          // Redirect to the coin purchase page with the discount code pre-applied
          window.location.href = `/coin-purchase?code=MAGIC10`;
        } else {
          toast({
            title: "Invalid discount code",
            description: data.message || "The discount code could not be applied.",
            variant: "destructive"
          });
        }
      } else {
        throw new Error("Failed to validate discount code");
      }
    } catch (error) {
      console.error("Error applying discount:", error);
      toast({
        title: "Error",
        description: "There was a problem applying the discount code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApplyingDiscount(false);
      setShowDiscountModal(false);
    }
  };

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login required",
        description: "Please sign up or log in to generate AI videos. New users get 100 free coins!",
        variant: "default"
      });
      setShowAuthModal(true);
      return;
    }
    
    if (!file) {
      setError('Please upload an image.');
      toast({
        title: "No image selected",
        description: "Please select an image to animate.",
        variant: "destructive"
      });
      return;
    }
    
    if (!prompt.trim()) {
      setError('Please enter a description of the desired motion.');
      toast({
        title: "No prompt provided",
        description: "Please describe how you want the image to animate.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user has enough coins
    if (userCoins !== null && userCoins < VIDEO_COST) {
      toast({
        title: "Insufficient coins",
        description: `You need ${VIDEO_COST} coins to generate a video. You currently have ${userCoins} coins.`,
        variant: "default"
      });
      
      // Show the discount modal
      setShowDiscountModal(true);
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setProcessingStartTime(new Date());
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('prompt', prompt);
    formData.append('modelVersion', modelVersion);
    formData.append('negativePrompt', negativePrompt);
    formData.append('numFrames', numFrames.toString());
    formData.append('numSteps', numSteps.toString());
    formData.append('motionScale', motionScale.toString());
    formData.append('guidance', guidance.toString());
    formData.append('timeScale', timeScale.toString());
    formData.append('aspectRatio', aspectRatio);
    formData.append('duration', duration.toString());
    if (seed !== null) {
      formData.append('seed', seed.toString());
    }
    
    try {
      // Use fetch directly to upload the image
      const response = await fetch('/api/image-to-video', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error('Failed to generate video');
        }
        throw new Error(errorData.error || errorData.details || 'Failed to generate video');
      }
      
      const data = await response.json();
      setProgress(100);
      
      // Short delay to show 100% progress before displaying the result
      setTimeout(async () => {
        // Set the video URL and other response data
        setGeneratedVideoUrl(data.videoUrl);
        setIsProcessing(false);
        
        // Update result information from the API response
        if (data.modelVersion) setModelVersion(data.modelVersion);
        if (data.duration) setDuration(data.duration);
        if (data.promptUsed) setPrompt(data.promptUsed);
        if (data.numFrames) setNumFrames(data.numFrames);
        
        // Set the aspect ratio from the response, or keep the current one
        // This allows the user to see what aspect ratio was actually used
        if (data.aspectRatio) {
          setAspectRatio(data.aspectRatio);
        }
        
        // Save the video to history via the API
        try {
          const historyData = {
            videoUrl: data.videoUrl,
            thumbnailUrl: imagePreview || 'https://via.placeholder.com/200',
            prompt: prompt,
            modelVersion: modelVersion,
            aspectRatio: aspectRatio,
            duration: duration,
            sourceImageUrl: imagePreview
          };
          
          const historyResponse = await fetch('/api/video-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(historyData)
          });
          
          if (historyResponse.ok) {
            // Get the video history ID from the response
            const historyResponseData = await historyResponse.json();
            let historyId = null;
            
            if (historyResponseData && historyResponseData.id) {
              historyId = historyResponseData.id;
              
              // Automatically add to stock library
              // This ensures any video saved to history is immediately available in the Free Stock Videos section
              try {
                await fetch(`/api/video-history/${historyId}/add-to-stock`, {
                  method: 'POST'
                });
                
                console.log('Video automatically added to stock library');
                
                // Note: The video will now be visible in both the user's history and the stock library
                // The isInStockLibrary flag will be set to true in the refreshed history data
              } catch (stockError) {
                console.error('Error adding video to stock library automatically:', stockError);
              }
            }
            
            // Refresh the video history
            const response = await fetch('/api/video-history');
            if (response.ok) {
              const data = await response.json();
              if (data.videos && Array.isArray(data.videos)) {
                setVideoHistory(data.videos);
              }
            }
          } else {
            console.error('Failed to save video to history');
          }
        } catch (error) {
          console.error('Error saving video to history:', error);
        }
        
        toast({
          title: "Video generated!",
          description: "Your image has been successfully animated.",
        });
      }, 500);
    } catch (err) {
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }
  
  // Handle downloading the generated video
  function handleDownload() {
    if (generatedVideoUrl) {
      const a = document.createElement('a');
      a.href = generatedVideoUrl;
      a.download = 'animated-image.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
  
  // Reset the form to start over
  function resetForm() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setFile(null);
    setImagePreview(null);
    setPrompt('');
    setNegativePrompt('');
    setModelVersion('gen-2');
    setNumFrames(120);
    setNumSteps(30);
    setMotionScale(0.6);
    setGuidance(25);
    setTimeScale(1.0);
    setSeed(null);
    setDuration(5);
    setAspectRatio('16:9');
    setGeneratedVideoUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
  
  // Load video example data
  function loadVideoExample(example: {prompt: string; videoUrl: string}) {
    setPrompt(example.prompt);
    setFile(null); // We can't access an actual file for the video examples
    setModelVersion('gen-2');
    setError(null);
    // Set the generated video URL to show the example video
    setGeneratedVideoUrl(example.videoUrl);
    
    toast({
      title: "Example loaded",
      description: "You can now see how this style looks in motion.",
    });
  }
  
  // To fix TypeScript error with the old function reference
  const loadExample = loadVideoExample;
  
  // Load a video from history
  function loadHistoryVideo(video: VideoHistoryItemType) {
    setGeneratedVideoUrl(video.videoUrl);
    setPrompt(video.prompt);
    setModelVersion(video.modelVersion);
    setAspectRatio(video.aspectRatio);
    
    // Make sure we only use valid durations (5 or 10 seconds)
    const validDuration = video.duration === 10 ? 10 : 5;
    setDuration(validDuration);
    
    // Switch to the create tab to view the video
    setActiveTab('create');
    
    toast({
      title: "History video loaded",
      description: "You can now view or customize this video.",
    });
  }
  
  // Delete a video from history
  async function deleteHistoryVideo(videoId: number) {
    try {
      const response = await fetch(`/api/video-history/${videoId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove the video from the local state
        setVideoHistory(prev => prev.filter(video => video.id !== videoId));
        
        toast({
          title: "Video deleted",
          description: "The video has been removed from your history.",
        });
      } else {
        toast({
          title: "Deletion failed",
          description: "Could not delete the video. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the video.",
        variant: "destructive"
      });
    }
  }
  
  // Add a history video to the stock library
  async function addHistoryVideoToStock(videoId: number) {
    try {
      const response = await fetch(`/api/video-history/${videoId}/add-to-stock`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Update the local state to reflect the change
        setVideoHistory(prev => 
          prev.map(video => 
            video.id === videoId 
              ? { ...video, isInStockLibrary: true } 
              : video
          )
        );
        
        toast({
          title: "Added to stock library",
          description: "The video is now available in the stock library.",
        });
      } else {
        toast({
          title: "Failed to add to stock",
          description: "Could not add the video to the stock library. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to add video to stock library:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the video to the stock library.",
        variant: "destructive"
      });
    }
  }
  
  return (
    <>
      {/* Discount Modal */}
      <CoinDiscountModal
        open={showDiscountModal}
        onOpenChange={setShowDiscountModal}
        requiredCoins={VIDEO_COST}
        currentCoins={userCoins || 0}
        onApplyDiscount={handleApplyDiscount}
      />
      
      {/* Auth Modal */}
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
        title="Sign in to create AI videos"
        description="Sign up to get 100 free gold coins and start creating AI videos!"
      />
    
    <div className="container mx-auto py-10 relative min-h-screen" ref={containerRef}>
      {/* CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.7; }
        }
        
        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(1); }
          100% { opacity: 0.8; transform: scale(1.1); }
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}} />
      
      {/* Background stars effect */}
      {stars.map(star => (
        <Star 
          key={star.id} 
          style={{ 
            left: star.x, 
            top: star.y, 
            animationDelay: star.delay 
          }} 
        />
      ))}
      
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            <span className="inline-block relative">
              AI Video Magic
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Transform your static images into dynamic videos. Upload an image, describe how you want it to animate, and our AI will bring it to life.
          </p>
        </div>
        
        {/* Tabs for Create/History */}
        <div className="flex space-x-2 justify-center mb-4">
          <Button
            variant={activeTab === 'create' ? "default" : "outline"}
            onClick={() => setActiveTab('create')}
            className={`rounded-full px-4 py-2 ${
              activeTab === 'create' 
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white border-none' 
                : 'text-gray-300 bg-gray-800/60 border-gray-700 hover:bg-gray-700/50'
            }`}
          >
            <Camera className="mr-2 h-4 w-4" />
            Create Video
          </Button>
          <Button
            variant={activeTab === 'history' ? "default" : "outline"}
            onClick={() => setActiveTab('history')}
            className={`rounded-full px-4 py-2 ${
              activeTab === 'history' 
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white border-none' 
                : 'text-gray-300 bg-gray-800/60 border-gray-700 hover:bg-gray-700/50'
            }`}
          >
            <History className="mr-2 h-4 w-4" />
            Video History
          </Button>
        </div>
        
        {/* Main content - Two column layout */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${activeTab === 'history' ? 'hidden' : ''}`}>
          {/* Left side - Controls */}
          <div className="lg:col-span-5">
            <Card className="border-gray-700 bg-black/40 backdrop-blur-sm h-full">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-400" />
                  <span className="bg-gradient-to-r from-purple-400 to-cyan-400 text-transparent bg-clip-text">
                    Image to Video Transformer
                  </span>
                </CardTitle>
                <CardDescription>
                  Upload an image and describe how you want it to animate.
                  <span className="ml-2 inline-flex items-center text-cyan-400">
                    <Coins className="h-3 w-3 mr-1" />
                    50 coins per transformation
                  </span>
                </CardDescription>
              </CardHeader>
                  
              <CardContent className="overflow-y-auto pt-6" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                {!generatedVideoUrl ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="image-upload" className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Upload Image (JPEG, PNG, max 5MB)
                      </Label>
                      <div 
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-800/30 transition-colors ${
                          file ? 'border-green-600/50 bg-green-900/20' : 'border-gray-700'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        {imagePreview ? (
                          <div className="relative mx-auto w-full max-w-xs">
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="rounded-lg shadow-md mx-auto max-h-48 object-contain"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resetForm();
                                }}
                                className="bg-black/50 text-white border-white/20"
                              >
                                Change Image
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload className="mx-auto h-12 w-12 mb-2 text-gray-500" />
                            <p className="text-gray-400">Click to upload or drag and drop</p>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="prompt" className="flex items-center gap-2">
                        <Film className="h-4 w-4" />
                        Describe the Animation
                      </Label>
                      <Textarea
                        id="prompt"
                        placeholder="Describe how you want the image to animate (e.g., 'gentle breeze blowing through the trees, leaves rustling, clouds moving slowly across the sky')"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-24 bg-gray-800/60 border-gray-700"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="negativePrompt" className="flex items-center gap-2 text-gray-400">
                        <Film className="h-4 w-4" />
                        <span>Negative Prompt <span className="text-xs">(optional)</span></span>
                      </Label>
                      <Textarea
                        id="negativePrompt"
                        placeholder="Describe what you want to avoid in the animation (e.g., 'shaky camera, distortion, blurry motion')"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        className="min-h-16 bg-gray-800/60 border-gray-700"
                      />
                    </div>
                    
                    {/* Enhanced compact design with glow effects */}
                    <div className="space-y-4">
                      {/* Model Selection */}
                      <div className="group mt-2">
                        <div className="flex items-center gap-2 mb-2 transition-all group-hover:translate-x-1 duration-300">
                          <Wand2 className="h-4 w-4 text-purple-400 group-hover:animate-pulse" />
                          <h3 className="font-medium text-white text-sm uppercase tracking-wider group-hover:text-purple-300">Model</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {runwayModels.filter(model => model.type === 'gen-video').map(model => (
                            <div 
                              key={model.id}
                              className={`p-2 rounded-lg cursor-pointer transition-all border ${
                                modelVersion === model.id
                                  ? 'bg-gradient-to-r from-purple-800/40 to-cyan-800/40 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                                  : 'bg-gray-800/40 border-gray-700 hover:border-gray-500'
                              }`}
                              onClick={() => setModelVersion(model.id)}
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className={`w-3 h-3 rounded-full ${
                                    modelVersion === model.id ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.7)]' : 'bg-gray-600'
                                  }`}
                                />
                                <h3 className="font-medium text-white text-sm">{model.name}</h3>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 ml-5">{model.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Aspect Ratio Selection */}
                      <div className="group mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 transition-all group-hover:translate-x-1 duration-300">
                            <LayoutPanelTop className="h-4 w-4 text-purple-400 group-hover:animate-pulse" />
                            <h3 className="font-medium text-white text-sm uppercase tracking-wider group-hover:text-purple-300">Aspect Ratio</h3>
                          </div>
                          <span className="text-purple-400 font-medium text-xs px-2 py-1 bg-purple-900/30 rounded-full border border-purple-800/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                            {aspectRatio}
                          </span>
                        </div>
                        
                        <div className="p-3 bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700 shadow-md">
                          <RadioGroup 
                            value={aspectRatio} 
                            onValueChange={setAspectRatio}
                            className="grid grid-cols-2 md:grid-cols-3 gap-2"
                          >
                            {aspectRatioOptions.map((option) => (
                              <div 
                                key={option.value}
                                className={`relative flex flex-col p-2 rounded-lg cursor-pointer transition-all ${
                                  aspectRatio === option.value
                                    ? 'bg-gradient-to-br from-purple-800/40 to-cyan-800/40 border border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                    : 'bg-gray-800/40 border border-gray-700 hover:border-gray-500'
                                }`}
                              >
                                <RadioGroupItem 
                                  value={option.value} 
                                  id={`ratio-${option.value}`} 
                                  className="sr-only"
                                />
                                <Label 
                                  htmlFor={`ratio-${option.value}`}
                                  className="text-sm font-medium leading-none text-white"
                                >
                                  {option.value}
                                </Label>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                                  {option.label.split('-')[1]}
                                </p>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      </div>
                      
                      {/* Duration Setting */}
                      <div className="group mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 transition-all group-hover:translate-x-1 duration-300">
                            <Clock className="h-4 w-4 text-purple-400 group-hover:animate-pulse" />
                            <h3 className="font-medium text-white text-sm uppercase tracking-wider group-hover:text-purple-300">Duration</h3>
                            <div className="text-xs text-yellow-300 ml-1">
                              (Only supports 5s or 10s)
                            </div>
                          </div>
                          <span className="text-purple-400 font-medium text-xs px-2 py-1 bg-purple-900/30 rounded-full border border-purple-800/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                            {duration}s
                          </span>
                        </div>
                        <div className="p-3 bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700 shadow-md">
                          {/* Using radio buttons instead of slider for exact value selection */}
                          <RadioGroup
                            value={String(duration)}
                            onValueChange={(value) => setDuration(parseInt(value))}
                            className="flex justify-center gap-8 py-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="5" id="duration-5" />
                              <Label htmlFor="duration-5" className="text-white">5 seconds</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="10" id="duration-10" />
                              <Label htmlFor="duration-10" className="text-white">10 seconds</Label>
                            </div>
                          </RadioGroup>
                          <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span className="text-center w-full">Only 5s or 10s durations are supported</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Advanced Settings - Collapsible */}
                      <div className="group mt-3">
                        <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}>
                          <div className="flex items-center gap-2 transition-all group-hover:translate-x-1 duration-300">
                            <Settings className={`h-4 w-4 text-purple-400 ${isAdvancedOpen ? 'animate-spin-slow' : 'group-hover:animate-pulse'}`} />
                            <h3 className="font-medium text-white text-sm uppercase tracking-wider group-hover:text-purple-300">Advanced Settings</h3>
                          </div>
                          <span className={`transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`}>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </div>
                        
                        {isAdvancedOpen && (
                          <div className="p-3 bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700 shadow-md space-y-3">
                            {/* Advanced settings in a grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Frames */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <Label className="text-xs text-gray-300">Frames</Label>
                                  <span className="text-xs text-purple-400">{numFrames}</span>
                                </div>
                                <Slider 
                                  min={60}
                                  max={240}
                                  step={15}
                                  value={[numFrames]}
                                  onValueChange={(value) => setNumFrames(value[0])}
                                  className="py-1"
                                />
                              </div>
                              
                              {/* Steps */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <Label className="text-xs text-gray-300">Steps</Label>
                                  <span className="text-xs text-purple-400">{numSteps}</span>
                                </div>
                                <Slider 
                                  min={15}
                                  max={50}
                                  step={5}
                                  value={[numSteps]}
                                  onValueChange={(value) => setNumSteps(value[0])}
                                  className="py-1"
                                />
                              </div>
                              
                              {/* Motion Scale */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <Label className="text-xs text-gray-300">Motion Scale</Label>
                                  <span className="text-xs text-purple-400">{motionScale.toFixed(1)}</span>
                                </div>
                                <Slider 
                                  min={0.1}
                                  max={1.0}
                                  step={0.1}
                                  value={[motionScale]}
                                  onValueChange={(value) => setMotionScale(value[0])}
                                  className="py-1"
                                />
                              </div>
                              
                              {/* Guidance */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <Label className="text-xs text-gray-300">Guidance</Label>
                                  <span className="text-xs text-purple-400">{guidance}</span>
                                </div>
                                <Slider 
                                  min={5}
                                  max={40}
                                  step={1}
                                  value={[guidance]}
                                  onValueChange={(value) => setGuidance(value[0])}
                                  className="py-1"
                                />
                              </div>
                              
                              {/* Time Scale */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <Label className="text-xs text-gray-300">Time Scale</Label>
                                  <span className="text-xs text-purple-400">{timeScale.toFixed(1)}</span>
                                </div>
                                <Slider 
                                  min={0.5}
                                  max={2.0}
                                  step={0.1}
                                  value={[timeScale]}
                                  onValueChange={(value) => setTimeScale(value[0])}
                                  className="py-1"
                                />
                              </div>
                              
                              {/* Seed */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <Label className="text-xs text-gray-300">Seed (optional)</Label>
                                  <span className="text-xs text-purple-400">{seed !== null ? seed : 'Random'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Slider 
                                    min={1}
                                    max={1000000}
                                    step={1}
                                    value={[seed !== null ? seed : 500000]}
                                    onValueChange={(value) => setSeed(value[0])}
                                    disabled={seed === null}
                                    className="py-1 flex-1"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 border-gray-700 bg-gray-800/40"
                                    onClick={() => setSeed(seed === null ? Math.floor(Math.random() * 1000000) : null)}
                                  >
                                    {seed === null ? 'Set' : 'Random'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {error && (
                      <div className="bg-red-900/30 border border-red-700 p-3 rounded-md text-red-200 text-sm">
                        {error}
                      </div>
                    )}
                    
                    <div className="flex flex-col space-y-2">
                      <Button 
                        type="submit" 
                        disabled={isProcessing || !file || !prompt.trim()}
                        className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white border-none h-12"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Video...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Video
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-gray-700 bg-gray-800/40 text-gray-300 h-10"
                        onClick={resetForm}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset Form
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">Generated Video</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={resetForm}
                        className="hover:bg-gray-800/60 text-gray-400"
                      >
                        <X className="h-4 w-4 mr-1" />
                        New Video
                      </Button>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Prompt</h4>
                      <p className="text-white bg-gray-800/60 rounded-md p-2 text-sm">{prompt}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-gray-400 mb-1">Model</h4>
                        <p className="text-white">{modelVersion}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-400 mb-1">Aspect Ratio</h4>
                        <p className="text-white">{aspectRatio}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-400 mb-1">Duration</h4>
                        <p className="text-white">{duration} seconds</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-400 mb-1">Frames</h4>
                        <p className="text-white">{numFrames} frames</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleDownload}
                      className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white border-none"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Video
                    </Button>
                  </div>
                )}
              </CardContent>
              
              {isProcessing && (
                <CardFooter className="border-t border-gray-800 px-6 py-4">
                  <div className="w-full space-y-2">
                    <ProgressWithTimer 
                      value={progress} 
                      startTime={processingStartTime || undefined}
                      message="Generating your video..."
                      showCompletionEstimate={true}
                      className="h-2 bg-gray-700"
                    />
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
          
          {/* Right side - Preview */}
          <div className="lg:col-span-7">
            <Card className="border-gray-700 bg-black/40 backdrop-blur-sm h-full flex flex-col">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-purple-400" />
                  <span className="bg-gradient-to-r from-purple-400 to-cyan-400 text-transparent bg-clip-text">
                    Video Preview
                  </span>
                </CardTitle>
                <CardDescription>
                  {generatedVideoUrl 
                    ? "Your generated animation is ready to view." 
                    : "This is where your animation will appear after generation."}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6 flex-1 flex flex-col justify-center items-center">
                {generatedVideoUrl ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="relative rounded-lg overflow-hidden w-full max-w-3xl mx-auto shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                      <video 
                        ref={videoRef}
                        src={generatedVideoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className="w-full aspect-video bg-black/80"
                      />
                    </div>
                  </div>
                ) : isProcessing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <LoadingWithTimer 
                      message="Transforming your image into video..."
                      startTime={processingStartTime || undefined}
                      size="lg"
                      timerFormat="verbose"
                      centered
                      className="text-center"
                    />
                    <p className="text-sm text-gray-400 mt-4 max-w-md text-center">
                      This process typically takes 20-40 seconds depending on the complexity of your request
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-6 max-w-lg">
                    <div className="w-32 h-32 mx-auto">
                      <BrainVideoAnimation width={150} height={150} />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white mb-2">Ready to Create</h3>
                      <p className="text-gray-400 mb-6">
                        Configure your settings on the left panel, then generate a video to see it appear here.
                      </p>
                      
                      {!imagePreview && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-white">Examples:</p>
                          <div className="w-full max-w-2xl mx-auto">
                            <VideoExamplesPlayer 
                              videos={videoExamples}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Video History (Displayed when activeTab is 'history') */}
        <div className={`${activeTab === 'history' ? '' : 'hidden'}`}>
          <Card className="border-gray-700 bg-black/40 backdrop-blur-sm">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-400" />
                <span className="bg-gradient-to-r from-purple-400 to-cyan-400 text-transparent bg-clip-text">
                  Your Video History
                </span>
              </CardTitle>
              <CardDescription>
                Browse and reuse your previously generated videos.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              {videoHistory.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {videoHistory.map((video) => (
                    <VideoHistoryItem 
                      key={video.id} 
                      video={video} 
                      onSelect={() => loadHistoryVideo(video)}
                      onDelete={() => deleteHistoryVideo(video.id)}
                      onAddToStock={() => addHistoryVideoToStock(video.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-800/60 rounded-full mx-auto flex items-center justify-center">
                    <History className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium text-white mt-4 mb-2">No Videos Yet</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    You haven't created any videos yet. Generate your first video to see it appear in your history.
                  </p>
                  <Button
                    onClick={() => setActiveTab('create')}
                    className="mt-6 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white border-none"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Create Your First Video
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    <AuthModal 
      open={showAuthModal}
      onOpenChange={setShowAuthModal}
      defaultTab="register"
      description="Sign up to get 100 free gold coins and start creating AI videos!"
    />
    </>
  );
}