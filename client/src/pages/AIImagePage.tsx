import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sparkles, Upload, ArrowRight, Download, Loader2, Coins, LogOut } from 'lucide-react';
import CoinBalance from '@/components/CoinBalance';
import BuyTokensButton from '@/components/BuyTokensButton';
import AuthModal from '@/components/AuthModal';
import { forceLogout } from '@/utils/force-logout';
import AdvancedStarryBackground from '@/components/AdvancedStarryBackground';

export default function AIImagePage() {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch user's coin balance
  const { data: coinData, isLoading: isLoadingCoins } = useQuery<{ coins: number }>({
    queryKey: ['/api/user/coins'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  
  const coinBalance = coinData?.coins || 0;
  const COST_PER_IMAGE = 5;
  const hasEnoughCoins = coinBalance >= COST_PER_IMAGE;
  
  // Image generation mutation
  const textToImageMutation = useMutation({
    mutationFn: async (prompt: string) => {
      // Get the auth token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Make a direct fetch request with proper Authorization header
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Image generation error:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to generate image');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/coins'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate image. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Image editing mutation
  const imageEditMutation = useMutation({
    mutationFn: async ({ prompt, file }: { prompt: string; file: File }) => {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('image', file);
      
      // Get the auth token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Make a direct fetch request with proper Authorization header
      const response = await fetch('/api/image/edit', {
        method: 'POST',
        headers: {
          // Don't set Content-Type header - browser sets it automatically with boundary for FormData
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include', // Include cookies with the request
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Image editing error:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to process image');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/coins'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Image Editing Failed',
        description: error.message || 'Failed to edit image. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const isLoading = textToImageMutation.isPending || imageEditMutation.isPending;
  const generatedImage = textToImageMutation.data?.imageUrl || imageEditMutation.data?.imageUrl || null;
  const promptUsed = textToImageMutation.data?.promptUsed || imageEditMutation.data?.promptUsed || '';
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file (JPEG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }
    
    setImageFile(file);
    
    // Create image preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated - Perform a fresh check to ensure current state
    const token = localStorage.getItem('auth_token');
    if (!token || !user) {
      console.log('User not authenticated, showing auth modal');
      setIsAuthModalOpen(true);
      return;
    }
    
    if (!prompt.trim()) {
      toast({
        title: 'Empty Prompt',
        description: 'Please enter a description for your image.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!hasEnoughCoins) {
      toast({
        title: 'Insufficient Coins',
        description: `You need ${COST_PER_IMAGE} coins to generate an image. You have ${coinBalance} coins.`,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Double check auth before sending request
      if (!user || !localStorage.getItem('auth_token')) {
        console.log('User state lost during processing, showing auth modal');
        setIsAuthModalOpen(true);
        return;
      }
      
      if (mode === 'text') {
        await textToImageMutation.mutateAsync(prompt);
      } else if (mode === 'image' && imageFile) {
        await imageEditMutation.mutateAsync({ prompt, file: imageFile });
      } else {
        toast({
          title: 'Missing Image',
          description: 'Please upload an image first.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      
      // Check if error is due to authentication
      if (error?.response?.status === 401) {
        console.log('Authentication error during image generation, showing auth modal');
        setIsAuthModalOpen(true);
      } else {
        toast({
          title: 'Generation Failed',
          description: error?.message || 'Failed to generate image',
          variant: 'destructive',
        });
      }
    }
  };
  
  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    
    // Create a new anchor element
    const downloadLink = document.createElement('a');
    
    // Ensure full URL path for the image
    // If the URL starts with http or https, use it directly
    // Otherwise, it's a relative path and we need to create a full URL
    const imageUrl = generatedImage.startsWith('http') 
      ? generatedImage 
      : `${window.location.origin}${generatedImage}`;
    
    console.log('Downloading image from URL:', imageUrl);
    downloadLink.href = imageUrl;
    
    // Set the file name
    const timestamp = new Date().getTime();
    downloadLink.download = `ai-image-${timestamp}.png`;
    
    // Append to the document, click it, then remove it
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    toast({
      title: 'Download Started',
      description: 'Your image is being downloaded.',
    });
  }, [generatedImage, toast]);
  
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-blue-950 to-black text-white p-4 md:p-8">
      <AdvancedStarryBackground
        density={25}
        enableTAA={true}
        enableSSAO={true}
        enableHDR={true}
        enableBloom={true}
        depth={2}
      />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text flex items-center">
              <Sparkles className="mr-2 h-8 w-8 text-blue-400" />
              AI Image Generator
            </h1>
            <p className="text-gray-300 mt-2">Create stunning images with the power of AI</p>
            
            {/* Test Button for clearing auth state */}
            <button 
              onClick={forceLogout}
              className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
            >
              <LogOut className="h-3 w-3" />
              Force Logout
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <CoinBalance />
            <BuyTokensButton />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input section */}
          <div className="relative">
            <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700 p-6 shadow-xl rounded-xl">
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <div className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="text"
                        value="text"
                        checked={mode === 'text'}
                        onChange={() => setMode('text')}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="text" className="cursor-pointer">Text to Image</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="image"
                        value="image"
                        checked={mode === 'image'}
                        onChange={() => setMode('image')}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="image" className="cursor-pointer">Image Variation</Label>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4 p-3 bg-blue-950/40 border border-blue-900 rounded-lg text-sm">
                  <p className="text-blue-300 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <strong>Two ways to generate images:</strong>
                  </p>
                  <ul className="mt-1 ml-6 list-disc text-gray-300">
                    <li><strong>Text to Image:</strong> Describe what you want, and AI will create it from scratch.</li>
                    <li><strong>Image Variation:</strong> Upload an image, and AI will create a creative variation of it.</li>
                  </ul>
                </div>
                
                {mode === 'image' && (
                  <div className="mb-6">
                    <Label htmlFor="image-upload" className="block mb-2">Upload Image</Label>
                    
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-60 object-contain border border-gray-700 rounded-lg mb-2" 
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-300">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP (Max 10MB)</p>
                      </div>
                    )}
                    
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </div>
                )}
                
                <div className="mb-6">
                  <Label htmlFor="prompt" className="block mb-2">
                    {mode === 'text' 
                      ? 'Describe your image in detail' 
                      : 'Describe the image for reference (used for tracking)'}
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder={mode === 'text' 
                      ? 'A medieval castle floating among clouds, illuminated by cosmic light...' 
                      : 'A creative variation of my uploaded image...'}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="h-40 bg-gray-900 border-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{prompt.length} characters</span>
                    <span>Cost: {COST_PER_IMAGE} coins</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Coins className="h-5 w-5 text-yellow-400" />
                    <span className="text-sm">
                      Your balance: <span className="font-bold">{coinBalance}</span> coins
                    </span>
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={(user && (!hasEnoughCoins || !prompt.trim() || (mode === 'image' && !imageFile))) || isLoading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-2 rounded-full relative overflow-hidden group"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Generate Image
                        <ArrowRight className="ml-2 h-4 w-4 inline-block group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                    <span className="absolute -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                  </Button>
                </div>
              </form>
            </Card>
          </div>
          
          {/* Output section */}
          <div className="relative">
            <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700 p-6 shadow-xl rounded-xl h-full flex flex-col">
              <h2 className="text-xl font-bold mb-4">Generated Image</h2>
              
              {generatedImage ? (
                <div className="flex flex-col flex-grow">
                  <div className="relative flex-grow flex items-center justify-center bg-black/30 rounded-lg mb-4 overflow-hidden p-2">
                    <img 
                      src={generatedImage} 
                      alt="AI Generated" 
                      className="max-w-full max-h-[500px] object-contain rounded shadow-glow animate-fade-in"
                    />
                    <div className="absolute inset-0 pointer-events-none border border-blue-500/50 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  </div>
                  
                  {promptUsed && (
                    <div className="mb-4">
                      <Label className="text-sm text-gray-400">Prompt Used:</Label>
                      <p className="text-sm text-gray-300 bg-gray-900/50 p-2 rounded">{promptUsed}</p>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleDownload}
                    className="bg-gradient-to-r from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Image
                  </Button>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-700 rounded-lg">
                  {isLoading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-10 w-10 text-blue-400 animate-spin mb-4" />
                      <p className="text-gray-300">Generating your masterpiece...</p>
                      <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
                    </div>
                  ) : (
                    <>
                      <Sparkles className="h-16 w-16 text-blue-500/30 mb-4" />
                      <h3 className="text-xl font-medium text-gray-300 mb-2">Your creation will appear here</h3>
                      <p className="text-gray-400">Fill out the form and click Generate to create your image</p>
                    </>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      
      <style>{`
        .shadow-glow {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes shine {
          100% {
            left: 125%;
          }
        }
        
        .animate-shine {
          animation: shine 1.5s;
        }
      `}</style>
    </div>
  );
}