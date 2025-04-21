import React, { createContext, useState, useContext, ReactNode } from 'react';
import { UserAgent } from '@shared/schema';

// Define the personality type to match what's used in AIPersonalitySelector
export interface Personality {
  id: string;
  name: string;
  description: string;
  traits: string[];
  systemPrompt: string;
  voiceId: string;
  avatarSrc: string;
  category: 'business' | 'creative' | 'assistant' | 'custom';
  isPopular?: boolean;
}

// Define the voice type to match what's used in VoiceSelector
export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  labels: Record<string, string>;
}

// Define the phone number types
export interface PhoneNumber {
  phoneNumber: string;
  formattedNumber: string;
  locality: string;
  region: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  price: number;
}

// Define purchased phone number type - shape from database
export interface PurchasedPhoneNumber {
  id: number;
  user_id: number;
  phone_number: string;
  friendly_name: string | null;
  phone_sid: string | null;
  is_active: boolean;
  purchase_date: string;
  monthly_cost: number;
  capabilities: string;
  assigned_to_agent_id: number | null;
  region: string | null;
  country_code: string;
}

// Define the context type
interface AgentCreationContextType {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  systemPrompt: string;
  setSystemPrompt: (systemPrompt: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  selectedPersonality: Personality | null;
  setSelectedPersonality: (personality: Personality | null) => void;
  selectedVoice: Voice | null;
  setSelectedVoice: (voice: Voice | null) => void;
  selectedPhoneNumber: PhoneNumber | PurchasedPhoneNumber | null;
  setSelectedPhoneNumber: (phoneNumber: PhoneNumber | PurchasedPhoneNumber | null) => void;
  active: boolean;
  setActive: (active: boolean) => void;
  // New message fields
  greetingMessage: string;
  setGreetingMessage: (message: string) => void;
  greetingMessageRequired: boolean;
  setGreetingMessageRequired: (required: boolean) => void;
  secondMessage: string;
  setSecondMessage: (message: string) => void;
  secondMessageRequired: boolean;
  setSecondMessageRequired: (required: boolean) => void;
  thirdMessage: string;
  setThirdMessage: (message: string) => void;
  thirdMessageRequired: boolean;
  setThirdMessageRequired: (required: boolean) => void;
  // Knowledge base
  knowledgeBase: string;
  setKnowledgeBase: (knowledgeBase: string) => void;
  isComplete: boolean;
  reset: () => void;
}

// Create the context
export const AgentCreationContext = createContext<AgentCreationContextType | undefined>(undefined);

// Create the provider component
export function AgentCreationProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [selectedPersonality, _setSelectedPersonality] = useState<Personality | null>(null);
  const [selectedVoice, _setSelectedVoice] = useState<Voice | null>(null);
  
  // Create a wrapper for setSelectedPersonality with more robust state update handling
  const setSelectedPersonality = (personality: Personality | null) => {
    console.log("AgentCreationContext: Setting personality to:", personality?.name || 'null');
    
    // Use a functional update to ensure we're working with the latest state
    _setSelectedPersonality((prevPersonality) => {
      if (!personality) {
        console.log("AgentCreationContext: Clearing personality selection");
        return null;
      }
      
      if (!prevPersonality || prevPersonality.id !== personality.id) {
        console.log("AgentCreationContext: Updating personality to:", personality.name);
        // Create a fresh object to ensure React detects the change
        return {...personality}; 
      }
      
      console.log("AgentCreationContext: Personality already selected:", prevPersonality.name);
      return prevPersonality;
    });
    
    // Add a verification step to double-check the update was processed
    setTimeout(() => {
      _setSelectedPersonality((currentPersonality) => {
        if (!currentPersonality && personality) {
          console.log("AgentCreationContext: Personality update verification failed, forcing update");
          return {...personality};
        }
        if (currentPersonality && personality && currentPersonality.id !== personality.id) {
          console.log("AgentCreationContext: Personality ID mismatch in verification, forcing update");
          return {...personality};
        }
        return currentPersonality;
      });
      console.log("AgentCreationContext: Personality set verification complete");
    }, 50);
  };
  
