import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Settings, ChevronRight, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define the tutorial step interface
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  action: "click" | "input" | "select" | "wait";
  position: "top" | "right" | "bottom" | "left";
  requiredTab?: string;
  nextDelay?: number;
}

// Define props for the component
interface InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onTabChange: (tab: string) => void;
  currentTab: string;
}

export function InteractiveTutorial({
  isOpen,
  onClose,
  onTabChange,
  currentTab
}: InteractiveTutorialProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  // Define all tutorial steps 
  const tutorialSteps: TutorialStep[] = [
    // Basic tab
    {
      id: "welcome",
      title: "Welcome to the AI Agent Setup",
      description: "Let's build your AI agent together! I'll guide you through each step. First, let's give your agent a name.",
      targetSelector: "[name='name']",
      action: "input",
      position: "bottom",
      requiredTab: "basic",
      nextDelay: 1500
    },
    {
      id: "agent-description",
      title: "Add a Description",
      description: "Now describe what your agent does. This helps you identify different agents if you create more than one.",
      targetSelector: "[name='description']",
      action: "input",
      position: "bottom",
      requiredTab: "basic"
    },
    {
      id: "system-prompt",
      title: "Configure System Prompt",
      description: "The system prompt is crucial! It tells your AI how to behave. Be specific about your business needs and communication style.",
      targetSelector: "[name='systemPrompt']",
      action: "input",
      position: "bottom",
      requiredTab: "basic"
    },
    // Personality tab
    {
      id: "open-personality-tab",
      title: "Select AI Personality",
      description: "Now let's choose your agent's personality. Click the Personality tab.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "basic"
    },
    {
      id: "select-personality",
      title: "Choose a Personality",
      description: "Select one of these pre-designed personalities for your agent. Each one has different communication styles.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "personality"
    },
    // Voice tab
    {
      id: "open-voice-tab",
      title: "Select Agent Voice",
      description: "Great! Now let's choose a voice for your agent. Click the Voice tab.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "personality"
    },
    {
      id: "select-voice",
      title: "Choose a Voice",
      description: "Select a voice that best represents your brand. Click on one to preview how it sounds.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "voice"
    },
    // Phone tab
    {
      id: "open-phone-tab",
      title: "Set Up Phone Number",
      description: "Now let's set up a phone number for your agent. Click the Phone tab.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom", 
      requiredTab: "voice"
    },
    {
      id: "select-phone",
      title: "Choose a Phone Number",
      description: "Select a phone number for your agent to use when making calls.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "phone"
    },
    // Save agent
    {
      id: "return-to-basic",
      title: "Review Your Settings",
      description: "Now let's go back to the Basic tab to review all settings and save your agent.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "phone"
    },
    {
      id: "save-agent",
      title: "Save Your Agent",
      description: "Everything looks good! Click the Save button to create your AI agent.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "basic"
    },
    // Lead management
    {
      id: "leads-section",
      title: "Manage Your Leads",
      description: "Now let's add leads for your AI agent to contact. Scroll down to the Leads Management section.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "basic"
    },
    {
      id: "add-lead",
      title: "Add Your First Lead",
      description: "Click the 'Add Lead' button to create your first contact.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "basic"
    },
    // Call scheduling
    {
      id: "call-scheduling",
      title: "Set Up Automated Calls",
      description: "Finally, let's set up automated calls. Scroll down to the Automated Call Scheduling section.",
      targetSelector: "body", // Fallback to body to prevent errors
      action: "wait", // Change to wait so user can manually proceed
      position: "bottom",
      requiredTab: "basic"
    },
    // Completion
    {
      id: "completion",
      title: "Congratulations!",
      description: "You've successfully set up your AI agent! It's now ready to make calls to your leads based on your schedule.",
      targetSelector: "body",
      action: "wait",
      position: "bottom",
      requiredTab: "basic"
    }
  ];

  // Calculate progress percentage
  useEffect(() => {
    if (isOpen) {
      const percentage = (completedSteps.length / tutorialSteps.length) * 100;
      setProgress(percentage);
    }
  }, [completedSteps, isOpen, tutorialSteps.length]);

  // Handle tab changes when required by the current step
  useEffect(() => {
    if (isOpen && currentStepIndex < tutorialSteps.length) {
      const currentStep = tutorialSteps[currentStepIndex];
      
      if (currentStep.requiredTab && currentStep.requiredTab !== currentTab) {
        // If the step requires a different tab, change to that tab
        onTabChange(currentStep.requiredTab);
      }
    }
  }, [isOpen, currentStepIndex, tutorialSteps, currentTab, onTabChange]);

  // Mark current step as completed and advance to next step
  const completeCurrentStep = () => {
    const currentStep = tutorialSteps[currentStepIndex];
    
    // Don't add duplicates
    if (!completedSteps.includes(currentStep.id)) {
      setCompletedSteps([...completedSteps, currentStep.id]);
    }
    
    // Hide tooltip before switching steps
    setShowTooltip(false);
    setIsPositioned(false);
    
    // Advance to next step after a short delay
    setTimeout(() => {
      if (currentStepIndex < tutorialSteps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // If this was the last step, close the tutorial
        onClose();
      }
    }, 200);
  };

  // Position tooltip next to the target element
  useEffect(() => {
    if (!isOpen || !showTooltip) return;
    
    const step = tutorialSteps[currentStepIndex];
    const selector = step.targetSelector;
    
    try {
      // Find the target element in the DOM
      const element = document.querySelector(selector) as HTMLElement;
      setTargetElement(element);
      
      // For fallback or non-existent elements, center the tooltip
      if (!element || selector === 'body') {
        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Center the tooltip in the viewport
          const top = (viewportHeight - tooltipRect.height) / 2;
          const left = (viewportWidth - tooltipRect.width) / 2;
          
          setTooltipPosition({ 
            top: Math.max(20, top), 
            left: Math.max(20, left) 
          });
          setIsPositioned(true);
          
          // Hide the highlight for body/fallback elements
          if (highlightRef.current) {
            highlightRef.current.style.opacity = '0';
          }
        }
        return;
      }
      
      if (element && tooltipRef.current) {
        const elementRect = element.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        
        // Position tooltip based on specified position
        let top = 0;
        let left = 0;
        
        switch (step.position) {
          case "top":
            top = elementRect.top - tooltipRect.height - 10;
            left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
            break;
          case "right":
            top = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2);
            left = elementRect.right + 10;
            break;
          case "bottom":
            top = elementRect.bottom + 10;
            left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
            break;
          case "left":
            top = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2);
            left = elementRect.left - tooltipRect.width - 10;
            break;
        }
        
        // Ensure tooltip stays within viewport
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        
        if (left < 20) left = 20;
        if (left + tooltipRect.width > viewport.width - 20) {
          left = viewport.width - tooltipRect.width - 20;
        }
        
        if (top < 20) top = 20;
        if (top + tooltipRect.height > viewport.height - 20) {
          top = viewport.height - tooltipRect.height - 20;
        }
        
        setTooltipPosition({ top, left });
        setIsPositioned(true);
        
        // Position highlight element
        if (highlightRef.current) {
          highlightRef.current.style.width = `${elementRect.width + 10}px`;
          highlightRef.current.style.height = `${elementRect.height + 10}px`;
          highlightRef.current.style.top = `${elementRect.top - 5}px`;
          highlightRef.current.style.left = `${elementRect.left - 5}px`;
          highlightRef.current.style.opacity = '1';
        }
        
        // Make the element more prominent
        element.style.zIndex = '1000';
        element.classList.add('tutorial-target');
        
        // Add appropriate listeners based on the action type
        const handleTargetClick = () => {
          // For click actions, proceed after the click
          if (step.action === "click") {
            setTimeout(() => {
              completeCurrentStep();
            }, step.nextDelay || 300);
          }
        };
        
        // Always add click listener to allow advancement via click as well
        element.addEventListener('click', handleTargetClick);
        
        // Cleanup
        return () => {
          element.removeEventListener('click', handleTargetClick);
          element.style.zIndex = '';
          element.classList.remove('tutorial-target');
          
          if (highlightRef.current) {
            highlightRef.current.style.opacity = '0';
          }
        };
      }
    } catch (error) {
      // Fallback positioning if anything goes wrong
      console.log("Tutorial positioning fallback triggered");
      if (tooltipRef.current) {
        setTooltipPosition({ 
          top: window.innerHeight / 2 - 100, 
          left: window.innerWidth / 2 - 150 
        });
        setIsPositioned(true);
      }
    }
  }, [isOpen, showTooltip, currentStepIndex, tutorialSteps, setTargetElement, setTooltipPosition, setIsPositioned, completeCurrentStep]);

  // Show tooltip after ensuring all animations and transitions are complete
  useEffect(() => {
    if (!isOpen) return;
    
    // Small delay to ensure DOM updates and animations complete
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isOpen, currentStepIndex]);

  // Handle skip tutorial
  const handleSkip = () => {
    setShowTooltip(false);
    setIsPositioned(false);
    
    setTimeout(() => {
      onClose();
    }, 200);
  };
  
  // If tutorial is closed, don't render anything
  if (!isOpen) return null;
  
  const currentStep = tutorialSteps[currentStepIndex];
  
  return (
    <>
      {/* Progress bar at the top of the screen */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-300 z-50">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Skip tutorial button */}
      <button 
        onClick={handleSkip}
        className="fixed top-3 right-3 z-50 flex items-center space-x-1 px-2 py-1 text-sm bg-gray-800 text-white rounded-md shadow-md hover:bg-gray-700 transition-colors"
      >
        <X className="h-3 w-3" />
        <span>Skip tutorial</span>
      </button>
      
      {/* Tooltip that follows the current target element */}
      {showTooltip && document.body && createPortal(
        <div
          ref={tooltipRef}
          className={cn(
            "fixed z-50 max-w-xs p-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 transition-opacity duration-200",
            isPositioned ? "opacity-100" : "opacity-0"
          )}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <div className="flex items-start space-x-3">
            <div className="h-6 w-6 mt-0.5 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
              {currentStep.action === "click" && <ChevronRight className="h-4 w-4 text-primary" />}
              {currentStep.action === "input" && <Settings className="h-4 w-4 text-primary" />}
              {currentStep.action === "wait" && <Check className="h-4 w-4 text-primary" />}
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {currentStep.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {currentStep.description}
              </p>
              
              {/* Show a Next/Continue button for all action types */}
              <Button
                size="sm"
                onClick={completeCurrentStep}
                className="w-full justify-center mt-2"
              >
                {currentStepIndex < tutorialSteps.length - 1 ? "Next" : "Finish"}
              </Button>
              
              {/* Step count */}
              <div className="text-xs text-gray-500 mt-2 text-right">
                Step {currentStepIndex + 1} of {tutorialSteps.length}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Highlight element */}
      <div 
        ref={highlightRef}
        className="fixed z-40 border-2 border-primary rounded-md pointer-events-none transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
        style={{
          opacity: 0,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
        }}
      />
    </>
  );
}