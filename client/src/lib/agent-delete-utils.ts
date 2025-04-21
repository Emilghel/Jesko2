/**
 * Agent Deletion Utilities
 *
 * This module provides a reliable way to delete agents that works
 * with partner accounts and handles edge cases properly.
 */

import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { markAgentAsDeleted } from "@/lib/deleted-agents-store";

/**
 * Delete an agent using the direct database deletion endpoint
 * This is more reliable than the standard deletion API endpoint
 * 
 * @param agentId The ID of the agent to delete
 * @param force Whether to use force deletion (optional)
 * @returns A promise that resolves to true if deletion was successful
 */
export async function deleteAgent(agentId: number, force: boolean = false): Promise<boolean> {
  console.log(`[agent-delete-utils] Deleting agent ${agentId} (force: ${force})`);
  
  try {
    // Add to localStorage to ensure the agent stays deleted even if server-side deletion fails
    markAgentAsDeleted(agentId);
    console.log(`[agent-delete-utils] Agent ${agentId} marked as deleted in localStorage`);
    
    // Generate a unique request ID for tracking in logs
    const requestId = `direct-delete-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Always use the direct database deletion endpoint for reliability
    const url = `/api/agents/direct-db-delete/${agentId}`;
    
    // Optimistically update the UI first by completely removing the agent from the cache
    // This is the key part that ensures the agent doesn't reappear on page refresh
    await queryClient.cancelQueries({ queryKey: ['/api/user/agents'] });
    
    const previousAgents = queryClient.getQueryData(['/api/user/agents']) as any[] | undefined;
    
    if (previousAgents && Array.isArray(previousAgents)) {
      // Remove from main agents list
      const updatedAgents = previousAgents.filter(agent => agent.id !== agentId);
      queryClient.setQueryData(['/api/user/agents'], updatedAgents);
      
      // Remove any individual agent cache
      queryClient.removeQueries({ queryKey: ['/api/user/agents', agentId] });
      
      // Also remove from any other potential caches where the agent might be stored
      queryClient.removeQueries({ queryKey: [`/api/agents/${agentId}`] });
      queryClient.removeQueries({ queryKey: [`/api/user/agents/${agentId}`] });
      
      // Immediately write the changes to localStorage cache if available
      try {
        if (window.localStorage) {
          // Clear any cache that might contain this agent
          const cacheKeys = Object.keys(window.localStorage);
          for (const key of cacheKeys) {
            if (key.includes('agent') || key.includes('query')) {
              try {
                // Try to parse the stored value to see if it contains our agent
                const value = window.localStorage.getItem(key);
                if (value && value.includes(`"id":${agentId}`)) {
                  console.log(`[agent-delete-utils] Clearing localStorage cache: ${key}`);
                  window.localStorage.removeItem(key);
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      } catch (e) {
        // Ignore localStorage errors
        console.warn('[agent-delete-utils] Error cleaning localStorage cache:', e);
      }
    }
    
    // Make the API call using the more reliable direct DB endpoint
    const response = await apiRequest('DELETE', url, null, {
      'X-Delete-Request-ID': requestId,
      'X-Force-Delete': force ? 'true' : 'false',
      'X-Nuclear': 'true' // Always use nuclear mode for guaranteed deletion
    });
    
    // Handle success case
    if (response.status === 204) {
      console.log(`[agent-delete-utils] Agent ${agentId} deleted successfully`);
      
      // Force a complete refresh of all agent data
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/user/agents'],
        refetchType: 'all'
      });
      
      // Force a fetch of fresh data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/user/agents'] });
      }, 300);
      
      toast({
        title: "Agent deleted",
        description: "The agent has been permanently deleted.",
      });
      
      return true;
    }
    
    // Handle error cases
    console.error(`[agent-delete-utils] Failed to delete agent ${agentId}, status: ${response.status}`);
    
    // Force could be tried once if it fails and not already using force
    if (response.status >= 400 && !force) {
      console.log(`[agent-delete-utils] Attempting force deletion for agent ${agentId}`);
      return deleteAgent(agentId, true);
    }
    
    // If already using force or other error scenario
    let errorMessage = "Failed to delete the agent.";
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If we can't parse the response, use the default message
    }
    
    toast({
      title: "Deletion failed",
      description: errorMessage,
      variant: "destructive",
    });
    
    // Restore the UI state since the deletion failed
    if (previousAgents) {
      queryClient.setQueryData(['/api/user/agents'], previousAgents);
    }
    
    return false;
    
  } catch (error) {
    console.error('[agent-delete-utils] Error deleting agent:', error);
    
    // Show error notification
    toast({
      title: "Deletion failed",
      description: error instanceof Error ? error.message : "An unexpected error occurred.",
      variant: "destructive",
    });
    
    // Ensure queries are invalidated to restore proper state
    queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
    
    return false;
  }
}

/**
 * Nuclear delete for agents that resist normal deletion
 * This should only be used as a last resort when normal deletion fails
 * 
 * @param agentId The ID of the agent to delete
 * @returns A promise that resolves to true if deletion was successful
 */
export async function nuclearDeleteAgent(agentId: number): Promise<boolean> {
  console.log(`[agent-delete-utils] NUCLEAR DELETE for agent ${agentId}`);
  
  try {
    // Add to localStorage to ensure the agent stays deleted even if server-side deletion fails
    markAgentAsDeleted(agentId);
    console.log(`[agent-delete-utils] Agent ${agentId} marked as deleted in localStorage (nuclear)`);
    
    // Generate a unique request ID for tracking in logs
    const requestId = `nuclear-delete-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Optimistically update the UI first
    const previousAgents = queryClient.getQueryData(['/api/user/agents']) as any[] | undefined;
    
    if (previousAgents && Array.isArray(previousAgents)) {
      // Remove from main agents list
      const updatedAgents = previousAgents.filter(agent => agent.id !== agentId);
      queryClient.setQueryData(['/api/user/agents'], updatedAgents);
    }
    
    // Use the direct database deletion endpoint with nuclear flag
    const response = await apiRequest('DELETE', `/api/agents/direct-db-delete/${agentId}`, null, {
      'X-Delete-Request-ID': requestId,
      'X-Nuclear-Delete': 'true'
    });
    
    if (response.status === 204) {
      console.log(`[agent-delete-utils] Nuclear deletion successful for agent ${agentId}`);
      
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      
      toast({
        title: "Agent deleted",
        description: "The agent has been deleted using nuclear option.",
      });
      
      return true;
    }
    
    // If nuclear deletion fails, this is a serious issue
    console.error(`[agent-delete-utils] Nuclear deletion failed for agent ${agentId}`);
    
    toast({
      title: "Nuclear deletion failed",
      description: "Could not delete the agent even with nuclear option. Please contact support.",
      variant: "destructive",
    });
    
    // Restore UI state
    if (previousAgents) {
      queryClient.setQueryData(['/api/user/agents'], previousAgents);
    }
    
    return false;
    
  } catch (error) {
    console.error('[agent-delete-utils] Error in nuclear deletion:', error);
    
    toast({
      title: "Nuclear deletion error",
      description: error instanceof Error ? error.message : "An unexpected error occurred.",
      variant: "destructive",
    });
    
    // Ensure queries are invalidated to restore proper state
    queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
    
    return false;
  }
}