  // Create a wrapper for setSelectedVoice with more robust state update handling
  const setSelectedVoice = (voice: Voice | null) => {
    console.log("AgentCreationContext: Setting voice to:", voice);
    
    // Use a functional update to ensure we're working with the latest state
    _setSelectedVoice((prevVoice) => {
      if (!voice) {
        console.log("AgentCreationContext: Clearing voice selection");
        return null;
      }
      
      if (!prevVoice || prevVoice.voice_id !== voice.voice_id) {
        console.log("AgentCreationContext: Updating voice to:", voice.name);
        // Create a fresh object to ensure React detects the change
        return {...voice}; 
      }
      
      console.log("AgentCreationContext: Voice already selected:", prevVoice.name);
      return prevVoice;
    });
    
    // Add a verification step to double-check the update was processed
    setTimeout(() => {
      _setSelectedVoice((currentVoice) => {
        if (!currentVoice && voice) {
          console.log("AgentCreationContext: Voice update verification failed, forcing update");
          return {...voice};
        }
        if (currentVoice && voice && currentVoice.voice_id !== voice.voice_id) {
          console.log("AgentCreationContext: Voice ID mismatch in verification, forcing update");
          return {...voice};
        }
        return currentVoice;
      });
      console.log("AgentCreationContext: Voice set verification complete");
    }, 50);
  };
  const [selectedPhoneNumber, _setSelectedPhoneNumber] = useState<PhoneNumber | PurchasedPhoneNumber | null>(null);
  const [active, setActive] = useState<boolean>(true);
  
  // Helper functions to check the type of phone number
  const isPurchasedPhoneNumber = (obj: any): obj is PurchasedPhoneNumber => {
    return obj && 'phone_number' in obj;
  };
  
  const isPhoneNumber = (obj: any): obj is PhoneNumber => {
    return obj && 'phoneNumber' in obj && 'formattedNumber' in obj;
  };
  
  // Create a wrapper for setSelectedPhoneNumber with more robust state update handling
  const setSelectedPhoneNumber = (phoneNumber: PhoneNumber | PurchasedPhoneNumber | null) => {
    // Log with different format depending on the type
    console.log(
      "AgentCreationContext: Setting phone number to:", 
      phoneNumber ? 
        (isPhoneNumber(phoneNumber) ? phoneNumber.formattedNumber : 
         isPurchasedPhoneNumber(phoneNumber) ? phoneNumber.phone_number : 'null') 
        : 'null'
    );
    
    // Use a functional update to ensure we're working with the latest state
    _setSelectedPhoneNumber((prevPhoneNumber) => {
      if (!phoneNumber) {
        console.log("AgentCreationContext: Clearing phone number selection");
        return null;
      }
      
      // Compare based on the appropriate identifier
      const prevPhoneId = isPurchasedPhoneNumber(prevPhoneNumber) ? prevPhoneNumber.phone_number : 
                          isPhoneNumber(prevPhoneNumber) ? prevPhoneNumber.phoneNumber : null;
                          
      const newPhoneId = isPurchasedPhoneNumber(phoneNumber) ? phoneNumber.phone_number : 
                        isPhoneNumber(phoneNumber) ? phoneNumber.phoneNumber : null;
      
      if (!prevPhoneNumber || prevPhoneId !== newPhoneId) {
        console.log("AgentCreationContext: Updating phone number to:", 
          isPhoneNumber(phoneNumber) ? phoneNumber.formattedNumber : phoneNumber.phone_number
        );
        // Create a fresh object to ensure React detects the change
        return {...phoneNumber}; 
      }
      
      console.log("AgentCreationContext: Phone number already selected:", 
        isPhoneNumber(prevPhoneNumber) ? prevPhoneNumber.formattedNumber : prevPhoneNumber.phone_number
      );
      return prevPhoneNumber;
    });
    
    // Add a verification step to double-check the update was processed
    setTimeout(() => {
      _setSelectedPhoneNumber((currentPhoneNumber) => {
        if (!currentPhoneNumber && phoneNumber) {
          console.log("AgentCreationContext: Phone number update verification failed, forcing update");
          return {...phoneNumber};
        }
        
        // Compare based on the appropriate identifier for verification
        if (currentPhoneNumber && phoneNumber) {
          const currentPhoneId = isPurchasedPhoneNumber(currentPhoneNumber) ? currentPhoneNumber.phone_number : 
                                isPhoneNumber(currentPhoneNumber) ? currentPhoneNumber.phoneNumber : null;
                                
          const newPhoneId = isPurchasedPhoneNumber(phoneNumber) ? phoneNumber.phone_number : 
                            isPhoneNumber(phoneNumber) ? phoneNumber.phoneNumber : null;
          
          if (currentPhoneId !== newPhoneId) {
            console.log("AgentCreationContext: Phone number mismatch in verification, forcing update");
            return {...phoneNumber};
          }
        }
        return currentPhoneNumber;
      });
      console.log("AgentCreationContext: Phone number set verification complete");
    }, 50);
  };
  
