import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Upload, 
  Download, 
  Sparkles, 
  Image as ImageIcon, 
  Film, 
  Wand2, 
  Coins,
  Info,
  Clock,
  Camera,
  Palette
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

// Star component for background effects
const Star = ({ style }: { style?: React.CSSProperties }) => {
  return (
    <div 
      className="absolute rounded-full bg-purple-300"
      style={{
        width: `${2 + Math.random() * 4}px`,
        height: `${2 + Math.random() * 4}px`,
        opacity: 0.7,
        animation: `twinkle ${3 + Math.random() * 7}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 5}s`,
        ...style
      }}
    />
  );
};

// Glow effect component
const GlowEffect = ({ className, color = "purple" }: { className?: string, color?: string }) => {
  const colorMap: Record<string, string> = {
    purple: "rgba(147, 51, 234, 0.4)",
    cyan: "rgba(6, 182, 212, 0.4)",
    pink: "rgba(219, 39, 119, 0.4)",
  };
  
  return (
    <div 
      className={`absolute rounded-full blur-3xl ${className}`} 
      style={{ 
        background: colorMap[color] || colorMap.purple,
        animation: "pulse 8s ease-in-out infinite alternate",
      }}
    />
  );
};

// Example component
const ExampleCard = ({ 
  title, 
  description, 
  imageUrl, 
  videoUrl, 
  onClick 
}: { 
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  onClick: () => void; 
}) => {
  return (
    <div 
      className="rounded-lg overflow-hidden border border-gray-700 cursor-pointer hover:border-purple-500 transition-all hover:shadow-lg hover:shadow-purple-900/30 bg-gray-900/40"
      onClick={onClick}
    >
      <div className="aspect-w-16 aspect-h-9 relative">
        <div className="p-3 absolute inset-0 flex flex-col">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-full">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-medium text-white">{title}</h3>
          </div>
          <div className="flex-grow flex items-center justify-center space-x-4">
            <div className="bg-black/30 rounded p-2 w-24 h-24 flex items-center justify-center">
              <img src={imageUrl} alt="Before" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="text-purple-400">→</div>
            <div className="bg-black/30 rounded p-2 w-24 h-24 flex items-center justify-center">
              <video
                src={videoUrl}
                className="max-w-full max-h-full"
                muted
                loop
                autoPlay
                playsInline
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{description}</p>
        </div>
      </div>
    </div>
  );
};

