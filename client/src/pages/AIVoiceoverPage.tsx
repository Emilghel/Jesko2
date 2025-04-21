import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, Mic, Speaker, Volume2, VolumeX, Play, Pause, RefreshCw, Download, Coins, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CoinBalance from '@/components/CoinBalance';
import AuthModal from '@/components/AuthModal';
import AdvancedStarryBackground from '@/components/AdvancedStarryBackground';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: {
    accent?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
}

// Define response interface for voice generation
interface VoiceGenerationResponse {
  audioUrl: string;
  message: string;
  fileName: string;
  text: string;
}

export default function AIVoiceoverPage() {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [stability, setStability] = useState<number>(0.5);
  const [similarity, setSimilarity] = useState<number>(0.75);
  const [speed, setSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [filteredVoices, setFilteredVoices] = useState<ElevenLabsVoice[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [insufficientCoins, setInsufficientCoins] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch user's coin balance
  const { data: coinData } = useQuery({
    queryKey: ['/api/user/coins'],
    queryFn: async () => {
      console.log('Fetching user coin balance');
      const res = await apiRequest('GET', '/api/user/coins');
      return res.json();
    }
  });

  // Fetch available voices
  console.log('Initializing ElevenLabs voice query with endpoint: /api/elevenlabs/voices');
  const { data: voices, isLoading: loadingVoices, error: voicesError } = useQuery({
    queryKey: ['/api/elevenlabs/voices'],
    queryFn: async () => {
      console.log('Executing ElevenLabs voice query');
      const res = await apiRequest('GET', '/api/elevenlabs/voices');
      console.log('ElevenLabs API response received:', res.status);
      return res.json();
    },
  });

  // Calculate word count when text changes
  useEffect(() => {
    if (!text) {
      setWordCount(0);
      setInsufficientCoins(false);
      return;
    }
    
    // Calculate number of words in the text
    const count = text.trim().split(/\s+/).length;
    setWordCount(count);
    
    // Check if user has enough coins
    if (coinData && coinData.coins < count) {
      setInsufficientCoins(true);
    } else {
      setInsufficientCoins(false);
    }
  }, [text, coinData]);

  // Filter voices based on search query
  useEffect(() => {
    if (!voices) return;

    let filtered = voices;
    
    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((voice: ElevenLabsVoice) => 
        voice.name.toLowerCase().includes(query) ||
        voice.description?.toLowerCase().includes(query) ||
        voice.labels?.gender?.toLowerCase().includes(query) ||
        voice.labels?.accent?.toLowerCase().includes(query)
      );
    }
    
    setFilteredVoices(filtered);
    
    // If we don't have a selected voice yet but have voices, select the first one
    if (!selectedVoice && filtered.length > 0) {
      setSelectedVoice(filtered[0].voice_id);
    }
  }, [voices, searchQuery, selectedVoice]);

  // Generate voice mutation
  const generateVoiceMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        // We'll handle this in the UI with the auth modal, not as an error
        return null;
      }
      
      if (!text || !selectedVoice) {
        throw new Error('Please enter text and select a voice');
      }

      if (insufficientCoins) {
        throw new Error(`Insufficient coins. You need ${wordCount} coins, but you only have ${coinData?.coins}.`);
      }

      const res = await apiRequest('POST', '/api/voiceover/use', {
        text,
        voice_id: selectedVoice,
        stability,
        similarity_boost: similarity,
        speed
      });
      
      return res.json();
    },
    onSuccess: (data: VoiceGenerationResponse) => {
      setAudioUrl(data.audioUrl);
      setGeneratedTextForFile(text); // Store the text for the filename
      
      // Invalidate coin balance query to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/user/coins'] });
      
      toast({
        title: 'Voice generated successfully',
        description: `Used ${wordCount} coins. Your audio is now playing.`,
        variant: 'default',
      });
      
      // Auto-play the audio when generated
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error('Audio autoplay error:', error);
            toast({
              title: 'Autoplay error',
              description: 'Could not automatically play audio. Please click play manually.',
              variant: 'destructive',
            });
          });
        }
      }, 500); // Small delay to ensure audio element is updated
    },
    onError: (error: Error) => {
      if (error.message.includes('Insufficient coins')) {
        toast({
          title: 'Insufficient coins',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to generate voice',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  });

  // Handle audio play/pause
  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Audio playback error:', error);
        toast({
          title: 'Playback error',
          description: error instanceof Error ? error.message : 'Could not play audio',
          variant: 'destructive',
        });
      });
    }
  };

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle audio play/pause state changes
  useEffect(() => {
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('pause', handlePause);
      audioElement.addEventListener('ended', handleEnded);
    }
    
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('play', handlePlay);
        audioElement.removeEventListener('pause', handlePause);
        audioElement.removeEventListener('ended', handleEnded);
      }
    };
  }, []);

  // Keep track of the generated text for download
  const [generatedTextForFile, setGeneratedTextForFile] = useState<string>('');

  // Direct download mutation
  const downloadVoiceMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        // We'll handle this in the UI with the auth modal, not as an error
        return null;
      }
      
      if (insufficientCoins) {
        throw new Error(`Insufficient coins. You need ${wordCount} coins, but you only have ${coinData?.coins}.`);
      }
      
      // Create the same voice but tell the server it's for download
      const res = await apiRequest('POST', '/api/voiceover/use', {
        text,
        voice_id: selectedVoice,
        stability,
        similarity_boost: similarity,
        speed,
        download: true // Signal this is a download request
      });
      
      return res.json();
    },
    onSuccess: (data: VoiceGenerationResponse) => {
      // Create a direct download link with download query param
      window.location.href = `${data.audioUrl}?download=true`;
      
      // Invalidate coin balance query to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/user/coins'] });
      
      toast({
        title: "Download started",
        description: `Used ${wordCount} coins. Your audio file is downloading.`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error('Error downloading audio:', error);
      if (error.message.includes('Insufficient coins')) {
        toast({
          title: 'Insufficient coins',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: "Download failed",
          description: "There was an error downloading the audio file.",
          variant: "destructive",
        });
      }
    }
  });
  
  // Trigger the download process
  const downloadAudio = () => {
    // Check if user is authenticated
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    if (!text || !selectedVoice) {
      toast({
        title: "Cannot download",
        description: "Please generate a voice first.",
        variant: "destructive",
      });
      return;
    }
    
    downloadVoiceMutation.mutate();
  };

  // Languages represented in the voices
  const languages = [
    { code: 'all', name: 'All Languages' },
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
  ];

  // Sample text options
  const sampleTexts = [
    "Welcome to AI Voiceover. Convert your text to natural-sounding speech in seconds.",
    "Hello world! This is a demo of the text-to-speech capabilities.",
    "AI technology has transformed how we interact with computers and automate tasks.",
    "Your personal AI assistant is ready to help with tasks, answer questions, and provide information."
  ];

  const useSampleText = (index: number) => {
    setText(sampleTexts[index]);
  };

  // Generate a new voice when user clicks the button
  const handleGenerateVoice = () => {
    // Check if user is authenticated
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    generateVoiceMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#0A0F16] text-white pt-16 pb-16 relative">
      <AdvancedStarryBackground
        density={25}
        enableTAA={true}
        enableSSAO={true}
        enableHDR={true}
        enableBloom={true}
        depth={2}
      />
      {/* Navigation header */}
      <header className="fixed top-0 left-0 right-0 bg-[#0A0F16]/90 backdrop-blur-md border-b border-[#1E293B] z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/home">
            <div className="flex items-center gap-2 cursor-pointer">
              <ArrowLeft className="h-5 w-5 text-gray-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
                WarmLeadNetwork AI
              </span>
            </div>
          </Link>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 pt-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
            Convert Text to Speech Using AI
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Human-like voiceovers for your videos, content, and more — powered by ElevenLabs
          </p>
        </div>
        
        {/* Text input and generation section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2">
            <Card className="bg-[#0F172A]/70 backdrop-blur-md border-[#1E293B] shadow-xl">
              <CardHeader className="flex justify-between items-start">
                <div>
                  <CardTitle>Enter Your Text</CardTitle>
                  <CardDescription>Type or paste the text you want to convert to speech</CardDescription>
                </div>
                <div className="flex items-center bg-[#141B29] px-3 py-1.5 rounded-full border border-[#1E293B]">
                  <Coins className="w-4 h-4 text-amber-400 mr-2" />
                  <span className="text-amber-400 font-medium">{coinData?.coins || 0}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Textarea 
                  placeholder="Type or paste your text here..." 
                  className="min-h-[200px] bg-[#141B29] border-[#1E293B] text-white"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                
                <div className="flex flex-wrap gap-2">
                  {sampleTexts.map((_, index) => (
                    <Button 
                      key={index} 
                      variant="outline" 
                      size="sm"
                      onClick={() => useSampleText(index)}
                      className="text-xs border-[#1E293B] hover:bg-[#1E293B]/50"
                    >
                      Sample Text {index + 1}
                    </Button>
                  ))}
                </div>
                
                {user && insufficientCoins && (
                  <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Insufficient Coins</AlertTitle>
                    <AlertDescription>
                      You need {wordCount} coins to generate this voiceover, but you only have {coinData?.coins}. 
                      <Link to="/ai-token-pricing" className="underline ml-1">
                        Buy more coins
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    <Coins className="inline-block mr-1 h-4 w-4 text-amber-400" /> Cost: {wordCount} coins
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleGenerateVoice}
                    disabled={!text || !selectedVoice || generateVoiceMutation.isPending || (user && insufficientCoins)}
                    className="flex-1 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90"
                  >
                    {generateVoiceMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Speaker className="mr-2 h-5 w-5" />
                        Generate Voice
                      </>
                    )}
                  </Button>
                  
                  {audioUrl && (
                    <Button
                      variant="outline"
                      onClick={downloadAudio}
                      className="border-[#1E293B] hover:bg-[#1E293B]/50"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="bg-[#0F172A]/70 backdrop-blur-md border-[#1E293B] shadow-xl">
              <CardHeader>
                <CardTitle>Voice Settings</CardTitle>
                <CardDescription>Customize your AI voice options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Language</label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="bg-[#141B29] border-[#1E293B] text-white">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141B29] border-[#1E293B] text-white">
                      {languages.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                          {language.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-gray-300">Voice</label>
                    <input
                      type="text"
                      placeholder="Search voices..."
                      className="px-2 py-1 text-xs bg-[#141B29] border border-[#1E293B] rounded text-white w-32"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="bg-[#141B29] border-[#1E293B] text-white">
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141B29] border-[#1E293B] text-white max-h-[300px]">
                      {loadingVoices ? (
                        <SelectItem value="loading" disabled>Loading voices...</SelectItem>
                      ) : voicesError ? (
                        <SelectItem value="error" disabled>Error loading voices</SelectItem>
                      ) : filteredVoices.length === 0 ? (
                        <SelectItem value="empty" disabled>No voices found</SelectItem>
                      ) : (
                        filteredVoices.map((voice) => (
                          <SelectItem key={voice.voice_id} value={voice.voice_id}>
                            {voice.name} {voice.description ? `(${voice.description})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Speed: {speed.toFixed(1)}x</label>
                    </div>
                    <Slider
                      value={[speed * 100]}
                      min={50}
                      max={200}
                      step={10}
                      onValueChange={(value) => setSpeed(value[0] / 100)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Stability: {stability.toFixed(2)}</label>
                    </div>
                    <Slider
                      value={[stability * 100]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(value) => setStability(value[0] / 100)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Similarity: {similarity.toFixed(2)}</label>
                    </div>
                    <Slider
                      value={[similarity * 100]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(value) => setSimilarity(value[0] / 100)}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {audioUrl && (
              <Card className="mt-6 bg-[#0F172A]/70 backdrop-blur-md border-[#1E293B] shadow-xl">
                <CardHeader>
                  <CardTitle>Generated Audio</CardTitle>
                  <CardDescription>Listen to your generated voiceover</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <audio ref={audioRef} src={audioUrl} className="hidden" />
                  
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={toggleAudio}
                      className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90 rounded-full w-12 h-12"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    
                    <div className="flex items-center flex-1 gap-2">
                      <Button
                        variant="ghost" 
                        size="icon"
                        className="text-gray-400"
                        onClick={() => setVolume(0)}
                      >
                        {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                      
                      <Slider
                        value={[volume * 100]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => setVolume(value[0] / 100)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}