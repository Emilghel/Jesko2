import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DirectCallButtonProps {
  phoneNumber: string;
  recipient: string;
  disabled?: boolean;
  agentId?: number;
}

/**
 * A simplified direct call button that bypasses the complex call dialog
 * and directly makes an API call to initiate a Twilio call
 */
export function DirectCallButton({ phoneNumber, recipient, disabled = false, agentId }: DirectCallButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Default Twilio phone number
  const twilioPhoneNumber = '+15302886523';

  const handleClick = async () => {
    try {
      setIsLoading(true);
      console.log('[DIRECT_CALL] Initiating direct call to:', {
        recipient,
        phoneNumber,
        twilioPhoneNumber
      });

      // Make direct API call
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          phoneNumber,
          twilioPhoneNumber
        }),
      });

      console.log('[DIRECT_CALL] Response status:', response.status);
      
      const data = await response.json();
      console.log('[DIRECT_CALL] Response data:', data);

      if (response.ok) {
        toast({
          title: 'Call initiated',
          description: `Calling ${recipient}...`,
        });
      } else {
        toast({
          title: 'Call failed',
          description: data.error || data.details || 'Failed to initiate call',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[DIRECT_CALL] Error:', error);
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
    <Button
      onClick={handleClick}
      disabled={isLoading || disabled}
      size="sm"
      variant="outline"
      className="bg-blue-50 text-blue-700 hover:bg-blue-100"
    >
      <Phone className="h-3.5 w-3.5 mr-1" />
      {isLoading ? 'Calling...' : 'Direct Call'}
    </Button>
  );
}