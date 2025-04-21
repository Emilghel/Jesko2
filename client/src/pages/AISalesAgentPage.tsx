import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { 
  Phone, Mic, CirclePlay, HelpCircle, X, Loader2
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
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
import { Label } from "@/components/ui/label";
import { queryClient } from '@/lib/queryClient';
import AdvancedStarryBackground from '@/components/AdvancedStarryBackground';

export default function AISalesAgentPage() {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isPhoneCalling, setIsPhoneCalling] = useState(false);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);
  const closeDialogRef = useRef<HTMLButtonElement>(null);

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
      const data = await apiRequest('/api/user/agent');
      return data?.agent || null;
    },
    staleTime: 60000,
  });

  // Send message to the SalesGPT API
  const sendMessage = async () => {
    if (!message.trim()) return;
    
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
      
      // Call the API
      const response = await apiRequest('/api/salesgpt/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage.text
        })
      });
      
      // Add AI response to conversation
      if (response) {
        const aiMessage = {
          type: 'ai' as const,
          text: response.response,
          timestamp: new Date(),
          audioUrl: response.audio_url
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
    
    try {
      const response = await apiRequest('/api/salesgpt/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text
        })
      });
      
      if (response && response.audio_url) {
        // Play the audio
        const audio = new Audio(response.audio_url);
        audio.play();
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
      
      const agentId = agentData?.id || 1; // Use default agent ID if none available
      
      const response = await apiRequest('/api/twilio-direct/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId,
          phoneNumber: formattedNumber,
          record: true
        })
      });
      
      return response;
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

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-blue-950 to-black text-white">
      <AdvancedStarryBackground 
        density={25}
        enableTAA={true}
        enableSSAO={true}
        enableHDR={true}
        enableBloom={true}
        depth={2}
      />
      <div className="container mx-auto py-6 relative z-10">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Sales Agent</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="h-4 w-4" />
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
        
        <Card>
          <CardHeader>
            <CardTitle>Sales Conversation</CardTitle>
            <CardDescription>
              Have a conversation with our AI sales agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-y-auto border rounded-md p-4">
              {conversation.messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Start a conversation with the AI Sales Agent
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
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm">{formatMessage(msg.text)}</div>
                      </div>
                      
                      {msg.type === 'ai' && msg.audioUrl && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            const audio = new Audio(msg.audioUrl);
                            audio.play();
                          }}
                          className="mt-1"
                        >
                          <CirclePlay className="h-4 w-4 mr-1" />
                          Play audio
                        </Button>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSubmit} className="w-full">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !message.trim()}
                >
                  Send
                </Button>
                
                {/* Phone Call Dialog */}
                <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
                  <DialogTrigger asChild>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={activeCallSid ? "bg-green-100" : ""}
                          >
                            <Phone className={`h-4 w-4 ${activeCallSid ? "text-green-600" : ""}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{activeCallSid ? "Active call in progress" : "Initiate a phone call with the AI agent"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Initiate AI Agent Phone Call</DialogTitle>
                      <DialogDescription>
                        Enter a phone number to receive a call from our AI Sales Agent.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCallSubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone-number" className="text-right">
                            Phone
                          </Label>
                          <Input
                            id="phone-number"
                            placeholder="+12345678901"
                            value={phoneNumber}
                            onChange={handlePhoneNumberChange}
                            className="col-span-3"
                            disabled={isPhoneCalling}
                            required
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Enter phone number in E.164 format: +[country code][number]
                          <br />
                          Example: +12025550123 for a US number
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose ref={closeDialogRef} asChild>
                          <Button type="button" variant="outline" disabled={isPhoneCalling}>
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button type="submit" disabled={isPhoneCalling || !phoneNumber.trim()}>
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
              </div>
            </form>
          </CardFooter>
        </Card>
        
        {/* Active Call Status Banner */}
        {activeCallSid && (
          <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-md flex justify-between items-center">
            <div className="flex items-center">
              <Phone className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm text-green-700">Active call in progress</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
              onClick={() => {
                // In a real implementation, we would end the call via API here
                setActiveCallSid(null);
                toast({
                  title: 'Call Ended',
                  description: 'The phone call has been terminated.',
                });
              }}
            >
              <X className="h-4 w-4 mr-1" />
              End Call
            </Button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}