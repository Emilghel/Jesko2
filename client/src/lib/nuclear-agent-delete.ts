import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

/**
 * Nuclear delete function for agents that are persistently failing to delete
 * via conventional methods. This is a last resort option that directly removes
 * database entries in a specific sequence to overcome deletion blockers.
 * 
 * WARNING: This is extremely destructive and bypasses normal safeguards.
 * Only use when standard and force deletion have both failed repeatedly.
 * 
 * @param agentId ID of the agent to delete
 */
export async function nuclearDeleteAgent(agentId: number): Promise<void> {
  try {
    // Log the nuclear deletion attempt
    console.warn(`⚠️ NUCLEAR DELETE initiated for agent ID: ${agentId}`);
    
    // Before deletion, ensure we have the latest data
    await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
    
    // First, add a delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Call the backend nuclear deletion endpoint
    const response = await fetch(`/api/user/agents/${agentId}/nuclear`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Ensure cookies are sent with the request
    });
    
    if (!response.ok) {
      let errorMessage = 'Nuclear deletion failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
        // Try to get text response if JSON parsing fails
        try {
          const errorText = await response.text();
          if (errorText) errorMessage += `: ${errorText}`;
        } catch (textError) {
          console.error('Could not get error text either:', textError);
        }
      }
      throw new Error(errorMessage);
    }
    
    // Success notification
    toast({
      title: "Agent Deleted Successfully",
      description: "The agent was completely removed using nuclear deletion.",
      variant: "default",
    });
    
    // Clean up ALL cached data for this agent to ensure proper UI refresh
    // First completely remove these queries from the cache
    queryClient.removeQueries({ queryKey: ['/api/user/agents'] });
    queryClient.removeQueries({ queryKey: ['/api/calls'] });
    queryClient.removeQueries({ queryKey: ['/api/automated-calls'] });
    
    // Wait a moment before issuing the refetch to avoid race conditions
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Then trigger a hard refetch of all related data
    queryClient.invalidateQueries({ 
      queryKey: ['/api/user/agents'],
      refetchType: 'all'
    });
    queryClient.invalidateQueries({ 
      queryKey: ['/api/calls'],
      refetchType: 'all'
    });
    queryClient.invalidateQueries({ 
      queryKey: ['/api/automated-calls'],
      refetchType: 'all'
    });
    
    // Log success
    console.log(`⚠️ NUCLEAR DELETE successful for agent ID: ${agentId}`);
    
    return;
  } catch (error) {
    console.error('Nuclear deletion failed:', error);
    
    // Error notification
    toast({
      title: "Nuclear Deletion Failed",
      description: error instanceof Error ? error.message : "An unexpected error occurred during nuclear deletion.",
      variant: "destructive",
    });
    
    throw error;
  }
}