import React, { useState, Suspense, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Environment, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useLocation, useRoute } from 'wouter';
import { Loader2 } from 'lucide-react';
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
  modelPath: string;
  scale: number;
  position: [number, number, number];
  rotation: [number, number, number];
}> = {
  'real-estate': {
    name: 'Real Estate Agent',
    description: 'Choosing "Real Estate" unlocks AI tools specifically optimized for lead generation, listing descriptions, and appointment setting in real estate.',
    modelPath: '/models/real-estate.glb', // placeholder path
    scale: 2,
    position: [0, -1, 0],
    rotation: [0, 0, 0]
  },
  'ecommerce': {
    name: 'E-commerce Specialist',
    description: 'Choosing "E-commerce" enhances your AI with product listing optimization, customer service automation, and sales funnel tools specific to online stores.',
    modelPath: '/models/ecommerce.glb', // placeholder path
    scale: 2,
    position: [0, -1, 0],
    rotation: [0, 0, 0]
  },
  'content-creator': {
    name: 'Content Creator',
    description: 'The "Content Creator" character provides AI tools for content scheduling, engagement analytics, and personalized response generation for your audience.',
    modelPath: '/models/content-creator.glb', // placeholder path
    scale: 2,
    position: [0, -1, 0],
    rotation: [0, 0, 0]
  },
  'law-firm': {
    name: 'Law Firm',
    description: 'The "Law Firm" character includes AI capabilities for client intake, document analysis, and specialized legal terminology understanding for your practice.',
    modelPath: '/models/law-firm.glb', // placeholder path
    scale: 2,
    position: [0, -1, 0],
    rotation: [0, 0, 0]
  },
  'marketing-agency': {
    name: 'Marketing Agency',
    description: 'With the "Marketing Agency" character, access campaign optimization tools, client reporting templates, and multi-channel content coordination.',
    modelPath: '/models/marketing-agency.glb', // placeholder path
    scale: 2,
    position: [0, -1, 0],
    rotation: [0, 0, 0]
  },
  'insurance': {
    name: 'Insurance Agent',
    description: 'The "Insurance" character specializes in policy explanation, claim processing assistance, and customer retention strategies for insurance professionals.',
    modelPath: '/models/insurance.glb', // placeholder path
    scale: 2,
    position: [0, -1, 0],
    rotation: [0, 0, 0]
  },
  'crypto': {
    name: 'Crypto Project',
    description: 'Selecting "Crypto Project" provides specialized AI tools for token economics explanation, community management, and technical whitepaper assistance.',
    modelPath: '/models/crypto.glb', // placeholder path
    scale: 2,
    position: [0, -1, 0],
    rotation: [0, 0, 0]
  },
  'event-planner': {
    name: 'Event Planner',
    description: 'The "Event Planner" character offers tools for scheduling coordination, vendor management, and client communication templates for event professionals.',
    modelPath: '/models/event-planner.glb', // placeholder path
    scale: 2,
    position: [0, -1, 0],
    rotation: [0, 0, 0]
  }
};

