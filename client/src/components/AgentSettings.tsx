import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAgent } from "@/hooks/use-agent";
import { useUserAgents } from "@/hooks/use-user-agents";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InteractiveTutorial } from "@/components/InteractiveTutorial";
import "@/styles/interactive-tutorial.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Bot, MessageSquare, Phone, Mic, Sparkles, Music, AlertCircle, Check, BookOpen, Globe, HelpCircle } from "lucide-react";
import { AIPersonalitySelector } from "./AIPersonalitySelector";
import VoiceSelector from "./VoiceSelector";
import PhoneNumberPurchase from "./PhoneNumberPurchase";
import { UserAgentsList } from "./UserAgentsList";
import AuthRequiredModal from "./AuthRequiredModal";
import { AgentCreationProvider, useAgentCreation, Voice, PhoneNumber } from "@/contexts/AgentCreationContext";
import { useToast } from "@/hooks/use-toast";
import { AgentTutorialOverlay } from "./AgentTutorialOverlay";

// Wrapper component with context provider
export function AgentSettings() {
  return (
    <AgentCreationProvider>
      <AgentSettingsContent />
    </AgentCreationProvider>
  );
}

// Content component that uses the context
function AgentSettingsContent() {
  const { 
    createUserAgent, 
    isCreating 
  } = useUserAgents();
  
  // Get user authentication state
  const { user } = useAuth();
  
  // Modal state for authentication required dialog
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  
  const {
    name, setName,
    description, setDescription,
    systemPrompt, setSystemPrompt,
    phoneNumber, setPhoneNumber,
    selectedPersonality, setSelectedPersonality,
    selectedVoice, setSelectedVoice,
    selectedPhoneNumber, setSelectedPhoneNumber,
    active, setActive,
    // New message fields
    greetingMessage, setGreetingMessage,
    greetingMessageRequired, setGreetingMessageRequired,
    secondMessage, setSecondMessage,
    secondMessageRequired, setSecondMessageRequired,
    thirdMessage, setThirdMessage,
    thirdMessageRequired, setThirdMessageRequired,
    // Knowledge base
    knowledgeBase, setKnowledgeBase,
    isComplete,
    reset
  } = useAgentCreation();
  
  // Add state for active tab
  const [activeTab, setActiveTab] = useState("basic");
  
  // Tutorial overlay state - show automatically for first-time visitors
  const [tutorialOpen, setTutorialOpen] = useState(() => {
    // Check if this is the first time visiting the page
    const tutorialShown = localStorage.getItem('agent_tutorial_shown');
    return tutorialShown !== 'true';
  });
  
  // Website scraping state
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const websiteUrlRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  
  // Check for pending save after authentication
  useEffect(() => {
    // If user just got authenticated and there was a pending save action
    if (user && localStorage.getItem('pending_agent_save') === 'true') {
      // Clear the pending flag
      localStorage.removeItem('pending_agent_save');
      
      // Show a toast message
      toast({
        title: "Welcome back!",
        description: "You're now logged in. Your agent settings are ready to save.",
        variant: "default"
      });
      
      // Trigger save action
      setPendingSave(true);
    }
  }, [user, toast]);
  
  // Fetch ElevenLabs voices
  const { data: voices = [] } = useQuery<Voice[]>({
    queryKey: ["/api/elevenlabs/voices"],
  });

  // Check if this is the first time the user is visiting this page
  useEffect(() => {
    // Show tutorial for first-time users
    const tutorialShown = localStorage.getItem('agent_tutorial_shown');
    if (!tutorialShown) {
      // Wait a moment to ensure the component is fully rendered
      setTimeout(() => {
        setTutorialOpen(true);
      }, 1000);
    }
  }, []);

  // Effect for loading cached data (voice, personality, phone, messages) at component mount time
  useEffect(() => {
    console.log("🔄 Component mounted, checking for cached data");
    
    // Try to recover voice from localStorage
    const cachedVoice = localStorage.getItem('temp_selected_voice');
    if (cachedVoice && (!selectedVoice || !selectedVoice.voice_id)) {
      try {
        const parsedVoice = JSON.parse(cachedVoice) as Voice;
        console.log("🔄 Recovering voice from localStorage:", parsedVoice.name);
        
        // Force direct update with small delay to ensure component is fully mounted
        setTimeout(() => {
          setSelectedVoice(parsedVoice);
          console.log("🔄 Restored voice from localStorage");
        }, 50);
      } catch (error) {
        console.error("Error parsing cached voice:", error);
      }
    } else if (selectedVoice?.voice_id) {
      console.log("✅ Voice already set in state:", selectedVoice.name);
    } else {
      console.log("ℹ️ No cached voice data found");
    }
    
    // Try to recover personality from localStorage
    const cachedPersonality = localStorage.getItem('temp_selected_personality');
    if (cachedPersonality && (!selectedPersonality || !selectedPersonality.id)) {
      try {
        const parsedPersonality = JSON.parse(cachedPersonality);
        console.log("🔄 Recovering personality from localStorage:", parsedPersonality.name);
        
        // Force direct update with small delay
        setTimeout(() => {
          setName(parsedPersonality.name);
          setDescription(parsedPersonality.description);
          setSystemPrompt(parsedPersonality.systemPrompt);
          setSelectedPersonality(parsedPersonality);
          console.log("🔄 Restored personality from localStorage");
        }, 50);
      } catch (error) {
        console.error("Error parsing cached personality:", error);
      }
    } else if (selectedPersonality?.id) {
      console.log("✅ Personality already set in state:", selectedPersonality.name);
    } else {
      console.log("ℹ️ No cached personality data found");
    }
    
    // Try to recover phone number from localStorage
    const cachedPhone = localStorage.getItem('temp_selected_phone');
    if (cachedPhone && (!selectedPhoneNumber || 
        (!('phoneNumber' in selectedPhoneNumber) && !('phone_number' in selectedPhoneNumber)))) {
      try {
        const parsedPhone = JSON.parse(cachedPhone);
        console.log("🔄 Recovering phone from localStorage:", 
          'formattedNumber' in parsedPhone ? parsedPhone.formattedNumber : 
          parsedPhone.friendly_name || parsedPhone.phone_number);
        
        // Force direct update with small delay
        setTimeout(() => {
          setSelectedPhoneNumber(parsedPhone);
          setPhoneNumber('phoneNumber' in parsedPhone ? parsedPhone.phoneNumber : parsedPhone.phone_number);
          console.log("🔄 Restored phone from localStorage");
        }, 50);
      } catch (error) {
        console.error("Error parsing cached phone:", error);
      }
    } else if (selectedPhoneNumber && ('phoneNumber' in selectedPhoneNumber || 'phone_number' in selectedPhoneNumber)) {
      console.log("✅ Phone already set in state:", 
        'formattedNumber' in selectedPhoneNumber ? selectedPhoneNumber.formattedNumber : 
        selectedPhoneNumber.friendly_name || selectedPhoneNumber.phone_number);
    } else {
      console.log("ℹ️ No cached phone data found");
    }
    
    // Try to recover message configuration from localStorage
    const cachedGreetingMessage = localStorage.getItem('temp_greeting_message');
    if (cachedGreetingMessage) {
      setGreetingMessage(cachedGreetingMessage);
      console.log("🔄 Restored greeting message from localStorage");
    }
    
    const cachedGreetingRequired = localStorage.getItem('temp_greeting_required');
    if (cachedGreetingRequired) {
      setGreetingMessageRequired(cachedGreetingRequired === 'true');
      console.log("🔄 Restored greeting required flag from localStorage");
    }
    
    const cachedSecondMessage = localStorage.getItem('temp_second_message');
    if (cachedSecondMessage) {
      setSecondMessage(cachedSecondMessage);
      console.log("🔄 Restored second message from localStorage");
    }
    
    const cachedSecondRequired = localStorage.getItem('temp_second_required');
    if (cachedSecondRequired) {
      setSecondMessageRequired(cachedSecondRequired === 'true');
      console.log("🔄 Restored second required flag from localStorage");
    }
    
    const cachedThirdMessage = localStorage.getItem('temp_third_message');
    if (cachedThirdMessage) {
      setThirdMessage(cachedThirdMessage);
      console.log("🔄 Restored third message from localStorage");
    }
    
    const cachedThirdRequired = localStorage.getItem('temp_third_required');
    if (cachedThirdRequired) {
      setThirdMessageRequired(cachedThirdRequired === 'true');
      console.log("🔄 Restored third required flag from localStorage");
    }
    
    // Try to recover knowledge base from localStorage
    const cachedKnowledgeBase = localStorage.getItem('temp_knowledge_base');
    if (cachedKnowledgeBase) {
      setKnowledgeBase(cachedKnowledgeBase);
      console.log("🔄 Restored knowledge base from localStorage");
    }
  }, []);

  // Effect to save voice selection to cache whenever it changes
  useEffect(() => {
    if (selectedVoice) {
      console.log("💾 Saving voice to localStorage:", selectedVoice.name);
      localStorage.setItem('temp_selected_voice', JSON.stringify(selectedVoice));
    }
  }, [selectedVoice]);

  // Effect for synchronizing selected settings across tabs
  useEffect(() => {
    // Log when selectedVoice changes
    console.log("selectedVoice changed:", selectedVoice);
    
    // For debugging tab switching and state persistence
    console.log("Current active tab:", activeTab);
    console.log("Current form state:", { 
      name, 
      description, 
      systemPrompt, 
      phoneNumber, 
      selectedVoice: selectedVoice?.name || 'None',
      selectedPersonality: selectedPersonality?.name || 'None',
      selectedPhoneNumber: selectedPhoneNumber ? 
        ('formattedNumber' in selectedPhoneNumber ? selectedPhoneNumber.formattedNumber : 
        selectedPhoneNumber.friendly_name || selectedPhoneNumber.phone_number) : 'None',
      // Log message configuration
      greetingMessage,
      greetingMessageRequired,
      secondMessage,
      secondMessageRequired,
      thirdMessage,
      thirdMessageRequired,
      // Log knowledge base
      knowledgeBase: knowledgeBase ? `${knowledgeBase.substring(0, 30)}...` : 'None'
    });
    
    // Save message configuration to localStorage
    localStorage.setItem('temp_greeting_message', greetingMessage);
    localStorage.setItem('temp_greeting_required', greetingMessageRequired.toString());
    localStorage.setItem('temp_second_message', secondMessage);
    localStorage.setItem('temp_second_required', secondMessageRequired.toString());
    localStorage.setItem('temp_third_message', thirdMessage);
    localStorage.setItem('temp_third_required', thirdMessageRequired.toString());
    
    // Save knowledge base to localStorage
    localStorage.setItem('temp_knowledge_base', knowledgeBase);
    
  }, [
    selectedVoice, activeTab, name, description, systemPrompt, phoneNumber, 
    selectedPersonality, selectedPhoneNumber, greetingMessage, greetingMessageRequired,
    secondMessage, secondMessageRequired, thirdMessage, thirdMessageRequired,
    knowledgeBase
  ]);

  // Voice recognition settings state
  const [voiceRecognitionSettings, setVoiceRecognitionSettings] = useState({
    enabled: true,
    language: "en-US",
    continuous: false,
    interimResults: true,
    maxAlternatives: 1,
    profanityFilter: false
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Update the right state based on the input name
    switch (name) {
      case "name":
        setName(value);
        break;
      case "description":
        setDescription(value);
        break;
      case "systemPrompt":
        setSystemPrompt(value);
        break;
      case "phoneNumber":
        setPhoneNumber(value);
        break;
      default:
        // For voice recognition settings
        setVoiceRecognitionSettings(prev => ({
          ...prev,
          [name]: value
        }));
    }
  };
  
  const handleVoiceRecognitionToggle = (setting: string) => (checked: boolean) => {
    setVoiceRecognitionSettings(prev => ({
      ...prev,
      [setting]: checked
    }));
  };
  
  // Effect to perform save when pendingSave is set to true (after authentication)
  useEffect(() => {
    if (pendingSave && user) {
      // Reset the pending flag
      setPendingSave(false);
      
      // Execute the save operation automatically
      handleSaveAgent();
    }
  }, [pendingSave, user]);
  
  // Separate the saving logic to a function
  const handleSaveAgent = async () => {
    if (!user) {
      // If user is not authenticated, show the auth modal
      setAuthModalOpen(true);
      return;
    }
    
    try {
      // Create a new user agent with the collected data
      await createUserAgent({
        name,
        description,
        system_prompt: systemPrompt,
        // For phone number, we'll use a custom field for the phone number text since we don't have a proper ID
        // This will be processed on the server to find or create a phone number entry
        phone_number_id: null, 
        is_active: active,
        voice_id: selectedVoice?.voice_id || "",
        // Add knowledge base
        knowledge_base: knowledgeBase,
        // Custom settings as JSON string to store voice recognition settings and message configuration
        custom_settings: JSON.stringify({
          // Voice recognition settings
          voice_recognition_enabled: voiceRecognitionSettings.enabled,
          voice_recognition_language: voiceRecognitionSettings.language,
          voice_recognition_continuous: voiceRecognitionSettings.continuous,
          voice_recognition_interim_results: voiceRecognitionSettings.interimResults,
          voice_recognition_max_alternatives: voiceRecognitionSettings.maxAlternatives,
          voice_recognition_profanity_filter: voiceRecognitionSettings.profanityFilter,
          
          // Message configuration
          greeting_message: greetingMessage,
          greeting_message_required: greetingMessageRequired,
          second_message: secondMessage,
          second_message_required: secondMessageRequired,
          third_message: thirdMessage,
          third_message_required: thirdMessageRequired
        })
      });
      
      // Show success notification with guidance to AI Automated Call Scheduling
      toast({
        title: "Agent Saved Successfully",
        description: `Your AI agent "${name}" has been saved. Please scroll down to the AI Automated Call Scheduling section to select your AI agent.`,
        variant: "default",
        duration: 6000, // Show for 6 seconds to make sure users see it
      });
      
      // Reset to the basic tab
      setActiveTab("basic");
      
      // Reset form after submission
      reset();
    } catch (error) {
      toast({
        title: "Error Creating Agent",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Website scraping handler
  const handleScrapeWebsite = async () => {
    // Get the URL from the input
    const websiteUrl = websiteUrlRef.current?.value;
    
    if (!websiteUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL to import content",
        variant: "destructive",
      });
      return;
    }
    
    // Set loading state
    setIsScrapingWebsite(true);
    
    try {
      // Call the API to scrape the website
      const response = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: websiteUrl }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import content from website');
      }
      
      const data = await response.json();
      
      // Add the scraped content to the knowledge base
      // If knowledge base already has content, add a separator
      const updatedKnowledgeBase = knowledgeBase 
        ? `${knowledgeBase}\n\n--- IMPORTED FROM ${websiteUrl} ---\n\n${data.content}`
        : data.content;
      
      // Update the knowledge base
      setKnowledgeBase(updatedKnowledgeBase);
      
      // Show success message
      toast({
        title: "Content Imported",
        description: `Successfully imported content from ${websiteUrl}`,
        variant: "default",
      });
      
      // Clear the input
      if (websiteUrlRef.current) {
        websiteUrlRef.current.value = '';
      }
    } catch (error) {
      console.error('Error scraping website:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import content from website",
        variant: "destructive",
      });
    } finally {
      // Reset loading state
      setIsScrapingWebsite(false);
    }
  };
  
  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveAgent();
  };
  
  return (
    <Card className="w-full">
      {/* Auth Required Modal */}
      <AuthRequiredModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        // The onCreateAccount functionality is now handled within the modal component
      />
      
      <CardHeader className="flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <CardTitle>Your AI Agent</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTutorialOpen(true)}
            className="flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4 text-primary" />
            Tutorial
          </Button>
        </div>
        <CardDescription>
          Configure your personal AI assistant that handles your phone calls
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Interactive tutorial component */}
          <InteractiveTutorial
            isOpen={tutorialOpen}
            onClose={() => {
              setTutorialOpen(false);
              // Mark tutorial as shown
              localStorage.setItem('agent_tutorial_shown', 'true');
            }}
            onTabChange={setActiveTab}
            currentTab={activeTab}
          />
          
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="basic" data-highlight="basic-settings">
                Basic Settings
              </TabsTrigger>
              <TabsTrigger value="personality" data-highlight="personality-tab">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Personality
              </TabsTrigger>
              <TabsTrigger value="voice" data-highlight="voice-tab">
                <Music className="w-4 h-4 mr-2" />
                Voice
              </TabsTrigger>
              <TabsTrigger value="phone" data-highlight="phone-tab">
                <Phone className="w-4 h-4 mr-2" />
                Phone Numbers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={handleInputChange}
                  placeholder="Name your agent"
                  required
                />
                {selectedPersonality && (
                  <p className="text-xs text-emerald-500 flex items-center mt-1">
                    <Check className="h-3 w-3 mr-1" />
                    Using {selectedPersonality.name} personality
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={description}
                  onChange={handleInputChange}
                  placeholder="Briefly describe what your agent does"
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                </div>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={phoneNumber}
                  onChange={handleInputChange}
                  placeholder="+12345678901"
                />
                {selectedPhoneNumber ? (
                  <p className="text-xs text-emerald-500 flex items-center mt-1">
                    <Check className="h-3 w-3 mr-1" />
                    Using selected phone number: {'formattedNumber' in selectedPhoneNumber ? selectedPhoneNumber.formattedNumber : selectedPhoneNumber.friendly_name || selectedPhoneNumber.phone_number}
                  </p>
                ) : phoneNumber ? (
                  <p className="text-xs text-blue-500 flex items-center mt-1">
                    <Phone className="h-3 w-3 mr-1" />
                    Custom phone number entered
                  </p>
                ) : (
                  <p className="text-xs text-yellow-500 flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Select a phone number in the Phone Numbers tab
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                </div>
                <Textarea
                  id="systemPrompt"
                  name="systemPrompt"
                  value={systemPrompt}
                  onChange={handleInputChange}
                  placeholder="Instructions for how your AI should behave on calls"
                  rows={5}
                />
                {selectedPersonality && (
                  <p className="text-xs text-emerald-500 flex items-center mt-1">
                    <Check className="h-3 w-3 mr-1" />
                    Personality-optimized prompt from {selectedPersonality.name}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="knowledgeBase">Knowledge Base</Label>
                </div>
                
                {/* Website Import Feature */}
                <div className="flex gap-2 mb-2 w-full">
                  <Input 
                    id="websiteUrl"
                    placeholder="https://example.com"
                    className="flex-1"
                    ref={websiteUrlRef}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScrapeWebsite}
                    disabled={isScrapingWebsite}
                    className="whitespace-nowrap"
                  >
                    {isScrapingWebsite ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Import from Website
                      </>
                    )}
                  </Button>
                </div>
                
                <Textarea
                  id="knowledgeBase"
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  placeholder="Provide domain-specific information to help your agent answer questions more accurately"
                  rows={5}
                  className="min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground">
                  Add domain-specific knowledge that your AI agent can reference when answering questions.
                  This helps the agent provide more accurate and contextual responses. You can manually add
                  information or import content from a website.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <Label>Voice</Label>
                </div>
                {selectedVoice ? (
                  <div className="flex items-center p-2 bg-secondary/30 rounded-md border border-secondary">
                    <div className="mr-2 bg-primary/20 p-1 rounded-full">
                      <Music className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedVoice.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedVoice.category} voice
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-yellow-500 flex items-center p-2 bg-yellow-500/10 rounded-md">
                    <AlertCircle className="h-3 w-3 mr-2" />
                    Please select a voice in the Voice tab
                  </p>
                )}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label>Message Configuration</Label>
                </div>
                
                {/* Greeting Message */}
                <div className="space-y-2 border border-border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="greetingMessage">Greeting Message</Label>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="greetingMessageRequired" 
                        checked={greetingMessageRequired}
                        onCheckedChange={setGreetingMessageRequired}
                      />
                      <Label htmlFor="greetingMessageRequired" className="text-xs">Required</Label>
                    </div>
                  </div>
                  <Textarea
                    id="greetingMessage"
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    placeholder="Hello, how can I help you today?"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the first message your AI agent will say when answering a call.
                  </p>
                </div>
                
                {/* Second Message */}
                <div className="space-y-2 border border-border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="secondMessage">Second Message</Label>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="secondMessageRequired" 
                        checked={secondMessageRequired}
                        onCheckedChange={setSecondMessageRequired}
                      />
                      <Label htmlFor="secondMessageRequired" className="text-xs">Required</Label>
                    </div>
                  </div>
                  <Textarea
                    id="secondMessage"
                    value={secondMessage}
                    onChange={(e) => setSecondMessage(e.target.value)}
                    placeholder="Optional follow-up message..."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional second message that will be spoken after the greeting.
                  </p>
                </div>
                
                {/* Third Message */}
                <div className="space-y-2 border border-border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="thirdMessage">Third Message</Label>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="thirdMessageRequired" 
                        checked={thirdMessageRequired}
                        onCheckedChange={setThirdMessageRequired}
                      />
                      <Label htmlFor="thirdMessageRequired" className="text-xs">Required</Label>
                    </div>
                  </div>
                  <Textarea
                    id="thirdMessage"
                    value={thirdMessage}
                    onChange={(e) => setThirdMessage(e.target.value)}
                    placeholder="Optional final message..."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional third message that will be spoken after the second message.
                  </p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="active" 
                  checked={active}
                  onCheckedChange={setActive}
                />
                <Label htmlFor="active">Agent active</Label>
              </div>

              {!isComplete && (
                <Alert variant="destructive" className="bg-amber-900/20 border-amber-800 text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Missing required information</AlertTitle>
                  <AlertDescription>
                    Please complete all required fields to create your agent. You need a name, system prompt, and voice.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="personality" className="space-y-6">
              <AIPersonalitySelector
                onSelectPersonality={(personality) => {
                  // Update the global context
                  console.log("✨ Personality selected:", personality.name);
                  
                  // Save to localStorage for persistence
                  localStorage.setItem('temp_selected_personality', JSON.stringify(personality));
                  console.log("💾 Saved personality to localStorage");
                  
                  // Set all values in a synchronized manner
                  setName(personality.name);
                  setDescription(personality.description);
                  setSystemPrompt(personality.systemPrompt);
                  setSelectedPersonality(personality);
                  
                  // Create a stable copy for state updates
                  const personalityCopy = {...personality};
                  
                  // Show toast to confirm selection
                  toast({
                    title: "Personality Selected",
                    description: `${personality.name} personality has been applied to your agent`,
                    variant: "default",
                  });
                  
                  // Set up a three-tier timeout approach for state updates
                  const firstCheck = () => {
                    console.log("🧪 Personality verification check:", 
                      selectedPersonality ? selectedPersonality.name : "none");
                    
                    // Force another update to ensure the state is correct
                    setName(personalityCopy.name);
                    setDescription(personalityCopy.description);
                    setSystemPrompt(personalityCopy.systemPrompt);
                    setSelectedPersonality(personalityCopy);
                    console.log("🔄 Forced secondary personality update");
                    
                    // Schedule the second check
                    setTimeout(secondCheck, 100);
                  };
                  
                  const secondCheck = () => {
                    console.log("🧪 Final personality state check:", 
                      selectedPersonality ? selectedPersonality.name : "none");
                      
                    // If still not set, try one more time with a direct reference
                    if (!selectedPersonality || selectedPersonality.id !== personalityCopy.id) {
                      console.log("⚠️ Personality state still not updated, final attempt");
                      setName(personalityCopy.name);
                      setDescription(personalityCopy.description);
                      setSystemPrompt(personalityCopy.systemPrompt);
                      setSelectedPersonality(personalityCopy);
                    }
                    
                    // Schedule the tab switch
                    setTimeout(switchTab, 100);
                  };
                  
                  const switchTab = () => {
                    console.log("Switching to basic tab with personality:", personalityCopy.name);
                    setActiveTab("basic");
                  };
                  
                  // Start the cascade of checks
                  setTimeout(firstCheck, 200);
                }}
              />
            </TabsContent>
            
            <TabsContent value="voice" className="space-y-6">
              <VoiceSelector
                voices={voices} // We now have consistent types
                selectedVoiceId={selectedVoice?.voice_id || ""}
                onSelectVoice={(voiceId) => {
                  console.log("✅ Voice ID selected in AgentSettings:", voiceId);
                  
                  // Validate voiceId
                  if (!voiceId) {
                    console.error("❌ Invalid voice ID (empty)");
                    toast({
                      title: "Error selecting voice",
                      description: "Invalid voice ID received. Please try again.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Find the selected voice in the voices array
                  console.log("🔍 Searching for voice among", voices.length, "voices");
                  const voice = voices.find(v => v.voice_id === voiceId);
                  
                  if (!voice) {
                    console.error("❌ Voice not found for ID:", voiceId);
                    toast({
                      title: "Error selecting voice",
                      description: "Could not find the selected voice. Please try again.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  console.log("✅ Found voice in AgentSettings:", voice.name);
                  
                  try {
                    // Make sure we're setting a voice with the right structure
                    const formattedVoice: Voice = {
                      voice_id: voice.voice_id,
                      name: voice.name || 'Unnamed Voice',
                      category: voice.category || 'General',
                      description: voice.description || '',
                      preview_url: voice.preview_url || '',
                      labels: voice.labels || {}
                    };
                    
                    console.log("🔄 Setting formatted voice:", formattedVoice.name);
                    
                    // Save to localStorage first to ensure we have a backup
                    localStorage.setItem('temp_selected_voice', JSON.stringify(formattedVoice));
                    console.log("💾 Saved voice to localStorage");
                    
                    // Direct update to state
                    setSelectedVoice(formattedVoice);
                    
                    // Show toast for voice selection only when it's a deliberate selection
                    // (This is skipped during preview actions, which now use preventDefault and stopPropagation)
                    toast({
                      title: "Voice Selected",
                      description: `${formattedVoice.name} voice has been applied to your agent`,
                      variant: "default",
                    });
                    
                    // Force a direct state check and update with a direct object reference
                    const voiceCopy = {...formattedVoice};
                    console.log("🔄 Created voice copy for stability:", voiceCopy.name);
                    
                    // Set up a three-tier timeout approach for state updates
                    const firstCheck = () => {
                      console.log("🧪 Voice selection verification check - Current voice:", 
                        selectedVoice ? selectedVoice.name : "none");
                      
                      // Force another update to ensure the state is correct
                      setSelectedVoice(voiceCopy);
                      console.log("🔄 Forced secondary voice update");
                      
                      // Schedule the second check
                      setTimeout(secondCheck, 100);
                    };
                    
                    const secondCheck = () => {
                      console.log("🧪 Final voice state check:", 
                        selectedVoice ? selectedVoice.name : "none");
                        
                      // If still not set, try one more time with a direct reference
                      if (!selectedVoice || selectedVoice.voice_id !== voiceCopy.voice_id) {
                        console.log("⚠️ Voice state still not updated, final attempt");
                        setSelectedVoice(voiceCopy);
                      }
                      
                      // Schedule the tab switch
                      setTimeout(switchTab, 100);
                    };
                    
                    const switchTab = () => {
                      console.log("Switching to basic tab with voice:", formattedVoice.name);
                      setActiveTab("basic");
                    };
                    
                    // Start the cascade of checks
                    setTimeout(firstCheck, 200);
                  } catch (error) {
                    console.error("Error formatting voice:", error);
                    toast({
                      title: "Error processing voice",
                      description: "There was a problem processing the selected voice. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              />
            </TabsContent>
            
            <TabsContent value="phone" className="space-y-6">
              <PhoneNumberPurchase 
                onSelectPhoneNumber={(phoneNumber) => {
                  console.log("📞 Phone number selected:", 
                    'formattedNumber' in phoneNumber ? phoneNumber.formattedNumber : 
                    phoneNumber.friendly_name || phoneNumber.phone_number);
                  
                  // Create a stable copy for reference
                  const phoneCopy = {...phoneNumber};
                  
                  // First verify the current state before making changes
                  console.log("🔍 Current state check before phone selection:");
                  console.log(" - Current personality:", selectedPersonality?.name || "none");
                  console.log(" - Current voice:", selectedVoice?.name || "none");
                  
                  // Cache all selections in localStorage for state persistence
                  localStorage.setItem('temp_selected_phone', JSON.stringify(phoneCopy));
                  console.log("💾 Saved phone number to localStorage");
                  
                  // Also re-save the other selections to make sure they're synchronized
                  if (selectedPersonality) {
                    localStorage.setItem('temp_selected_personality', JSON.stringify(selectedPersonality));
                    console.log("💾 Re-saved personality to localStorage:", selectedPersonality.name);
                  }
                  
                  if (selectedVoice) {
                    localStorage.setItem('temp_selected_voice', JSON.stringify(selectedVoice));
                    console.log("💾 Re-saved voice to localStorage:", selectedVoice.name);
                  }
                  
                  // Update states using robust context methods 
                  // Note: These are now wrapped with verification in the context
                  setSelectedPhoneNumber(phoneCopy);
                  setPhoneNumber('phoneNumber' in phoneCopy ? phoneCopy.phoneNumber : phoneCopy.phone_number);
                  
                  // Show toast immediately to confirm selection
                  toast({
                    title: "Phone Number Selected",
                    description: `${'formattedNumber' in phoneNumber ? phoneNumber.formattedNumber : 
                    phoneNumber.friendly_name || phoneNumber.phone_number} has been assigned to your agent`,
                    variant: "default",
                  });
                  
                  // Implement a more cautious approach for tab switching
                  const switchTab = () => {
                    // Let's check the state before switching tabs
                    console.log("📊 State verification before tab switch:");
                    console.log(" - Phone number:", selectedPhoneNumber ? 
                      ('formattedNumber' in selectedPhoneNumber ? selectedPhoneNumber.formattedNumber : 
                      selectedPhoneNumber.friendly_name || selectedPhoneNumber.phone_number) : "none");
                    console.log(" - Personality:", selectedPersonality?.name || "none");
                    console.log(" - Voice:", selectedVoice?.name || "none");
                    
                    // Now switch tab
                    console.log("Switching to basic tab with selections preserved");
                    setActiveTab("basic");
                    
                    // Do a final check after tab switch to ensure state consistency
                    setTimeout(() => {
                      console.log("🔍 Final state check after tab switch:");
                      console.log(" - Phone number:", selectedPhoneNumber ? 
                        ('formattedNumber' in selectedPhoneNumber ? selectedPhoneNumber.formattedNumber : 
                        selectedPhoneNumber.friendly_name || selectedPhoneNumber.phone_number) : "none");
                      console.log(" - Personality:", selectedPersonality?.name || "none");
                      console.log(" - Voice:", selectedVoice?.name || "none");
                      
                      // Force a last refresh from localStorage if needed
                      const cachedVoice = localStorage.getItem('temp_selected_voice');
                      const cachedPersonality = localStorage.getItem('temp_selected_personality');
                      
                      if ((!selectedVoice || !selectedVoice.voice_id) && cachedVoice) {
                        try {
                          const parsedVoice = JSON.parse(cachedVoice) as Voice;
                          console.log("⚡ Emergency voice recovery from localStorage:", parsedVoice.name);
                          setSelectedVoice(parsedVoice);
                        } catch (error) {
                          console.error("Error parsing cached voice in final check:", error);
                        }
                      }
                      
                      if ((!selectedPersonality || !selectedPersonality.id) && cachedPersonality) {
                        try {
                          const parsedPersonality = JSON.parse(cachedPersonality);
                          console.log("⚡ Emergency personality recovery from localStorage:", parsedPersonality.name);
                          setSelectedPersonality(parsedPersonality);
                          setName(parsedPersonality.name);
                          setDescription(parsedPersonality.description);
                          setSystemPrompt(parsedPersonality.systemPrompt);
                        } catch (error) {
                          console.error("Error parsing cached personality in final check:", error);
                        }
                      }
                    }, 200);
                  };
                  
                  // Give state updates some time to settle before switching tabs
                  setTimeout(switchTab, 300);
                }}
              />
            </TabsContent>
            


          </Tabs>
          
          {/* Voice Recognition Settings */}
          <Separator />
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="voice-recognition">
              <AccordionTrigger className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <span>Voice Recognition Settings</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Enable/Disable Voice Recognition */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="voiceRecognitionEnabled" className="font-medium">
                      Enable Voice Recognition
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Turn speech recognition on or off
                    </p>
                  </div>
                  <Switch 
                    id="voiceRecognitionEnabled" 
                    checked={voiceRecognitionSettings.enabled}
                    onCheckedChange={handleVoiceRecognitionToggle('enabled')}
                  />
                </div>
                
                {/* Language Selection */}
                <div className="space-y-2">
                  <Label htmlFor="voiceRecognitionLanguage">Recognition Language</Label>
                  <Select 
                    value={voiceRecognitionSettings.language}
                    onValueChange={(value) => setVoiceRecognitionSettings(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger id="voiceRecognitionLanguage">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                      <SelectItem value="fr-FR">French</SelectItem>
                      <SelectItem value="de-DE">German</SelectItem>
                      <SelectItem value="it-IT">Italian</SelectItem>
                      <SelectItem value="ja-JP">Japanese</SelectItem>
                      <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Advanced Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="voiceRecognitionContinuous" className="font-medium">
                        Continuous Recognition
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Keep listening after results are returned
                      </p>
                    </div>
                    <Switch 
                      id="voiceRecognitionContinuous" 
                      checked={voiceRecognitionSettings.continuous}
                      onCheckedChange={handleVoiceRecognitionToggle('continuous')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="voiceRecognitionInterimResults" className="font-medium">
                        Interim Results
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Show partial results while speaking
                      </p>
                    </div>
                    <Switch 
                      id="voiceRecognitionInterimResults" 
                      checked={voiceRecognitionSettings.interimResults}
                      onCheckedChange={handleVoiceRecognitionToggle('interimResults')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="voiceRecognitionProfanityFilter" className="font-medium">
                        Profanity Filter
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Filter profanity from recognition results
                      </p>
                    </div>
                    <Switch 
                      id="voiceRecognitionProfanityFilter" 
                      checked={voiceRecognitionSettings.profanityFilter}
                      onCheckedChange={handleVoiceRecognitionToggle('profanityFilter')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="voiceRecognitionMaxAlternatives">Max Alternatives</Label>
                    <Select 
                      value={voiceRecognitionSettings.maxAlternatives.toString()}
                      onValueChange={(value) => setVoiceRecognitionSettings(prev => ({
                        ...prev, 
                        maxAlternatives: parseInt(value, 10)
                      }))}
                    >
                      <SelectTrigger id="voiceRecognitionMaxAlternatives">
                        <SelectValue placeholder="Select number of alternatives" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Number of alternative transcriptions to return
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full md:w-auto relative overflow-hidden group"
            disabled={isCreating}
            data-highlight="save-button"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="relative z-10">Saving...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4 drop-shadow-[0_0_4px_rgba(255,255,255,0.7)] relative z-10 text-yellow-500" />
                <span className="text-white relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] font-medium">
                  Save Agent Settings
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}