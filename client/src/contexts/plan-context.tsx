import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define plan types
export interface PlanDetails {
  id: string;
  name: string;
  price: string;
  billing: string;
  features: string[];
  hasTrial: boolean;
  trialDays?: number;
  trialIncludes?: string;
  isPopular?: boolean;
  isPremium?: boolean;
  badge?: string;
}

// Available plans data
export const availablePlans: Record<string, PlanDetails> = {
  // Jesko AI Plans
  'jesko-ai-starter': {
    id: 'jesko-ai-starter',
    name: 'Jesko AI Starter',
    price: '$18',
    billing: 'month',
    features: [
      '1 Conversational Agent',
      'Book Appointments',
      'Handle Client Queries',
      '50 Dials',
      'CRM',
      'Automated AI Calls'
    ],
    hasTrial: true,
    trialDays: 7,
    trialIncludes: '100 coins',
    badge: 'Great for Beginners'
  },
  'jesko-ai-standard': {
    id: 'jesko-ai-standard',
    name: 'Jesko AI Standard',
    price: '$49',
    billing: 'month',
    features: [
      'Everything from $18 membership +',
      '150 dials',
      '2 languages'
    ],
    hasTrial: true,
    trialDays: 7,
    trialIncludes: '100 coins'
  },
  'ai-secretary-starter': {
    id: 'ai-secretary-starter',
    name: 'AI Secretary Starter',
    price: '$99',
    billing: 'month',
    features: [
      'Custom AI Agent',
      'Book Appointments',
      'Handle Client Queries'
    ],
    hasTrial: true,
    trialDays: 3,
    trialIncludes: '50 calls/month',
    badge: 'Great for Beginners'
  },
  'ai-secretary-standard': {
    id: 'ai-secretary-standard',
    name: 'AI Secretary',
    price: '$299',
    billing: 'month',
    features: [
      'Custom AI Agent',
      'Book Appointments',
      'Handle Client Queries',
      '300 calls/month'
    ],
    hasTrial: true,
    trialDays: 3,
    trialIncludes: '300 calls/month'
  },
  'ai-secretary-pro': {
    id: 'ai-secretary-pro',
    name: 'AI Secretary Pro',
    price: '$799',
    billing: 'month',
    features: [
      '2 Agents',
      '600 calls/month',
      'Trained on FAQs and URLs',
      'Speaks 2 languages',
      'Book Appointments',
      'Handle Client Queries',
      'Custom AI Agent'
    ],
    hasTrial: false,
    isPopular: true
  },
  'ai-secretary-enterprise': {
    id: 'ai-secretary-enterprise',
    name: 'AI Secretary Enterprise',
    price: 'Custom',
    billing: 'month',
    features: [
      '10 Agents',
      'Unlimited calls',
      'Trained on FAQs and URLs',
      'Speaks 29 languages',
      'Book Appointments',
      'Handle Client Queries',
      'Custom AI Agents',
      'Dedicated Success Manager',
      'AI-Powered Objection Handling',
      'Personalized Onboarding'
    ],
    hasTrial: false,
    isPremium: true,
    badge: 'Schedule a Call'
  },
  
  // AI Tokens Packages
  '100': {
    id: '100',
    name: '100 AI Tokens',
    price: '$4.87',
    billing: 'one-time',
    features: [
      '100 AI tokens for voice generation',
      'Tokens never expire',
      'Best for small projects'
    ],
    hasTrial: false
  },
  '500': {
    id: '500',
    name: '500 AI Tokens',
    price: '$9.87',
    billing: 'one-time',
    features: [
      '500 AI tokens for voice generation',
      'Tokens never expire',
      'Most popular choice'
    ],
    hasTrial: false,
    isPopular: true
  },
  '5000': {
    id: '5000',
    name: '5000 AI Tokens',
    price: '$28.87',
    billing: 'one-time',
    features: [
      '5000 AI tokens for voice generation',
      'Tokens never expire',
      'Best value for money'
    ],
    hasTrial: false
  }
};

// Context type
type PlanContextType = {
  selectedPlan: PlanDetails | null;
  setSelectedPlan: (plan: PlanDetails | null) => void;
  selectPlanById: (id: string) => void;
  clearPlan: () => void;
};

// Create context
export const PlanContext = createContext<PlanContextType | null>(null);

// Provider component
export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);

  const selectPlanById = (id: string) => {
    console.log(`PlanContext: Selecting plan by ID "${id}"`);
    
    // Check if this is a token package
    const isTokenId = id === '100' || id === '500' || id === '5000';
    console.log(`PlanContext: Is token package: ${isTokenId}`);
    
    const plan = availablePlans[id];
    if (plan) {
      console.log(`PlanContext: Found plan:`, plan);
      setSelectedPlan(plan);
    } else {
      console.error(`PlanContext: Plan with ID "${id}" not found in availablePlans`);
      
      // Special fallback for token packages if not found in availablePlans
      if (isTokenId) {
        console.log(`PlanContext: Creating fallback token plan for ${id}`);
        const tokenPlan: PlanDetails = {
          id: id,
          name: `${id} AI Tokens`,
          price: id === '100' ? '$4.87' : id === '500' ? '$9.87' : '$28.87',
          billing: 'one-time',
          features: [`${id} AI tokens for voice generation`],
          hasTrial: false
        };
        console.log(`PlanContext: Setting fallback token plan:`, tokenPlan);
        setSelectedPlan(tokenPlan);
      }
    }
  };

  const clearPlan = () => {
    setSelectedPlan(null);
  };

  return (
    <PlanContext.Provider value={{ selectedPlan, setSelectedPlan, selectPlanById, clearPlan }}>
      {children}
    </PlanContext.Provider>
  );
};

// Custom hook to use the plan context
export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};