// Character Model component
const CharacterModel = ({ profession }: { profession: Profession }) => {
  // For demo purposes, we'll use placeholder models or simple geometries
  const character = characterData[profession];
  
  // Create refs for animations
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Colors mapping for different professions
  const colors = {
    'real-estate': '#c0392b', // Red
    'ecommerce': '#2980b9',   // Blue
    'content-creator': '#8e44ad', // Purple
    'law-firm': '#2c3e50',    // Dark blue
    'marketing-agency': '#d35400', // Orange
    'insurance': '#16a085',   // Teal
    'crypto': '#f39c12',      // Yellow
    'event-planner': '#27ae60' // Green
  };
  
  // Handle animations in useFrame hook
  useFrame((state) => {
    if (groupRef.current) {
      // Gently float up and down
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      
      // Slow rotation
      groupRef.current.rotation.y += 0.003;
    }
    
    if (meshRef.current) {
      // Light pulsing effect by scaling slightly
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });
  
  // Function to get the appropriate geometry for the profession
  const renderGeometry = () => {
    switch(profession) {
      case 'real-estate':
        return <boxGeometry args={[1, 2, 1]} />;
      case 'ecommerce':
        return <cylinderGeometry args={[0.8, 0.8, 2]} />;
      case 'content-creator':
        return <sphereGeometry args={[1, 32, 32]} />;
      case 'law-firm':
        return <coneGeometry args={[1, 2, 32]} />;
      case 'marketing-agency':
        return <dodecahedronGeometry args={[1, 0]} />;
      case 'insurance':
        return <torusGeometry args={[0.8, 0.3, 16, 32]} />;
      case 'crypto':
        return <icosahedronGeometry args={[1, 0]} />;
      case 'event-planner':
        return <octahedronGeometry args={[1, 0]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return (
    <group
      ref={groupRef}
      position={character.position}
      rotation={character.rotation as any}
      scale={[character.scale, character.scale, character.scale]}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        {renderGeometry()}
        <meshStandardMaterial 
          color={colors[profession]} 
          metalness={0.5} 
          roughness={0.2}
          emissive={colors[profession]}
          emissiveIntensity={0.25}
        />
      </mesh>
      
      {/* Floating light effects */}
      <pointLight position={[0, 1, 2]} intensity={2} color="#ffffff" />
      <pointLight position={[0, -1, -1]} intensity={0.5} color="#0088ff" />
      
      {/* Particle effect (simplified) */}
      <mesh position={[0, 0, 0]} scale={[2, 2, 2]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={colors[profession]} transparent opacity={0.05} />
      </mesh>
    </group>
  );
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
      <div className="w-full h-24 bg-gray-800 flex items-center justify-center">
        {/* Thumbnail version */}
        <div className="w-16 h-16">
          {profession === 'real-estate' && <div className="w-full h-full bg-[#c0392b] rounded"></div>}
          {profession === 'ecommerce' && <div className="w-full h-full bg-[#2980b9] rounded-full"></div>}
          {profession === 'content-creator' && <div className="w-full h-full bg-[#8e44ad] rounded-full"></div>}
          {profession === 'law-firm' && <div className="w-full h-full border-b-[16px] border-r-[8px] border-l-[8px] border-[#2c3e50]"></div>}
          {profession === 'marketing-agency' && <div className="w-full h-full bg-[#d35400] transform rotate-45"></div>}
          {profession === 'insurance' && <div className="w-14 h-14 border-4 rounded-full border-[#16a085] mt-1"></div>}
          {profession === 'crypto' && <div className="w-full h-full bg-[#f39c12] transform rotate-45"></div>}
          {profession === 'event-planner' && <div className="w-full h-full bg-[#27ae60] transform rotate-45"></div>}
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

const CharacterCreationPage = () => {
  const [selectedProfession, setSelectedProfession] = useState<Profession>('real-estate');
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const [isPageReady, setIsPageReady] = useState(false);
  
  // Handle authentication state and redirection
  useEffect(() => {
    console.log("Auth state in character creation:", { user, isLoading });
    
    // Only act when auth state is fully determined (not loading)
    if (!isLoading) {
      if (!user) {
        console.log("No user found, redirecting to auth page");
        navigate('/auth');
      } else {
        console.log("User found, staying on character creation page", user);
        setIsPageReady(true);
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
          {/* Left side - 3D model */}
          <div className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-4 overflow-hidden h-[500px] border border-gray-800 shadow-lg shadow-blue-900/20">
            <div className="relative w-full h-full">
              <Canvas shadows camera={{ position: [0, 0, 6], fov: 50 }}>
                <Suspense fallback={
                  <Html center>
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-white">Loading 3D model...</p>
                    </div>
                  </Html>
                }>
                  <ambientLight intensity={0.3} />
                  <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} castShadow />
                  <CharacterModel profession={selectedProfession} />
                  <Environment preset="city" />
                  <OrbitControls 
                    autoRotate 
                    autoRotateSpeed={1} 
                    enableZoom={false}
                    enablePan={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 2}
                  />
                </Suspense>
              </Canvas>
              
              {/* Character info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm p-4 border-t border-gray-800">
                <h2 className="text-xl font-bold text-[#33C3BD]">{character.name}</h2>
                <p className="text-gray-300 text-sm mt-1">{character.description}</p>
              </div>
              
              {/* Glowing effect */}
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-[#33C3BD] opacity-30 rounded-full filter blur-3xl"></div>
            </div>
          </div>
          
          {/* Right side - Character selection */}
          <div className="flex flex-col">
            <div className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-4 border border-gray-800 shadow-lg shadow-blue-900/20 mb-4">
              <h2 className="text-xl font-bold mb-4 text-white">Available Characters</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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

export default CharacterCreationPage;