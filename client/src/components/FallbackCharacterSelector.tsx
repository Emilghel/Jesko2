import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

// Professional character data with descriptions
export type Profession = 
  | 'real-estate'
  | 'ecommerce'
  | 'content-creator'
  | 'law-firm'
  | 'marketing-agency'
  | 'insurance'
  | 'crypto'
  | 'event-planner';

interface CharacterData {
  name: string;
  description: string;
  tagline: string;
  color: string;
  characterDescription: string; // Description of the character's appearance and animations
}

const characterData: Record<Profession, CharacterData> = {
  'real-estate': {
    name: 'Real Estate Agent',
    description: 'Specialized in property listings, market analysis, and client engagement strategies for the real estate industry.',
    tagline: 'Your AI will help you manage listings, create compelling property descriptions, and track client relationships.',
    color: '#FF5733',
    characterDescription: 'Dressed in a blazer, holding a tablet and keys. Checking listings on a floating hologram.'
  },
  'ecommerce': {
    name: 'E-commerce Pro',
    description: 'Focused on online store optimization, product descriptions, and digital marketing strategies for e-commerce businesses.',
    tagline: 'Your AI will help you craft product listings, optimize your store, and create effective marketing campaigns.',
    color: '#33A1FF',
    characterDescription: 'Modern hoodie, VR glasses, carrying packages or shopping cart items. Tapping on a floating store interface.'
  },
  'content-creator': {
    name: 'Content Creator',
    description: 'Expert in content strategy, audience engagement, and multi-platform content distribution for digital creators.',
    tagline: 'As a Content Creator, the AI will help you script videos, generate captions, and plan viral content.',
    color: '#FF33A1',
    characterDescription: 'Ring light, camera on shoulder, headphones around neck. Taking a selfie or pointing at ideas in the air.'
  },
  'law-firm': {
    name: 'Law Firm Rep',
    description: 'Specialized in legal documentation, client communication, and practice management for legal professionals.',
    tagline: 'Your AI will assist with document preparation, case research, and client management tools.',
    color: '#3361FF',
    characterDescription: 'Suit and tie, holding a gavel and legal docs. Stamping papers with authority.'
  },
  'marketing-agency': {
    name: 'Marketing Agency Boss',
    description: 'Focused on campaign development, analytics, and client strategy for marketing agency professionals.',
    tagline: 'Your AI will help you create campaign briefs, track metrics, and generate client presentations.',
    color: '#A133FF',
    characterDescription: 'Stylish outfit, tablet with graphs floating around. Typing fast in mid-air with floating ads.'
  },
  'insurance': {
    name: 'Insurance Agent',
    description: 'Expert in policy management, client communication, and claims processing for insurance professionals.',
    tagline: 'Your AI will help you explain policies, compare coverage options, and track client information.',
    color: '#33FFA1',
    characterDescription: 'Business casual, clipboard and umbrella (symbolizing coverage). Shielding with umbrella or shaking hands.'
  },
  'crypto': {
    name: 'Crypto Project Leader',
    description: 'Specialized in blockchain technology, token economics, and community engagement for crypto professionals.',
    tagline: 'Your AI will help you draft whitepapers, create token explanations, and monitor market trends.',
    color: '#FFD700',
    characterDescription: 'Futuristic armor/techwear, floating coins and a digital wallet. Flipping tokens or typing on a holographic screen.'
  },
  'event-planner': {
    name: 'Event Planner',
    description: 'Focused on event coordination, vendor management, and client experience for event planning professionals.',
    tagline: 'Your AI will help you create event timelines, manage vendor contacts, and draft client proposals.',
    color: '#FF33F5',
    characterDescription: 'Dressed sharp, holding a clipboard and balloon/confetti cannon. Popping confetti or pointing at a venue layout.'
  }
};

