import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import ImmersiveAudioVisualizer from '@/components/ImmersiveAudioVisualizer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  ArrowLeft
} from 'lucide-react';

export default function AudioVisualizationDemo() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [visualizationType, setVisualizationType] = useState<'circular' | 'wave' | 'bars' | 'particles'>('circular');
  const [primaryColor, setPrimaryColor] = useState<string>('#33C3BD');
  const [secondaryColor, setSecondaryColor] = useState<string>('#0075FF');
  const [interactive, setInteractive] = useState<boolean>(true);
  const [isUsingMic, setIsUsingMic] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const [showControls, setShowControls] = useState<boolean>(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Create audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      if (mediaStreamRef.current) {
        const tracks = mediaStreamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  // Handle play/pause audio
  const toggleAudio = async () => {
    if (!audioContextRef.current) return;
    
    // If using microphone, toggle it
    if (isUsingMic) {
      if (isPlaying) {
        stopMicrophone();
      } else {
        await startMicrophone();
      }
      return;
    }
    
    // Otherwise, toggle simulated audio
    if (isPlaying) {
      // Stop current source if any
      if (sourceNodeRef.current) {
        if ('stop' in sourceNodeRef.current) {
          (sourceNodeRef.current as AudioBufferSourceNode).stop();
        }
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start a simulated audio source (oscillator)
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(analyserRef.current!);
      analyserRef.current!.connect(audioContextRef.current.destination);
      
      oscillator.start();
      sourceNodeRef.current = oscillator as any;
      setIsPlaying(true);
    }
  };
  
  // Handle microphone input
  const toggleMicrophone = async () => {
    setIsUsingMic(!isUsingMic);
    
    // If turning on mic, make sure to start it if we're playing
    if (!isUsingMic && isPlaying) {
      // Stop current source
      if (sourceNodeRef.current) {
        if ('stop' in sourceNodeRef.current) {
          (sourceNodeRef.current as AudioBufferSourceNode).stop();
        }
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      
      // Start microphone
      await startMicrophone();
    } 
    // If turning off mic and playing, switch to oscillator
    else if (isUsingMic && isPlaying) {
      stopMicrophone();
      
      // Start oscillator
      if (audioContextRef.current) {
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
        
        gainNode.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(analyserRef.current!);
        analyserRef.current!.connect(audioContextRef.current.destination);
        
        oscillator.start();
        sourceNodeRef.current = oscillator as any;
      }
    }
  };
  
  // Start microphone input
  const startMicrophone = async () => {
    try {
      if (!audioContextRef.current) return;
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Create source from microphone
      const micSource = audioContextRef.current.createMediaStreamSource(stream);
      sourceNodeRef.current = micSource;
      
      // Connect to analyser (but not to destination to prevent feedback)
      micSource.connect(analyserRef.current!);
      
      setIsPlaying(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsUsingMic(false);
    }
  };
  
  // Stop microphone input
  const stopMicrophone = () => {
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    setIsPlaying(false);
  };
  
  // Update volume
  useEffect(() => {
    if (!audioContextRef.current || !sourceNodeRef.current || !analyserRef.current) return;
    
    // Only adjust volume for oscillator sources, not microphone
    if (!isUsingMic && sourceNodeRef.current instanceof AudioBufferSourceNode) {
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = volume;
      
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current.connect(gainNode);
      gainNode.connect(analyserRef.current);
    }
  }, [volume, isUsingMic]);
  
  // Analyze audio to get levels
  useEffect(() => {
    let animationFrameId: number;
    
    const analyzeAudio = () => {
      if (!analyserRef.current) {
        animationFrameId = requestAnimationFrame(analyzeAudio);
        return;
      }
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Get frequency data
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Normalize to 0-1 range and apply volume scaling
      const normalizedLevel = (average / 255) * (isUsingMic ? 1 : volume);
      setAudioLevel(isPlaying ? normalizedLevel : 0);
      
      animationFrameId = requestAnimationFrame(analyzeAudio);
    };
    
    analyzeAudio();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, isUsingMic, volume]);
  
  return (
    <div className="min-h-screen bg-[#0A0F16] text-white pt-16">
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
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowControls(!showControls)}
            className="text-gray-400 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 pt-6 pb-24">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
            Immersive Audio Visualization
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Experience real-time audio visualization with interactive features. Try different visualization types and interact with the waves using your mouse.
          </p>
        </div>
        
        {/* Visualizer container */}
        <div className="w-full overflow-hidden rounded-xl border border-[#1E293B] aspect-[16/9] md:aspect-[21/9] lg:aspect-video mb-8 relative shadow-lg">
          <div className="absolute inset-0 bg-[#080D14] border border-[#1E293B] overflow-hidden rounded-xl">
            <ImmersiveAudioVisualizer
              isActive={isPlaying}
              audioLevel={audioLevel}
              visualizationType={visualizationType}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              interactive={interactive}
              className="w-full h-full"
            />
          </div>
          
          {/* Floating playback controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-[#0A0F16]/80 backdrop-blur-md rounded-full border border-[#1E293B] shadow-lg">
            <Button
              variant="ghost" 
              size="icon"
              className={`rounded-full ${isUsingMic ? 'text-cyan-500' : 'text-gray-400'}`}
              onClick={toggleMicrophone}
            >
              {isUsingMic ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="default"
              size="icon"
              onClick={toggleAudio}
              className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90 rounded-full w-12 h-12"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <div className="flex items-center gap-2">
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
                className="w-24"
              />
            </div>
          </div>
        </div>
        
        {/* Controls panel */}
        {showControls && (
          <div className="bg-[#0F172A] rounded-xl border border-[#1E293B] p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-white">Visualization Settings</h2>
            
            <Tabs defaultValue="type" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="type">Visualization Type</TabsTrigger>
                <TabsTrigger value="colors">Colors</TabsTrigger>
                <TabsTrigger value="interaction">Interaction</TabsTrigger>
              </TabsList>
              
              <TabsContent value="type" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(['circular', 'wave', 'bars', 'particles'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={visualizationType === type ? "default" : "outline"}
                      className={visualizationType === type 
                        ? "bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90" 
                        : ""}
                      onClick={() => setVisualizationType(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
                
                <div className="bg-[#141B29] rounded-lg p-4 text-gray-300 text-sm">
                  <h3 className="font-semibold mb-2">About {visualizationType.charAt(0).toUpperCase() + visualizationType.slice(1)} Visualization</h3>
                  {visualizationType === 'circular' && (
                    <p>Circular visualization creates concentric rings that pulse with the audio. Interactive nodes respond to sound frequencies.</p>
                  )}
                  {visualizationType === 'wave' && (
                    <p>Wave visualization displays dynamic sound waves that ripple based on audio intensity. Mouse interaction creates unique wave patterns.</p>
                  )}
                  {visualizationType === 'bars' && (
                    <p>Bars visualization shows classic equalizer-style bars that react to audio frequencies. Hover near bars to see them respond to your movements.</p>
                  )}
                  {visualizationType === 'particles' && (
                    <p>Particles visualization creates a swarm of particles that flow and connect based on audio levels. Mouse interactions attract particles for unique patterns.</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="colors" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="primary-color" className="block mb-2">
                      Primary Color
                    </Label>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded border border-white/20" 
                        style={{ backgroundColor: primaryColor }}
                      />
                      <input 
                        id="primary-color"
                        type="color" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full rounded border border-[#1E293B] bg-[#141B29] p-1 h-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="secondary-color" className="block mb-2">
                      Secondary Color
                    </Label>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded border border-white/20" 
                        style={{ backgroundColor: secondaryColor }}
                      />
                      <input 
                        id="secondary-color"
                        type="color" 
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full rounded border border-[#1E293B] bg-[#141B29] p-1 h-10"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Preset Color Themes</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button 
                      variant="outline" 
                      className="border-[#33C3BD] hover:border-[#33C3BD]/80"
                      onClick={() => {
                        setPrimaryColor('#33C3BD');
                        setSecondaryColor('#0075FF');
                      }}
                    >
                      Cyan/Blue
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-[#8B5CF6] hover:border-[#8B5CF6]/80"
                      onClick={() => {
                        setPrimaryColor('#8B5CF6');
                        setSecondaryColor('#EC4899');
                      }}
                    >
                      Purple/Pink
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-[#10B981] hover:border-[#10B981]/80"
                      onClick={() => {
                        setPrimaryColor('#10B981');
                        setSecondaryColor('#3B82F6');
                      }}
                    >
                      Green/Blue
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-[#F59E0B] hover:border-[#F59E0B]/80"
                      onClick={() => {
                        setPrimaryColor('#F59E0B');
                        setSecondaryColor('#EF4444');
                      }}
                    >
                      Amber/Red
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="interaction" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="interactive-toggle" className="block font-medium">
                      Interactive Mode
                    </Label>
                    <p className="text-sm text-gray-400">Allow mouse interactions with the visualization</p>
                  </div>
                  <Switch
                    id="interactive-toggle"
                    checked={interactive}
                    onCheckedChange={setInteractive}
                  />
                </div>
                
                <div className="bg-[#141B29] rounded-lg p-4 text-gray-300 text-sm">
                  <h3 className="font-semibold mb-2">Interaction Tips</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Move your mouse over the visualization to see it respond</li>
                    <li>Try different visualization types for unique interaction patterns</li>
                    <li>The {visualizationType} visualization responds to your mouse movements by {
                      visualizationType === 'circular' ? 'connecting to the center point' :
                      visualizationType === 'wave' ? 'creating ripples in the waves' :
                      visualizationType === 'bars' ? 'amplifying nearby bars' :
                      'attracting nearby particles'
                    }</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}