/**
 * Agent Utility Functions
 * 
 * This file contains utility functions for agent management operations,
 * specifically handling direct API interactions that bypass the query client
 * for more reliable error handling.
 */

import { getAuthToken } from './auth';
import { queryClient } from './queryClient';
import { toast } from '@/hooks/use-toast';
import type { ToastProps } from '@/components/ui/toast';

/**
 * Delete an agent by ID using a direct fetch with explicit error handling
 * 
 * @param agentId The ID of the agent to delete
 * @returns A promise that resolves to true if successful, or throws an error
 */
/**
 * Delete all agents for the current user using a direct fetch with explicit error handling
 * 
 * @returns A promise that resolves to the number of deleted agents if successful, or throws an error
 */
export async function deleteAllAgents(forceDelete: boolean = true, useNuclearDelete: boolean = true): Promise<number> {
  console.log(`Attempting to delete all agents... (force: ${forceDelete}, nuclear: ${useNuclearDelete})`);
  
  // Get the authentication token
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required to delete agents');
  }
  
  // Set up the request headers with authentication
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  try {
    // First delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Invalidate the query BEFORE making the delete request to avoid the UI showing inconsistent state
    await queryClient.cancelQueries({ queryKey: ['/api/user/agents'] });
    
    // Optimistically update the UI by removing all agents from the cache
    queryClient.setQueryData(['/api/user/agents'], () => []);
    
    // Build the URL with the force and nuclear parameters
    let url = `/api/user/agents`;
    const params = [];
    
    if (forceDelete) {
      params.push('force=true');
    }
    
    if (useNuclearDelete) {
      params.push('nuclear=true');
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    // Make the API call with explicit error handling
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      credentials: 'include'
    });
    
    console.log(`Delete all agents API response status: ${response.status}`);
    
    if (response.status === 200) {
      // Parse the response to get the number of deleted agents
      const data = await response.json();
      console.log('All agents successfully deleted:', data);
      
      // Invalidate the agents query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      
      // Show success toast
      toast({
        title: 'All agents deleted',
        description: `Successfully deleted ${data.deletedCount || 0} agents.`,
      });
      
      return data.deletedCount || 0;
    } 
    else if (response.status === 401) {
      const error = new Error('You must be logged in to delete agents');
      console.error(error);
      
      toast({
        title: 'Authentication error',
        description: 'Please log in again to delete agents.',
        variant: 'destructive',
      });
      
      // Restore the data by invalidating the query
      await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      throw error;
    }
    else {
      // For other error cases, try to get the error details from the response
      let errorMessage = `Failed to delete agents (status ${response.status})`;
      
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If we can't parse the response as JSON, just use the generic error message
        console.warn('Could not parse error response as JSON', e);
      }
      
      const error = new Error(errorMessage);
      console.error(error);
      
      toast({
        title: 'Failed to delete all agents',
        description: forceDelete ? 
          "Even aggressive deletion failed. Your agents may have critical dependencies that need to be removed first." : 
          errorMessage,
        variant: 'destructive',
      });
      
      // Restore the data by invalidating the query 
      await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      throw error;
    }
  } catch (error) {
    console.error('Error during agent deletion:', error);
    
    // Ensure the error is shown to the user
    toast({
      title: 'Agent deletion failed',
      description: error instanceof Error ? error.message : 'An unknown error occurred during agent deletion',
      variant: 'destructive',
    });
    
    // Always make sure to restore the correct state
    await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
    
    throw error;
  }
}

