import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { useUserAgents } from "@/hooks/use-user-agents";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TestCall() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { userAgents, isLoading: isLoadingAgents } = useUserAgents();
  
  const [callSid, setCallSid] = useState('TEST-CALL-' + Math.random().toString(36).substring(2, 10));
  const [userMessage, setUserMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<{role: string, content: string}[]>([]);
  
  // Extract agent ID from URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const agentIdParam = urlParams.get('agentId');
  const agentId = agentIdParam ? parseInt(agentIdParam) : null;
  
  // Find the selected agent
  const selectedAgent = userAgents.find(agent => agent.id === agentId);
  
  useEffect(() => {
    // If agent ID is provided but not found, show error
    if (agentId && !isLoadingAgents && !selectedAgent) {
      toast({
        title: "Agent Not Found",
        description: "The selected AI agent could not be found. You may have been redirected to the test page.",
        variant: "destructive"
      });
    }
    
    // If we have a valid agent, display confirmation
    if (selectedAgent) {
      toast({
        title: "Agent Selected",
        description: `Testing "${selectedAgent.name}" agent. Send a message to begin the conversation.`,
      });
    }
  }, [selectedAgent, isLoadingAgents, agentId, toast]);

  const simulateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userMessage.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a message to send to the AI.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create a simulated Twilio request object similar to what would come from a real call
      const mockedTwilioRequest = {
        CallSid: callSid,
        From: '+15551234567',
        SpeechResult: userMessage,
        // Include agent ID if we have one
        AgentId: agentId
      };
      
      toast({
        title: "Processing",
        description: "Sending your message to the AI...",
      });
      
      // Call the audio webhook endpoint
      const response = await axios.post('/api/twilio/audio', mockedTwilioRequest);
      
      if (response.data.success) {
        // Wait for the WebSocket to deliver the response
        // In a real app, this would be handled by the WebSocket connection
        // For now, we'll simulate it with a delay
        setTimeout(() => {
          // Make a separate request to get the AI response
          // In a real app with WebSockets, this would be unnecessary
          axios.get('/api/logs?level=INFO').then(logsResponse => {
            const logs = logsResponse.data;
            const conversationLog = logs.find((log: any) => 
              log.message.includes('Received speech') && 
              log.message.includes(userMessage.substring(0, 10))
            );
            
            if (conversationLog) {
              const aiResponseLog = logs.find((log: any) => 
                log.timestamp > conversationLog.timestamp && 
                log.source === 'OpenAI'
              );
              
              if (aiResponseLog) {
                const responseText = aiResponseLog.message.replace('OpenAI response: ', '');
                setAiResponse(responseText);
                
                // Update conversation history
                const newConversation = [
                  ...conversation,
                  { role: 'user', content: userMessage },
                  { role: 'assistant', content: responseText }
                ];
                setConversation(newConversation);
                
                // Clear input
                setUserMessage('');
                
                toast({
                  title: "Response Received",
                  description: "The AI has responded to your message.",
                });
              } else {
                toast({
                  title: "No Response",
                  description: "Couldn't find the AI response in logs. Check server logs for details.",
                  variant: "destructive"
                });
              }
            } else {
              toast({
                title: "Error",
                description: "Couldn't find your message in the logs. Try again.",
                variant: "destructive"
              });
            }
            setIsProcessing(false);
          });
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: "Failed to process your message.",
          variant: "destructive"
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error simulating call:', error);
      toast({
        title: "Error",
        description: "Failed to communicate with the server. See console for details.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const resetCall = () => {
    setCallSid('TEST-CALL-' + Math.random().toString(36).substring(2, 10));
    setConversation([]);
    setAiResponse('');
    toast({
      title: "Call Reset",
      description: "Started a new conversation with a fresh session ID.",
    });
  };

  const handleBackToDashboard = () => {
    setLocation('/dashboard');
  };

  if (isLoadingAgents && agentId) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          className="text-xs flex items-center bg-[#1E293B] hover:bg-[#2E3B4B] text-gray-300 border-0"
          onClick={handleBackToDashboard}
        >
          <ArrowLeft className="h-3 w-3 mr-1" /> Back to Dashboard
        </Button>
        
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
          Test Voice AI Conversation
        </h1>
        
        <div className="w-24"></div> {/* Empty div for balance */}
      </div>

      {/* Agent Info (if applicable) */}
      {selectedAgent && (
        <div className="mb-6 bg-[#0F172A] rounded-lg p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium text-white">{selectedAgent.name}</h2>
              <Badge variant={selectedAgent.is_active ? "default" : "outline"} className="ml-2">
                {selectedAgent.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          {selectedAgent.description && (
            <p className="text-sm text-gray-400 mt-2">{selectedAgent.description}</p>
          )}
        </div>
      )}
      
      <div className="bg-[#0F172A] rounded-lg p-6 mb-8 border border-[#1E293B]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-[#33C3BD]">Simulated Call</h2>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">Session ID:</span>
            <code className="bg-[#1E293B] text-xs rounded px-2 py-1">{callSid}</code>
            <button 
              onClick={resetCall}
              className="ml-3 text-xs bg-[#1E293B] hover:bg-[#2E3B4B] text-gray-300 px-2 py-1 rounded"
              disabled={isProcessing}
            >
              New Session
            </button>
          </div>
        </div>
        
        <div className="bg-[#1E293B] rounded-lg p-4 mb-4 h-64 overflow-y-auto">
          {conversation.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <p>No conversation yet. Send a message to begin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversation.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.role === 'user' 
                        ? 'bg-[#0075FF] text-white rounded-br-none' 
                        : 'bg-[#2D3748] text-gray-200 rounded-bl-none border-l-2 border-[#33C3BD]'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <form onSubmit={simulateCall}>
          <div className="flex items-center">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Type a message to test the AI..."
              className="flex-1 bg-[#1E293B] border border-[#2D3748] text-gray-200 rounded-l-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#33C3BD]"
              disabled={isProcessing}
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] text-white px-4 py-2 rounded-r-md font-medium text-sm disabled:opacity-50"
              disabled={isProcessing || !userMessage.trim()}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing
                </span>
              ) : (
                "Send"
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-[#0F172A] rounded-lg p-6 border border-[#1E293B]">
        <h2 className="text-lg font-medium text-[#33C3BD] mb-4">Voice AI System Setup</h2>
        
        <div className="space-y-4 text-sm text-gray-300">
          <p>This test interface allows you to simulate voice conversations with your AI without making actual phone calls. It uses the same API endpoints that the Twilio integration uses, bypassing only the voice input/output layer.</p>
          
          <div className="bg-[#1E293B] rounded p-3 border border-[#2D3748]">
            <h3 className="font-medium text-white mb-2">How to set up Twilio for real voice calls:</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li>Log in to your Twilio console</li>
              <li>Configure your phone number's Voice webhook to point to <code className="bg-[#0F172A] px-1 rounded">/api/twilio/voice</code></li>
              <li>Set the HTTP method to POST</li>
              <li>Save your changes</li>
              <li>For more details, see the TWILIO_SETUP.md file</li>
            </ol>
          </div>
          
          <p>When properly configured, callers to your Twilio number will be connected to your AI agent, which will respond using the voice and parameters you've configured in the settings.</p>
        </div>
      </div>
    </div>
  );
}