interface FallbackCharacterSelectorProps {
  selectedProfession: Profession;
  onSelectProfession: (profession: Profession) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const FallbackCharacterSelector: React.FC<FallbackCharacterSelectorProps> = ({
  selectedProfession,
  onSelectProfession,
  onConfirm,
  isLoading = false
}) => {
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
          <div className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 overflow-hidden border border-gray-800 shadow-lg shadow-blue-900/20 relative">
            {/* Character avatar display */}
            <div id="character-model" className="flex justify-center items-center h-80 mb-6">
              <div 
                className="w-full h-full relative rounded-xl overflow-hidden"
                style={{ backgroundColor: `${characterData[selectedProfession].color}10` }}
              >
                {/* Character base */}
                <div className="absolute inset-0 w-full h-full">
                  {/* Animated background effects */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70"></div>
                  
                  {/* Floating particles that match the character color */}
                  <div className="absolute inset-0 overflow-hidden">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div 
                        key={i}
                        className="absolute rounded-full animate-float"
                        style={{
                          width: `${Math.random() * 10 + 2}px`,
                          height: `${Math.random() * 10 + 2}px`,
                          backgroundColor: characterData[selectedProfession].color,
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          opacity: Math.random() * 0.5 + 0.2,
                          animationDuration: `${Math.random() * 10 + 5}s`,
                          animationDelay: `${Math.random() * 5}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Character figure - Detailed profession-based representations */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60">
                  {selectedProfession === 'real-estate' && (
                    <div className="character-real-estate">
                      {/* Body base */}
                      <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 w-32 h-48 rounded-lg bg-gradient-to-b from-slate-700 to-slate-600 animate-sway"></div>
                      
                      {/* Shirt collar */}
                      <div className="absolute top-[36%] left-1/2 transform -translate-x-1/2 w-26 h-6 rounded-t-lg bg-white"></div>
                      
                      {/* Tie */}
                      <div className="absolute top-[41%] left-1/2 transform -translate-x-1/2 w-7 h-12 bg-gradient-to-b from-red-600 to-red-700 rounded-b-lg"></div>
                      
                      {/* Head with face details */}
                      <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full bg-[#F2D2BD]">
                        {/* Eyes */}
                        <div className="absolute top-[35%] left-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] left-[25%] w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                        </div>
                        <div className="absolute top-[35%] right-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                        </div>
                        
                        {/* Smile */}
                        <div className="absolute top-[60%] left-[35%] right-[35%] h-2 border-b-2 border-gray-800 rounded-full"></div>
                        
                        {/* Hair */}
                        <div className="absolute top-[-5%] left-[5%] right-[5%] h-10 bg-brown-600 rounded-t-full bg-amber-900"></div>
                      </div>
                      
                      {/* Arms */}
                      <div className="absolute top-[45%] left-[5%] w-4 h-20 bg-slate-700 rounded-full animate-presentation"></div>
                      <div className="absolute top-[45%] right-[5%] w-4 h-20 bg-slate-700 rounded-full transform rotate-[25deg]"></div>
                      
                      {/* Property hologram in hand */}
                      <div className="absolute bottom-[35%] right-[15%] w-28 h-20 rounded-md border-2 border-blue-400 opacity-80 animate-float-house glow-effect">
                        {/* House silhouette */}
                        <div className="absolute top-[20%] left-[20%] w-15 h-10 bg-blue-400 opacity-60 rounded-sm"></div>
                        <div className="absolute top-[10%] left-[25%] right-[25%] bottom-[50%] bg-transparent border-t-[10px] border-l-[10px] border-r-[10px] border-blue-400 opacity-60"></div>
                      </div>
                      
                      {/* Keys with keyring */}
                      <div className="absolute bottom-[30%] left-[20%] w-6 h-6 rounded-full bg-yellow-400 animate-bounce-slow">
                        <div className="absolute top-[-20%] left-[40%] w-1 h-5 bg-gray-400 rounded-full"></div>
                        <div className="absolute top-[-30%] left-[25%] w-3 h-3 border-2 border-gray-400 rounded-full"></div>
                        <div className="absolute top-[-10%] left-[0%] w-3 h-1 bg-gray-700"></div>
                        <div className="absolute top-[-10%] left-[60%] w-3 h-1 bg-gray-700"></div>
                      </div>
                      
                      {/* Tablet showing property details */}
                      <div className="absolute top-[50%] left-[18%] w-14 h-10 rounded-md bg-gray-200 animate-float-slow">
                        <div className="absolute inset-1 flex flex-col justify-around">
                          <div className="h-1 bg-blue-400 rounded-full w-2/3"></div>
                          <div className="h-0.5 bg-gray-400 rounded-full w-full"></div>
                          <div className="h-0.5 bg-gray-400 rounded-full w-full"></div>
                          <div className="h-0.5 bg-gray-400 rounded-full w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedProfession === 'ecommerce' && (
                    <div className="character-ecommerce">
                      {/* Modern hoodie */}
                      <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 w-36 h-44 bg-gradient-to-b from-blue-600 to-blue-500 rounded-xl animate-sway">
                        {/* Hoodie strings */}
                        <div className="absolute top-[5%] left-[25%] w-1 h-8 bg-white transform rotate-3 rounded-full"></div>
                        <div className="absolute top-[5%] right-[25%] w-1 h-6 bg-white transform -rotate-3 rounded-full"></div>
                        
                        {/* Logo on hoodie */}
                        <div className="absolute top-[25%] left-[35%] w-12 h-12 bg-white rounded-full flex items-center justify-center">
                          <div className="w-7 h-7 bg-blue-500 rounded-sm transform rotate-45"></div>
                        </div>
                      </div>
                      
                      {/* Head with trendy details */}
                      <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full bg-[#E8BEAC]">
                        {/* Eyes */}
                        <div className="absolute top-[35%] left-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] left-[25%] w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                        </div>
                        <div className="absolute top-[35%] right-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                        </div>
                        
                        {/* Modern hairstyle */}
                        <div className="absolute top-[-10%] left-[0%] w-24 h-12 bg-black rounded-t-2xl"></div>
                        
                        {/* Beard */}
                        <div className="absolute bottom-[10%] left-[25%] right-[25%] h-4 bg-black rounded-b-xl opacity-60"></div>
                        
                        {/* Expression - concentrated */}
                        <div className="absolute top-[60%] left-[40%] right-[40%] h-0.5 bg-gray-700"></div>
                      </div>
                      
                      {/* AR/VR Headset */}
                      <div className="absolute top-[28%] left-1/2 transform -translate-x-1/2 w-28 h-10 bg-gray-800 rounded-lg">
                        <div className="absolute inset-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-md opacity-40 animate-pulse"></div>
                      </div>
                      
                      {/* Floating e-commerce interfaces */}
                      <div className="absolute top-[40%] right-[15%] w-24 h-16 rounded-md bg-white animate-float-slow shadow-lg">
                        {/* Product listings */}
                        <div className="absolute inset-1 grid grid-cols-2 gap-1">
                          <div className="bg-blue-100 rounded-sm"></div>
                          <div className="bg-green-100 rounded-sm"></div>
                          <div className="bg-yellow-100 rounded-sm"></div>
                          <div className="bg-red-100 rounded-sm"></div>
                        </div>
                        
                        {/* Cart icon */}
                        <div className="absolute top-[-8px] right-[-8px] w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-sm"></div>
                        </div>
                      </div>
                      
                      {/* Shopping cart analytics */}
                      <div className="absolute top-[55%] left-[20%] w-16 h-20 bg-gray-100 rounded-md animate-float-slow">
                        <div className="absolute top-[20%] left-[20%] right-[20%] h-1 bg-green-500 rounded-full"></div>
                        <div className="absolute top-[40%] left-[20%] right-[40%] h-1 bg-blue-500 rounded-full"></div>
                        <div className="absolute top-[60%] left-[20%] right-[60%] h-1 bg-yellow-500 rounded-full"></div>
                        <div className="absolute top-[80%] left-[20%] right-[30%] h-1 bg-purple-500 rounded-full"></div>
                      </div>
                      
                      {/* Hovering notifications */}
                      <div className="absolute top-[30%] left-[15%] w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center animate-bounce-slow">+1</div>
                      <div className="absolute top-[25%] left-[25%] w-4 h-4 bg-blue-500 rounded-full animate-float"></div>
                    </div>
                  )}
                  
                  {selectedProfession === 'content-creator' && (
                    <div className="character-content-creator">
                      {/* Trendy outfit */}
                      <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 w-32 h-44 bg-gradient-to-b from-pink-500 to-purple-600 rounded-xl animate-sway">
                        {/* Brand logo */}
                        <div className="absolute top-[30%] left-[35%] w-10 h-10 bg-white rounded-full">
                          <div className="absolute inset-2 bg-pink-400 rounded-sm transform rotate-45"></div>
                        </div>
                      </div>
                      
                      {/* Head with stylish details */}
                      <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full bg-[#FFE0BD]">
                        {/* Eyes with makeup */}
                        <div className="absolute top-[35%] left-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] left-[25%] w-1.5 h-1.5 rounded-full bg-purple-700"></div>
                          <div className="absolute top-[-50%] left-[-20%] right-[-20%] h-0.5 bg-black rounded-lg"></div>
                        </div>
                        <div className="absolute top-[35%] right-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-purple-700"></div>
                          <div className="absolute top-[-50%] left-[-20%] right-[-20%] h-0.5 bg-black rounded-lg"></div>
                        </div>
                        
                        {/* Styled hair */}
                        <div className="absolute top-[-15%] left-[-5%] right-[-5%] h-12 bg-purple-300 rounded-t-3xl"></div>
                        <div className="absolute top-[-10%] right-[-10%] w-10 h-14 bg-purple-300 rounded-tr-3xl transform rotate-12"></div>
                        
                        {/* Makeup - blush */}
                        <div className="absolute top-[50%] left-[20%] w-4 h-2 bg-pink-300 rounded-full opacity-60"></div>
                        <div className="absolute top-[50%] right-[20%] w-4 h-2 bg-pink-300 rounded-full opacity-60"></div>
                        
                        {/* Bright smile */}
                        <div className="absolute top-[60%] left-[30%] right-[30%] h-3 bg-white rounded-full border border-gray-300"></div>
                      </div>
                      
                      {/* Professional camera */}
                      <div className="absolute top-[37%] right-[10%] w-14 h-10 bg-black rounded-md">
                        <div className="absolute top-[-5px] left-[30%] w-6 h-6 bg-gray-700 rounded-full">
                          <div className="absolute inset-1 bg-gray-900 rounded-full">
                            <div className="absolute inset-1 bg-blue-400 rounded-full opacity-30"></div>
                          </div>
                        </div>
                        <div className="absolute top-[30%] right-[-5px] w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                      
                      {/* Ring light */}
                      <div className="absolute top-[15%] left-1/2 transform -translate-x-1/2 -translate-y-[30%] w-40 h-40 rounded-full border-4 border-gray-200 opacity-40 animate-pulse glow-effect">
                        <div className="absolute inset-3 rounded-full border-2 border-gray-200 opacity-60"></div>
                      </div>
                      
                      {/* Pro microphone */}
                      <div className="absolute top-[35%] left-[10%] w-3 h-16 bg-gray-800 rounded-full">
                        <div className="absolute top-[-8px] w-full h-8 bg-gray-300 rounded-lg">
                          <div className="absolute inset-1 bg-gray-400 rounded-md"></div>
                        </div>
                      </div>
                      
                      {/* Social media icons floating */}
                      <div className="absolute top-[25%] left-[25%] w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center animate-float text-white text-xs font-bold">f</div>
                      <div className="absolute top-[20%] right-[30%] w-6 h-6 bg-pink-500 rounded-full animate-float-slow"></div>
                      <div className="absolute top-[55%] left-[15%] w-6 h-6 bg-red-600 rounded-sm animate-float-slow transform rotate-45"></div>
                      
                      {/* Headphones */}
                      <div className="absolute top-[28%] left-1/2 transform -translate-x-1/2 w-28 h-6 bg-transparent border-t-4 border-purple-500 rounded-t-full"></div>
                      <div className="absolute top-[29%] left-[20%] w-4 h-8 bg-purple-500 rounded-lg"></div>
                      <div className="absolute top-[29%] right-[20%] w-4 h-8 bg-purple-500 rounded-lg"></div>
                    </div>
                  )}
                  
                  {selectedProfession === 'law-firm' && (
                    <div className="character-law-firm">
                      {/* Formal suit */}
                      <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 w-34 h-48 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg animate-sway">
                        {/* Lapels */}
                        <div className="absolute top-[5%] left-[20%] w-4 h-12 bg-gray-700 rounded-br-xl transform rotate-[15deg]"></div>
                        <div className="absolute top-[5%] right-[20%] w-4 h-12 bg-gray-700 rounded-bl-xl transform -rotate-[15deg]"></div>
                        
                        {/* Suit buttons */}
                        <div className="absolute top-[30%] left-[45%] w-3 h-3 bg-gray-600 rounded-full"></div>
                        <div className="absolute top-[40%] left-[45%] w-3 h-3 bg-gray-600 rounded-full"></div>
                      </div>
                      
                      {/* White dress shirt */}
                      <div className="absolute top-[34%] left-1/2 transform -translate-x-1/2 w-20 h-18 bg-white rounded-t-lg">
                        {/* Shirt collar */}
                        <div className="absolute top-[-5%] left-[5%] w-8 h-5 bg-white transform rotate-[20deg] rounded-t-lg"></div>
                        <div className="absolute top-[-5%] right-[5%] w-8 h-5 bg-white transform -rotate-[20deg] rounded-t-lg"></div>
                      </div>
                      
                      {/* Formal tie */}
                      <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 w-7 h-15 bg-gradient-to-b from-blue-800 to-blue-700 rounded-b-lg">
                        <div className="absolute top-[10%] left-[40%] w-1 h-10 bg-blue-600"></div>
                        <div className="absolute bottom-[20%] left-[30%] w-3 h-2 bg-blue-900 rounded-sm transform skew-x-12"></div>
                      </div>
                      
                      {/* Distinguished head */}
                      <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full bg-[#E6BEA6]">
                        {/* Serious eyes */}
                        <div className="absolute top-[35%] left-[30%] w-3 h-1.5 bg-white rounded-full">
                          <div className="absolute inset-y-0 left-[30%] w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                          <div className="absolute top-[-100%] left-[0%] right-[0%] h-0.5 bg-gray-700 rounded-full"></div>
                        </div>
                        <div className="absolute top-[35%] right-[30%] w-3 h-1.5 bg-white rounded-full">
                          <div className="absolute inset-y-0 right-[30%] w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                          <div className="absolute top-[-100%] left-[0%] right-[0%] h-0.5 bg-gray-700 rounded-full"></div>
                        </div>
                        
                        {/* Professional hairstyle */}
                        <div className="absolute top-[-5%] left-[0%] right-[0%] h-8 bg-gray-700 rounded-t-xl"></div>
                        
                        {/* Stern expression */}
                        <div className="absolute top-[65%] left-[35%] right-[35%] h-0.5 bg-gray-800"></div>
                      </div>
                      
                      {/* Gavel */}
                      <div className="absolute top-[40%] right-[15%] w-20 h-8 transform rotate-[30deg]">
                        <div className="absolute left-0 top-0 w-12 h-4 bg-amber-800 rounded-md"></div>
                        <div className="absolute left-8 top-[-6px] w-10 h-10 bg-amber-700 rounded-lg animate-hammer"></div>
                      </div>
                      
                      {/* Legal scales of justice */}
                      <div className="absolute top-[25%] right-[25%] w-20 h-16 animate-float-slow">
                        <div className="absolute top-0 left-[45%] w-2 h-8 bg-gray-800 rounded-full"></div>
                        <div className="absolute top-[8px] left-[30%] right-[30%] h-1 bg-gray-800 rounded-full"></div>
                        <div className="absolute top-[8px] left-[10%] w-6 h-6 border-2 border-gray-700 rounded-full bg-transparent"></div>
                        <div className="absolute top-[8px] right-[10%] w-6 h-6 border-2 border-gray-700 rounded-full bg-transparent"></div>
                      </div>
                      
                      {/* Legal documents */}
                      <div className="absolute bottom-[30%] left-[15%] transform -rotate-[5deg]">
                        <div className="w-14 h-16 bg-gray-100 rounded-sm">
                          <div className="absolute inset-2 flex flex-col justify-around">
                            <div className="h-0.5 bg-gray-400 rounded-full"></div>
                            <div className="h-0.5 bg-gray-400 rounded-full"></div>
                            <div className="h-0.5 bg-gray-400 rounded-full"></div>
                            <div className="h-0.5 bg-gray-400 rounded-full"></div>
                            <div className="h-0.5 bg-gray-400 rounded-full"></div>
                          </div>
                        </div>
                        <div className="absolute top-[-3px] left-[2px] w-14 h-16 bg-gray-200 rounded-sm -z-10"></div>
                        <div className="absolute top-[-6px] left-[4px] w-14 h-16 bg-gray-300 rounded-sm -z-20"></div>
                      </div>
                    </div>
                  )}
                  
                  {selectedProfession === 'marketing-agency' && (
                    <div className="character-marketing">
                      {/* Stylish outfit */}
                      <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 w-32 h-44 bg-gradient-to-b from-purple-700 to-purple-500 rounded-lg animate-sway">
                        {/* Fashion details */}
                        <div className="absolute top-[5%] left-[10%] right-[10%] h-6 bg-purple-400 rounded-full"></div>
                      </div>
                      
                      {/* Creative head */}
                      <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full bg-[#FFDBAC]">
                        {/* Expressive eyes */}
                        <div className="absolute top-[35%] left-[25%] w-4 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] left-[25%] w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                        <div className="absolute top-[35%] right-[25%] w-4 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] right-[25%] w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                        
                        {/* Artistic hairstyle */}
                        <div className="absolute top-[-15%] left-[-5%] right-[-5%] h-12 bg-black rounded-t-3xl">
                          <div className="absolute right-[10%] w-8 h-4 bg-purple-400 rounded-tr-lg"></div>
                        </div>
                        
                        {/* Creative smile */}
                        <div className="absolute top-[65%] left-[30%] right-[30%] h-1 border-b-2 border-gray-700 rounded-full"></div>
                      </div>
                      
                      {/* Multiple floating UI elements - campaign dashboards */}
                      <div className="absolute top-[35%] right-[10%] w-18 h-12 bg-white rounded-md shadow-lg animate-float-slow">
                        {/* Growth chart */}
                        <div className="absolute inset-1">
                          <div className="absolute bottom-0 left-0 w-2 h-4 bg-green-500 rounded-sm"></div>
                          <div className="absolute bottom-0 left-[25%] w-2 h-5 bg-green-500 rounded-sm"></div>
                          <div className="absolute bottom-0 left-[50%] w-2 h-3 bg-green-500 rounded-sm"></div>
                          <div className="absolute bottom-0 left-[75%] w-2 h-6 bg-green-500 rounded-sm"></div>
                        </div>
                      </div>
                      
                      {/* Ad creative design */}
                      <div className="absolute top-[25%] right-[25%] w-12 h-10 bg-blue-100 rounded-md border border-blue-300 animate-float">
                        <div className="absolute top-[20%] left-[20%] right-[20%] h-2 bg-blue-300 rounded-sm"></div>
                        <div className="absolute bottom-[20%] left-[20%] right-[20%] h-3 bg-blue-200 rounded-sm"></div>
                      </div>
                      
                      {/* Social media metrics */}
                      <div className="absolute top-[45%] right-[30%] w-10 h-10 bg-pink-100 rounded-full border border-pink-300 animate-float-slow">
                        <div className="absolute inset-2 flex items-center justify-center">
                          <div className="w-4 h-4 bg-pink-400 rounded-sm transform rotate-45"></div>
                        </div>
                      </div>
                      
                      {/* Marketing strategy tablet */}
                      <div className="absolute top-[50%] left-[15%] w-16 h-12 bg-gray-800 rounded-lg animate-float-slow">
                        <div className="absolute inset-1 bg-gradient-to-br from-purple-800 to-blue-800 rounded-md">
                          <div className="absolute top-[20%] left-[10%] right-[10%] h-0.5 bg-white rounded-full"></div>
                          <div className="absolute top-[40%] left-[10%] right-[30%] h-0.5 bg-white rounded-full"></div>
                          <div className="absolute top-[60%] left-[10%] right-[50%] h-0.5 bg-white rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* Brand color palette */}
                      <div className="absolute top-[30%] left-[20%] flex animate-pulse">
                        <div className="w-3 h-6 bg-red-500 rounded-l-sm"></div>
                        <div className="w-3 h-6 bg-blue-500"></div>
                        <div className="w-3 h-6 bg-green-500"></div>
                        <div className="w-3 h-6 bg-yellow-500 rounded-r-sm"></div>
                      </div>
                    </div>
                  )}
                  
                  {selectedProfession === 'insurance' && (
                    <div className="character-insurance">
                      {/* Professional attire */}
                      <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 w-32 h-44 bg-gradient-to-b from-teal-700 to-teal-600 rounded-lg animate-sway">
                        {/* Jacket lapels */}
                        <div className="absolute top-[10%] left-[20%] w-3 h-8 bg-teal-500 rounded-br-lg transform rotate-[15deg]"></div>
                        <div className="absolute top-[10%] right-[20%] w-3 h-8 bg-teal-500 rounded-bl-lg transform -rotate-[15deg]"></div>
                        
                        {/* Company logo pin */}
                        <div className="absolute top-[15%] left-[30%] w-5 h-5 bg-white rounded-full">
                          <div className="absolute inset-1 bg-teal-400 rounded-sm"></div>
                        </div>
                      </div>
                      
                      {/* Shirt and tie */}
                      <div className="absolute top-[36%] left-1/2 transform -translate-x-1/2 w-20 h-14 bg-white rounded-t-lg"></div>
                      <div className="absolute top-[42%] left-1/2 transform -translate-x-1/2 w-6 h-12 bg-teal-800 rounded-b-lg"></div>
                      
                      {/* Trustworthy face */}
                      <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full bg-[#F1C27D]">
                        {/* Kind eyes */}
                        <div className="absolute top-[35%] left-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] left-[25%] w-1.5 h-1.5 rounded-full bg-blue-700"></div>
                        </div>
                        <div className="absolute top-[35%] right-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-blue-700"></div>
                        </div>
                        
                        {/* Professional hair */}
                        <div className="absolute top-[-5%] left-[-5%] right-[-5%] h-10 bg-gray-500 rounded-t-xl"></div>
                        
                        {/* Reassuring smile */}
                        <div className="absolute top-[60%] left-[30%] right-[30%] h-2 border-b-2 border-gray-700 rounded-full"></div>
                      </div>
                      
                      {/* Insurance policy document */}
                      <div className="absolute top-[45%] left-[15%] w-14 h-18 bg-white rounded-sm shadow-md animate-float-slow transform -rotate-[5deg]">
                        <div className="absolute top-[10%] left-[20%] right-[20%] h-1 bg-gray-400 rounded-full"></div>
                        <div className="absolute top-[25%] left-[20%] right-[20%] h-1 bg-gray-400 rounded-full"></div>
                        <div className="absolute top-[40%] left-[20%] right-[40%] h-1 bg-gray-400 rounded-full"></div>
                        <div className="absolute top-[55%] left-[20%] right-[60%] h-1 bg-gray-400 rounded-full"></div>
                        
                        {/* Insurance stamp */}
                        <div className="absolute bottom-[15%] right-[15%] w-5 h-5 rounded-full border-2 border-teal-600">
                          <div className="absolute inset-1 flex items-center justify-center">
                            <div className="w-2 h-2 bg-teal-600 rounded-sm"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Protective umbrella symbol */}
                      <div className="absolute top-[25%] right-[20%] animate-umbrella transform">
                        <div className="w-24 h-20 relative">
                          <div className="absolute top-0 left-0 right-0 h-3 bg-transparent border-t-[10px] border-teal-400 rounded-t-full"></div>
                          <div className="absolute top-[10px] left-[45%] w-2 h-16 bg-teal-500 rounded-full"></div>
                          <div className="absolute top-[5px] left-[10%] w-1 h-4 bg-teal-500 rounded-full transform -rotate-[30deg]"></div>
                          <div className="absolute top-[5px] right-[10%] w-1 h-4 bg-teal-500 rounded-full transform rotate-[30deg]"></div>
                        </div>
                      </div>
                      
                      {/* Shield protection icon */}
                      <div className="absolute top-[45%] right-[25%] w-12 h-14 animate-pulse-slight">
                        <div className="w-full h-full bg-teal-200 rounded-t-2xl rounded-b-lg border-2 border-teal-500">
                          <div className="absolute inset-2 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-teal-600 rounded-full"></div>
                            <div className="absolute top-[45%] left-[35%] w-1 h-2 bg-teal-600 transform rotate-45"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedProfession === 'crypto' && (
                    <div className="character-crypto">
                      {/* Futuristic outfit */}
                      <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 w-36 h-44 bg-gradient-to-b from-gray-900 via-gray-800 to-yellow-900 rounded-lg">
                        {/* Tech patterns */}
                        <div className="absolute inset-y-0 left-[10%] w-1 h-full bg-yellow-500 opacity-40"></div>
                        <div className="absolute inset-y-0 right-[10%] w-1 h-full bg-yellow-500 opacity-40"></div>
                        <div className="absolute inset-x-0 top-[30%] h-1 w-full bg-yellow-500 opacity-40"></div>
                        <div className="absolute inset-x-0 bottom-[20%] h-1 w-full bg-yellow-500 opacity-40"></div>
                      </div>
                      
                      {/* Tech-enhanced head */}
                      <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full bg-[#E6BE8A]">
                        {/* High-tech eye interface */}
                        <div className="absolute top-[35%] left-[20%] right-[20%] h-3 bg-black rounded-lg">
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 opacity-70 animate-pulse"></div>
                        </div>
                        
                        {/* Sleek hairstyle */}
                        <div className="absolute top-[-10%] left-[0%] right-[0%] h-10 bg-gray-900 rounded-t-2xl"></div>
                        
                        {/* Determined expression */}
                        <div className="absolute top-[65%] left-[35%] right-[35%] h-1 bg-gray-800 rounded-full"></div>
                      </div>
                      
                      {/* Holographic displays */}
                      <div className="absolute top-[25%] right-[15%] w-20 h-15 perspective-effect">
                        <div className="absolute inset-0 border-2 border-yellow-400 bg-black/30 rounded-lg animate-pulse-slight glow-effect">
                          {/* Chart pattern */}
                          <div className="absolute bottom-[20%] left-[10%] right-[10%] h-0.5 opacity-80">
                            <svg width="100%" height="100%" viewBox="0 0 100 20">
                              <polyline points="0,10 20,15 40,5 60,20 80,10 100,15" fill="none" stroke="#F0B90B" strokeWidth="2"/>
                            </svg>
                          </div>
                          {/* Price data */}
                          <div className="absolute top-[20%] left-[20%] right-[20%] h-2 flex justify-between">
                            <div className="h-2 w-8 bg-green-500 rounded-sm"></div>
                            <div className="h-2 w-4 bg-red-500 rounded-sm"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Floating crypto coins */}
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div 
                          key={i}
                          className="absolute rounded-full border-2 border-yellow-400 animate-float-slow glow-effect"
                          style={{
                            width: `${Math.random() * 10 + 8}px`,
                            height: `${Math.random() * 10 + 8}px`,
                            right: `${Math.random() * 40 + 10}%`,
                            top: `${Math.random() * 50 + 10}%`,
                            opacity: Math.random() * 0.7 + 0.3,
                            animationDuration: `${Math.random() * 8 + 4}s`,
                            animationDelay: `${Math.random() * 3}s`
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center text-yellow-400 text-[6px] font-bold">
                            {['₿', 'Ξ', 'Ł', '₮', '₳', 'Ð'][Math.floor(Math.random() * 6)]}
                          </div>
                        </div>
                      ))}
                      
                      {/* Advanced crypto trading interface */}
                      <div className="absolute top-[50%] left-[15%] w-16 h-12 bg-gray-900 rounded-md border border-yellow-500 animate-float-slow">
                        <div className="absolute inset-1 flex flex-col justify-around">
                          <div className="h-0.5 bg-yellow-400 rounded-full"></div>
                          <div className="h-0.5 bg-green-400 rounded-full w-3/4"></div>
                          <div className="h-0.5 bg-red-400 rounded-full w-1/2"></div>
                          <div className="flex justify-between h-1">
                            <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                            <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                            <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Digital wallet */}
                      <div className="absolute bottom-[25%] right-[25%] w-14 h-8 bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-md animate-pulse-slight">
                        <div className="absolute inset-1 bg-gray-900 rounded-sm">
                          <div className="absolute inset-1 flex items-center justify-center">
                            <div className="w-2 h-4 bg-yellow-400 rounded-sm"></div>
                            <div className="w-2 h-4 bg-yellow-500 rounded-sm ml-1"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedProfession === 'event-planner' && (
                    <div className="character-event-planner">
                      {/* Fashionable outfit */}
                      <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 w-32 h-44 bg-gradient-to-b from-pink-700 to-pink-600 rounded-lg animate-sway">
                        {/* Style elements */}
                        <div className="absolute top-[10%] left-[30%] right-[30%] h-4 bg-white rounded-full"></div>
                        <div className="absolute top-[25%] left-[35%] right-[35%] h-3 bg-pink-500 rounded-full"></div>
                      </div>
                      
                      {/* Creative head */}
                      <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full bg-[#FFE0BD]">
                        {/* Expressive eyes */}
                        <div className="absolute top-[35%] left-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] left-[25%] w-1.5 h-1.5 rounded-full bg-violet-700"></div>
                        </div>
                        <div className="absolute top-[35%] right-[30%] w-3 h-2 bg-white rounded-full">
                          <div className="absolute top-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-violet-700"></div>
                        </div>
                        
                        {/* Stylish hair */}
                        <div className="absolute top-[-10%] left-[-5%] right-[-5%] h-12 bg-[#A05C32] rounded-t-3xl">
                          <div className="absolute left-[20%] bottom-[-10%] w-5 h-14 bg-[#A05C32] rounded-br-3xl transform skew-x-12"></div>
                        </div>
                        
                        {/* Excited smile */}
                        <div className="absolute top-[60%] left-[30%] right-[30%] h-2 border-b-2 border-gray-800 rounded-full transform scale-y-[-1]"></div>
                      </div>
                      
                      {/* Event clipboard */}
                      <div className="absolute top-[45%] left-[15%] w-14 h-18 bg-white rounded-md shadow-md animate-float-slow transform -rotate-[5deg]">
                        {/* Clipboard clip */}
                        <div className="absolute top-[-5px] left-[30%] right-[30%] h-3 bg-gray-400 rounded-t-lg"></div>
                        
                        {/* Event notes */}
                        <div className="absolute top-[15%] left-[15%] right-[15%] h-1 bg-pink-300 rounded-full"></div>
                        <div className="absolute top-[30%] left-[15%] right-[15%] h-1 bg-pink-300 rounded-full"></div>
                        <div className="absolute top-[45%] left-[15%] right-[40%] h-1 bg-pink-300 rounded-full"></div>
                        
                        {/* Event checklist */}
                        <div className="absolute top-[65%] left-[15%] flex items-center">
                          <div className="w-2 h-2 border border-pink-600 rounded-sm">
                            <div className="w-full h-full bg-pink-500 rounded-sm"></div>
                          </div>
                          <div className="w-6 h-1 bg-pink-300 rounded-full ml-1"></div>
                        </div>
                        <div className="absolute top-[80%] left-[15%] flex items-center">
                          <div className="w-2 h-2 border border-pink-600 rounded-sm">
                            <div className="w-full h-full bg-pink-500 rounded-sm"></div>
                          </div>
                          <div className="w-8 h-1 bg-pink-300 rounded-full ml-1"></div>
                        </div>
                      </div>
                      
                      {/* Party decorations - floating balloons */}
                      <div className="absolute top-[20%] right-[20%] animate-float-slow">
                        <div className="w-5 h-7 bg-red-400 rounded-full"></div>
                        <div className="absolute top-[0px] left-[-8px] w-5 h-7 bg-blue-400 rounded-full"></div>
                        <div className="absolute top-[0px] left-[8px] w-5 h-7 bg-yellow-400 rounded-full"></div>
                        <div className="absolute top-[7px] left-[0px] w-1 h-10 bg-gray-500 rounded-full"></div>
                      </div>
                      
                      {/* Floating calendar */}
                      <div className="absolute top-[35%] right-[30%] w-12 h-14 bg-white rounded-md border border-pink-400 animate-float">
                        {/* Calendar header */}
                        <div className="absolute top-0 left-0 right-0 h-3 bg-pink-400 rounded-t-md"></div>
                        
                        {/* Calendar grid */}
                        <div className="absolute top-[35%] left-[10%] right-[10%] bottom-[10%] grid grid-cols-3 grid-rows-2 gap-0.5">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div 
                              key={i} 
                              className="bg-gray-100 rounded-sm text-center" 
                              style={{
                                backgroundColor: i === 3 ? 'rgb(249 168 212)' : 'rgb(243 244 246)'
                              }}
                            ></div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Confetti launcher */}
                      <div className="absolute bottom-[30%] right-[15%] w-14 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-md transform rotate-[20deg] animate-confetti">
                        <div className="absolute left-0 top-[30%] bottom-[30%] w-[30%] bg-gray-700 rounded-l-md"></div>
                        
                        {/* Confetti particles */}
                        {Array.from({ length: 15 }).map((_, i) => (
                          <div 
                            key={i}
                            className="absolute w-2 h-2 animate-confetti-particle"
                            style={{
                              backgroundColor: ['pink', 'yellow', 'blue', 'green', 'purple', 'red', 'orange'][Math.floor(Math.random() * 7)],
                              left: '100%',
                              top: '50%',
                              opacity: Math.random() * 0.8 + 0.2,
                              transform: `rotate(${Math.random() * 360}deg)`,
                              width: `${Math.random() * 5 + 2}px`,
                              height: `${Math.random() * 5 + 2}px`,
                              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                              animationDuration: `${Math.random() * 2 + 1}s`,
                              animationDelay: `${Math.random() * 0.5}s`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Character Description Container */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2 text-white text-sm">
                    <p className="text-center text-xs text-[#33C3BD] font-medium truncate">
                      {characterData[selectedProfession].characterDescription.split('.')[0]}
                    </p>
                  </div>
                </div>
                
                {/* Full description */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/80 text-xs text-white">
                  <div className="font-semibold text-sm mb-1 text-[#33C3BD]">Animation:</div>
                  <p>{characterData[selectedProfession].characterDescription.split('.')[1]?.trim() || "Interacting with holographic elements"}</p>
                </div>
              </div>
            </div>
            
            {/* Character info */}
            <div className="mt-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent mb-4">
                {characterData[selectedProfession].name}
              </h2>
              <p className="text-gray-300 mb-4">{characterData[selectedProfession].description}</p>
              <div className="mt-4 p-4 bg-[#33C3BD]/10 rounded-lg border border-[#33C3BD]/20">
                <p className="text-white italic">{characterData[selectedProfession].tagline}</p>
              </div>
            </div>
          </div>
          
          {/* Right side - Character selection */}
          <div className="flex flex-col">
            <div className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-4 border border-gray-800 shadow-lg shadow-blue-900/20 mb-4">
              <h2 className="text-xl font-bold mb-4 text-white">Available Characters</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(characterData) as Profession[]).map((profession) => (
                  <div
                    key={profession}
                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${
                      selectedProfession === profession 
                        ? 'scale-105 ring-2 ring-[#33C3BD] shadow-lg shadow-[#33C3BD]/20 animate-pulse-subtle' 
                        : 'hover:scale-105 hover:shadow-md hover:shadow-gray-700/30'
                    }`}
                    onClick={() => onSelectProfession(profession)}
                  >
                    <div 
                      className="h-20 flex items-center justify-center p-2 text-center relative overflow-hidden"
                      style={{ backgroundColor: `${characterData[profession].color}30` }}
                    >
                      {/* Mini character preview - interactive and detailed */}
                      <div className="relative w-full h-full">
                        {/* Animated background particles */}
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div 
                            key={i}
                            className="absolute rounded-full animate-float"
                            style={{
                              width: `${Math.random() * 3 + 1}px`,
                              height: `${Math.random() * 3 + 1}px`,
                              backgroundColor: characterData[profession].color,
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              opacity: Math.random() * 0.4 + 0.2,
                              animationDuration: `${Math.random() * 8 + 3}s`,
                              animationDelay: `${Math.random() * 2}s`
                            }}
                          />
                        ))}
                        
