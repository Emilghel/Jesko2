import { useState, useCallback } from "react";
import { useUserAgents } from "@/hooks/use-user-agents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bot, Phone, Clock, MessageSquare, Info, Trash2, Zap, AlertTriangle, Atom } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { AgentDetailsModal } from "./AgentDetailsModal";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { DeleteAllAgentsConfirmationDialog } from "./DeleteAllAgentsConfirmationDialog";
import { NuclearDeleteConfirmationDialog } from "./NuclearDeleteConfirmationDialog";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function UserAgentsList({ minimal = false }) {
  // State for managing enhanced tab functionality
  const [selectedTab, setSelectedTab] = useState("all-agents");
  const [_, setLocation] = useLocation();
  const { 
    userAgents, 
    isLoading, 
    isError, 
    error, 
    deleteUserAgent,
    isDeleting: isAgentDeleting,
    deleteAllUserAgents,
    isDeletingAll,
    // Use the modal state from the hook
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleteAllModalOpen,
    setIsDeleteAllModalOpen,
    refetch
  } = useUserAgents();
  
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  
  // Nuclear delete state
  const [isNuclearDeleteModalOpen, setIsNuclearDeleteModalOpen] = useState(false);
  const [isNuclearDeleting, setIsNuclearDeleting] = useState(false);
  
  const handleOpenDetails = (agentId) => {
    setSelectedAgentId(agentId);
    setIsDetailsModalOpen(true);
  };
  
  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    // Optional: Keep the agent ID in memory for a short period in case the modal is reopened
    setTimeout(() => {
      setSelectedAgentId(null);
    }, 300);
  };

  const handleOpenDeleteModal = (e, agentId) => {
    e.stopPropagation(); // Prevent card click
    setAgentToDelete(agentId);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTimeout(() => {
      setAgentToDelete(null);
    }, 300);
  };

  // Add a local state for managing deletion state
  const [isDeletingLocally, setIsDeletingLocally] = useState(false);
  
  /**
   * Handle direct agent deletion without confirmation dialog
   * Uses the enhanced agent-delete-utils with redirect prevention
   */
  const handleDirectDeleteV2 = useCallback(async (agentId) => {
    console.log(`⚠️⚠️⚠️ COMPLETELY NEW APPROACH: Direct delete v3 starting for agent ${agentId}`);
    
    try {
      // Show loading toast
      toast({
        title: "Deleting agent...",
        description: "Please wait while we remove this agent with direct database access"
      });
      
      // Save current agents state for duplication detection
      const beforeCount = userAgents.length;
      const beforeIds = userAgents.map(a => a.id);
      console.log(`Before deletion: ${beforeCount} agents with IDs: ${beforeIds.join(', ')}`);
      
      // Get the auth token from localStorage or cookie
      let token = '';
      try {
        token = localStorage.getItem('auth_token') || 
          document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] || '';
        
        console.log(`Auth token present: ${!!token}`);
      } catch (e) {
        console.error('Error getting auth token:', e);
      }
      
      // This endpoint completely bypasses the normal deletion system
      // and uses direct database access to prevent duplication
      const url = `/api/agents/direct-db-delete/${agentId}?ts=${Date.now()}`;
      
      console.log(`Making request to completely new endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Delete-Request-ID': `direct-db-${Date.now()}`,
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        redirect: 'manual' // Critical - never follow redirects
      });
      
      console.log(`Direct DB delete response: ${response.status}`);
      
      const success = response.status >= 200 && response.status < 300;
      
      if (success) {
        // Success toast
        toast({
          title: "Agent deleted",
          description: "The agent has been successfully removed"
        });
        
        // Refresh the agent list
        queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
        
        // Check for duplication after a delay
        setTimeout(() => {
          const currentCount = userAgents.length;
          const currentIds = userAgents.map(a => a.id);
          
          console.log(`After deletion: ${currentCount} agents with IDs: ${currentIds.join(', ')}`);
          
          // Alert if we've got duplication (more agents than before)
          if (currentCount > beforeCount) {
            console.error(`DUPLICATION DETECTED! Agent count increased from ${beforeCount} to ${currentCount}`);
            
            toast({
              title: "Warning: Duplication detected",
              description: "Try using nuclear delete (atom button) to clean up duplicate agents",
              variant: "destructive",
            });
          }
          
          // Also check if the specific agent is still present
          if (currentIds.includes(agentId)) {
            console.error(`Agent ${agentId} still exists after deletion!`);
            
            toast({
              title: "Deletion issue detected",
              description: "The agent still exists. Try using nuclear delete.",
              variant: "destructive",
            });
          }
        }, 1500);
      } else {
        // Failure toast
        toast({
          title: "Delete failed",
          description: "Try using nuclear delete (atom button)",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Direct delete error:", error);
      toast({
        title: "Delete error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [userAgents]);
  
  const handleDeleteAgent = async (useForce = false) => {
    if (agentToDelete !== null) {
      try {
        // Set local state to show loading
        setIsDeletingLocally(true);
        
        // ADDED DEBUG OUTPUT
        console.log(`DEBUG: Starting Enhanced Delete process...`);
        console.log(`DEBUG: Attempting to delete agent with ID ${agentToDelete}, force=${useForce}`);
        console.log(`DEBUG: About to import deleteAgent from agent-delete-utils.ts`);
        
        // Use the new dedicated delete function from agent-delete-utils
        const { deleteAgent } = await import('@/lib/agent-delete-utils');
        
        console.log(`DEBUG: Successfully imported deleteAgent function, about to call it now`);
        const success = await deleteAgent(agentToDelete, useForce);
        
        console.log(`DEBUG: deleteAgent function returned: ${success}`);
        
        if (success) {
          console.log(`Agent deletion succeeded for agent ${agentToDelete}`);
          
          // Close the modal after successful deletion
          setTimeout(() => {
            setIsDeleteModalOpen(false);
            setIsDeletingLocally(false);
          }, 500);
        } else {
          console.error(`Agent deletion failed for agent ${agentToDelete}`);
          
          if (!useForce) {
            // If standard deletion failed, try with force
            console.log(`DEBUG: Standard deletion failed, trying with force=true`);
            const forceSuccess = await deleteAgent(agentToDelete, true);
            
            console.log(`DEBUG: Force deletion result: ${forceSuccess}`);
            
            if (forceSuccess) {
              console.log(`Force deletion succeeded for agent ${agentToDelete}`);
              
              // Close the modal after successful deletion
              setTimeout(() => {
                setIsDeleteModalOpen(false);
                setIsDeletingLocally(false);
              }, 500);
            } else {
              // Both methods failed, suggest nuclear deletion through dedicated endpoint
              console.log(`DEBUG: Both standard and force deletion failed, preparing nuclear option`);
              setIsDeleteModalOpen(false);
              
              // Wait a bit and then show nuclear option
              setTimeout(() => {
                setIsDeletingLocally(false);
                // Show nuclear deletion modal for the same agent
                handleOpenNuclearDeleteModal(null, agentToDelete);
              }, 500);
            }
          } else {
            // Already tried with force, suggest nuclear option through dedicated endpoint
            console.log(`DEBUG: Force deletion was requested but failed, preparing nuclear option`);
            setIsDeleteModalOpen(false);
            
            // Wait a bit and then show nuclear option
            setTimeout(() => {
              setIsDeletingLocally(false);
              // Show nuclear deletion modal for the same agent
              handleOpenNuclearDeleteModal(null, agentToDelete);
            }, 500);
          }
        }
      } catch (error) {
        console.error('Unexpected error during agent deletion:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Reset UI state
        setIsDeletingLocally(false);
        setIsDeleteModalOpen(false);
        
        // Show error toast
        toast({
          title: "Deletion error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  };
  
  /**
   * Handle nuclear deletion of an agent - last resort option
   * This completely bypasses all safety checks to forcefully remove the agent
   */
  const handleNuclearDeleteAgent = async () => {
    if (agentToDelete !== null) {
      try {
        setIsNuclearDeleting(true);
        // Import the nuclear deletion utility from the new dedicated file
        const { nuclearDeleteAgent } = await import('@/lib/agent-delete-utils');
        
        console.log(`⚠️ NUCLEAR DELETE initiated for agent ${agentToDelete}`);
        
        // Call the nuclear deletion utility
        const success = await nuclearDeleteAgent(agentToDelete);
        
        if (success) {
          console.log(`Nuclear deletion succeeded for agent ${agentToDelete}`);
          toast({
            title: "Agent obliterated",
            description: "The agent was completely removed from the system"
          });
          
          // Refresh the list
          refetch();
        } else {
          console.error(`Nuclear deletion failed for agent ${agentToDelete}`);
          
          // Show a toast to inform the user
          toast({
            title: "Nuclear deletion failed",
            description: "Contact support for assistance with removing this agent.",
            variant: "destructive",
          });
        }
        
        // Close the modal after deletion attempt (success or failure)
        setTimeout(() => {
          setIsNuclearDeleteModalOpen(false);
          setIsNuclearDeleting(false);
        }, 500);
      } catch (error) {
        console.error('Error during nuclear deletion:', error);
        
        // Show error toast
        toast({
          title: "Deletion error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
        
        // Close the modal after a delay even on error
        setTimeout(() => {
          setIsNuclearDeleteModalOpen(false);
          setIsNuclearDeleting(false);
        }, 1000);
      }
    }
  };
  
  // Nuclear deletion handler - this is the extreme option when all else fails
  const handleOpenNuclearDeleteModal = (e, agentId) => {
    if (e) e.stopPropagation(); // Prevent card click if event provided
    setAgentToDelete(agentId);
    setIsNuclearDeleteModalOpen(true);
    
    // Log the nuclear deletion attempt for debugging
    console.log(`Nuclear delete modal opened for agent ID: ${agentId}`);
  };
  
  const handleCloseNuclearDeleteModal = () => {
    setIsNuclearDeleteModalOpen(false);
    setTimeout(() => {
      setAgentToDelete(null);
    }, 300);
  };

  const handleOpenDeleteAllModal = (e) => {
    e.preventDefault();
    setIsDeleteAllModalOpen(true);
  };

  const handleCloseDeleteAllModal = () => {
    setIsDeleteAllModalOpen(false);
  };

  const handleDeleteAllAgents = async (useForce = false) => {
    try {
      console.log(`Deleting all agents with force mode: ${useForce}`);
      
      // Use our new dedicated utility function for deletion
      const { deleteAllAgents } = await import('@/lib/agent-delete-utils');
      const success = await deleteAllAgents(useForce);
      
      if (success) {
        console.log('Successfully deleted all agents');
      } else {
        console.error('Failed to delete all agents');
      }
      
      // Close the modal after the deletion attempt (success or failure)
      setTimeout(() => {
        setIsDeleteAllModalOpen(false);
      }, 500);
    } catch (error) {
      console.error('Error during delete all agents operation:', error);
      
      // Show error toast
      toast({
        title: "Error deleting agents",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      
      // Close the modal after a delay even on error
      setTimeout(() => {
        setIsDeleteAllModalOpen(false);
      }, 1000);
    }
  };

  const handleTestAgent = (e, agentId) => {
    e.stopPropagation(); // Prevent card click
    setLocation(`/test-call?agentId=${agentId}`);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load user agents"}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Display "No agents" message for empty list
  if (userAgents.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No AI agents created yet</h3>
        <p>Create a new agent from the personality tab to get started.</p>
      </div>
    );
  }
  
  // If in minimal mode, return a simplified version
  if (minimal) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {userAgents.map((agent) => (
            <Card 
              key={agent.id} 
              className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleOpenDetails(agent.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                  </div>
                  <Badge variant={agent.is_active ? "default" : "outline"}>
                    {agent.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {agent.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs flex items-center"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent the card's onClick from triggering
                      handleOpenDetails(agent.id);
                    }}
                  >
                    <Info className="h-3 w-3 mr-1" /> View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {isDetailsModalOpen && selectedAgentId && (
          <AgentDetailsModal 
            agentId={selectedAgentId} 
            isOpen={isDetailsModalOpen} 
            onClose={handleCloseDetails} 
          />
        )}
      </div>
    );
  }

  // Full version
  return (
    <>
      {/* Header with agent count and tabs */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-white">
            My AI Agents ({userAgents.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage your AI agents and connect them to leads
          </p>
        </div>
        {userAgents.length > 0 && (
          <Button 
            variant="destructive" 
            size="sm" 
            className="bg-red-900 hover:bg-red-800 text-white"
            onClick={handleOpenDeleteAllModal}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Delete All Agents
          </Button>
        )}
      </div>

      {/* Tabs for different agent management views */}
      <div className="mb-6">
        <Tabs 
          value={selectedTab} 
          onValueChange={setSelectedTab} 
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="all-agents">All Agents</TabsTrigger>
            <TabsTrigger value="connect-leads">Connect to Leads</TabsTrigger>
            <TabsTrigger value="manage-agents">Agent Management</TabsTrigger>
          </TabsList>
          
          {/* All Agents Tab */}
          <TabsContent value="all-agents" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {userAgents.map((agent) => (
                <Card 
                  key={agent.id} 
                  className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
                  onClick={() => handleOpenDetails(agent.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                      </div>
                      <Badge variant={agent.is_active ? "default" : "outline"}>
                        {agent.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {agent.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {agent.phone_number_id && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>Connected Phone Number</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {agent.call_count} {agent.call_count === 1 ? 'call' : 'calls'}
                        </span>
                      </div>
                      
                      {agent.last_active && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Last active: {formatDistanceToNow(new Date(agent.last_active), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between mt-4">
                        <div className="flex gap-2">
                          {/* Delete V2 Button - Uses our enhanced deletion utility */}
                          <div className="relative group">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs flex items-center bg-red-900/80 hover:bg-red-900 text-white hover:text-white border-0"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                // Use our dedicated function for direct deletion
                                handleDirectDeleteV2(agent.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </div>
                          
                          {/* Nuclear Delete Button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs flex items-center bg-red-800/80 hover:bg-red-800 text-white hover:text-white border-0"
                            onClick={(e) => handleOpenNuclearDeleteModal(e, agent.id)}
                          >
                            <Atom className="h-3 w-3 mr-1" /> Nuclear
                          </Button>
                          
                          {/* Test Call Button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs flex items-center"
                            onClick={(e) => handleTestAgent(e, agent.id)}
                          >
                            <Zap className="h-3 w-3 mr-1" /> Test Call
                          </Button>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs flex items-center"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent the card's onClick from triggering
                            handleOpenDetails(agent.id);
                          }}
                        >
                          <Info className="h-3 w-3 mr-1" /> Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Connect to Leads Tab */}
          <TabsContent value="connect-leads" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {userAgents.map((agent) => (
                <Card 
                  key={agent.id} 
                  className="overflow-hidden cursor-pointer transition-all"
                  onClick={() => setLocation(`/connect-leads?agentId=${agent.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                      </div>
                      <Badge variant={agent.is_active ? "default" : "outline"}>
                        {agent.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {agent.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mt-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation(); // prevent the card's onClick from triggering
                          setLocation(`/connect-leads?agentId=${agent.id}`);
                        }}
                      >
                        Connect to Leads
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Agent Management Tab */}
          <TabsContent value="manage-agents" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {userAgents.map((agent) => (
                <Card 
                  key={agent.id} 
                  className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                      </div>
                      <Badge variant={agent.is_active ? "default" : "outline"}>
                        {agent.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {agent.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs flex items-center justify-center"
                          onClick={(e) => handleOpenDetails(agent.id)}
                        >
                          <Info className="h-3 w-3 mr-1" /> View Details
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs flex items-center justify-center"
                          onClick={(e) => handleTestAgent(e, agent.id)}
                        >
                          <Zap className="h-3 w-3 mr-1" /> Test Call
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="text-xs flex items-center justify-center"
                          onClick={(e) => handleOpenDeleteModal(e, agent.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete Agent
                        </Button>
                        
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="text-xs flex items-center justify-center bg-red-900 hover:bg-red-800"
                          onClick={(e) => handleOpenNuclearDeleteModal(e, agent.id)}
                        >
                          <Atom className="h-3 w-3 mr-1" /> Nuclear Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Agent details modal */}
      {isDetailsModalOpen && selectedAgentId && (
        <AgentDetailsModal 
          agentId={selectedAgentId} 
          isOpen={isDetailsModalOpen} 
          onClose={handleCloseDetails} 
        />
      )}
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        isDeleting={isDeletingLocally}
        title="Delete AI Agent"
        description="Are you sure you want to delete this AI agent? This action cannot be undone and all associated data will be permanently lost."
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteAgent}
        forceOption={true}
        forceDescription="Use force deletion to remove related records and dependencies"
      />
      
      {/* Delete all agents confirmation */}
      <DeleteAllAgentsConfirmationDialog
        isOpen={isDeleteAllModalOpen}
        isDeleting={isDeletingAll}
        agentCount={userAgents.length}
        onClose={handleCloseDeleteAllModal}
        onConfirm={handleDeleteAllAgents}
      />
      
      {/* Nuclear Delete Confirmation (last resort option) */}
      <NuclearDeleteConfirmationDialog
        isOpen={isNuclearDeleteModalOpen}
        isDeleting={isNuclearDeleting}
        title="Nuclear Delete AI Agent"
        description="You are about to completely remove this agent using nuclear deletion. This is a last resort option that bypasses all safety checks and forcefully removes data from the database."
        warningMessage="This action cannot be reversed. It will delete the agent and all related data, including records that might be referenced by other parts of the system."
        agentName={userAgents.find(a => a.id === agentToDelete)?.name || "Unnamed Agent"}
        onClose={handleCloseNuclearDeleteModal}
        onConfirm={handleNuclearDeleteAgent}
      />
    </>
  );
}