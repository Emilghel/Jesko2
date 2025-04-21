import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Phone, Info, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { formatPhoneNumberForTwilio } from "@/lib/phone-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Quick preset phone number options
const PRESET_NUMBERS = [
  { label: 'Twilio Test Number', value: '+15005550006' },
  { label: 'Twilio Error Number', value: '+15005550001' },
  { label: 'US Test Number', value: '+16505551212' }
];

export default function DirectCallTest() {
  const [phoneNumber, setPhoneNumber] = useState('+15005550006'); // Twilio test number
  const [twilioNumber, setTwilioNumber] = useState('+15302886523');
  const [agentId, setAgentId] = useState(''); // Start with empty agentId, will be set once agents load
  const [agents, setAgents] = useState<Array<{id: number; name: string; description: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [callResult, setCallResult] = useState<{success: boolean; message: string; data?: any} | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [useRecording, setUseRecording] = useState(false);
  const [useFallback, setUseFallback] = useState(true);
  const [lastCallSid, setLastCallSid] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Load available agents on component mount
  useEffect(() => {
    async function loadAgents() {
      try {
        setLoadingAgents(true);
        console.log('[TEST_CALL] Loading agents from /api/agents');
        
        const response = await fetch('/api/agents', {
          headers: {
            'Content-Type': 'application/json',
            // Include authorization if using token-based auth
            'Authorization': localStorage.getItem('auth_token') ? 
              `Bearer ${localStorage.getItem('auth_token')}` : ''
          }
        });
        
        console.log('[TEST_CALL] Agents response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[TEST_CALL] Loaded agents:', data);
          
          // Check if our special Twilio test agent (ID 210) is in the list
          const hasSpecialAgent = data.some(agent => agent.id === 210);
          
          // If not, add it manually to ensure it's always available
          if (!hasSpecialAgent) {
            console.log('[TEST_CALL] Adding special Twilio test agent (ID: 210)');
            data.push({
              id: 210,
              name: 'Twilio Test Agent',
              description: 'Special agent for Twilio calls testing'
            });
          }
          
          setAgents(data);
          
          // If we have agents, default to the special agent if available, otherwise the first one
          if (data.length > 0) {
            const specialAgent = data.find(agent => agent.id === 210);
            const defaultAgentId = specialAgent ? '210' : data[0].id.toString();
            console.log(`[TEST_CALL] Setting default agent ID to ${defaultAgentId}`);
            setAgentId(defaultAgentId);
          } else {
            console.warn('[TEST_CALL] No agents found in the response');
          }
        } else {
          const errorText = await response.text();
          console.error('[TEST_CALL] Failed to load agents:', response.status, errorText);
          toast({
            title: 'Error loading agents',
            description: `Could not load available AI agents. Status: ${response.status}`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('[TEST_CALL] Error loading agents:', error);
        toast({
          title: 'Error',
          description: 'Failed to load agents. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingAgents(false);
      }
    }
    
    loadAgents();
  }, [toast]);

  // Format the phone number when it changes
  useEffect(() => {
    try {
      // Only attempt to format if not a test number
      if (!phoneNumber.startsWith('+1500')) {
        const formattedNumber = formatPhoneNumberForTwilio(phoneNumber);
        if (formattedNumber !== phoneNumber) {
          setPhoneNumber(formattedNumber);
        }
      }
    } catch (error) {
      // Ignore formatting errors, will be caught on submission
    }
  }, [phoneNumber]);

  const handleSelectPreset = (value: string) => {
    setPhoneNumber(value);
  };

  const handleTestCall = async () => {
    try {
      setIsLoading(true);
      setCallResult(null);
      
      // Validate phone number format
      if (!phoneNumber.startsWith('+')) {
        throw new Error('Phone number must be in E.164 format (starting with +)');
      }
      
      // Validate agent selection
      if (!agentId) {
        throw new Error('Please select an agent before making a call');
      }

      console.log('[TEST CALL] Starting direct test call with:', {
        phoneNumber,
        twilioNumber,
        agentId: parseInt(agentId),
        useRecording,
        useFallback
      });

      // Make direct API call
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: parseInt(agentId),
          phoneNumber,
          twilioPhoneNumber: twilioNumber,
          record: useRecording,
          useFallback: useFallback
        }),
      });

      console.log('[TEST CALL] Response status:', response.status);
      
      const data = await response.json();
      console.log('[TEST CALL] Response data:', data);

      if (response.ok) {
        setLastCallSid(data.callSid);
        setCallResult({
          success: true,
          message: `Call initiated successfully with SID: ${data.callSid}`,
          data
        });
        
        toast({
          title: 'Call initiated successfully',
          description: `Call SID: ${data.callSid}`,
          variant: 'default',
        });
      } else {
        setCallResult({
          success: false,
          message: data.error || data.details || 'Unknown error',
          data
        });
        
        toast({
          title: 'Call failed',
          description: data.error || data.details || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[TEST CALL] Error:', error);
      
      setCallResult({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkCallStatus = async () => {
    if (!lastCallSid) {
      toast({
        title: 'No call to check',
        description: 'You need to make a call first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/calls/${lastCallSid}`);
      
      if (response.ok) {
        const data = await response.json();
        
        setCallResult({
          success: true,
          message: `Call status: ${data.status}`,
          data
        });
        
        toast({
          title: 'Call status retrieved',
          description: `Status: ${data.status}`,
          variant: 'default',
        });
      } else {
        const errorData = await response.json();
        
        setCallResult({
          success: false,
          message: errorData.error || 'Failed to retrieve call status',
          data: errorData
        });
        
        toast({
          title: 'Failed to check call status',
          description: errorData.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[CHECK CALL] Error:', error);
      
      toast({
        title: 'Error checking call status',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Direct Call Test</CardTitle>
        <CardDescription>
          Test Twilio call functionality directly with custom parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">To (Recipient)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+15302886523"
                  className={phoneNumber.startsWith('+') ? '' : 'border-red-500'}
                />
                <Select onValueChange={handleSelectPreset}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Presets" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_NUMBERS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!phoneNumber.startsWith('+') && (
                <p className="text-xs text-red-500">Number must start with + (E.164 format)</p>
              )}
            </div>
            <div>
              <Label htmlFor="twilioNumber">From (Twilio Number)</Label>
              <Input
                id="twilioNumber"
                value={twilioNumber}
                onChange={(e) => setTwilioNumber(e.target.value)}
                placeholder="+15302886523"
              />
            </div>
            <div>
              <Label htmlFor="agentId">Agent</Label>
              <Select 
                value={agentId}
                onValueChange={setAgentId}
                disabled={loadingAgents}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingAgents ? "Loading agents..." : "Select an AI agent"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>AI Agents</SelectLabel>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name} {agent.description ? `- ${agent.description}` : ''}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced-options">
              <AccordionTrigger 
                onClick={() => setAdvanced(!advanced)}
                className="text-sm font-medium"
              >
                Advanced Options
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="recording">Enable Recording</Label>
                      <p className="text-xs text-muted-foreground">
                        Record this call (may cause issues)
                      </p>
                    </div>
                    <Switch
                      id="recording"
                      checked={useRecording}
                      onCheckedChange={setUseRecording}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="fallback">Use Fallback URL</Label>
                      <p className="text-xs text-muted-foreground">
                        Apply fallback URL for error recovery
                      </p>
                    </div>
                    <Switch
                      id="fallback"
                      checked={useFallback}
                      onCheckedChange={setUseFallback}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button
              onClick={handleTestCall}
              disabled={isLoading || !agentId}
              className="w-full"
              variant="default"
            >
              {isLoading ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" /> Make Test Call
                </>
              )}
            </Button>
            
            <Button
              onClick={checkCallStatus}
              disabled={isLoading || !lastCallSid}
              className="w-full"
              variant="outline"
            >
              <Info className="mr-2 h-4 w-4" /> 
              {lastCallSid ? 'Check Call Status' : 'No Call to Check'}
            </Button>
          </div>
          
          {callResult && (
            <Alert 
              variant={callResult.success ? "default" : "destructive"}
              className={`mt-4 ${callResult.success ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' : ''}`}
            >
              {callResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{callResult.success ? 'Success' : 'Error'}</AlertTitle>
              <AlertDescription>
                {callResult.message}
                
                {callResult.data && (
                  <div className="mt-2 text-xs">
                    <details>
                      <summary className="cursor-pointer">View Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                        {JSON.stringify(callResult.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start">
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold mb-1">Tips for Successful Calling:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use E.164 format for phone numbers (starting with +)</li>
            <li>Make sure Twilio credentials are set up correctly</li>
            <li>For testing, use Twilio's test numbers like +15005550006</li>
            <li>Call SIDs can be used to track call status</li>
          </ul>
        </div>
      </CardFooter>
    </Card>
  );
}