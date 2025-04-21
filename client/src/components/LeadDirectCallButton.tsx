import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneNumberForTwilio } from '@/lib/phone-utils';

interface LeadDirectCallButtonProps {
  leadPhoneNumber: string;
  leadName: string;
  agentId?: number;
  className?: string;
}

/**
 * A direct call button that bypasses the complex call dialog
 * and directly calls the Twilio API with hardcoded values for testing
 */
export function LeadDirectCallButton({ 
  leadPhoneNumber, 
  leadName, 
  agentId, // Agent ID parameter now required, no default
  className = ''
}: LeadDirectCallButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      console.log('[DIRECT_CALL] Starting direct call with:', {
        leadName,
        leadPhoneNumber,
        agentId
      });

      // Format the phone number using our utility
      let formattedPhoneNumber;
      try {
        formattedPhoneNumber = formatPhoneNumberForTwilio(leadPhoneNumber);
        console.log('[DIRECT_CALL] Formatted phone number:', formattedPhoneNumber);
      } catch (formatError) {
        console.error('[DIRECT_CALL] Error formatting phone number:', formatError);
        toast({
          title: 'Phone number error',
          description: formatError instanceof Error ? formatError.message : 'Invalid phone number format',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Make a direct API call with hardcoded Twilio number
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          phoneNumber: formattedPhoneNumber,
          twilioPhoneNumber: '+15302886523' // Hardcoded for testing
        }),
      });

      console.log('[DIRECT_CALL] API response status:', response.status);
      
      // Parse the response
      const data = await response.json();
      console.log('[DIRECT_CALL] API response data:', data);
      
      if (response.ok) {
        toast({
          title: 'Direct call initiated',
          description: `Calling ${leadName} at ${leadPhoneNumber}...`,
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
      disabled={isLoading}
      size="sm"
      variant="outline"
      className={`bg-blue-100 text-blue-700 hover:bg-blue-200 ${className}`}
    >
      <Phone className="h-3.5 w-3.5 mr-1" />
      {isLoading ? 'Calling...' : 'Direct Call'}
    </Button>
  );
}