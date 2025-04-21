import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserAgent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useUserAgentDetails(agentId: number | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    data: agent,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<UserAgent>({
    queryKey: ['/api/user/agents', agentId],
    queryFn: async () => {
      try {
        if (!agentId) {
          throw new Error("No agent ID provided");
        }
        
        console.log(`Fetching agent details for ID: ${agentId}`);
        
        // First attempt to get from cache
        const cachedAgentsList = queryClient.getQueryData(['/api/user/agents']) as UserAgent[] | undefined;
        
        if (cachedAgentsList) {
          const cachedAgent = cachedAgentsList.find(a => a.id === agentId);
          if (cachedAgent) {
            console.log(`Found agent ${agentId} in cache, using cached data`);
            return cachedAgent;
          }
        }
        
        // If not in cache, fetch from server
        console.log(`Agent ${agentId} not in cache, fetching from server`);
        const response = await apiRequest('GET', `/api/user/agents/${agentId}`);
        
        if (!response.ok) {
          // For 401 or 403 errors, show a consistent message
          if (response.status === 401 || response.status === 403) {
            throw new Error("You don't have permission to access this agent");
          }
          
          // For 404, show a not found message
          if (response.status === 404) {
            throw new Error("The requested agent could not be found");
          }
          
          // For other errors, try to get the error message from the response
          try {
            const errorData = await response.json();
            throw new Error(
              errorData.message || `Failed to fetch agent (${response.status})`
            );
          } catch (parseError) {
            // If we can't parse JSON, fall back to a generic error
            throw new Error(`Failed to fetch agent (${response.status})`);
          }
        }
        
        console.log(`Successfully fetched agent details for ID: ${agentId} from server`);
        const agentData = await response.json();
        
        // Update the cache for the individual agent
        queryClient.setQueryData(['/api/user/agents', agentId], agentData);
        
        // Also update the agent in the agents list cache if it exists
        if (cachedAgentsList) {
          const updatedList = cachedAgentsList.map(a => 
            a.id === agentId ? agentData : a
          );
          queryClient.setQueryData(['/api/user/agents'], updatedList);
        }
        
        return agentData;
      } catch (error) {
        console.error("Error fetching agent details:", error);
        // Re-throw the error for React Query to handle
        throw error;
      }
    },
    enabled: !!agentId, // Only run the query if we have an agentId
    retry: 2, // Increased to 2 retries for better reliability
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000), // Exponential backoff
    staleTime: 1000 * 30, // 30 seconds - reduced to ensure fresher data
    gcTime: 1000 * 60 * 5, // 5 minutes
    // Error handling
    onError: (error: Error) => {
      toast({
        title: "Error loading agent",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  return {
    agent,
    isLoading,
    isError,
    error,
    refetch
  };
}

// Hook to get available voices
export function useVoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    data: voices = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/voices'],
    queryFn: async () => {
      try {
        console.log('Fetching available voices');
        const response = await apiRequest('GET', '/api/voices');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch voices (${response.status})`);
        }
        
        console.log('Successfully fetched voices');
        return response.json();
      } catch (error) {
        console.error("Error fetching voices:", error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 60, // 1 hour
    // Error handling
    onError: (error: Error) => {
      toast({
        title: "Error loading voices",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  return {
    voices,
    isLoading,
    isError,
    error,
    refetch
  };
}

// Hook to get available phone numbers
export function usePhoneNumbers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    data: phoneNumbers = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/phone-numbers'],
    queryFn: async () => {
      try {
        console.log('Fetching available phone numbers');
        const response = await apiRequest('GET', '/api/phone-numbers');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch phone numbers (${response.status})`);
        }
        
        console.log('Successfully fetched phone numbers');
        return response.json();
      } catch (error) {
        console.error("Error fetching phone numbers:", error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 10, // 10 minutes
    // Error handling
    onError: (error: Error) => {
      toast({
        title: "Error loading phone numbers",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  return {
    phoneNumbers,
    isLoading,
    isError,
    error,
    refetch
  };
}