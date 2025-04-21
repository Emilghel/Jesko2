import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { LeadCall } from '@/shared/schema';

// Hook to fetch calls for a specific lead
export function useLeadCalls(leadId: number | null) {
  return useQuery({
    queryKey: ['/api/lead-calls/lead', leadId],
    queryFn: async () => {
      if (!leadId) return { calls: [] };
      try {
        const response = await apiRequest(`/api/lead-calls/lead/${leadId}`);
        
        // Check if there was an error in the response
        if (response && response.error) {
          console.warn(`API returned error: ${response.error}`);
          // Return empty calls array with the error
          return { 
            calls: [], 
            error: response.error,
            message: 'No conversation history available'
          };
        }
        
        return response;
      } catch (error) {
        console.error(`Error fetching lead calls for lead ID ${leadId}:`, error);
        
        // Friendly message for auth errors
        if (error instanceof Error && error.message.includes('401')) {
          return { 
            calls: [], 
            error: 'Authentication error',
            message: 'Please login to view conversation history'
          };
        }
        
        // Return empty calls array with the error message
        return { 
          calls: [], 
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'No conversation history available'
        };
      }
    },
    enabled: !!leadId, // Only run the query if leadId is provided
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 401) {
        return false;
      }
      return failureCount < 1; // Only retry once for other errors
    },
    staleTime: 30000, // 30 seconds
  });
}

// Hook to fetch a specific call by ID
export function useLeadCall(callId: number | null) {
  return useQuery({
    queryKey: ['/api/lead-calls', callId],
    queryFn: async () => {
      if (!callId) return { call: null };
      const response = await apiRequest(`/api/lead-calls/${callId}`);
      return response;
    },
    enabled: !!callId, // Only run the query if callId is provided
  });
}

// Hook to create a new lead call
export function useCreateLeadCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (callData: any) => {
      const response = await apiRequest('/api/lead-calls', {
        method: 'POST',
        body: JSON.stringify(callData),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/lead-calls/lead', variables.lead_id] });
    },
  });
}

// Hook to update a lead call
export function useUpdateLeadCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<LeadCall>) => {
      const response = await apiRequest(`/api/lead-calls/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/lead-calls', variables.id] });
      if (variables.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['/api/lead-calls/lead', variables.lead_id] });
      }
    },
  });
}

// Hook to delete a lead call
export function useDeleteLeadCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, leadId }: { id: number, leadId: number }) => {
      const response = await apiRequest(`/api/lead-calls/${id}`, {
        method: 'DELETE',
      });
      return { ...response, leadId };
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/lead-calls', data.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/lead-calls/lead', data.leadId] });
    },
  });
}