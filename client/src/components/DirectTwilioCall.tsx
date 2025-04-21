/**
 * Direct Twilio Call Component
 * 
 * This component provides an enhanced direct Twilio calling experience
 * similar to how ElevenLabs integrates with Twilio for smoother calling.
 */
import { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertCircle, 
  Phone, 
  RefreshCw, 
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper function to format phone numbers
const formatPhoneNumberForTwilio = (phoneNumber: string): string => {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it doesn't start with +, add + and country code if needed
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+1' + cleaned;  // Default to US
    }
  }
  
  return cleaned;
};

// Preset phone numbers for testing
const PRESET_NUMBERS = [
  { label: 'Twilio Test', value: '+15005550006' },
  { label: 'US Number', value: '+16505551212' }
];

export default function DirectTwilioCall() {
  const [phoneNumber, setPhoneNumber] = useState('+15005550006'); // Twilio test number
  const [twilioNumber, setTwilioNumber] = useState('+15302886523'); // Our Twilio number
  const [agentId, setAgentId] = useState(''); // Empty string - will be set after agents load
  const [agents, setAgents] = useState<Array<{id: number; name: string; description: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [callResult, setCallResult] = useState<{success: boolean; message: string; data?: any} | null>(null);
  const [record, setRecord] = useState(false);
  const [lastCallSid, setLastCallSid] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Load available agents on component mount
  useEffect(() => {
    async function loadAgents() {
      try {
        setLoadingAgents(true);
        console.log('[DIRECT_TWILIO] Loading agents from /api/agents');
        
        const response = await fetch('/api/agents', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('auth_token') ? 
              `Bearer ${localStorage.getItem('auth_token')}` : ''
          }
        });
        
        console.log('[DIRECT_TWILIO] Agents response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[DIRECT_TWILIO] Loaded agents:', data);
          
          setAgents(data);
          
          // If we have agents, default to the first one
          if (data.length > 0) {
            console.log(`[DIRECT_TWILIO] Setting default agent ID to ${data[0].id.toString()}`);
            setAgentId(data[0].id.toString());
          } else {
            console.warn('[DIRECT_TWILIO] No agents found in the response');
          }
        } else {
          const errorText = await response.text();
          console.error('[DIRECT_TWILIO] Failed to load agents:', response.status, errorText);
          toast({
            title: 'Error loading agents',
            description: `Could not load available AI agents. Status: ${response.status}`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('[DIRECT_TWILIO] Error loading agents:', error);
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
        // Fix common user input errors like double plus signs
        let cleanNumber = phoneNumber;
        
        // Remove any extra '+' symbols beyond the first one
        if (phoneNumber.indexOf('+') !== phoneNumber.lastIndexOf('+')) {
          cleanNumber = '+' + phoneNumber.replace(/\+/g, '');
        }
        
        const formattedNumber = formatPhoneNumberForTwilio(cleanNumber);
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

      console.log('[DIRECT_TWILIO] Starting direct call with:', {
        phoneNumber,
        twilioNumber,
        agentId: parseInt(agentId),
        record
      });

      // Make direct API call to our enhanced endpoint
      const response = await fetch('/api/twilio-direct/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('auth_token') ? 
            `Bearer ${localStorage.getItem('auth_token')}` : ''
        },
        body: JSON.stringify({
          agentId: parseInt(agentId),
          phoneNumber,
          twilioPhoneNumber: twilioNumber,
          record
        }),
      });

      console.log('[DIRECT_TWILIO] Response status:', response.status);
      
      const data = await response.json();
      console.log('[DIRECT_TWILIO] Response data:', data);

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
      console.error('[DIRECT_TWILIO] Error:', error);
      
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
      console.error('[DIRECT_TWILIO] Error checking call status:', error);
      
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
        <CardTitle>Enhanced Twilio Call</CardTitle>
        <CardDescription>
          Test the enhanced Twilio integration with ElevenLabs TTS
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
                  placeholder="+14155552671"
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
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="recording">Enable Recording</Label>
              <p className="text-xs text-muted-foreground">
                Record this call (may cause issues)
              </p>
            </div>
            <Switch
              id="recording"
              checked={record}
              onCheckedChange={setRecord}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
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
                  <Phone className="mr-2 h-4 w-4" /> Make Enhanced Call
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
          <p className="font-semibold mb-1">Enhanced Twilio Integration:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Uses direct TwiML for smoother voice interactions</li>
            <li>Improved speech recognition and agent responses</li>
            <li>Enhanced error handling and fallback mechanisms</li>
            <li>Designed to work more seamlessly like ElevenLabs integration</li>
          </ul>
        </div>
      </CardFooter>
    </Card>
  );
}