// Animation style card component
const AnimationStyleCard = ({ 
  id, 
  name, 
  description, 
  selected, 
  onClick 
}: { 
  id: string;
  name: string;
  description: string;
  selected: boolean;
  onClick: () => void; 
}) => {
  return (
    <div 
      className={`p-4 rounded-lg cursor-pointer transition-all ${
        selected 
          ? 'bg-gradient-to-br from-purple-900/80 to-gray-900 border border-purple-500 shadow-lg shadow-purple-900/20' 
          : 'bg-gray-800/60 border border-gray-700 hover:bg-gray-800'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`mr-3 rounded-full p-2 ${selected ? 'bg-purple-600' : 'bg-gray-700'}`}>
            <Palette className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className={`font-medium ${selected ? 'text-white' : 'text-gray-200'}`}>{name}</h3>
            <p className={`text-xs ${selected ? 'text-purple-200' : 'text-gray-400'}`}>{description}</p>
          </div>
        </div>
        {selected && (
          <div className="ml-2 text-purple-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

const NewAIVideoMagicPage = () => {
  // Image and prompt state
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [animationStyle, setAnimationStyle] = useState('realistic');
  const [duration, setDuration] = useState(5);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  
  // Visual effects state
  const [stars, setStars] = useState<Array<{ id: number, x: string, y: string, delay: string }>>([]);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Toast notifications
  const { toast } = useToast();
  
  // Animation styles
  const animationStyles = [
    { id: 'realistic', name: 'Realistic', description: 'Natural, lifelike motion' },
    { id: 'artistic', name: 'Artistic', description: 'Creative, stylized animation' },
    { id: 'cinematic', name: 'Cinematic', description: 'Movie-quality transitions' },
    { id: 'dramatic', name: 'Dramatic', description: 'Bold, impactful movements' }
  ];
  
  // Example cards data
  const examples = [
    {
      title: 'Portrait Animation',
      description: 'Subtle facial movements and expressions',
      imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
      videoUrl: 'https://d3vdg3wkkdlg7q.cloudfront.net/portrait-animation.mp4',
      prompt: 'Add subtle facial expressions and gentle head movements'
    },
    {
      title: 'Nature Animation',
      description: 'Dynamic landscape with flowing water and rustling leaves',
      imageUrl: 'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
      videoUrl: 'https://d3vdg3wkkdlg7q.cloudfront.net/nature-animation.mp4',
      prompt: 'Add flowing water, rustling leaves, and birds flying in the sky'
    },
    {
      title: 'Product Showcase',
      description: 'Rotating product with spotlight effects',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
      videoUrl: 'https://d3vdg3wkkdlg7q.cloudfront.net/product-animation.mp4',
      prompt: 'Slowly rotate product with professional lighting effects'
    }
  ];
  
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setImagePreview(previewUrl);
    setFile(selectedFile);
    setError(null);
    
    // Clean up the old preview URL if it exists
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };
  
  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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
      setImagePreview(previewUrl);
      setFile(droppedFile);
      setError(null);
      
      // Clean up the old preview URL if it exists
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    setIsProcessing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('prompt', prompt);
    formData.append('style', animationStyle);
    formData.append('duration', duration.toString());
    
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
      setTimeout(() => {
        setGeneratedVideoUrl(data.videoUrl);
        setIsProcessing(false);
        
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
  };
  
  // Handle downloading the generated video
  const handleDownload = () => {
    if (generatedVideoUrl) {
      const a = document.createElement('a');
      a.href = generatedVideoUrl;
      a.download = 'animated-image.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  // Reset the form to start over
  const resetForm = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setFile(null);
    setImagePreview(null);
    setPrompt('');
    setAnimationStyle('realistic');
    setDuration(5);
    setGeneratedVideoUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Load example data
  const loadExample = (example: typeof examples[0]) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(example.imageUrl);
    setPrompt(example.prompt);
    setFile(null); // We can't access the actual file from the example
    setAnimationStyle('realistic');
    setError(null);
    
    toast({
      title: "Example loaded",
      description: "You can now customize the prompt and settings.",
    });
  };
  
  return (
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
      
      {/* Glow effects */}
      <GlowEffect className="h-64 w-64 top-20 -left-20" color="purple" />
      <GlowEffect className="h-96 w-96 bottom-10 -right-20" color="cyan" />
      <GlowEffect className="h-48 w-48 top-1/2 left-1/3" color="pink" />
      
      <div className="relative z-10">
        <h1 className="text-5xl font-bold text-center mb-3 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
          AI Video Magic
        </h1>
        
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <p className="text-gray-300 text-center text-lg">
            Transform your static images into dynamic videos with AI-powered animation
          </p>
          <Sparkles className="h-5 w-5 text-purple-400" />
        </div>
      
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main upload and form section */}
          <div className="space-y-8">
            <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800 shadow-xl relative overflow-hidden">
              {/* Card shimmer effect */}
              <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-purple-500 to-transparent" 
                   style={{ backgroundSize: '200% 100%', animation: 'shimmer 8s infinite' }}></div>
              
              <CardHeader className="relative">
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-500 animate-ping"></div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-400" />
                  Animate Your Images
                </CardTitle>
                <CardDescription>
                  Upload an image and describe how you want it to animate with AI
                </CardDescription>
                
                <div className="mt-2 p-2 bg-purple-900/30 border border-purple-800/50 rounded-md text-sm text-purple-200">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span>Each video generation costs 15 coins. Sign in to track your generations!</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
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
                    
                    <Tabs defaultValue="style" className="w-full">
                      <TabsList className="w-full bg-gray-800/60">
                        <TabsTrigger value="style" className="flex-1">Animation Style</TabsTrigger>
                        <TabsTrigger value="duration" className="flex-1">Duration</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="style" className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {animationStyles.map(style => (
                            <AnimationStyleCard 
                              key={style.id}
                              id={style.id}
                              name={style.name}
                              description={style.description}
                              selected={animationStyle === style.id}
                              onClick={() => setAnimationStyle(style.id)}
                            />
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="duration" className="mt-4">
                        <div className="space-y-4 p-4 bg-gray-800/60 rounded-lg">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Video Duration: {duration} seconds
                            </Label>
                            <span className="text-xs text-gray-400">(3-15 seconds)</span>
                          </div>
                          
                          <Slider 
                            min={3}
                            max={15}
                            step={1}
                            value={[duration]}
                            onValueChange={(value) => setDuration(value[0])}
                            className="py-4"
                          />
                          
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>3s</span>
                            <span>15s</span>
                          </div>
                          
                          <p className="text-sm text-gray-400 mt-2">
                            <Info className="h-3 w-3 inline mr-1" />
                            Longer durations may result in more detailed animations but take longer to generate
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    {error && (
                      <div className="p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
                        {error}
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      disabled={isProcessing || !imagePreview || !prompt.trim()}
                      className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Video...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Create Animation
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg overflow-hidden border border-gray-700">
                      <video 
                        controls 
                        className="w-full h-auto" 
                        src={generatedVideoUrl}
                        autoPlay
                        loop
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    
                    <div className="flex gap-3 flex-wrap">
                      <Button 
                        onClick={handleDownload}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Video
                      </Button>
                      
                      <Button 
                        onClick={resetForm}
                        variant="outline"
                        className="flex-1 border-gray-700 hover:bg-gray-800"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Create Another
                      </Button>
                    </div>
                    
                    <div className="mt-4 p-3 bg-gray-800/60 rounded-md border border-gray-700">
                      <h4 className="font-medium text-white mb-1">Generation Details</h4>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-gray-400">Style:</div>
                        <div className="text-gray-200">{animationStyle}</div>
                        <div className="text-gray-400">Duration:</div>
                        <div className="text-gray-200">{duration} seconds</div>
                        <div className="text-gray-400">Prompt:</div>
                        <div className="text-gray-200">{prompt}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Generating your video...</span>
                      <span className="text-purple-400">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-gray-500 animate-pulse">This may take up to 60 seconds depending on complexity</p>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="text-sm text-gray-400">
                <p>For best results, use high-quality images with clear subjects and detailed prompts.</p>
              </CardFooter>
            </Card>
          </div>
          
          {/* Examples and information section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-3 flex items-center text-white">
                <Sparkles className="h-5 w-5 mr-2 text-purple-400" />
                Examples
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {examples.map((example, index) => (
                  <ExampleCard 
                    key={index}
                    title={example.title}
                    description={example.description}
                    imageUrl={example.imageUrl}
                    videoUrl={example.videoUrl}
                    onClick={() => loadExample(example)}
                  />
                ))}
              </div>
            </div>
            
            <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Tips for Better Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <div className="bg-purple-900/50 p-1 rounded-full h-5 w-5 flex items-center justify-center mt-0.5">
                      <span className="text-xs text-purple-300">1</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Use high-quality images</span>
                      <p className="text-gray-400">Clear, well-lit images with good resolution work best</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <div className="bg-purple-900/50 p-1 rounded-full h-5 w-5 flex items-center justify-center mt-0.5">
                      <span className="text-xs text-purple-300">2</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Be specific in your prompts</span>
                      <p className="text-gray-400">Describe the exact movements and effects you want to see</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <div className="bg-purple-900/50 p-1 rounded-full h-5 w-5 flex items-center justify-center mt-0.5">
                      <span className="text-xs text-purple-300">3</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Match style to content</span>
                      <p className="text-gray-400">Choose animation styles that complement your image subject</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <div className="bg-purple-900/50 p-1 rounded-full h-5 w-5 flex items-center justify-center mt-0.5">
                      <span className="text-xs text-purple-300">4</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Experiment with duration</span>
                      <p className="text-gray-400">Longer videos allow for more detailed animation sequences</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAIVideoMagicPage;