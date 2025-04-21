import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

// Character profession types
type Profession = 
  | 'real-estate'
  | 'ecommerce'
  | 'content-creator'
  | 'law-firm'
  | 'marketing-agency'
  | 'insurance'
  | 'crypto'
  | 'event-planner';

// Character data with descriptions
const characterData: Record<Profession, {
  name: string;
  description: string;
  color: string;
}> = {
  'real-estate': {
    name: 'Real Estate Agent',
    description: 'Choosing "Real Estate" unlocks AI tools specifically optimized for lead generation, listing descriptions, and appointment setting in real estate.',
    color: '#c0392b',
  },
  'ecommerce': {
    name: 'E-commerce Specialist',
    description: 'Choosing "E-commerce" enhances your AI with product listing optimization, customer service automation, and sales funnel tools specific to online stores.',
    color: '#2980b9',
  },
  'content-creator': {
    name: 'Content Creator',
    description: 'The "Content Creator" character provides AI tools for content scheduling, engagement analytics, and personalized response generation for your audience.',
    color: '#8e44ad',
  },
  'law-firm': {
    name: 'Law Firm',
    description: 'The "Law Firm" character includes AI capabilities for client intake, document analysis, and specialized legal terminology understanding for your practice.',
    color: '#2c3e50',
  },
  'marketing-agency': {
    name: 'Marketing Agency',
    description: 'With the "Marketing Agency" character, access campaign optimization tools, client reporting templates, and multi-channel content coordination.',
    color: '#d35400',
  },
  'insurance': {
    name: 'Insurance Agent',
    description: 'The "Insurance" character specializes in policy explanation, claim processing assistance, and customer retention strategies for insurance professionals.',
    color: '#16a085',
  },
  'crypto': {
    name: 'Crypto Project',
    description: 'Selecting "Crypto Project" provides specialized AI tools for token economics explanation, community management, and technical whitepaper assistance.',
    color: '#f39c12',
  },
  'event-planner': {
    name: 'Event Planner',
    description: 'The "Event Planner" character offers tools for scheduling coordination, vendor management, and client communication templates for event professionals.',
    color: '#27ae60',
  }
};

