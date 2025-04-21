import { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CheckCircle, 
  Music, 
  Volume2, 
  RefreshCw, 
  User, 
  Mic, 
  Headphones,
  AlertCircle,
  Search,
  XCircle
} from "lucide-react";
import { AudioWaveform } from './AudioWaveform';
import { Voice } from '@/contexts/AgentCreationContext';
import { playVoiceSound } from '@/utils/sounds';
import SimpleVoicePreview from './SimpleVoicePreview';

/**
 * Creates animated floating particles effect when the preview button is clicked
 * This adds a modern, interactive feel to the button interaction
 */
function createPreviewButtonParticles(e: React.MouseEvent<HTMLButtonElement>) {
  // Get the button that was clicked
  const button = e.currentTarget;
  
  // Get the particle container inside the button
  const particleContainer = button.querySelector('.preview-voice-button-particles-container');
  if (!particleContainer) return;
  
  // Get button dimensions and position for calculating particle positions
  const rect = button.getBoundingClientRect();
  
  // Get click position relative to the button
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Create 12 particles with random movement paths
  for (let i = 0; i < 12; i++) {
    // Create a particle element
    const particle = document.createElement('div');
    particle.classList.add('preview-button-particle');
    
    // Calculate randomized sizes for varied appearance
    const size = 4 + Math.random() * 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Set initial position variables
    particle.style.setProperty('--x', x.toString());
    particle.style.setProperty('--y', y.toString());
    
    // Set random destination vectors
    particle.style.setProperty('--destX', (Math.random() * 2 - 1).toString());
    particle.style.setProperty('--destY', (Math.random() * 2 - 1).toString());
    
    // Set random opacity for visual depth
    particle.style.setProperty('--opacity', (0.3 + Math.random() * 0.5).toString());
    
    // Add particle to container
    particleContainer.appendChild(particle);
    
    // Remove particle after animation completes
    setTimeout(() => {
      if (particleContainer.contains(particle)) {
        particleContainer.removeChild(particle);
      }
    }, 3000);
  }
}

// Custom SVG Icons for individual voices
const AriaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="1.5" />
    <path d="M8 9a6 3 0 0 1 8 0" stroke="white" strokeWidth="1.5" />
    <path d="M8 15l8-6" stroke="white" strokeWidth="1.5" />
    <path d="M16 15l-8-6" stroke="white" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1" />
    <circle cx="12" cy="12" r="1" fill="white" />
  </svg>
);

const RogerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
    <path d="M3 9h18" stroke="white" strokeWidth="1.5" />
    <circle cx="7.5" cy="15" r="1.5" fill="white" />
    <circle cx="12" cy="15" r="1.5" fill="white" />
    <circle cx="16.5" cy="15" r="1.5" fill="white" />
    <path d="M7.5 6h9" stroke="white" strokeWidth="1.5" />
  </svg>
);

const SarahIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" fill="#ec4899" stroke="#be185d" strokeWidth="1.5" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="white" strokeWidth="1.5" />
    <path d="M9 9h.01" stroke="white" strokeWidth="2" />
    <path d="M15 9h.01" stroke="white" strokeWidth="2" />
    <path d="M12 13.5v-3" stroke="white" strokeWidth="1.5" />
    <path d="M10 12h4" stroke="white" strokeWidth="1.5" />
  </svg>
);

const LauraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M18 8c0-3.5-2.5-6-6-6S6 4.5 6 8c0 4 3 6 6 9 3-3 6-5 6-9z" fill="#f472b6" stroke="#db2777" strokeWidth="1.5" />
    <path d="M12 18v2" stroke="#db2777" strokeWidth="1.5" />
    <path d="M9 14.5c0-1 1-2 3-2s3 1 3 2" stroke="white" strokeWidth="1.5" />
    <circle cx="9" cy="10" r="1" fill="white" />
    <circle cx="15" cy="10" r="1" fill="white" />
  </svg>
);

const CharlieIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <rect x="4" y="4" width="16" height="16" rx="2" fill="#f97316" stroke="#c2410c" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="5" fill="#fdba74" stroke="#c2410c" strokeWidth="1.5" />
    <path d="M15 9l-6 6" stroke="white" strokeWidth="1.5" />
    <path d="M9 9l6 6" stroke="white" strokeWidth="1.5" />
  </svg>
);

const GeorgeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <rect x="4" y="4" width="16" height="16" rx="4" fill="#0ea5e9" stroke="#0284c7" strokeWidth="1.5" />
    <circle cx="12" cy="10" r="3" fill="#7dd3fc" stroke="#0284c7" strokeWidth="1.5" />
    <path d="M6 20c0-3 3-5 6-5s6 2 6 5" fill="#7dd3fc" stroke="#0284c7" strokeWidth="1.5" />
  </svg>
);

const CallumIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5" />
    <path d="M16 10c0 2.5-4 2.5-4 5v2" stroke="white" strokeWidth="1.5" />
    <path d="M12 18h.01" stroke="white" strokeWidth="2" />
    <path d="M8 10h.01" stroke="white" strokeWidth="2" />
    <path d="M6 14h4" stroke="white" strokeWidth="1.5" />
  </svg>
);

const RiverIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M4 11h16c0 4-3.333 6-8 9-4.667-3-8-5-8-9z" fill="#22d3ee" stroke="#06b6d4" strokeWidth="1.5" />
    <path d="M4 11c8-10 8 0 16-10" stroke="#06b6d4" strokeWidth="1.5" />
    <circle cx="8" cy="8" r="1" fill="white" />
    <circle cx="16" cy="8" r="1" fill="white" />
    <path d="M9 12h6" stroke="white" strokeWidth="1.5" />
  </svg>
);

const LiamIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#a3e635" stroke="#65a30d" strokeWidth="1.5" />
    <circle cx="8" cy="10" r="1.5" fill="white" />
    <circle cx="16" cy="10" r="1.5" fill="white" />
    <path d="M8 16c2 1 6 1 8 0" stroke="white" strokeWidth="1.5" />
    <path d="M6 6h12" stroke="#65a30d" strokeWidth="1.5" />
  </svg>
);

const CharlotteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" fill="#f43f5e" stroke="#e11d48" strokeWidth="1.5" />
    <path d="M8 10h0M16 10h0" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="15" r="2" fill="#fda4af" stroke="white" strokeWidth="1" />
    <path d="M10 7.5c1-1 3-1 4 0" stroke="white" strokeWidth="1.5" />
  </svg>
);

const AliceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" fill="#c084fc" stroke="#a855f7" strokeWidth="1.5" />
    <path d="M8 12a2 2 0 0 1 4 0c0 1-1 2-2 3v1" stroke="white" strokeWidth="1.5" />
    <path d="M12 17h.01" stroke="white" strokeWidth="2" />
    <path d="M14.5 12a2 2 0 0 1 1.5-.5c1 0 2 .5 2 2" stroke="white" strokeWidth="1.5" />
    <path d="M16 10h.01" stroke="white" strokeWidth="2" />
  </svg>
);

const MatildaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <rect x="2" y="6" width="20" height="12" rx="2" fill="#fb7185" stroke="#e11d48" strokeWidth="1.5" />
    <path d="M18 11v2" stroke="white" strokeWidth="1.5" />
    <circle cx="15" cy="12" r="1" fill="white" />
    <path d="M6 9l4 6" stroke="white" strokeWidth="1.5" />
    <path d="M10 9l-4 6" stroke="white" strokeWidth="1.5" />
  </svg>
);

const WillIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" fill="#3b82f6" stroke="#2563eb" strokeWidth="1.5" />
    <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" fill="#3b82f6" stroke="#2563eb" strokeWidth="1.5" />
    <rect x="9" y="3" width="6" height="18" fill="#60a5fa" stroke="#2563eb" strokeWidth="1.5" />
    <path d="M9 8h6M9 12h6M9 16h6" stroke="white" strokeWidth="1.5" />
  </svg>
);

const JessicaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" fill="#f472b6" stroke="#ec4899" strokeWidth="1.5" />
    <path d="M12 6v2" stroke="white" strokeWidth="1.5" />
    <path d="M12 16v2" stroke="white" strokeWidth="1.5" />
    <path d="M8 12h2" stroke="white" strokeWidth="1.5" />
    <path d="M14 12h2" stroke="white" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="4" fill="#fda4af" stroke="#ec4899" strokeWidth="1.5" />
  </svg>
);

const EricIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#a78bfa" stroke="#8b5cf6" strokeWidth="1.5" />
    <path d="M7 7h10M7 12h10M7 17h4" stroke="white" strokeWidth="1.5" />
    <circle cx="16" cy="17" r="1.5" fill="white" />
  </svg>
);

const ChrisIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5" />
    <path d="M16 2v10l-4-3-4 3V2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
    <path d="M8 16h8" stroke="white" strokeWidth="1.5" />
  </svg>
);

const BrianIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" fill="#818cf8" stroke="#6366f1" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="6" fill="#a5b4fc" stroke="#6366f1" strokeWidth="1.5" />
    <path d="M15 9l-6 6" stroke="white" strokeWidth="1.5" />
    <path d="M9 9l6 6" stroke="white" strokeWidth="1.5" />
  </svg>
);

const DanielIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <rect x="4" y="4" width="16" height="16" rx="3" fill="#2dd4bf" stroke="#14b8a6" strokeWidth="1.5" />
    <circle cx="12" cy="10" r="3" fill="#5eead4" stroke="#14b8a6" strokeWidth="1" />
    <path d="M6 20v-2a6 6 0 0 1 12 0v2" fill="#5eead4" stroke="#14b8a6" strokeWidth="1.5" />
  </svg>
);

const LilyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" fill="#d8b4fe" stroke="#a855f7" strokeWidth="1.5" />
    <path d="M8 13c0 2 1.5 3 4 3s4-1 4-3" stroke="white" strokeWidth="1.5" />
    <path d="M9 9h.01" stroke="white" strokeWidth="2" />
    <path d="M15 9h.01" stroke="white" strokeWidth="2" />
    <path d="M12 3v3M8 5l2 2M16 5l-2 2" stroke="#a855f7" strokeWidth="1.5" />
  </svg>
);

const BillIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M21 5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5z" fill="#facc15" stroke="#eab308" strokeWidth="1.5" />
    <path d="M14 9h4" stroke="white" strokeWidth="1.5" />
    <path d="M14 12h4" stroke="white" strokeWidth="1.5" />
    <path d="M14 15h2" stroke="white" strokeWidth="1.5" />
    <circle cx="8" cy="12" r="3" fill="#fef08a" stroke="#eab308" strokeWidth="1.5" />
  </svg>
);

// Map voice names to specific icons
const voiceNameToIcon: Record<string, JSX.Element> = {
  "Aria": <AriaIcon />,
  "Roger": <RogerIcon />,
  "Sarah": <SarahIcon />,
  "Laura": <LauraIcon />,
  "Charlie": <CharlieIcon />,
  "George": <GeorgeIcon />,
  "Callum": <CallumIcon />,
  "River": <RiverIcon />,
  "Liam": <LiamIcon />,
  "Charlotte": <CharlotteIcon />,
  "Alice": <AliceIcon />,
  "Matilda": <MatildaIcon />,
  "Will": <WillIcon />,
  "Jessica": <JessicaIcon />,
  "Eric": <EricIcon />,
  "Chris": <ChrisIcon />,
  "Brian": <BrianIcon />,
  "Daniel": <DanielIcon />,
  "Lily": <LilyIcon />,
  "Bill": <BillIcon />
};

