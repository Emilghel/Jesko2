/**
 * Emergency Agent Deletion Utility
 * 
 * This is a specialized utility for dealing with problematic agents that
 * cannot be deleted through normal channels. It bypasses the standard
 * deletion flow and works directly with the database.
 */

import { toast } from '@/hooks/use-toast';

/**
 * Emergency delete an agent that cannot be deleted normally
 * This uses a special backend endpoint that bypasses the standard deletion flow
 * and directly deletes the agent from the database
 * 
 * @param agentId The ID of the agent to delete
 * @returns Promise resolving to success status
 */
export async function emergencyDeleteAgent(agentId: number): Promise<boolean> {
  try {
    // Generate a unique request ID for tracking
    const requestId = `emer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`🚨 EMERGENCY DELETE: Starting emergency deletion for agent ${agentId} (request ID: ${requestId})`);
    
    // Attempt direct database deletion first
    const response = await fetch(`/api/agents/direct-db-delete/${agentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Delete-Request-ID': requestId,
      },
      // This is important - don't follow redirects automatically, as this can
      // cause duplication issues with POST requests
      redirect: 'manual',
    });
    
    if (response.status === 204 || response.status === 200) {
      console.log(`EMERGENCY DELETE SUCCESS: Agent ${agentId} was deleted successfully`);
      toast({
        title: "Success",
        description: "Agent has been deleted successfully.",
        variant: "default",
      });
      return true;
    }
    
    // If first attempt failed, try the alternative endpoint
    console.log(`First emergency delete attempt failed with status ${response.status}, trying alternative endpoint...`);
    
    const alternativeResponse = await fetch(`/api/user/agents/${agentId}/emergency-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      redirect: 'manual',
    });
    
    if (alternativeResponse.status === 204 || alternativeResponse.status === 200) {
      console.log(`ALTERNATIVE EMERGENCY DELETE SUCCESS: Agent ${agentId} was deleted successfully`);
      toast({
        title: "Success",
        description: "Agent has been deleted using alternative method.",
        variant: "default",
      });
      return true;
    }
    
    // If both methods failed, try using nuclear delete as last resort
    console.log(`Both emergency delete attempts failed, trying nuclear delete as last resort...`);
    
    const nuclearResponse = await fetch(`/api/user/agents/${agentId}/nuclear-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      redirect: 'manual',
    });
    
    if (nuclearResponse.status === 204 || nuclearResponse.status === 200) {
      console.log(`NUCLEAR DELETE SUCCESS: Agent ${agentId} was deleted successfully`);
      toast({
        title: "Success",
        description: "Agent has been deleted using nuclear method.",
        variant: "default",
      });
      return true;
    }
    
    // All methods failed
    console.error(`ALL EMERGENCY DELETE METHODS FAILED for agent ${agentId}`);
    let errorJson = {};
    try {
      errorJson = await response.json();
    } catch (e) {
      // Ignore JSON parsing errors
    }
    
    toast({
      title: "Delete Failed",
      description: "All deletion methods failed. Please contact support.",
      variant: "destructive",
    });
    
    return false;
  } catch (error) {
    console.error('Error in emergency agent deletion:', error);
    toast({
      title: "Delete Failed",
      description: "An unexpected error occurred during agent deletion.",
      variant: "destructive",
    });
    return false;
  }
}

/**
 * Persistent retry mechanism for emergency agent deletion
 * Will continue trying multiple times and different methods until success
 * 
 * @param agentId The ID of the agent to delete
 * @param maxRetries Maximum number of retry attempts (default 3)
 * @returns Promise resolving to success status
 */
export async function persistentEmergencyDeleteAgent(agentId: number, maxRetries = 3): Promise<boolean> {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const success = await emergencyDeleteAgent(agentId);
      
      if (success) {
        return true;
      }
      
      // Exponential backoff for retries
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retry ${retryCount + 1}/${maxRetries} for agent ${agentId} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retryCount++;
    } catch (error) {
      console.error(`Error during retry ${retryCount + 1}/${maxRetries}:`, error);
      retryCount++;
    }
  }
  
  console.error(`All ${maxRetries} retry attempts failed for agent ${agentId}`);
  return false;
}