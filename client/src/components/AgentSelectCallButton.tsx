import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPhoneNumberForTwilio } from '@/lib/phone-utils';

interface Agent {
  id: number;
  name: string;
  description: string;
}

interface AgentSelectCallButtonProps {
  phoneNumber: string;
  recipient: string;
  className?: string;
}

/**
 * A call button that allows selecting which AI agent to use for the call
 */
export function AgentSelectCallButton({ 
  phoneNumber,
  recipient,
  className = ''
}: AgentSelectCallButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Load available agents on component mount
  useEffect(() => {
    async function loadAgents() {
      try {
        setLoadingAgents(true);
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data = await response.json();
          
          // Check if our special Twilio test agent (ID 210) is in the list
          const hasSpecialAgent = data.some(agent => agent.id === 210);
          
          // If not, add it manually to ensure it's always available
          if (!hasSpecialAgent) {
            console.log('[AGENT_CALL] Adding special Twilio test agent (ID: 210)');
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
            setSelectedAgentId(defaultAgentId);
          }
        } else {
          console.error('[AGENT_CALL] Failed to load agents:', await response.text());
          toast({
            title: 'Error loading agents',
            description: 'Could not load available AI agents.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('[AGENT_CALL] Error:', error);
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

  const handleClick = async () => {
    try {
      if (!selectedAgentId) {
        toast({
          title: 'No agent selected',
          description: 'Please select an AI agent to make the call.',
          variant: 'destructive',
        });
        return;
      }
      
      setIsLoading(true);
      console.log('[AGENT_CALL] Initiating call with:', {
        recipient,
        phoneNumber,
        agentId: selectedAgentId
      });

      // Format the phone number using our utility
      let formattedPhoneNumber;
      try {
        formattedPhoneNumber = formatPhoneNumberForTwilio(phoneNumber);
        console.log('[AGENT_CALL] Formatted phone number:', formattedPhoneNumber);
      } catch (formatError) {
        console.error('[AGENT_CALL] Error formatting phone number:', formatError);
        toast({
          title: 'Phone number error',
          description: formatError instanceof Error ? formatError.message : 'Invalid phone number format',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Make API call
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: parseInt(selectedAgentId),
          phoneNumber: formattedPhoneNumber,
          twilioPhoneNumber: '+15302886523' // Default Twilio phone number
        }),
      });

      console.log('[AGENT_CALL] Response status:', response.status);
      
      const data = await response.json();
      console.log('[AGENT_CALL] Response data:', data);
      
      if (response.ok) {
        const selectedAgent = agents.find(agent => agent.id.toString() === selectedAgentId);
        toast({
          title: 'Call initiated',
          description: `Calling ${recipient} with agent: ${selectedAgent?.name || 'Unknown'}...`,
        });
      } else {
        toast({
          title: 'Call failed',
          description: data.error || data.details || 'Failed to initiate call',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[AGENT_CALL] Error:', error);
      toast({
        title: 'Call error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Select 
        value={selectedAgentId} 
        onValueChange={setSelectedAgentId}
        disabled={loadingAgents || isLoading}
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
      
      <Button
        onClick={handleClick}
        disabled={isLoading || !selectedAgentId}
        size="sm"
        variant="outline"
        className={`bg-blue-100 text-blue-700 hover:bg-blue-200 ${className}`}
      >
        <Phone className="h-3.5 w-3.5 mr-1" />
        {isLoading ? 'Calling...' : 'Call with Selected Agent'}
      </Button>
    </div>
  );
}