// Voice personalities with their traits and themes
const voicePersonalities: Record<string, {
  icon: JSX.Element;
  traits: string[];
  description: string;
  themeColor: string;
  gradient: string;
  label: string;
}> = {
  // Professional/business voices
  'EXAVITQu4vr4xnSDxMaL': {
    icon: <User className="h-6 w-6" />,
    traits: ['Authoritative', 'Strategic', 'Analytical'],
    description: 'Business Advisor',
    themeColor: 'from-blue-600 to-blue-800',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    label: 'Professional'
  },
  'MF3mGyEYCl7XYWbV9V6O': {
    icon: <User className="h-6 w-6" />,
    traits: ['Persuasive', 'Confident', 'Engaging'],
    description: 'Sales Closer',
    themeColor: 'from-purple-600 to-purple-800',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
    label: 'Persuasive'
  },
  // Creative voices
  'jBpfuIE2acCO8z3wKNLl': {
    icon: <User className="h-6 w-6" />,
    traits: ['Imaginative', 'Expressive', 'Storyteller'],
    description: 'Creative Writer',
    themeColor: 'from-pink-500 to-rose-600',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)',
    label: 'Creative'
  },
  // Technical voices
  'ErXwobaYiN019PkySvjV': {
    icon: <User className="h-6 w-6" />,
    traits: ['Clear', 'Precise', 'Knowledgeable'],
    description: 'Tech Guide',
    themeColor: 'from-cyan-500 to-cyan-700',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
    label: 'Technical'
  },
  '91SeH2EvqiGWpIu9Nbvv': {
    icon: <User className="h-6 w-6" />,
    traits: ['Innovative', 'Strategic', 'Trendy'],
    description: 'Marketing Expert',
    themeColor: 'from-orange-500 to-amber-600',
    gradient: 'linear-gradient(135deg, #f97316 0%, #d97706 100%)',
    label: 'Marketing'
  },
  // Coaching/support voices
  'D38z5RcWu1voky8WS1ja': {
    icon: <User className="h-6 w-6" />,
    traits: ['Motivational', 'Supportive', 'Action-oriented'],
    description: 'Coach & Motivator',
    themeColor: 'from-green-500 to-emerald-600',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
    label: 'Supportive'
  },
  // Default entry for voices without specific mapping
  'default': {
    icon: <Headphones className="h-6 w-6" />,
    traits: ['Professional', 'Clear', 'Engaging'],
    description: 'Voice Assistant',
    themeColor: 'from-gray-600 to-gray-800',
    gradient: 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)',
    label: 'Standard'
  }
};

// Helper to get personality info for a voice
const getPersonalityInfo = (voiceId: string) => {
  return voicePersonalities[voiceId] || voicePersonalities['default'];
};

// Helper to get custom icon for a voice by name
const getVoiceIcon = (name: string) => {
  return voiceNameToIcon[name] || voiceNameToIcon["default"] || <Headphones className="h-6 w-6" />;
};

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
}