export async function deleteAgentById(agentId: number, forceDelete: boolean = false, useNuclearDelete: boolean = true): Promise<boolean> {
  console.log(`Attempting to delete agent with ID ${agentId}... (force: ${forceDelete}, nuclear: ${useNuclearDelete})`);
  
  // Get the authentication token
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required to delete an agent');
  }
  
  // Set up the request headers with authentication
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  try {
    // First delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Invalidate the query BEFORE making the delete request to avoid the UI showing duplicated agents
    await queryClient.cancelQueries({ queryKey: ['/api/user/agents'] });
    
    // Optimistically update the UI by removing the agent from the cache
    queryClient.setQueryData(['/api/user/agents'], (oldData: any) => {
      if (Array.isArray(oldData)) {
        return oldData.filter(agent => agent.id !== agentId);
      }
      return oldData;
    });
    
    // Build the URL with the force and nuclear parameters
    let url = `/api/user/agents/${agentId}`;
    const params = [];
    
    if (forceDelete) {
      params.push('force=true');
    }
    
    if (useNuclearDelete) {
      params.push('nuclear=true');
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
      
    // Make the API call with explicit error handling
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      credentials: 'include'
    });
    
    console.log(`Delete agent API response status: ${response.status}`);
    
    // Check specific status codes
    if (response.status === 204) {
      console.log('Agent successfully deleted');
      
      // Show success toast
      toast({
        title: "Agent deleted",
        description: "Your agent has been deleted successfully.",
      });
      
      // Invalidate the query AFTER successful deletion to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      
      return true;
    } 
    else if (response.status === 401) {
      const error = new Error('You must be logged in to delete an agent');
      console.error(error);
      
      toast({
        title: "Authentication error",
        description: "Please log in again to delete agents.",
        variant: "destructive",
      });
      
      // Invalidate to restore correct state
      await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      throw error;
    }
    else if (response.status === 403) {
      const error = new Error('You do not have permission to delete this agent');
      console.error(error);
      
      toast({
        title: "Permission denied",
        description: "You don't have permission to delete this agent.",
        variant: "destructive",
      });
      
      // Invalidate to restore correct state
      await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      throw error;
    }
    else if (response.status === 404) {
      // If we're using force delete, treat 404 as a successful deletion
      // since the agent might have been removed by a previous operation
      if (forceDelete) {
        console.log('Agent not found during force delete - treating as success');
        
        toast({
          title: "Agent deleted",
          description: "The agent has been removed from the system.",
        });
        
        // Invalidate the query to refresh data
        await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
        
        return true;
      }
      
      // Standard 404 error handling for non-force deletions
      const error = new Error('Agent not found');
      console.error(error);
      
      toast({
        title: "Agent not found",
        description: "The agent you're trying to delete doesn't exist or was already deleted.",
        variant: "destructive",
      });
      
      // Invalidate to restore correct state
      await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      throw error;
    }
    else if (response.status === 400 && !forceDelete) {
      // If this is a standard deletion attempt and it failed with a 400 error,
      // it's likely due to database constraints. Try again with force=true.
      console.log('Standard deletion failed with 400 status. Attempting force delete...');
      
      // Automatic retry with force=true
      return deleteAgentById(agentId, true);
    }
    else {
      // For other error cases, try to get the error details from the response
      let errorMessage = `Failed to delete agent (status ${response.status})`;
      
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If we can't parse the response as JSON, just use the generic error message
        console.warn('Could not parse error response as JSON', e);
      }
      
      // If we had a non-400 error with regular deletion, try force delete as a last resort
      if (!forceDelete) {
        console.log('Deletion failed with non-400 error. Trying force delete as last resort...');
        try {
          // Attempt a force delete as a fallback
          return await deleteAgentById(agentId, true);
        } catch (retryError) {
          // If both attempts fail, use the original error
          const error = new Error(`${errorMessage} (Force delete also failed)`);
          console.error(error);
          
          toast({
            title: "Agent deletion failed",
            description: "Standard and aggressive deletion methods both failed. Try manually removing related data first.",
            variant: "destructive",
          });
          
          // Invalidate to restore correct state
          await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
          throw error;
        }
      }
      
      const error = new Error(errorMessage);
      console.error(error);
      
      toast({
        title: "Agent deletion failed",
        description: forceDelete ? 
          "Even aggressive deletion failed. The agent may have critical dependencies that need to be removed first." : 
          errorMessage,
        variant: "destructive",
      });
      
      // Invalidate to restore correct state
      await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      throw error;
    }
  } catch (error) {
    console.error('Error during agent deletion:', error);
    
    // Ensure the error is shown to the user
    toast({
      title: "Agent deletion failed",
      description: error instanceof Error ? error.message : 'An unknown error occurred during agent deletion',
      variant: "destructive",
    });
    
    // Always invalidate the query on any error to ensure UI consistency
    await queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
    
    throw error;
  }
}