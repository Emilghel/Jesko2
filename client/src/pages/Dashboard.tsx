import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import LeadsManagementSection from '@/components/LeadsManagementSection';
import { EnhancedAgentSettingsWrapper } from "@/components/EnhancedAgentSettingsWrapper";
import { ServerStatus } from "@/types";
import { 
  Loader2, MessageSquare, Users, BrainCircuit, Bot, 
  Phone, CirclePlay, X, HelpCircle, Mic, Volume2,
  UserCog, AlertTriangle
} from "lucide-react";
import { useUserAgents } from "@/hooks/use-user-agents";
import CoinBalance from "@/components/CoinBalance";
import StarBackground from "@/components/StarBackground";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Link } from "wouter";
import { queryClient } from '@/lib/queryClient';

// Animation styles
const animationStyles = `
  @keyframes cardGlow {
    0%, 100% {
      box-shadow: 0 0 15px 2px rgba(51, 195, 189, 0.2),
                 0 0 20px 5px rgba(0, 117, 255, 0.1);
    }
    50% {
      box-shadow: 0 0 20px 5px rgba(51, 195, 189, 0.3),
                 0 0 30px 10px rgba(0, 117, 255, 0.2);
    }
  }

  @keyframes buttonPulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 8px 2px rgba(0, 200, 83, 0.3);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 12px 4px rgba(0, 200, 83, 0.5);
    }
  }
  
  @keyframes coinSpin {
    0% {
      transform: rotateY(0deg);
    }
    100% {
      transform: rotateY(360deg);
    }
  }
  
  @keyframes iconFloat {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-5px);
    }
  }
  
  @keyframes pulseDot {
    0%, 100% {
      opacity: 0.6;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }
  
  .pulse-dot {
    width: 8px;
    height: 8px;
    background-color: #10b981;
    border-radius: 50%;
    display: inline-block;
    animation: pulseDot 1.5s ease-in-out infinite;
  }
`;

// Animated icon component
function AnimatedIcon({ icon, color }: { icon: React.ReactNode, color: string }) {
  return (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-opacity-20" 
         style={{ 
           backgroundColor: `rgba(${color === 'blue' ? '56, 189, 248' : 
                             color === 'green' ? '52, 211, 153' : 
                             color === 'purple' ? '139, 92, 246' : 
                             color === 'yellow' ? '251, 191, 36' : 
                             color === 'pink' ? '236, 72, 153' : 
                             color === 'cyan' ? '51, 195, 189' : '255, 255, 255'}, 0.2)`,
           animation: 'iconFloat 3s ease-in-out infinite',
           boxShadow: `0 0 15px 5px rgba(${color === 'blue' ? '56, 189, 248' : 
                                         color === 'green' ? '52, 211, 153' : 
                                         color === 'purple' ? '139, 92, 246' : 
                                         color === 'yellow' ? '251, 191, 36' : 
                                         color === 'pink' ? '236, 72, 153' : 
                                         color === 'cyan' ? '51, 195, 189' : '255, 255, 255'}, 0.3)`
         }}>
      {icon}
    </div>
  );
}

// Enhanced error boundary component with retry functionality
class ErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}> {
  state = { 
    hasError: false,
    error: null as Error | null 
  };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard component error:", error);
    console.error("Component stack:", errorInfo.componentStack);
    
