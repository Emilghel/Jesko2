import { useState } from "react";
import { useUserAgents } from "@/hooks/use-user-agents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bot, Phone, Clock, MessageSquare, Info, Trash2, Zap, AlertTriangle, Atom, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { AgentDetailsModal } from "./AgentDetailsModal";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { DeleteAllAgentsConfirmationDialog } from "./DeleteAllAgentsConfirmationDialog";
import { NuclearDeleteConfirmationDialog } from "./NuclearDeleteConfirmationDialog";
import { useLocation } from "wouter";

/**
 * Enhanced version of UserAgentsList specifically for Dashboard integration
 * This component includes the three-tiered deletion system and maintains the 
 * dashboard styling theme.
 */
export function DashboardAgentsList() {
  const [_, setLocation] = useLocation();
  const { 
    userAgents, 
    isLoading, 
    isError, 
    error, 
    deleteUserAgent,
    isDeleting,
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

  const handleDeleteAgent = async (useForce: boolean = false) => {
    if (agentToDelete !== null) {
      try {
        console.log(`Attempting to delete agent ${agentToDelete} with force=${useForce}`);
        
        // Use the hook's function directly which is more reliable
        await deleteUserAgent({ id: agentToDelete, force: useForce });
        
        // Close the modal after successful deletion
        setTimeout(() => {
          setIsDeleteModalOpen(false);
        }, 500);
      } catch (error) {
        console.error('Error during agent deletion:', error);
        
        if (!useForce) {
          // If standard deletion failed, try with force
          console.log(`Standard deletion failed, trying with force=true`);
          try {
            await deleteUserAgent({ id: agentToDelete, force: true });
            
            // If we get here, force deletion succeeded
            console.log(`Force deletion succeeded for agent ${agentToDelete}`);
            
            // Close the modal after successful deletion
            setTimeout(() => {
              setIsDeleteModalOpen(false);
            }, 500);
          } catch (forceError) {
            console.error('Force deletion failed:', forceError);
            
            // Both methods failed, suggest nuclear deletion
            setIsDeleteModalOpen(false);
            
            // Wait a bit and then show nuclear option
            setTimeout(() => {
              // Show nuclear deletion modal for the same agent
              handleOpenNuclearDeleteModal(null, agentToDelete);
            }, 500);
          }
        } else {
          // Already tried with force, suggest nuclear option
          setIsDeleteModalOpen(false);
          
          // Wait a bit and then show nuclear option
          setTimeout(() => {
            // Show nuclear deletion modal for the same agent
            handleOpenNuclearDeleteModal(null, agentToDelete);
          }, 500);
        }
      }
    }
  };
  
  // Nuclear deletion handler - this is the extreme option when all else fails
  const handleOpenNuclearDeleteModal = (e: React.MouseEvent | null, agentId: number) => {
    if (e) e.stopPropagation(); // Prevent card click if event provided
    setAgentToDelete(agentId);
    setIsNuclearDeleteModalOpen(true);
  };
  
  const handleCloseNuclearDeleteModal = () => {
    setIsNuclearDeleteModalOpen(false);
    setTimeout(() => {
      setAgentToDelete(null);
    }, 300);
  };
  
  const handleNuclearDeleteAgent = async () => {
    if (agentToDelete !== null) {
      try {
        setIsNuclearDeleting(true);
        // Import the nuclear deletion utility
        const { nuclearDeleteAgent } = await import('@/lib/nuclear-agent-delete');
        
        console.log(`⚠️ NUCLEAR DELETE initiated for agent ${agentToDelete}`);
        
        // Call the nuclear deletion utility
        await nuclearDeleteAgent(agentToDelete);
        
        // Success will be handled by the utility function (toast + query invalidation)
        // Close the modal after successful deletion
        setTimeout(() => {
          setIsNuclearDeleteModalOpen(false);
          setIsNuclearDeleting(false);
        }, 500);
      } catch (error) {
        console.error('Error during nuclear deletion:', error);
        
        // Close the modal after a delay even on error
        setTimeout(() => {
          setIsNuclearDeleteModalOpen(false);
          setIsNuclearDeleting(false);
        }, 2000);
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
      // Import the direct deletion utility
      const { deleteAllAgents } = await import('@/lib/agent-utils');
      
      console.log(`Deleting all agents with force mode: ${useForce}`);
      
      // Call the direct deletion utility with the force parameter from checkbox
      await deleteAllAgents(useForce);
      
      // Success will be handled by the utility function (toast + query invalidation)
      // Close the modal after successful deletion
      setTimeout(() => {
        setIsDeleteAllModalOpen(false);
      }, 500);
    } catch (error) {
      console.error('Error initiating delete all agents operation:', error);
      
      // Close the modal after a delay even on error
      setTimeout(() => {
        setIsDeleteAllModalOpen(false);
      }, 2000);
    }
  };

  const handleTestAgent = (e: React.MouseEvent, agentId: number) => {
    e.stopPropagation(); // Prevent card click
    setLocation(`/test-call?agentId=${agentId}`);
  };

  const handleCreateAgent = () => {
    setLocation("/personality");
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
  
  return (
    <>
      {/* Header with agent count and Delete All button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-white">
            Your AI Agents ({userAgents.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            {userAgents.length > 0 
              ? "Manage your AI agents below" 
              : "Create your first AI agent to get started"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] text-white"
            onClick={handleCreateAgent}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
          {userAgents.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="bg-red-900 hover:bg-red-800 text-white"
              onClick={handleOpenDeleteAllModal}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          )}
        </div>
      </div>

      {/* Display "No agents" message for empty list */}
      {userAgents.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground bg-gray-800/20 rounded-lg border border-gray-700/50 backdrop-blur-sm">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No AI agents created yet</h3>
          <p>Create a new agent from the personality tab to get started.</p>
          <Button 
            variant="default" 
            size="sm" 
            className="mt-4 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] text-white"
            onClick={handleCreateAgent}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Agent
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {userAgents.map((agent) => (
            <Card 
              key={agent.id} 
              className="overflow-hidden cursor-pointer transition-all hover:shadow-md bg-gray-800/30 border border-gray-700/50 backdrop-blur-sm"
              style={{ 
                boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.1), 0 0 20px 5px rgba(0, 117, 255, 0.05)',
                animation: 'cardGlow 4s ease-in-out infinite'
              }}
              onClick={() => handleOpenDetails(agent.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-[#33C3BD]" />
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs flex items-center bg-[#1E293B] hover:bg-[#2E3B4B] text-red-400 hover:text-red-300 border-0"
                        onClick={(e) => handleOpenDeleteModal(e, agent.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs flex items-center bg-[#1E293B] hover:bg-[#2E3B4B] text-cyan-400 hover:text-cyan-300 border-0"
                        onClick={(e) => handleTestAgent(e, agent.id)}
                      >
                        <Zap className="h-3 w-3 mr-1" /> Test
                      </Button>
                      {/* Nuclear delete button with enhanced visibility and safety features */}
                      <div className="relative group">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs flex items-center bg-gradient-to-r from-red-900/60 to-orange-900/60 hover:from-red-800/70 hover:to-orange-800/70 text-orange-400 hover:text-orange-300 border-0 relative"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenNuclearDeleteModal(e, agent.id);
                          }}
                          onClick={(e) => {
                            // Show the nuclear modal on regular click too for better UX
                            e.stopPropagation();
                            handleOpenNuclearDeleteModal(e, agent.id);
                          }}
                        >
                          <Atom className="h-3 w-3 mr-1 animate-pulse" /> 
                          <span className="sr-only">Emergency Delete</span>
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        </Button>
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-950 bg-opacity-90 text-white text-xs rounded-md px-2 py-1 w-40 pointer-events-none z-50 border border-red-500/50">
                          <span className="text-red-300 font-semibold">⚠️ NUCLEAR DELETE:</span> Last resort for stuck agents
                        </div>
                      </div>
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
      )}
      
      <AgentDetailsModal 
        agentId={selectedAgentId} 
        isOpen={isDetailsModalOpen} 
        onClose={handleCloseDetails} 
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
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