  // New message states
  const [greetingMessage, setGreetingMessage] = useState<string>("Hello, how can I help you today?");
  const [greetingMessageRequired, setGreetingMessageRequired] = useState<boolean>(true);
  const [secondMessage, setSecondMessage] = useState<string>("");
  const [secondMessageRequired, setSecondMessageRequired] = useState<boolean>(false);
  const [thirdMessage, setThirdMessage] = useState<string>("");
  const [thirdMessageRequired, setThirdMessageRequired] = useState<boolean>(false);
  
  // Knowledge base state
  const [knowledgeBase, setKnowledgeBase] = useState<string>("");

  // Check if the form is complete with required fields
  const isComplete = Boolean(name && systemPrompt && selectedVoice?.voice_id);

  // Reset the form
  const reset = () => {
    setName('');
    setDescription('');
    setSystemPrompt('');
    setPhoneNumber('');
    setSelectedPersonality(null);
    setSelectedVoice(null);
    setSelectedPhoneNumber(null);
    setActive(true);
    setGreetingMessage("Hello, how can I help you today?");
    setGreetingMessageRequired(true);
    setSecondMessage("");
    setSecondMessageRequired(false);
    setThirdMessage("");
    setThirdMessageRequired(false);
    setKnowledgeBase("");
  };

  return (
    <AgentCreationContext.Provider
      value={{
        name,
        setName,
        description,
        setDescription,
        systemPrompt,
        setSystemPrompt,
        phoneNumber,
        setPhoneNumber,
        selectedPersonality,
        setSelectedPersonality,
        selectedVoice,
        setSelectedVoice,
        selectedPhoneNumber,
        setSelectedPhoneNumber,
        active,
        setActive,
        // New message fields
        greetingMessage,
        setGreetingMessage,
        greetingMessageRequired,
        setGreetingMessageRequired,
        secondMessage,
        setSecondMessage,
        secondMessageRequired,
        setSecondMessageRequired,
        thirdMessage,
        setThirdMessage,
        thirdMessageRequired,
        setThirdMessageRequired,
        // Knowledge base
        knowledgeBase,
        setKnowledgeBase,
        isComplete,
        reset,
      }}
    >
      {children}
    </AgentCreationContext.Provider>
  );
}

// Create a hook to use the context
export function useAgentCreation() {
  const context = useContext(AgentCreationContext);
  
  if (context === undefined) {
    throw new Error('useAgentCreation must be used within an AgentCreationProvider');
  }
  
  return context;
}