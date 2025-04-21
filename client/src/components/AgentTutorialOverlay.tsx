import { useState, useEffect, useRef } from "react";
import { 
  X, Settings, Sparkles, Mic, Phone, ChevronRight, 
  ChevronLeft, Check, Users, Calendar, Clock, PlayCircle, 
  Save, PanelRight, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define the tutorial step interface
interface TutorialStep {
  title: string;
  description: string;
  targetTab: string;
  icon: React.ReactNode;
  highlight?: string;
  detailSteps?: {
    title: string;
    description: string;
    targetElement?: string;
  }[];
  animation?: "pulse" | "bounce" | "highlight" | "arrow";
  action?: "click" | "scroll" | "input" | "wait";
  leadsManagement?: boolean;
}

// Define props for the component
interface AgentTutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onTabChange: (tab: string) => void;
  currentTab: string;
}

export function AgentTutorialOverlay({
  isOpen,
  onClose,
  onTabChange,
  currentTab
}: AgentTutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentDetailStep, setCurrentDetailStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  // Define tutorial steps with expanded content
  const tutorialSteps: TutorialStep[] = [
    {
      title: "1. Basic Settings",
      description: "Start by filling out the basic information for your AI agent, including name, description, and system prompt. This helps personalize your agent and define how it will interact with your clients.",
      targetTab: "basic",
      icon: <Settings className="h-6 w-6" />,
      highlight: "basic-settings",
      animation: "highlight",
      detailSteps: [
        {
          title: "Name Your Agent",
          description: "Give your AI agent a professional name that reflects its purpose. For example, 'Sales Assistant', 'Customer Support Agent', or 'Lead Qualifier'."
        },
        {
          title: "Add a Description",
          description: "Briefly describe what your agent does. This helps you identify the purpose of each agent if you create multiple ones."
        },
        {
          title: "Define System Prompt",
          description: "The system prompt provides detailed instructions to your AI about how to behave. Be specific about your business, target audience, and communication style."
        },
        {
          title: "Knowledge Base",
          description: "Add product details, FAQs, pricing, and other essential information your AI will need to answer questions accurately. You can also import content directly from your website."
        }
      ]
    },
    {
      title: "2. Choose AI Personality",
      description: "Select from our pre-defined AI personalities or create your own custom one. The personality defines how your agent will communicate and respond to different situations.",
      targetTab: "personality",
      icon: <Sparkles className="h-6 w-6" />,
      highlight: "personality-tab",
      animation: "pulse",
      detailSteps: [
        {
          title: "Select a Personality Template",
          description: "Choose from our expert-designed personalities optimized for different roles like sales, customer service, or lead qualification."
        },
        {
          title: "Customize Tone and Style",
          description: "Adjust how formal, friendly, or persuasive your AI agent will be when speaking with your leads and customers."
        },
        {
          title: "Preview Personality",
          description: "See examples of how your AI will respond in different scenarios before finalizing your selection."
        }
      ]
    },
    {
      title: "3. Select Voice",
      description: "Choose a voice for your AI agent from our wide variety of realistic voice options. The voice will be used for all phone calls and voice messages.",
      targetTab: "voice",
      icon: <Mic className="h-6 w-6" />,
      highlight: "voice-tab",
      animation: "pulse",
      detailSteps: [
        {
          title: "Browse Voice Options",
          description: "Listen to samples of different voice options that match your brand's identity."
        },
        {
          title: "Consider Your Audience",
          description: "Select a voice that will resonate with your target audience and convey professionalism and expertise."
        },
        {
          title: "Test Call Quality",
          description: "Make sure the voice sounds natural and clear over phone lines by testing a sample call."
        }
      ]
    },
    {
      title: "4. Setup Phone Number",
      description: "Purchase or select a phone number for your AI agent. This number will be used for outbound calls to your leads and for receiving inbound calls from clients.",
      targetTab: "phone",
      icon: <Phone className="h-6 w-6" />,
      highlight: "phone-tab",
      animation: "pulse",
      detailSteps: [
        {
          title: "Select Area Code",
          description: "Choose a phone number with an area code that matches your business location or target market."
        },
        {
          title: "Purchase New Number",
          description: "Get a dedicated phone number that your AI agent will use for all communications."
        },
        {
          title: "Configure Call Settings",
          description: "Set up how calls should be handled, including business hours, voicemail options, and call forwarding."
        }
      ]
    },
    {
      title: "5. Save Your Agent",
      description: "After configuring all the settings, save your AI agent to activate it. You'll need to click the Save button at the bottom of the form.",
      targetTab: "basic",
      icon: <Save className="h-6 w-6" />,
      highlight: "save-button",
      animation: "bounce"
    },
    {
      title: "6. Manage Your Leads",
      description: "Add and organize your leads for your AI agent to contact. You can import leads from a CSV file or add them manually.",
      targetTab: "basic",
      icon: <Users className="h-6 w-6" />,
      highlight: "leads-management-section", 
      leadsManagement: true,
      detailSteps: [
        {
          title: "Import Your Contacts",
          description: "Upload your existing leads from a spreadsheet or CRM system to quickly populate your contact list."
        },
        {
          title: "Add Lead Details",
          description: "Include contact information, notes about previous interactions, and any specific interests or needs."
        },
        {
          title: "Segment Your Leads",
          description: "Organize leads into categories based on their stage in the sales process, interests, or potential value."
        }
      ]
    },
    {
      title: "7. Schedule Automated Calls",
      description: "Set up when and how often your AI agent should call your leads. You can create different schedules for different groups of leads.",
      targetTab: "basic",
      icon: <Calendar className="h-6 w-6" />,
      highlight: "automated-call-scheduler",
      leadsManagement: true,
      detailSteps: [
        {
          title: "Create Call Schedule",
          description: "Define when your AI should make calls, respecting business hours and optimal contact times."
        },
        {
          title: "Set Call Frequency",
          description: "Determine how often to follow up with leads who don't answer or request a callback."
        },
        {
          title: "Define Call Objectives",
          description: "Specify what the AI should accomplish during each call, such as qualifying leads, scheduling appointments, or providing information."
        }
      ]
    },
    {
      title: "8. Monitor Performance",
      description: "Track how your AI agent is performing with call analytics, conversion rates, and recording reviews. Use this data to optimize your agent's effectiveness.",
      targetTab: "basic",
      icon: <PanelRight className="h-6 w-6" />,
      highlight: "analytics-section",
      animation: "arrow",
      leadsManagement: true,
      detailSteps: [
        {
          title: "Review Call Recordings",
          description: "Listen to actual conversations your AI has with leads to ensure quality and identify improvement opportunities."
        },
        {
          title: "Analyze Performance Metrics",
          description: "Track key performance indicators like contact rate, conversion rate, and average call duration."
        },
        {
          title: "Implement Improvements",
          description: "Based on the data, refine your AI's personality, script, or call strategy to improve results over time."
        }
      ]
    }
  ];

  // Effect to highlight elements based on current step
  useEffect(() => {
    if (!isOpen || !tutorialSteps[currentStep].highlight) return;

    const highlightElement = document.querySelector(`[data-highlight="${tutorialSteps[currentStep].highlight}"]`);
    if (highlightElement && highlightRef.current) {
      const rect = highlightElement.getBoundingClientRect();
      
      highlightRef.current.style.width = `${rect.width + 10}px`;
      highlightRef.current.style.height = `${rect.height + 10}px`;
      highlightRef.current.style.left = `${rect.left - 5}px`;
      highlightRef.current.style.top = `${rect.top - 5}px`;
      highlightRef.current.style.opacity = '1';
    } else {
      // If element not found, hide the highlight
      if (highlightRef.current) {
        highlightRef.current.style.opacity = '0';
      }
    }
  }, [isOpen, currentStep, tutorialSteps, currentTab]);

  // Change tab when step changes
  useEffect(() => {
    if (isOpen && tutorialSteps[currentStep].targetTab !== currentTab) {
      onTabChange(tutorialSteps[currentStep].targetTab);
    }
  }, [isOpen, currentStep, onTabChange, tutorialSteps, currentTab]);

  // Scroll to step when it changes
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const stepElements = containerRef.current.querySelectorAll('.tutorial-step');
      if (stepElements[currentStep]) {
        stepElements[currentStep].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isOpen, currentStep]);
  
  // Auto-advance effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isOpen && autoAdvance && currentStep < tutorialSteps.length - 1) {
      // Auto advance to next step after 5 seconds
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setCurrentDetailStep(0); // Reset detail step when moving to next main step
      }, 5000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, autoAdvance, currentStep, tutorialSteps.length]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-container" ref={containerRef}>
        <div className="tutorial-header">
          <h2 className="text-xl font-bold">AI Agent Setup Tutorial</h2>
          <button onClick={onClose} className="tutorial-close" aria-label="Close tutorial">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="tutorial-body">
          <p className="text-muted-foreground mb-6">
            Learn how to set up your AI agent in just a few steps. This tutorial will guide you through 
            the process of creating an effective AI assistant that can handle calls with your leads.
          </p>
          
          {tutorialSteps.map((step, index) => (
            <div 
              key={index} 
              className={`tutorial-step ${currentStep === index ? 'active' : ''} ${step.leadsManagement ? 'tutorial-step-leads' : ''}`}
              onClick={() => handleStepClick(index)}
            >
              <div className={`tutorial-step-icon ${step.leadsManagement ? 'tutorial-leads-icon' : ''}`}>
                {step.icon}
              </div>
              <div className="tutorial-step-content">
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  {step.title}
                  {currentStep > index && (
                    <span className="ml-2 bg-green-500/20 p-1 rounded-full">
                      <Check className="h-4 w-4 text-green-500" />
                    </span>
                  )}
                </h3>
                <p className="text-muted-foreground">{step.description}</p>
                
                {/* Show detail steps if this is the current step */}
                {currentStep === index && step.detailSteps && (
                  <div className="mt-4 space-y-3 pl-4 border-l-2 border-primary/30">
                    {step.detailSteps.map((detailStep, detailIndex) => (
                      <div 
                        key={detailIndex}
                        className={cn(
                          "p-3 rounded-md transition-all duration-300",
                          currentDetailStep === detailIndex && currentStep === index 
                            ? "bg-primary/10 border-l-2 border-primary" 
                            : "bg-background/50 hover:bg-primary/5"
                        )}
                      >
                        <h4 className="text-sm font-medium">{detailStep.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{detailStep.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Auto-advance toggle */}
          <div className="flex items-center justify-end gap-2 mt-4 mb-2">
            <label htmlFor="auto-advance" className="text-sm text-muted-foreground">
              Auto-advance through tutorial
            </label>
            <div 
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer ${autoAdvance ? 'bg-primary' : 'bg-input'}`}
              onClick={() => setAutoAdvance(!autoAdvance)}
              role="switch"
              aria-checked={autoAdvance}
              id="auto-advance"
            >
              <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${autoAdvance ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
          </div>
        </div>
        
        <div className="tutorial-footer">
          <div className="tutorial-progress">
            {tutorialSteps.map((_, index) => (
              <div 
                key={index} 
                className={`tutorial-progress-dot ${currentStep === index ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                onClick={() => handleStepClick(index)}
                title={tutorialSteps[index].title}
              />
            ))}
          </div>
          
          <div className="flex gap-2 items-center">
            {/* Detail steps navigation (only shown if current step has detail steps) */}
            {tutorialSteps[currentStep].detailSteps && tutorialSteps[currentStep].detailSteps.length > 0 && (
              <div className="flex items-center mr-4 text-xs text-muted-foreground">
                <button 
                  onClick={() => setCurrentDetailStep(Math.max(0, currentDetailStep - 1))}
                  disabled={currentDetailStep === 0}
                  className="p-1 rounded-full hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous detail"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="mx-2">
                  {currentDetailStep + 1} / {tutorialSteps[currentStep].detailSteps.length}
                </span>
                <button 
                  onClick={() => setCurrentDetailStep(Math.min(tutorialSteps[currentStep].detailSteps!.length - 1, currentDetailStep + 1))}
                  disabled={currentDetailStep === tutorialSteps[currentStep].detailSteps!.length - 1}
                  className="p-1 rounded-full hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next detail"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <Button 
              variant="outline" 
              onClick={handlePrevious} 
              disabled={currentStep === 0}
              className="flex items-center"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <Button 
              onClick={handleNext} 
              className="flex items-center"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'} 
              {currentStep < tutorialSteps.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Highlight element */}
      <div 
        ref={highlightRef} 
        className={cn(
          "tutorial-highlight", 
          tutorialSteps[currentStep].animation === "pulse" && "highlight-pulse",
          tutorialSteps[currentStep].animation === "bounce" && "highlight-bounce"
        )}
        aria-hidden="true"
      />
      
      {/* Direction arrow for specific steps */}
      {tutorialSteps[currentStep].animation === "arrow" && (
        <div
          ref={arrowRef}
          className="tutorial-arrow"
          aria-hidden="true"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}