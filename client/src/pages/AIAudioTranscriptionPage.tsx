import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, Mic, FileAudio, Headphones, Copy, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIAudioTranscriptionPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const { toast } = useToast();
  const { user, isPartner } = useAuth();
  const [coins, setCoins] = useState(0);
  
  const TRANSCRIPTION_COST = 10; // Cost in coins to transcribe audio
  
  // Fetch user's coins
  useEffect(() => {
    if (user) {
      fetch('/api/user/coins')
        .then(res => res.json())
        .then(data => {
          if (data.coins) {
            setCoins(data.coins);
          }
        })
        .catch(err => console.error('Failed to fetch coins:', err));
    }
  }, [user]);
  
  useEffect(() => {
    document.title = "AI Audio Transcription - Jesko";
  }, []);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setErrorMessage(null);
    
    if (file) {
      // Check file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt || '')) {
        setErrorMessage("Please upload a valid audio file (MP3, WAV, OGG, M4A).");
        setSelectedFile(null);
        return;
      }
      
      // Check file size (max 16MB)
      if (file.size > 16 * 1024 * 1024) {
        setErrorMessage("File size exceeds 16MB limit. Please upload a smaller file.");
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
    }
  };
  
  const handleTranscribe = async () => {
    if (!selectedFile) return;
    
    // Check if user has enough coins
    if (user && coins < TRANSCRIPTION_COST) {
      toast({
        title: "Insufficient coins",
        description: `You need ${TRANSCRIPTION_COST} coins to transcribe audio. Please purchase more coins.`,
        variant: "destructive"
      });
      return;
    }
    
    setIsTranscribing(true);
    setErrorMessage(null);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      // We need to call the Flask server API endpoint
      // The URL can be relative if the API is proxied through the main server, or absolute for direct connection
      const transcriptionUrl = '/transcription/api/transcribe';
      const response = await fetch(transcriptionUrl, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.error) {
        setErrorMessage(data.error);
      } else {
        setTranscriptionResult(data.transcription);
        
        // Deduct coins if the user is authenticated
        if (user) {
          try {
            await fetch('/api/coins/use', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                coins: TRANSCRIPTION_COST, 
                reason: 'Audio transcription' 
              })
            });
            // Update local coin state
            setCoins(prevCoins => prevCoins - TRANSCRIPTION_COST);
          } catch (error) {
            console.error('Failed to update coins:', error);
          }
        }
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setErrorMessage("An error occurred while processing your request. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTranscriptionResult(null);
    setErrorMessage(null);
    setCopySuccess(false);
    
    // Reset the file input
    const fileInput = document.getElementById('audio-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  const copyToClipboard = async () => {
    if (transcriptionResult) {
      try {
        await navigator.clipboard.writeText(transcriptionResult);
        setCopySuccess(true);
        
        // Reset copy success after 2 seconds
        setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/80">
      <nav className="bg-[#0F172A] p-4 border-b border-[#1E293B]">
        <div className="container mx-auto">
          <div className="text-xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
            Jesko - AI Audio Transcription
          </div>
        </div>
      </nav>
      
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">
            AI Audio Transcription
          </h1>
          
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Convert your audio files to text using powerful AI. Perfect for meetings, interviews, podcasts, and more.
          </p>
          
          {user && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-muted">
                <span className="font-medium">Available Coins:</span>
                <span className="ml-2 font-bold text-purple-600">{coins}</span>
                
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
                      <Info className="h-4 w-4" />
                      <span className="sr-only">Info</span>
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Transcription Costs</h4>
                      <p className="text-sm text-muted-foreground">
                        Each audio transcription costs {TRANSCRIPTION_COST} coins. 
                        Transcriptions are limited to 16MB per file.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          )}
          
          <Card className="border-2 border-muted shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <FileAudio className="mr-2 h-5 w-5 text-purple-500" />
                Audio Transcription
              </CardTitle>
              <CardDescription>
                Upload your audio file to convert speech to text
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {!transcriptionResult ? (
                <>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${errorMessage ? 'border-red-300 bg-red-50' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50'}`}
                    onClick={() => document.getElementById('audio-file')?.click()}
                  >
                    <input
                      type="file"
                      id="audio-file"
                      className="hidden"
                      accept=".mp3,.wav,.ogg,.m4a"
                      onChange={handleFileChange}
                      disabled={isTranscribing}
                    />
                    
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="rounded-full bg-purple-100 p-3">
                        <Headphones className="h-6 w-6 text-purple-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MP3, WAV, OGG or M4A (max. 16MB)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {errorMessage && (
                    <div className="text-red-500 text-sm text-center">
                      {errorMessage}
                    </div>
                  )}
                  
                  <div className="flex justify-center pt-4">
                    <Button 
                      size="lg"
                      disabled={!selectedFile || isTranscribing}
                      onClick={handleTranscribe}
                      className="relative overflow-hidden group"
                    >
                      {isTranscribing ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                          Transcribing...
                        </div>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Transcribe Audio
                          <span className="absolute inset-0 rounded-md translate-y-[105%] bg-white/10 group-hover:translate-y-0 transition-transform duration-300"></span>
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {!user && (
                    <p className="text-xs text-center text-muted-foreground mt-4">
                      Sign in to save your transcriptions and get more features.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Transcription Result</h3>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={resetForm}
                      >
                        New Transcription
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={copyToClipboard}
                        className="flex items-center"
                      >
                        {copySuccess ? (
                          <>
                            <CheckCircle className="mr-1 h-4 w-4 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-md">
                    <p className="whitespace-pre-wrap">{transcriptionResult}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border border-muted bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Transcription Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-muted/50">
                  <div className="rounded-full bg-purple-100 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                      <path d="M21 15V6"></path>
                      <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>
                      <path d="M12 12H3"></path>
                      <path d="M16 6H3"></path>
                      <path d="M12 18H3"></path>
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium">Multiple Languages</h3>
                  <p className="text-xs text-center text-muted-foreground">
                    Transcribe audio in multiple languages and accents
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-muted/50">
                  <div className="rounded-full bg-purple-100 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium">Secure Processing</h3>
                  <p className="text-xs text-center text-muted-foreground">
                    Your audio files are processed securely
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-muted/50">
                  <div className="rounded-full bg-purple-100 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium">High Accuracy</h3>
                  <p className="text-xs text-center text-muted-foreground">
                    State-of-the-art AI accuracy for clear speech
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <footer className="bg-[#0F172A] p-6 mt-12">
        <div className="container mx-auto text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Jesko. All rights reserved.</p>
          <p className="mt-2">Powered by OpenAI Whisper API</p>
        </div>
      </footer>
    </div>
  );
}