// Character card component for selection
const CharacterCard = ({ 
  profession, 
  selected, 
  onClick 
}: { 
  profession: Profession;
  selected: boolean; 
  onClick: () => void;
}) => {
  const character = characterData[profession];
  
  return (
    <div 
      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 transform ${
        selected ? 'scale-105 ring-2 ring-[#33C3BD] shadow-lg shadow-[#33C3BD]/20' : 'hover:scale-105'
      }`}
      onClick={onClick}
    >
      <div className="w-full h-32 flex items-center justify-center" style={{ backgroundColor: `${character.color}30` }}>
        {/* Character visual representation */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: character.color }}>
          <span className="text-white font-bold text-xl">{character.name.charAt(0)}</span>
        </div>
      </div>
      <div className={`p-3 bg-gray-900 ${selected ? 'bg-opacity-80' : 'bg-opacity-60'} backdrop-blur-sm`}>
        <h3 className={`text-sm font-semibold ${selected ? 'text-[#33C3BD]' : 'text-white'}`}>
          {character.name}
        </h3>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 bg-[#33C3BD] rounded-full w-5 h-5 flex items-center justify-center text-black font-bold text-xs">
          ✓
        </div>
      )}
    </div>
  );
};

const FallbackCharacterCreationPage = () => {
  const [selectedProfession, setSelectedProfession] = useState<Profession>('real-estate');
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const [isPageReady, setIsPageReady] = useState(false);
  
  // Handle authentication state and redirection
  useEffect(() => {
    console.log("Auth state in fallback character creation:", { 
      user: user ? { id: user.id, username: user.username } : null, 
      isLoading,
      pathname: window.location.pathname
    });
    
    // Only act when auth state is fully determined (not loading)
    if (!isLoading) {
      if (!user) {
        console.log("No user found, redirecting to auth page");
        navigate('/auth');
      } else {
        console.log("User found, staying on character creation page", { 
          id: user.id, 
          username: user.username,
          email: user.email
        });
        
        // Add a small delay before showing the content to ensure everything is loaded
        const timer = setTimeout(() => {
          setIsPageReady(true);
          console.log("Character creation page ready to render");
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user, isLoading, navigate]);

  const handleSelectCharacter = (profession: Profession) => {
    setSelectedProfession(profession);
  };

  const handleConfirmSelection = () => {
    // In a real app, you would save the user's selection to the database
    // For now, we'll just navigate to the dashboard
    navigate('/dashboard');
  };

  const character = characterData[selectedProfession];

  // Show loading screen while auth is checking
  if (isLoading || !isPageReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0F1D] to-[#162033] text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-[#33C3BD] border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-semibold text-[#33C3BD]">Loading your experience...</h2>
          <p className="text-gray-400 mt-2 text-sm">Please wait while we prepare your character selection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0F1D] to-[#162033] text-white overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars-bg"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-[#0A0F1D]/80"></div>
      </div>
      
      <div className="container mx-auto py-8 relative z-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
            Choose Your AI Character
          </h1>
          <p className="mt-3 text-gray-300 max-w-xl mx-auto">
            Select a character that matches your profession. This will personalize your AI assistant
            with specialized tools and knowledge for your specific field.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side - Character display */}
          <div className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 overflow-hidden border border-gray-800 shadow-lg shadow-blue-900/20">
            <div className="flex flex-col items-center">
              <div 
                className="w-40 h-40 rounded-full mb-6 flex items-center justify-center"
                style={{ backgroundColor: character.color }}
              >
                <span className="text-white text-6xl font-bold">{character.name.charAt(0)}</span>
              </div>
              
              <h2 className="text-2xl font-bold text-[#33C3BD] mb-4">{character.name}</h2>
              <p className="text-gray-300 text-center">{character.description}</p>
              
              {/* Glowing effect */}
              <div className="relative mt-8">
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-[#33C3BD] opacity-30 rounded-full filter blur-3xl"></div>
              </div>
            </div>
          </div>
          
          {/* Right side - Character selection */}
          <div className="flex flex-col">
            <div className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-4 border border-gray-800 shadow-lg shadow-blue-900/20 mb-4">
              <h2 className="text-xl font-bold mb-4 text-white">Available Characters</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(characterData) as Profession[]).map((profession) => (
                  <CharacterCard
                    key={profession}
                    profession={profession}
                    selected={selectedProfession === profession}
                    onClick={() => handleSelectCharacter(profession)}
                  />
                ))}
              </div>
            </div>
            
            <div className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-4 border border-gray-800 shadow-lg shadow-blue-900/20">
              <h3 className="text-lg font-semibold mb-3">Why Character Selection Matters</h3>
              <p className="text-gray-300 text-sm mb-4">
                Each character comes equipped with specialized AI capabilities tailored to your profession. 
                Your selection improves the AI's effectiveness at handling industry-specific tasks, terminology, 
                and workflows. This provides a more personalized experience designed for your business needs.
              </p>
              
              <div className="flex flex-col space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#33C3BD] flex items-center justify-center text-black font-bold text-xs mr-2 mt-0.5">1</div>
                  <p className="text-sm text-gray-300">Optimized AI responses for your industry</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#33C3BD] flex items-center justify-center text-black font-bold text-xs mr-2 mt-0.5">2</div>
                  <p className="text-sm text-gray-300">Specialized tools and automation features</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#33C3BD] flex items-center justify-center text-black font-bold text-xs mr-2 mt-0.5">3</div>
                  <p className="text-sm text-gray-300">Industry-specific templates and workflows</p>
                </div>
              </div>
              
              <div className="mt-6">
                <Button 
                  onClick={handleConfirmSelection}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:from-[#3DD8D2] hover:to-[#0085FF] text-white rounded-lg shadow-lg shadow-blue-700/20 transition-all"
                >
                  Confirm Selection
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FallbackCharacterCreationPage;