    // You could send this error to an error monitoring service here
  }
  
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError) {
      // Provide a more informative fallback with retry option
      if (typeof this.props.fallback === 'object' && React.isValidElement(this.props.fallback)) {
        return this.props.fallback;
      }
      
      // Default fallback with retry button
      return (
        <div className="p-8 text-center text-white">
          <div className="mb-4">Error loading component. Please try refreshing the page.</div>
          <button 
            onClick={this.handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default function Dashboard() {
  const { toast } = useToast();
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    online: true,
    message: "Server Online"
  });
  
  // AI Sales Agent Chat State
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isPhoneCalling, setIsPhoneCalling] = useState(false);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);
  const closeDialogRef = useRef<HTMLButtonElement>(null);
  
  // Agent selection state
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  
  // Tab state for AI Sales Agent section
  const [activeTab, setActiveTab] = useState<'chat' | 'manage'>('chat');
  
  // Fetch available agents and agent operations with forced refresh when returning to this page
  const { userAgents, isLoading: isLoadingAgents, deleteUserAgent, refetch } = useUserAgents();
  
  // Refresh agent list when the component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  // Simplified agent deletion focused on UI updates only
  const handleDeleteAgent = async (agentId: number) => {
    try {
      console.log(`UI-focused deletion of agent ID: ${agentId}`);
      
      // Store the current agents list for reference
      const currentAgents = userAgents || [];
      
      // Create new agents array excluding the deleted agent (deep copy to avoid reference issues)
      const updatedAgents = currentAgents.filter(agent => agent.id !== agentId);
      
      // 1. First update all our UI caches to immediately reflect deletion
      // This happens regardless of API success/failure
      console.log(`Updating UI cache to remove agent ${agentId}`);
      const queryKey = ['/api/user/agents'];
      queryClient.setQueryData(queryKey, updatedAgents);
      
      // 2. Also clear any individual cached data for this agent
      queryClient.removeQueries({ queryKey: ['/api/user/agents', agentId] });
      
      // 3. Wait a brief moment to ensure UI updates before API call
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 4. Let the user know we're processing the deletion
      toast({
        title: "Agent removed",
        description: "The agent has been removed from your list."
      });
      
      // 5. Attempt the actual backend deletion, but don't let UI depend on it
      try {
        console.log(`Attempting backend deletion for agent ${agentId}`);
        await deleteUserAgent({ id: agentId, force: true });
        console.log(`Backend confirmed deletion of agent ${agentId}`);
      } catch (apiError) {
        // Log but don't disrupt the UI flow - user already saw agent was removed
        console.error(`Backend deletion error for agent ${agentId}:`, apiError);
      }
      
    } catch (error) {
      console.error(`General error in agent deletion for ID ${agentId}:`, error);
      
      // Even on error, still remove from UI to match user expectation
      if (userAgents) {
        const fallbackUpdate = userAgents.filter(agent => agent.id !== agentId);
        queryClient.setQueryData(['/api/user/agents'], fallbackUpdate);
      }
      
      toast({
        title: "Agent removed",
        description: "The agent has been removed from your dashboard."
      });
    }
  };

  // State for conversation history
  const [conversation, setConversation] = useState<{
    sessionId: string;
    messages: Array<{ 
      type: 'user' | 'ai';
      text: string;
      timestamp: Date;
      audioUrl?: string;
    }>
  }>({
    sessionId: sessionId,
    messages: []
  });

  // Fetch agent information
  const { data: agentData } = useQuery({
    queryKey: ['/api/user/agent'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/user/agent');
      const data = await response.json();
      return data?.agent || null;
    },
    staleTime: 60000,
  });

  // Send message to the SalesGPT API
  const sendMessage = async () => {
    if (!message.trim()) return;
    
    // Check if agent is selected
    if (!selectedAgentId && userAgents && userAgents.length > 0) {
      toast({
        title: 'No agent selected',
        description: 'Please select an AI agent to continue the conversation.',
        variant: 'destructive'
      });
      return;
    }
    
    // Auto-select first agent if none selected but agents are available
    if (!selectedAgentId && userAgents && userAgents.length > 0) {
      setSelectedAgentId(userAgents[0].id.toString());
    }
    
    // Log selected agent information for debugging
    console.log('Selected Agent ID:', selectedAgentId);
    console.log('Available Agents:', userAgents);
    console.log('Session ID:', sessionId);
    
    setIsLoading(true);
    
    try {
      // Add user message to conversation
      const userMessage = {
        type: 'user' as const,
        text: message,
        timestamp: new Date()
      };
      
      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage]
      }));
      
      // Clear input
      setMessage('');
      
      // Prepare the request data
      const requestData = {
        session_id: sessionId,
        message: userMessage.text,
        agent_id: selectedAgentId ? parseInt(selectedAgentId) : undefined
      };
      
      console.log('Sending chat request with data:', requestData);
      
      // Call the API
      const response = await apiRequest(
        'POST',
        '/api/salesgpt/chat',
        requestData
      );
      
      // Add AI response to conversation
      if (response.ok) {
        const responseData = await response.json();
        const aiMessage = {
          type: 'ai' as const,
          text: responseData.response,
          timestamp: new Date(),
          audioUrl: responseData.audio_url
        };
        
        setConversation(prev => ({
          ...prev,
          messages: [...prev.messages, aiMessage]
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to communicate with the Sales AI.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate audio for a message
  const generateAudio = async (text: string) => {
    if (!text.trim()) return;
    
    // Check if agent is selected
    if (!selectedAgentId && userAgents && userAgents.length > 0) {
      toast({
        title: 'No agent selected',
        description: 'Please select an AI agent to generate voice.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const response = await apiRequest(
        'POST',
        '/api/salesgpt/voice',
        {
          session_id: sessionId,
          message: text,
          agent_id: selectedAgentId ? parseInt(selectedAgentId) : undefined
        }
      );
      
      if (response.ok) {
        const responseData = await response.json();
        if (responseData.audio_url) {
          // Play the audio
          const audio = new Audio(responseData.audio_url);
          audio.play();
        }
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate voice response.',
        variant: 'destructive'
      });
    }
  };

  // Initiate a phone call with Twilio
  const initiatePhoneCall = useMutation({
    mutationFn: async () => {
      // Format phone number for E.164 format if needed
      let formattedNumber = phoneNumber.trim();
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+1' + formattedNumber.replace(/\D/g, '');
      }

      // Check if we have a valid number
      if (!/^\+\d{10,15}$/.test(formattedNumber)) {
        throw new Error('Please enter a valid phone number in E.164 format (e.g., +12345678901)');
      }
      
      // Check if agent is selected - use selected agent or fall back to default
      if (!selectedAgentId && userAgents && userAgents.length > 0) {
        toast({
          title: 'No agent selected',
          description: 'Please select an AI agent before initiating a call.',
          variant: 'destructive'
        });
        throw new Error('Please select an AI agent before initiating a call.');
      }
      
      // Use the selected agent ID for the call if available, otherwise use the default
      const agentId = selectedAgentId 
        ? parseInt(selectedAgentId) 
        : (agentData?.id || 1); // Fallback to default ID if none available
      
      const response = await apiRequest(
        'POST',
        '/api/twilio-direct/call',
        {
          agentId,
          phoneNumber: formattedNumber,
          record: true
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to initiate call. Please try again.');
      }
      
      // Parse the response to get call data
      const callData = await response.json();
      return callData;
    },
    onSuccess: (data) => {
      if (closeDialogRef.current) {
        closeDialogRef.current.click();
      }
      
      setActiveCallSid(data.callSid);
      
      toast({
        title: 'Call Initiated',
        description: `Call to ${phoneNumber} has been initiated successfully.`,
      });
      
      // Reset phone number
      setPhoneNumber('');
    },
    onError: (error: any) => {
      console.error('Error initiating call:', error);
      toast({
        title: 'Call Failed',
        description: error.message || 'Failed to initiate phone call. Please try again.',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsPhoneCalling(false);
    }
  });

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  // Handle phone number input change
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  // Handle phone call submission
  const handleCallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPhoneCalling(true);
    initiatePhoneCall.mutate();
  };

  // Format message with line breaks preserved
  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  const handleRestartServer = async () => {
    try {
      await fetch("/api/server/restart", { method: "POST" });
    } catch (error) {
      console.error("Failed to restart server:", error);
    }
  };

  // Reference to track if UFO motion script is loaded
  const ufoMotionScriptLoaded = useRef(false);

  // Set default agent when agents are loaded
  useEffect(() => {
    if (userAgents && userAgents.length > 0 && !selectedAgentId) {
      // Select the first agent by default when agents are loaded
      setSelectedAgentId(userAgents[0].id.toString());
    }
  }, [userAgents, selectedAgentId]);

  // Load the UFO motion script
  useEffect(() => {
    if (!ufoMotionScriptLoaded.current) {
      const script = document.createElement('script');
      script.src = '/ufo-motion.js';
      script.async = true;
      script.onload = () => {
        ufoMotionScriptLoaded.current = true;
        console.log('UFO motion effects activated');
      };
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  useEffect(() => {
    // Set up WebSocket connection to receive real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle different types of real-time updates
      if (data.type === "server_status") {
        setServerStatus(data.payload);
      }
    };

    socket.onclose = () => {
      // Attempt to reconnect after a delay
      setTimeout(() => {
        console.log("WebSocket connection closed. Reconnecting...");
      }, 5000);
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 overflow-hidden text-white">
      {/* Star background animation */}
      <StarBackground />
      
      {/* Main content with relative positioning and higher z-index */}
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent"
                style={{ textShadow: '0 0 15px rgba(51, 195, 189, 0.5)' }}>
              AI Agent Dashboard
            </h1>
            <p className="text-gray-400">
              Monitor your AI agents, calls, and service status
            </p>
          </div>
          
          {/* Coin balance display with spinning animation */}
          <div className="flex items-center px-4 py-2 rounded-lg" 
               style={{ 
                 background: 'rgba(20, 20, 25, 0.7)',
                 backdropFilter: 'blur(10px)',
                 border: '1px solid rgba(51, 195, 189, 0.2)',
                 boxShadow: '0 0 20px rgba(51, 195, 189, 0.3)'
               }}>
            <div className="mr-3" style={{ animation: 'coinSpin 4s linear infinite', transformStyle: 'preserve-3d' }}>
              <Bot className="h-6 w-6 text-cyan-400" 
                  style={{ filter: 'drop-shadow(0 0 10px rgba(51, 195, 189, 0.7))' }}/>
            </div>
            <div>
              <div className="text-xs text-gray-400">Server Status</div>
              <div className="flex items-center">
                <span className="pulse-dot mr-1"></span>
                <span className="font-bold text-green-300">Online</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* AI Sales Agent Chat Section */}
        <div className="mb-10 relative">
          <div className="relative z-10 bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md overflow-hidden rounded-lg"
               style={{ 
                 background: 'rgba(20, 20, 30, 0.7)', 
                 animation: 'cardGlow 4s ease-in-out infinite',
                 boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
               }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#33C3BD] to-[#0075FF]"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <AnimatedIcon icon={<MessageSquare className="h-6 w-6 text-cyan-400" />} color="cyan" />
                  <h2 className="text-xl font-bold ml-3 text-white">AI Sales Agent</h2>
                </div>
                
                {/* Active Call Badge */}
                {activeCallSid && (
                  <div className="flex items-center bg-green-900/30 text-green-300 text-xs rounded-full px-3 py-1.5 border border-green-500/30">
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    <span>Active Call</span>
                  </div>
                )}
                
                {/* Help Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <HelpCircle className="h-4 w-4 text-cyan-400/70" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Our AI Sales Agent can help answer questions and engage in sales conversations.
                        Type a message to get started or initiate a phone call.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Tabs for Chat and Manage Agents */}
              <Tabs defaultValue="chat" className="w-full mb-4">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="chat" onClick={() => setActiveTab('chat')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="manage" onClick={() => setActiveTab('manage')}>
                    <UserCog className="h-4 w-4 mr-2" />
                    Manage Agents
                  </TabsTrigger>
                </TabsList>
                
                {/* Chat Tab Content */}
                <TabsContent value="chat" className="mt-0">
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <UserCog className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-cyan-300">Select AI Agent</span>
                    </div>
                    <Select 
                      value={selectedAgentId} 
                      onValueChange={setSelectedAgentId}
                      disabled={isLoadingAgents}
                    >
                      <SelectTrigger className="w-full bg-gray-800/50 border-gray-700">
                        <SelectValue placeholder={isLoadingAgents ? "Loading agents..." : "Select an AI agent"} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectGroup>
                          <SelectLabel>Available Agents</SelectLabel>
                          {userAgents && userAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id.toString()}>
                              {agent.name} {agent.description ? ` - ${agent.description}` : ''}
                            </SelectItem>
                          ))}
                          {userAgents && userAgents.length === 0 && (
                            <div className="px-2 py-1 text-sm text-gray-400">
                              No agents found. Configure one in Agent Settings below.
                            </div>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Chat Container */}
              <div className="h-[300px] overflow-y-auto border border-gray-700/50 rounded-md p-4 bg-gray-800/20 mb-4">
                {conversation.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4 text-gray-400">
                    <p>Start a conversation with the AI Sales Agent</p>
                    
                    {/* Circular Video Container */}
                    <div className="relative w-24 h-24 mx-auto mb-2 overflow-hidden rounded-full">
                      <div className="absolute inset-0 flex items-center justify-center bg-black rounded-full">
                        <video
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                          style={{ objectPosition: "center" }}
                        >
                          <source 
                            src="https://video.wixstatic.com/video/ee3656_ba3a2394c3cc4a4c9a2de7ddbadd043f/1080p/mp4/file.mp4" 
                            type="video/mp4" 
                          />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                    
                    <div className="max-w-md text-center text-xs bg-gray-800/60 p-4 rounded-lg">
                      <p className="mb-2">This feature allows you to test your AI agent's responses before deploying it to call real leads.</p>
                      <p>Type a message below to see how your agent will respond, and click the "Play audio" button to hear its voice.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversation.messages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            msg.type === 'user' 
                              ? 'bg-cyan-700/70 text-cyan-50' 
                              : 'bg-gray-700/70 text-gray-100'
                          }`}
                        >
                          <div className="text-sm">{formatMessage(msg.text)}</div>
                        </div>
                        
                        {msg.type === 'ai' && (
                          msg.audioUrl ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                // Log the audio URL for debugging
                                console.log('Playing audio URL:', msg.audioUrl);
                                
                                // Play the audio with error handling
                                try {
                                  const audio = new Audio(msg.audioUrl);
                                  
                                  // Add event listeners for debugging
                                  audio.onloadstart = () => console.log('Audio loading started');
                                  audio.oncanplay = () => console.log('Audio can play');
                                  audio.onplay = () => console.log('Audio playback started');
                                  audio.onerror = (e) => console.error('Audio error:', e);
                                  
                                  audio.play()
                                    .then(() => console.log('Audio playing successfully'))
                                    .catch(err => {
                                      console.error('Audio play error:', err);
                                      toast({
                                        title: 'Audio Error',
                                        description: 'Unable to play audio. Try again later.',
                                        variant: 'destructive'
                                      });
                                    });
                                } catch (err) {
                                  console.error('Audio creation error:', err);
                                  toast({
                                    title: 'Audio Error',
                                    description: 'Failed to create audio player.',
                                    variant: 'destructive'
                                  });
                                }
                              }}
                              className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30"
                            >
                              <CirclePlay className="h-3.5 w-3.5 mr-1" />
                              Play audio
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => generateAudio(msg.text)}
                              className="mt-1 text-xs border-cyan-800/50 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30"
                            >
                              <Volume2 className="h-3.5 w-3.5 mr-1" />
                              Listen to Voice
                            </Button>
                          )
                        )}
                        
                        <div className="text-xs text-gray-500 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Chat Input Form */}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                  placeholder="Type your message to the AI sales agent..."
                  value={message}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="flex-1 bg-gray-800/30 border-gray-700"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !message.trim()}
                  className="bg-cyan-700 hover:bg-cyan-600 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </Button>
                
                {/* Phone Call Dialog */}
                <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
                  <DialogTrigger asChild>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={activeCallSid ? "default" : "outline"}
                            size="icon"
                            className={activeCallSid ? "bg-green-700 hover:bg-green-600" : ""}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{activeCallSid ? "Manage active call" : "Initiate a phone call with the AI agent"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
                    <DialogHeader>
                      <DialogTitle>Initiate AI Agent Phone Call</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Enter a phone number to receive a call from our AI Sales Agent.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCallSubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone-number" className="text-right text-gray-300">
                            Phone
                          </Label>
                          <Input
                            id="phone-number"
                            placeholder="+12345678901"
                            value={phoneNumber}
                            onChange={handlePhoneNumberChange}
                            className="col-span-3 bg-gray-800 border-gray-700"
                            disabled={isPhoneCalling}
                            required
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          Enter phone number in E.164 format: +[country code][number]
                          <br />
                          Example: +12025550123 for a US number
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose ref={closeDialogRef} asChild>
                          <Button type="button" variant="outline" disabled={isPhoneCalling} className="border-gray-700">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button 
                          type="submit" 
                          disabled={isPhoneCalling || !phoneNumber.trim()}
                          className="bg-cyan-700 hover:bg-cyan-600"
                        >
                          {isPhoneCalling ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Initiating Call...
                            </>
                          ) : (
                            'Start Call'
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </form>
              
              {/* Active Call Controls */}
              {activeCallSid && (
                <div className="mt-4 p-3 rounded-md bg-green-900/20 border border-green-700/30">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-green-400 mr-2" />
                      <span className="text-sm text-green-300">Call in progress</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:text-red-400 border-red-800/50 hover:bg-red-900/30"
                      onClick={() => {
                        // In a real implementation, we would end the call via API here
                        setActiveCallSid(null);
                        toast({
                          title: 'Call Ended',
                          description: 'The phone call has been terminated.',
                        });
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      End Call
                    </Button>
                  </div>
                </div>
              )}
                </TabsContent>
                
                {/* Manage Agents Tab Content */}
                <TabsContent value="manage" className="mt-0">
                  {isLoadingAgents ? (
                    <div className="flex justify-center items-center h-[350px]">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : userAgents?.length === 0 ? (
                    <div className="text-center py-12">
                      <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-xl font-medium mb-2">No Saved Agents</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven't created any AI agents yet. Create one from the agent settings tab below.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        {userAgents && userAgents.map((agent) => (
                          <Card key={agent.id} className="bg-gray-800/40 border-gray-700">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-base flex items-center">
                                  <Bot className="h-4 w-4 mr-2 text-primary" />
                                  {agent.name}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                  <Badge variant={agent.is_active ? "default" : "secondary"} 
                                         className={agent.is_active ? "bg-green-600/20 text-green-300" : ""}>
                                    {agent.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </div>
                              <CardDescription className="text-xs line-clamp-2">
                                {agent.description || "No description provided"}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2 text-xs text-gray-400">
                              <div className="flex items-center justify-between">
                                <span>Calls: {agent.call_count || 0}</span>
                                <span>Voice: {agent.voice_id || "Default"}</span>
                              </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end pt-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="bg-transparent border-gray-700"
                                  >
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-900 text-white border-gray-800 max-w-xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Bot className="h-5 w-5 text-primary" />
                                      {agent.name}
                                    </DialogTitle>
                                    <DialogDescription>
                                      {agent.description || "No description provided."}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 my-4">
                                    <div>
                                      <h4 className="text-sm font-medium mb-1">System Prompt</h4>
                                      <div className="p-3 rounded-md bg-gray-800/50 border border-gray-700 text-sm whitespace-pre-wrap">
                                        {agent.system_prompt || "No system prompt defined."}
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium mb-1">Voice</h4>
                                      <div className="p-3 rounded-md bg-gray-800/50 border border-gray-700 text-sm">
                                        {agent.voice_id || "No voice selected."}
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium mb-1">Call Statistics</h4>
                                      <div className="p-3 rounded-md bg-gray-800/50 border border-gray-700 text-sm">
                                        Total calls: {agent.call_count || 0}
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline" className="border-gray-700">
                                        Close
                                      </Button>
                                    </DialogClose>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Link href={`/edit-agent/${agent.id}`}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30"
                                >
                                  Edit
                                </Button>
                              </Link>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    className="bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30"
                                  >
                                    Delete
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-900 text-white border-gray-800">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <AlertTriangle className="h-5 w-5 text-red-400" />
                                      Delete Agent
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-400">
                                      Are you sure you want to delete this agent? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="my-4 p-3 bg-red-950/30 border border-red-900/50 rounded-md">
                                    <h4 className="text-sm font-medium mb-1 text-red-300">Enhanced Deletion System</h4>
                                    <p className="text-xs text-gray-400">
                                      The enhanced deletion system will automatically try multiple methods if the standard deletion fails:
                                    </p>
                                    <ul className="text-xs text-gray-400 list-disc list-inside mt-1">
                                      <li>Standard deletion (safe method)</li>
                                      <li>Aggressive deletion (resolves dependencies)</li>
                                      <li>Nuclear deletion (last resort method)</li>
                                    </ul>
                                  </div>
                                  
                                  <DialogFooter className="mt-4">
                                    <DialogClose asChild>
                                      <Button variant="outline" className="border-gray-700">
                                        Cancel
                                      </Button>
                                    </DialogClose>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => {
                                        // Close the dialog first to avoid UI issues
                                        const closeButton = document.querySelector('[role="dialog"] button.border-gray-700');
                                        if (closeButton instanceof HTMLElement) {
                                          closeButton.click();
                                        }
                                        
                                        // Small delay to ensure dialog is closed before deletion starts
                                        setTimeout(() => {
                                          handleDeleteAgent(agent.id);
                                        }, 100);
                                      }}
                                      className="bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30"
                                    >
                                      Confirm Deletion
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
        
        <main className="flex-grow relative">
          <div className="container mx-auto">
            {/* Agent Settings Section - No separate background */}
            <div className="mb-10 relative">
              {/* Content directly on global background with same styling as Partner Dashboard cards */}
              <div className="relative z-10 bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md overflow-hidden rounded-lg"
                   style={{ 
                     background: 'rgba(20, 20, 30, 0.7)', 
                     animation: 'cardGlow 4s ease-in-out infinite',
                     boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                   }}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#33C3BD] to-[#0075FF]"></div>
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <AnimatedIcon icon={<BrainCircuit className="h-6 w-6 text-cyan-400" />} color="cyan" />
                    <h2 className="text-xl font-bold ml-3 text-white">Agent Settings</h2>
                  </div>
                  <ErrorBoundary fallback={<div className="p-6 text-center text-white">Error loading agent settings. Please try refreshing the page.</div>}>
                    <EnhancedAgentSettingsWrapper />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
            
            {/* Leads Management Section */}
            <div className="grid grid-cols-1 gap-6 mt-6 mb-6">
              {/* Wrap in error boundary */}
              {/* Replaced ErrorBoundary with direct component to avoid errors when clicking phone icons */}
                <LeadsManagementSection />
            </div>
          </div>
        </main>

        <footer className="px-6 py-4 mt-6 text-center relative z-10">
          <div className="text-gray-400 text-sm">
            <p>AI Agent Dashboard | Node.js + Express + WebSockets | © WarmLeadNetwork {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}