                        {/* Profession-specific detailed mini character */}
                        {profession === 'real-estate' && (
                          <div className="mini-real-estate w-full h-full flex items-center justify-center">
                            {/* Body */}
                            <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-10 h-12 rounded-lg bg-gray-600 animate-sway"></div>
                            {/* Head */}
                            <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#F2D2BD]"></div>
                            {/* House icon */}
                            <div className="absolute top-[30%] right-[25%] w-7 h-5 rounded-sm border border-blue-400 animate-float-slow glow-effect">
                              <div className="absolute top-[-3px] left-[20%] right-[20%] h-3 border-t-[3px] border-l-[3px] border-r-[3px] border-blue-400"></div>
                            </div>
                            {/* Keys */}
                            <div className="absolute bottom-[30%] left-[30%] w-3 h-3 rounded-full bg-yellow-400 animate-bounce-slow"></div>
                          </div>
                        )}
                        
                        {profession === 'ecommerce' && (
                          <div className="mini-ecommerce w-full h-full flex items-center justify-center">
                            {/* Hoodie */}
                            <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-10 h-12 rounded-lg bg-blue-500 animate-sway"></div>
                            {/* Head */}
                            <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#E8BEAC]"></div>
                            {/* VR headset */}
                            <div className="absolute top-[28%] left-1/2 transform -translate-x-1/2 w-9 h-3 rounded-lg bg-black animate-pulse-slight"></div>
                            {/* Shopping cart icon */}
                            <div className="absolute top-[40%] right-[20%] w-6 h-5 bg-white rounded-sm animate-float-slow">
                              <div className="absolute top-[40%] left-[15%] right-[15%] h-1 bg-blue-400"></div>
                              <div className="absolute bottom-[-3px] right-[25%] w-1 h-3 bg-gray-400"></div>
                              <div className="absolute bottom-[-3px] left-[25%] w-1 h-3 bg-gray-400"></div>
                            </div>
                          </div>
                        )}
                        
