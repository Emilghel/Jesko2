import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

// Define Lead type inline to avoid circular dependency
export interface Lead {
  id: number;
  user_id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
  source: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_contacted: string | null;
  tags: string[] | null;
}

// Define Agent type
interface Agent {
  id: number;
  name: string;
}

interface CallDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  lead: Lead | null;
  onInitiateCall: (agentId: number, twilioPhoneNumber: string | null) => void;
  phoneNumbers: { friendlyName: string; phoneNumber: string }[];
  phoneNumbersLoading: boolean;
  callInProgress: boolean;
}

export function CallDialog({
  isOpen,
  setIsOpen,
  lead,
  onInitiateCall,
  phoneNumbers = [],
  phoneNumbersLoading = false,
  callInProgress = false,
}: CallDialogProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Fetch agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/agents');
        if (!response.ok) {
          throw new Error(`Failed to fetch agents: ${response.status}`);
        }
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching agents:', error);
        return [];
      }
    },
  });
  
  // Reset selections when dialog opens or closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAgentId(null);
      setSelectedPhoneNumber(null);
    }
  }, [isOpen]);
  
  const handleInitiateCall = () => {
    if (!selectedAgentId) {
      toast({
        title: 'Missing information',
        description: 'Please select an AI agent to make the call',
        variant: 'destructive',
      });
      return;
    }
    
    onInitiateCall(selectedAgentId, selectedPhoneNumber);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Initiate AI Call</DialogTitle>
          <DialogDescription className="text-gray-400">
            Your AI agent will call this lead using Twilio.
          </DialogDescription>
        </DialogHeader>
        
        {lead && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-200">Lead Information</h4>
              <div className="bg-gray-800 p-3 rounded-md">
                <div className="text-white">{lead.full_name}</div>
                <div className="text-blue-400 flex items-center mt-1">
                  <Phone className="h-3.5 w-3.5 mr-1.5" /> 
                  {lead.phone_number}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-200">Select AI Agent</h4>
              <Select
                value={selectedAgentId?.toString() || ''} 
                onValueChange={(value) => setSelectedAgentId(parseInt(value))}
                disabled={agentsLoading || callInProgress}
              >
                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select an AI agent" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {agentsLoading ? (
                    <SelectItem value="" disabled>Loading agents...</SelectItem>
                  ) : agents && agents.length > 0 ? (
                    agents.map((agent: Agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No agents found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-200">Outgoing Call Details</h4>
              
              {/* Outgoing call info box */}
              <div className="bg-gray-800/50 border border-gray-700 p-3 rounded-md">
                <p className="text-sm text-gray-300 mb-2">
                  <strong>Your lead will see this phone number when called:</strong>
                </p>
                
                <Select
                  value={selectedPhoneNumber || ''}
                  onValueChange={setSelectedPhoneNumber}
                  disabled={phoneNumbersLoading || callInProgress}
                >
                  <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Use default number (+1 530 288 6523)" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="">Use default number (+1 530 288 6523)</SelectItem>
                    {phoneNumbersLoading ? (
                      <SelectItem value="" disabled>Loading phone numbers...</SelectItem>
                    ) : phoneNumbers && phoneNumbers.length > 0 ? (
                      phoneNumbers.map((phone, index) => {
                        const phoneNumber = typeof phone === 'string' ? phone : phone.phoneNumber;
                        const displayName = typeof phone === 'string' ? phone : (phone.friendlyName || phone.phoneNumber);
                        
                        return (
                          <SelectItem key={index} value={phoneNumber}>
                            {displayName}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="" disabled>No purchased numbers found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                
                <div className="mt-2 text-xs text-amber-300">
                  <div className="flex items-start">
                    <Phone className="h-3.5 w-3.5 mr-1.5 mt-0.5" />
                    <span>
                      This is the phone number that will be displayed on your lead's caller ID when they receive the call. Using your Twilio phone number ensures professional call presentation.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={callInProgress}>
            Cancel
          </Button>
          <div className="flex space-x-2">
            <Button 
              onClick={handleInitiateCall} 
              disabled={!selectedAgentId || callInProgress}
              className="relative"
            >
              {callInProgress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Start AI Call
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => {
                // Debug button to test direct API call with specific values
                console.log('[CALL DEBUG] Making direct test call with fixed values...');
                
                // Import API directly to make sure we're using the same method
                import('../lib/api').then(({ API }) => {
                  console.log('[CALL DEBUG] Loaded API utility');
                  
                  // Use the explicit hardcoded values for testing
                  API.initiateCall(
                    1, // agentId hardcoded for testing
                    '+14155552671', // lead phone number hardcoded for testing
                    undefined, // no leadId
                    '+15302886523' // twilio phone hardcoded for testing
                  ).then(response => {
                    console.log('[CALL DEBUG] Direct API test response status:', response.status);
                    return response.json().then(data => {
                      console.log('[CALL DEBUG] Direct API test JSON response:', data);
                      
                      toast({
                        title: "Test call result",
                        description: response.ok ? "Success! Check console for details" : `Error: ${data.error}`,
                        variant: response.ok ? "default" : "destructive"
                      });
                    });
                  }).catch(err => {
                    console.error('[CALL DEBUG] Direct API test error:', err);
                    toast({
                      title: "Test call failed",
                      description: err.message || "Unknown error",
                      variant: "destructive"
                    });
                  });
                });
              }} 
              variant="outline"
              type="button"
            >
              Test Direct Call
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}