import { useState, useCallback, useEffect } from "react";
import { useUserAgents } from "@/hooks/use-user-agents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bot, Phone, Clock, MessageSquare, Info, Trash2, Zap, AlertTriangle, Atom, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { AgentDetailsModal } from "./AgentDetailsModal";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { DeleteAllAgentsConfirmationDialog } from "./DeleteAllAgentsConfirmationDialog";
import { NuclearDeleteConfirmationDialog } from "./NuclearDeleteConfirmationDialog";
import { EmergencyDeleteButton } from "./EmergencyDeleteButton";
import { SimpleDeleteButton } from "./SimpleDeleteButton";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface UserAgentsListProps {
  minimal?: boolean;
}

export function UserAgentsList({ minimal = false }: UserAgentsListProps) {
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
    setIsDeleteAllModalOpen
  } = useUserAgents();
  
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<number | null>(null);
  
  // Nuclear delete state
  const [isNuclearDeleteModalOpen, setIsNuclearDeleteModalOpen] = useState(false);
  const [isNuclearDeleting, setIsNuclearDeleting] = useState(false);
  
  const handleOpenDetails = (agentId: number) => {
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

  const handleOpenDeleteModal = (e: React.MouseEvent, agentId: number) => {
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
  
  const handleDeleteAgent = async (useForce: boolean = false) => {
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
  
  // Nuclear deletion handler - this is the extreme option when all else fails
  const handleOpenNuclearDeleteModal = (e: React.MouseEvent | null, agentId: number) => {
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
  
  /**
   * Handle direct agent deletion without confirmation dialog
   * Uses the enhanced agent-delete-utils with redirect prevention
   */
  const handleDirectDeleteV2 = useCallback(async (agentId: number) => {
    console.log(`Direct delete v2 starting for agent ${agentId}`);
    
    try {
      // Show loading toast
      toast({
        title: "Deleting agent...",
        description: "Please wait while we remove this agent"
      });
      
      // Save current agents state for duplication detection
      const beforeCount = userAgents.length;
      const beforeIds = userAgents.map(a => a.id);
      console.log(`Before deletion: ${beforeCount} agents with IDs: ${beforeIds.join(', ')}`);
      
      // Import and use the deleteAgent function from our utilities
      const { deleteAgent } = await import('@/lib/agent-delete-utils');
      const success = await deleteAgent(agentId, false);
      
      console.log(`Direct delete v2 result: ${success}`);
      
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
  }, [userAgents, queryClient]);
  
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

  const handleOpenDeleteAllModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDeleteAllModalOpen(true);
  };

  const handleCloseDeleteAllModal = () => {
    setIsDeleteAllModalOpen(false);
  };

  const handleDeleteAllAgents = async (useForce: boolean = false) => {
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

  const handleTestAgent = (e: React.MouseEvent, agentId: number) => {
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
            onClick={() => {
              if (confirm(`Are you sure you want to delete ALL agents? This cannot be undone and will permanently remove all ${userAgents.length} agents.`)) {
                toast({
                  title: "Deleting all agents...",
                  description: "Please wait while we remove all your agents"
                });
                
                // Run deletion for each agent sequentially
                const deleteAgents = async () => {
                  let successCount = 0;
                  
                  for (const agent of userAgents) {
                    try {
                      const response = await fetch(`/api/direct-db-delete/${agent.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        redirect: 'manual'
                      });
                      
                      if (response.status === 200 || response.status === 204) {
                        successCount++;
                      }
                    } catch (error) {
                      console.error(`Error deleting agent ${agent.id}:`, error);
                    }
                  }
                  
                  // Refresh list regardless of success/failure
                  queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
                  
                  // Show results
                  toast({
                    title: successCount === userAgents.length ? "All agents deleted" : "Deletion partially complete",
                    description: `Successfully deleted ${successCount} of ${userAgents.length} agents`,
                    variant: successCount === userAgents.length ? "default" : "destructive"
                  });
                };
                
                // Start deletion process
                deleteAgents();
              }
            }}
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
                          {/* Simple Delete Button - direct database deletion */}
                          <SimpleDeleteButton agentId={agent.id} />

                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs flex items-center bg-[#1E293B] hover:bg-[#2E3B4B] text-cyan-400 hover:text-cyan-300 border-0"
                            onClick={(e) => handleTestAgent(e, agent.id)}
                          >
                            <Zap className="h-3 w-3 mr-1" /> Test
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
                          <Info className="h-3 w-3 mr-1" /> View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Connect to Leads Tab */}
          <TabsContent value="connect-leads" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Connect AI Agents to Leads</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Agent Selection Panel */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Select an AI Agent</h4>
                    <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                      {userAgents.map((agent) => (
                        <div 
                          key={agent.id}
                          className={`p-3 border rounded-lg cursor-pointer hover:bg-slate-900 transition-colors ${
                            selectedAgentId === agent.id ? 'bg-primary/20 border-primary' : ''
                          }`}
                          onClick={() => setSelectedAgentId(agent.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            <span className="font-medium">{agent.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {agent.description || "No description provided"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Lead Selection Panel - This is just a mockup, real functionality would use the leads data */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Select Leads</h4>
                    <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4" />
                          <span className="font-medium">Lead 1</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">123-456-7890</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4" />
                          <span className="font-medium">Lead 2</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">234-567-8901</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button className="bg-primary">
                    <Phone className="h-4 w-4 mr-2" />
                    Connect and Call Selected
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Agent Management Tab */}
          <TabsContent value="manage-agents" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Manage Your AI Agents</h3>
                  <Button className="bg-primary">
                    <Bot className="h-4 w-4 mr-2" />
                    Create New Agent
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {userAgents.map((agent) => (
                    <div 
                      key={agent.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Bot className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">{agent.name}</h4>
                          <p className="text-sm text-muted-foreground">{agent.description || "No description"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <SimpleDeleteButton agentId={agent.id} className="px-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <AgentDetailsModal 
        agentId={selectedAgentId} 
        isOpen={isDetailsModalOpen} 
        onClose={handleCloseDetails} 
      />

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