                        {profession === 'content-creator' && (
                          <div className="mini-creator w-full h-full flex items-center justify-center">
                            {/* Outfit */}
                            <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-10 h-12 rounded-lg bg-pink-500 animate-sway"></div>
                            {/* Stylish head */}
                            <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#FFE0BD]">
                              {/* Cool hair */}
                              <div className="absolute top-[-4px] right-[-2px] w-5 h-6 bg-purple-300 rounded-tr-xl transform rotate-12"></div>
                            </div>
                            {/* Camera */}
                            <div className="absolute top-[32%] right-[22%] w-5 h-4 bg-black rounded-sm">
                              <div className="absolute top-[-2px] left-[30%] w-2 h-2 bg-gray-700 rounded-full"></div>
                              <div className="absolute top-[30%] right-[-2px] w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
                            </div>
                            {/* Ring light */}
                            <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full border border-gray-300 opacity-30 animate-pulse"></div>
                          </div>
                        )}
                        
                        {profession === 'law-firm' && (
                          <div className="mini-lawyer w-full h-full flex items-center justify-center">
                            {/* Suit */}
                            <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-10 h-12 rounded-lg bg-gray-800 animate-sway"></div>
                            {/* Professional head */}
                            <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#E6BEA6]"></div>
                            {/* Tie */}
                            <div className="absolute top-[38%] left-1/2 transform -translate-x-1/2 w-2 h-5 bg-blue-700"></div>
                            {/* Gavel */}
                            <div className="absolute top-[36%] right-[22%] w-5 h-2 bg-amber-800 animate-hammer">
                              <div className="absolute right-0 w-3 h-3 bg-amber-700 rounded-sm"></div>
                            </div>
                            {/* Legal document */}
                            <div className="absolute bottom-[33%] left-[25%] w-4 h-5 bg-white animate-float-slow"></div>
                          </div>
                        )}
                        
