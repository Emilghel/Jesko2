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
    const plan = availablePlans[id];
    if (plan) {
      setSelectedPlan(plan);
    } else {
      console.error(`Plan with ID "${id}" not found`);
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