export default function VoiceSelector({ 
  voices, 
  selectedVoiceId, 
  onSelectVoice 
}: VoiceSelectorProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Group voices by category and ensure all voices have the required fields
  const normalizedVoices = voices.map((voice, index) => {
    // Make sure each voice has a unique ID - if missing, use name or index to create one
    const voiceId = voice.voice_id || `voice-${voice.name}-${index}`;
    console.log("Normalizing voice:", voice, "with ID:", voiceId);
    
    return {
      voice_id: voiceId, // Ensure we have a unique ID for each voice
      name: voice.name || 'Unnamed Voice',
      category: voice.category || 'General',
      description: voice.description || '',
      preview_url: voice.preview_url || '',
      labels: voice.labels || {},
    };
  });
  
  console.log("Normalized voices:", normalizedVoices);
  
  // Categories removed as requested
  
  // With category tabs removed, we only filter by search term
  const filteredVoices = searchTerm.trim() === ''
    ? normalizedVoices
    : normalizedVoices.filter(voice => 
        voice.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Simple function to play preview audio directly from URL
  const playDirectPreview = (previewUrl: string, voiceName: string) => {
    try {
      console.log("Playing direct preview from URL:", previewUrl);
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      
      // Set state for UI updates
      setIsLoading(true);
      setIsPlaying(true);
      setPlayingVoiceId(voiceName);
      
      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;
      
      // Set up event handlers
      audio.oncanplaythrough = () => setIsLoading(false);
      audio.onended = () => {
        setPlayingVoiceId(null);
        setIsPlaying(false);
      };
      audio.onerror = () => {
        // Log error but NEVER show it to users
        console.error("Direct preview audio error");
        
        // Reset UI state
        setPlayingVoiceId(null);
        setIsPlaying(false);
        setIsLoading(false);
        
        // No error notifications
        console.log("Suppressing direct preview audio error notifications");
      };
      
      // Set source and play
      audio.src = previewUrl;
      audio.play().catch(error => {
        // Log error but NEVER show it to users
        console.error("Error playing direct preview (suppressing notification):", error);
        
        // Specifically check for "play request was interrupted by a call to pause()" errors
        if (error.message && error.message.includes("interrupted")) {
          console.log("Caught 'play request was interrupted by pause' error - suppressing notification");
        }
        
        // Reset UI state for any error - never show notifications
        setPlayingVoiceId(null);
        setIsPlaying(false);
        setIsLoading(false);
        
        // No error notifications for ANY error
        console.log("Suppressing ALL direct preview error notifications");
      });
    } catch (error) {
      console.error("Error setting up direct preview:", error);
      setPlayingVoiceId(null);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const handlePlayVoiceSample = async (voiceId: string) => {
    try {
      // Check if we're already playing this voice
      if (playingVoiceId === voiceId && isPlaying) {
        console.log("Already playing this voice. Stopping playback.");
        
        // Stop the current audio and reset states
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        
        setPlayingVoiceId(null);
        setIsLoading(false);
        setIsPlaying(false);
        return;
      }
      
      console.log("Attempting to play voice sample for ID:", voiceId);
      console.log("IMPORTANT: This is ONLY a preview and will NOT save any agent settings");
      
      // Play a sound to indicate the button was pressed successfully
      playVoiceSound('preview');
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      
      // Set loading and playing state
      setIsLoading(true);
      setIsPlaying(true);
      setPlayingVoiceId(voiceId);
      
      // First try to play the preview URL if it exists
      const voice = normalizedVoices.find(v => v.voice_id === voiceId);
      console.log("Found voice for playback:", voice);
      
      if (!voice) {
        throw new Error("Voice not found");
      }
      
      if (voice.preview_url) {
        console.log("Using preview URL:", voice.preview_url);
        // Play the preview URL directly
        const audio = new Audio(voice.preview_url);
        audioRef.current = audio;
        
        audio.oncanplaythrough = () => {
          console.log("Audio can play through, ready to play");
          setIsLoading(false);
        };
        
        audio.onended = () => {
          console.log("Audio playback ended");
          setPlayingVoiceId(null);
          setIsPlaying(false);
        };
        
        audio.onerror = (e) => {
          console.error("Error playing preview URL:", e);
          console.error("Error details:", audio.error);
          console.log("Using SimpleVoicePreview with API endpoint");
          
          // Show toast about fallback
          toast({
            title: "Using fallback audio source",
            description: "Preview not available, generating sample from our servers.",
            variant: "default",
          });
          
          // Reset state before trying API method
          setIsPlaying(false);
          setIsLoading(true);
          
          // With our SimpleVoicePreview, we just need to set the ID and it will handle the rest
          setPlayingVoiceId(voiceId);
        };
        
        console.log("Starting preview audio playback");
        try {
          await audio.play();
          console.log("Preview audio playback started successfully");
        } catch (playError: unknown) {
          // Log error but NEVER show it to users (except for user interaction errors)
          console.error("Error during preview audio play() (suppressing notification):", playError);
          
          // Specifically check for "play request was interrupted by a call to pause()" errors
          if (playError instanceof Error && playError.message && playError.message.includes("interrupted")) {
            console.log("Caught 'play request was interrupted by pause' error - suppressing notification");
            // Continue to SimpleVoicePreview without showing an error
          }
          // Check if this is a user interaction error
          else if (playError instanceof Error && playError.name === "NotAllowedError") {
            toast({
              title: "Playback not allowed",
              description: "Browser requires user interaction. Please click the play button again.",
              variant: "default",
            });
            
            // Reset all states
            setPlayingVoiceId(null);
            setIsLoading(false);
            setIsPlaying(false);
            return;
          }
          
          // For other errors, use our SimpleVoicePreview component without showing errors
          console.log("Falling back to SimpleVoicePreview due to playback error (suppressing notification)");
          // SimpleVoicePreview will take over when playingVoiceId is set
          setPlayingVoiceId(voiceId);
          setIsLoading(true);
        }
      } else {
        console.log("No preview URL available, using SimpleVoicePreview with API");
        // SimpleVoicePreview will take over when playingVoiceId is set
        // No preview URL, using SimpleVoicePreview which will call the API
        setPlayingVoiceId(voiceId);
        setIsLoading(true);
      }
    } catch (error) {
      // Log error but NEVER show it to users
      console.error("Error playing voice sample (suppressing notification):", error);
      
      // Reset all states
      setPlayingVoiceId(null);
      setIsLoading(false);
      setIsPlaying(false);
      
      // Do not show any error notifications to users
      console.log("Suppressing voice sample error notification");
    }
  };
  
  const { toast } = useToast();
  
  const playFromAPI = async (voiceId: string) => {
    // Immediately update state to show loading/playing status
    setPlayingVoiceId(voiceId);
    setIsLoading(true);
    setIsPlaying(true);
    
    if (!voiceId) {
      // Log error but NEVER show it to users
      console.error("Invalid voice ID provided to playFromAPI (suppressing notification)");
      
      // Reset UI state
      setPlayingVoiceId(null);
      setIsLoading(false);
      setIsPlaying(false);
      
      // No error notifications
      console.log("Suppressing invalid voice ID error notification");
      return;
    }
    
    try {
      console.log("Playing voice from API for ID:", voiceId);
      
      // Play from our API endpoint
      const audioUrl = `/api/elevenlabs/voices/play/${voiceId}`;
      console.log("Audio URL:", audioUrl);
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      // Create a new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Set up event handlers BEFORE calling play()
      audio.oncanplaythrough = () => {
        console.log("API audio can play through");
        setIsLoading(false);
      };
      
      audio.onplay = () => {
        console.log("API audio playback started");
        setIsPlaying(true);
        setIsLoading(false);
      };
      
      audio.onended = () => {
        console.log("API audio playback ended");
        setPlayingVoiceId(null);
        setIsPlaying(false);
      };
      
      audio.onerror = (e) => {
        // Log error but NEVER show it to users
        console.error("Error playing audio from API (suppressing notification):", e);
        console.error("Audio error code:", audio.error?.code);
        console.error("Audio error message:", audio.error?.message);
        
        // Reset all state variables
        setPlayingVoiceId(null);
        setIsLoading(false);
        setIsPlaying(false);
        
        // Do not show any error notifications
        console.log("Suppressing API audio error notification");
      };
      
      // Check if the browser supports audio format
      if (!audio.canPlayType('audio/mpeg')) {
        // Log error but NEVER show it to users
        console.error("Browser doesn't support audio/mpeg format (suppressing notification)");
        
        // Reset state
        setPlayingVoiceId(null);
        setIsLoading(false);
        setIsPlaying(false);
        
        // No error notifications
        console.log("Suppressing browser compatibility error notification");
        
        return; // Exit early instead of throwing to avoid double error handling
      }
      
      // Start loading the audio
      audio.load();
      
      // Set a timeout to detect if loading takes too long
      const timeoutID = setTimeout(() => {
        if (isLoading && playingVoiceId === voiceId) {
          console.warn("Audio loading timeout - might be slow connection or server issue");
          toast({
            title: "Loading taking longer than expected",
            description: "The voice sample is taking a while to load. Please wait or try again.",
            variant: "default",
          });
        }
      }, 5000);
      
      // Start playing with better error handling
      try {
        console.log("Starting API audio playback");
        await audio.play();
        console.log("API audio playback started successfully");
        clearTimeout(timeoutID); // Clear timeout if playback starts successfully
      } catch (playError: unknown) {
        clearTimeout(timeoutID);
        // Log error but NEVER show it to users (except for user interaction errors)
        console.error("Error during API audio play() (suppressing notification):", playError);
        
        // Reset state variables in case of error
        setPlayingVoiceId(null);
        setIsLoading(false);
        setIsPlaying(false);
        
        // Only show user interaction errors (browser security related)
        if (playError instanceof Error && playError.name === "NotAllowedError") {
          toast({
            title: "Playback not allowed",
            description: "Browser requires user interaction before playing audio. Please click the play button again.",
            variant: "default",
          });
        } else {
          // Suppress all other error notifications
          console.log("Suppressing playback error notification");
        }
      }
    } catch (error) {
      // Log error but NEVER show it to users
      console.error("Error playing from API (suppressing notification):", error);
      
      // Always reset state in case of errors
      setPlayingVoiceId(null);
      setIsLoading(false);
      setIsPlaying(false);
      
      // Do not show any error notifications
      console.log("Suppressing general API playback error notification");
    }
  };

  if (voices.length === 0) {
    return (
      <div className="py-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-muted-foreground">Loading available voices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Select Voice
          </h3>
          
          {selectedVoiceId && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Selected: {voices.find(v => v.voice_id === selectedVoiceId)?.name || 'Voice'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Choose a voice for your AI agent to use during phone calls
        </p>
      </div>

      {/* Category tabs removed as requested */}
      
      {/* Search bar */}
      <div className="relative mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search voices by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* No results message */}
      {filteredVoices.length === 0 && (
        <div className="text-center py-10 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <AlertCircle className="w-10 h-10 text-gray-400 mb-2 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No voices found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Try a different search term</p>
        </div>
      )}

      {filteredVoices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVoices.map(voice => {
          const personalityInfo = getPersonalityInfo(voice.voice_id || '');
          const isSelected = selectedVoiceId === voice.voice_id;
          const isPlaying = playingVoiceId === voice.voice_id;
          
          return (
            <Card 
              key={voice.voice_id} 
              className={`cursor-pointer transition-all duration-300 overflow-hidden group hover:shadow-xl ${
                isSelected ? 
                  'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg scale-[1.02]' : 
                  'hover:translate-y-[-2px]'
              }`}
              onClick={(e) => {
                e.preventDefault(); // Prevent any default behavior
                e.stopPropagation(); // Stop event propagation
                
                console.log("Click event on voice card:", voice.name);
                
                // Make sure we have a valid voice_id
                if (!voice.voice_id) {
                  console.error("Missing voice_id for voice:", voice.name);
                  return;
                }
                
                // Stop any playing voice sample audio
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.src = "";
                  setPlayingVoiceId(null);
                  setIsPlaying(false);
                }
                
                // Play sound effect when selecting voice
                if (voice.name) {
                  playVoiceSound(voice.name);
                }
                
                // Debug verbose logging
                console.log("Selecting voice:", voice.name, voice.voice_id);
                console.log("Voice object:", JSON.stringify(voice));
                
                // Call the selection handler with a slight delay to ensure the UI updates first
                setTimeout(() => {
                  onSelectVoice(voice.voice_id);
                }, 10);
              }}
              style={{ 
                backgroundImage: isSelected ? personalityInfo.gradient : 'none',
                backgroundColor: isSelected ? 'transparent' : undefined,
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)'
              }}
            >
              <div className={`${isSelected ? 'bg-black/30 backdrop-blur-sm' : 'bg-transparent'} transition-all duration-300`}>
                <CardHeader className="pb-2 relative">
                  <div className="flex justify-between items-center">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        isSelected ? 'bg-white/20' : `bg-gradient-to-br ${personalityInfo.themeColor}`
                      } text-white`}>
                        {voice.name ? getVoiceIcon(voice.name) : personalityInfo.icon}
                      </div>
                      
                      <div>
                        <CardTitle className={`text-base transition-colors ${isSelected ? 'text-white' : ''}`}>
                          {voice.name}
                        </CardTitle>
                        <CardDescription className={`text-xs ${isSelected ? 'text-white/80' : ''}`}>
                          {personalityInfo.description || (voice.category || 'Standard voice')}
                        </CardDescription>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-white" />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pb-2">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1 mt-1">
                      {personalityInfo.traits.map(trait => (
                        <Badge 
                          key={trait} 
                          variant={isSelected ? "secondary" : "outline"} 
                          className={`text-xs ${isSelected ? 'bg-white/20 hover:bg-white/30 text-white border-none' : ''}`}
                        >
                          {trait}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="w-full mt-2 h-6">
                      {isPlaying ? (
                        <AudioWaveform isSpeaking={true} />
                      ) : (
                        <div className={`h-2 ${isSelected ? 'bg-white/20' : 'bg-secondary/50'} rounded-full w-full`} />
                      )}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`w-full text-xs h-10 relative preview-voice-button ${
                      isLoading && playingVoiceId === voice.voice_id ? 'loading' :
                      isPlaying && playingVoiceId === voice.voice_id ? 'playing' : ''
                    } ${isSelected ? 'scale-[1.02]' : ''}`}
                    onClick={(e) => {
                      // Prevent both the event propagation AND the default behavior
                      e.stopPropagation();
                      e.preventDefault();
                      
                      // Create floating particles when clicked
                      createPreviewButtonParticles(e);
                      
                      // Only handle preview functionality, completely disconnected from selection
                      if (voice.voice_id) {
                        // Show a toast to clarify that this is only a preview
                        toast({
                          title: "Voice Preview",
                          description: "This is just a preview. No settings will be saved until you click 'Save Agent Settings'.",
                          variant: "default",
                        });
                        
                        // Use the preview_url directly if available (much more reliable)
                        if (voice.preview_url) {
                          playDirectPreview(voice.preview_url, voice.name || 'Voice');
                        } else {
                          // Fall back to API-based preview if no preview URL
                          handlePlayVoiceSample(voice.voice_id);
                        }
                      }
                    }}
                    disabled={playingVoiceId !== null && playingVoiceId !== voice.voice_id}
                  >
                    {/* Particle container */}
                    <div className="preview-voice-button-particles-container"></div>
                    
                    {isLoading && playingVoiceId === voice.voice_id ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin button-icon" />
                        <span className="button-text">Loading sample...</span>
                      </>
                    ) : isPlaying && playingVoiceId === voice.voice_id ? (
                      <>
                        <Volume2 className="h-3.5 w-3.5 mr-1.5 button-icon" />
                        <span className="button-text">Stop Preview</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5 mr-1.5 button-icon" />
                        <span className="button-text">Preview Voice</span>
                      </>
                    )}
                  </Button>
                </CardFooter>
              </div>
            </Card>
          );
        })}
      </div>
      )}
      {/* Hidden SimpleVoicePreview component for direct audio playback */}
      {playingVoiceId && (
        <SimpleVoicePreview
          voiceId={playingVoiceId}
          previewUrl={voices.find(v => v.voice_id === playingVoiceId)?.preview_url}
          onComplete={() => {
            setPlayingVoiceId(null);
            setIsLoading(false);
            setIsPlaying(false);
          }}
          onError={(error: Error) => {
            // Log error but NEVER show it to users
            console.error("Voice preview error in VoiceSelector:", error);
            
            // Reset UI state 
            setPlayingVoiceId(null);
            setIsLoading(false);
            setIsPlaying(false);
            
            // We're intentionally NOT showing any error messages to the user
            console.log("Suppressing ALL audio/media errors in VoiceSelector UI");
            
            // No toast notifications for ANY errors
          }}
        />
      )}
    </div>
  );
}