                        {profession === 'marketing-agency' && (
                          <div className="mini-marketer w-full h-full flex items-center justify-center">
                            {/* Outfit */}
                            <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-10 h-12 rounded-lg bg-purple-600 animate-sway"></div>
                            {/* Creative head */}
                            <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#FFDBAC]"></div>
                            {/* Floating charts */}
                            <div className="absolute top-[30%] right-[20%] w-4 h-3 bg-purple-400 animate-float glow-effect"></div>
                            <div className="absolute top-[25%] right-[30%] w-3 h-2 bg-blue-400 animate-float-slow opacity-70 glow-effect"></div>
                            <div className="absolute top-[35%] right-[25%] w-2 h-2 bg-green-400 animate-float opacity-70 glow-effect"></div>
                            {/* Tablet */}
                            <div className="absolute bottom-[33%] left-[25%] w-4 h-3 bg-gray-200 animate-float-slow"></div>
                          </div>
                        )}
                        
                        {profession === 'insurance' && (
                          <div className="mini-insurance w-full h-full flex items-center justify-center">
                            {/* Business outfit */}
                            <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-10 h-12 rounded-lg bg-teal-600 animate-sway"></div>
                            {/* Trustworthy head */}
                            <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#F1C27D]"></div>
                            {/* Umbrella protection */}
                            <div className="absolute top-[28%] right-[22%] animate-umbrella">
                              <div className="w-6 h-1 border-t-[3px] border-teal-400 rounded-t-full"></div>
                              <div className="absolute top-[1px] left-[45%] w-1 h-5 bg-teal-400"></div>
                            </div>
                            {/* Policy document */}
                            <div className="absolute bottom-[33%] left-[25%] w-4 h-5 bg-white animate-float-slow"></div>
                          </div>
                        )}
                        
                        {profession === 'crypto' && (
                          <div className="mini-crypto w-full h-full flex items-center justify-center">
                            {/* Tech outfit */}
                            <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-10 h-12 bg-gradient-to-b from-gray-800 to-yellow-900 animate-pulse-slight"></div>
                            {/* Futuristic head */}
                            <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#E6BE8A]">
                              <div className="absolute top-[35%] left-[15%] right-[15%] h-1 bg-yellow-400 animate-pulse"></div>
                            </div>
                            {/* Floating crypto coins */}
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div 
                                key={i}
                                className="absolute rounded-full border border-yellow-400 animate-float-slow glow-effect"
                                style={{
                                  width: `${Math.random() * 3 + 3}px`,
                                  height: `${Math.random() * 3 + 3}px`,
                                  right: `${Math.random() * 20 + 25}%`,
                                  top: `${Math.random() * 20 + 30}%`,
                                  opacity: Math.random() * 0.6 + 0.4,
                                  animationDuration: `${Math.random() * 4 + 2}s`,
                                  animationDelay: `${Math.random() * 1}s`
                                }}
                              >
                                <div className="absolute inset-0 flex items-center justify-center text-yellow-400 text-[4px] font-bold">₿</div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {profession === 'event-planner' && (
                          <div className="mini-planner w-full h-full flex items-center justify-center">
                            {/* Fashionable outfit */}
                            <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-10 h-12 rounded-lg bg-pink-700 animate-sway"></div>
                            {/* Creative head */}
                            <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#FFE0BD]"></div>
                            {/* Clipboard */}
                            <div className="absolute bottom-[35%] left-[25%] w-4 h-5 bg-white animate-float-slow"></div>
                            {/* Mini confetti */}
                            <div className="absolute top-[35%] right-[25%] w-3 h-2 bg-gray-400 animate-confetti">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div 
                                  key={i}
                                  className="absolute w-1 h-1 animate-confetti-particle"
                                  style={{
                                    backgroundColor: ['pink', 'yellow', 'blue', 'green', 'purple'][Math.floor(Math.random() * 5)],
                                    left: '100%',
                                    top: '50%',
                                    opacity: Math.random() * 0.8 + 0.2,
                                    animationDuration: `${Math.random() * 1 + 0.5}s`,
                                    animationDelay: `${Math.random() * 0.3}s`
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`p-2 bg-gray-900 ${selectedProfession === profession ? 'bg-opacity-80' : 'bg-opacity-60'} backdrop-blur-sm transition-all duration-300`}>
                      <h3 className={`text-xs font-semibold ${selectedProfession === profession ? 'text-[#33C3BD]' : 'text-white'} transition-colors duration-300 truncate`}>
                        {characterData[profession].name}
                      </h3>
                    </div>
                    
                    {selectedProfession === profession && (
                      <div className="absolute top-2 right-2 bg-[#33C3BD] rounded-full w-5 h-5 flex items-center justify-center text-black font-bold text-xs">
                        ✓
                      </div>
                    )}
                  </div>
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
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:from-[#3DD8D2] hover:to-[#0085FF] text-white rounded-lg shadow-lg shadow-blue-700/20 transition-all"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    'Confirm Selection'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FallbackCharacterSelector;