import { useState } from "react";
import { useUserAgents } from "@/hooks/use-user-agents";
import { useLeads, Lead } from "../hooks/use-leads";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Bot, Phone, Pencil, Trash2, Zap, Check, Info, PhoneCall, PhoneOutgoing, ArrowRight, AlertTriangle, Atom } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { AgentDetailsModal } from "@/components/AgentDetailsModal";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { NuclearDeleteConfirmationDialog } from "@/components/NuclearDeleteConfirmationDialog";
import { DeleteAllAgentsConfirmationDialog } from "@/components/DeleteAllAgentsConfirmationDialog"; 
import { toast } from "@/hooks/use-toast";
import { AgentEditForm } from "../components/AgentEditForm";
// We're importing Lead from use-leads.ts already, no need for a separate import

// This function is now just a container component,
// handling routing between the different sections
export function MyAgentsPage() {
  const [location] = useLocation();
  const path = location.split("?")[0]; // Remove query params
  
  // Use specific components based on the path
  let ComponentToRender;
  
  if (path === "/my-agents") {
    // The main agents list view
    ComponentToRender = AllAgentsView;
  } else if (path === "/my-agents/create") {
    ComponentToRender = CreateAgentView;
  } else if (path === "/my-agents/manage") {
    ComponentToRender = ManageAgentsView;
  } else if (path === "/my-agents/delete") {
    ComponentToRender = DeleteAgentsView;
  } else if (path === "/my-agents/call-history") {
    ComponentToRender = CallHistoryView;
  } else if (path === "/my-agents/connect-leads") {
    ComponentToRender = ConnectLeadsView;
  } else if (path === "/my-agents/phone-settings") {
    ComponentToRender = PhoneSettingsView;
  } else {
    ComponentToRender = AllAgentsView; // Default view
  }
  
  return <ComponentToRender />;
}

// The main agents list view
function AllAgentsView() {
  const [_, setLocation] = useLocation();
  const { 
    userAgents, 
    isLoading: agentsLoading, 
    isError: agentsError, 
    error: agentErrorDetails,
    isDeleting,
  } = useUserAgents();

  const {
    leads,
    isLoading: leadsLoading,
    isError: leadsError,
  } = useLeads();
  
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState("all-agents");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isNuclearDeleteModalOpen, setIsNuclearDeleteModalOpen] = useState(false);
  const [isNuclearDeleting, setIsNuclearDeleting] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [isCallingLead, setIsCallingLead] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  
  // Handlers for agent detail viewing
  const handleViewDetails = (agentId: number) => {
    setSelectedAgentId(agentId);
    setIsDetailsModalOpen(true);
  };
  
  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setTimeout(() => setSelectedAgentId(null), 300);
  };
  
  // Handlers for agent editing
  const handleEditAgent = (agentId: number) => {
    setSelectedAgentId(agentId);
    setIsEditModalOpen(true);
  };
  
  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setTimeout(() => setSelectedAgentId(null), 300);
  };
  
  // Handlers for agent deletion
  const handleOpenDeleteModal = (agentId: number) => {
    setSelectedAgentId(agentId);
    setIsDeleteModalOpen(true);
  };
  
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTimeout(() => setSelectedAgentId(null), 300);
  };
  
  const handleDeleteAgent = async (useForce: boolean = false) => {
    if (selectedAgentId !== null) {
      try {
        // Import the direct deletion utility
        const { deleteAgentById } = await import('@/lib/agent-utils');
        
        console.log(`Deleting agent ${selectedAgentId} with force mode: ${useForce}`);
        
        // Call the direct deletion utility with force parameter
        await deleteAgentById(selectedAgentId, useForce);
        
        // Success will be handled by the utility function (toast + query invalidation)
        // Close the modal after successful deletion
        setTimeout(() => {
          setIsDeleteModalOpen(false);
        }, 500);
      } catch (error) {
        console.error('Error initiating delete agent operation:', error);
        
        // If standard and force deletion both failed, suggest nuclear option
        if (useForce) {
          // Close the current modal
          setIsDeleteModalOpen(false);
          
          // Wait a bit and then show nuclear option
          setTimeout(() => {
            // Show nuclear deletion modal for the same agent
            handleOpenNuclearDeleteModal(null, selectedAgentId);
          }, 500);
          return;
        }
        
        // Close the modal after a delay even on error
        setTimeout(() => {
          setIsDeleteModalOpen(false);
        }, 2000);
      }
    }
  };
  
  // Nuclear deletion handlers
  const handleOpenNuclearDeleteModal = (e: React.MouseEvent | null, agentId: number) => {
    if (e) e.stopPropagation(); // Prevent card click if event provided
    setSelectedAgentId(agentId);
    setIsNuclearDeleteModalOpen(true);
  };
  
  const handleCloseNuclearDeleteModal = () => {
    setIsNuclearDeleteModalOpen(false);
    setTimeout(() => {
      setSelectedAgentId(null);
    }, 300);
  };
  
  const handleNuclearDeleteAgent = async () => {
    if (selectedAgentId !== null) {
      try {
        setIsNuclearDeleting(true);
        // Import the nuclear deletion utility
        const { nuclearDeleteAgent } = await import('@/lib/nuclear-agent-delete');
        
        console.log(`⚠️ NUCLEAR DELETE initiated for agent ${selectedAgentId}`);
        
        // Call the nuclear deletion utility
        await nuclearDeleteAgent(selectedAgentId);
        
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
  
  // Delete All Agents handlers
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
  
  // Handle test calling the agent
  const handleTestAgent = (agentId: number) => {
    setLocation(`/test-call?agentId=${agentId}`);
  };
  
  // Lead management functions
  const handleSelectLead = (lead: Lead) => {
    if (selectedLeads.some(l => l.id === lead.id)) {
      setSelectedLeads(selectedLeads.filter(l => l.id !== lead.id));
    } else {
      setSelectedLeads([...selectedLeads, lead]);
    }
  };
  
  const handleCallLead = async (agentId: number, leadId: number) => {
    try {
      setIsCallingLead(true);
      
      // Call the API to initiate a call
      const res = await fetch(`/api/calls/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          leadId,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to initiate call');
      }
      
      const data = await res.json();
      
      toast({
        title: "Call Initiated",
        description: `Your AI agent is now calling ${leads.find(l => l.id === leadId)?.full_name || 'the lead'}`,
      });
      
      setCallInProgress(true);
      
      // Reset after a delay
      setTimeout(() => {
        setIsCallingLead(false);
        setCallInProgress(false);
      }, 5000);
      
    } catch (error) {
      console.error('Error initiating call:', error);
      toast({
        title: "Call Failed",
        description: "There was an error initiating the call. Please try again.",
        variant: "destructive",
      });
      setIsCallingLead(false);
    }
  };
  
  // Loading states
  if (agentsLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Error states
  if (agentsError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {agentErrorDetails instanceof Error ? agentErrorDetails.message : "Failed to load your agents"}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Empty state
  if (userAgents.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center p-8 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No AI agents created yet</h3>
          <p className="mb-6">Create a new agent from the personality tab to get started.</p>
          <Button onClick={() => setLocation("/personality")} className="text-white bg-primary">
            Create Your First AI Agent
          </Button>
        </div>
      </div>
    );
  }
  
  // Get currently selected agent
  const selectedAgent = userAgents.find(agent => agent.id === selectedAgentId);
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My AI Agents</h1>
      
      <Tabs 
        defaultValue="all-agents" 
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="all-agents">All Agents</TabsTrigger>
          <TabsTrigger value="agent-leads">Connect to Leads</TabsTrigger>
          <TabsTrigger value="active-agents">Active Agents</TabsTrigger>
        </TabsList>
        
        {/* All Agents Tab */}
        <TabsContent value="all-agents" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {userAgents.map(agent => (
              <Card key={agent.id} className="card overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Hidden nuclear delete trigger - only visible on right-click */}
                      <div 
                        className="w-5 h-5 hidden hover:opacity-100 opacity-0 transition-opacity duration-200 cursor-pointer nuclear-delete-trigger" 
                        onContextMenu={(e) => handleOpenNuclearDeleteModal(e, agent.id)}
                      >
                        <Atom className="h-5 w-5 text-red-600" />
                      </div>
                      <Badge variant={agent.is_active ? "default" : "outline"}>
                        {agent.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="py-2">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {agent.description || "No description provided"}
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    {agent.phone_number_id && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>Connected Phone Number</span>
                      </div>
                    )}
                    
                    {agent.last_active && (
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Last active: {formatDistanceToNow(new Date(agent.last_active), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between pt-2">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-primary"
                      onClick={() => handleEditAgent(agent.id)}
                    >
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleOpenDeleteModal(agent.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTestAgent(agent.id)}
                  >
                    <Zap className="h-4 w-4 mr-1" /> Test Call
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* Connect to Leads Tab */}
        <TabsContent value="agent-leads" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-12">
            {/* Agent Selection Column */}
            <div className="md:col-span-5 space-y-4">
              <h3 className="text-lg font-medium">Select an AI Agent</h3>
              <ScrollArea className="h-[60vh] rounded-md border p-4">
                {userAgents.map(agent => (
                  <div 
                    key={agent.id}
                    className={`p-4 mb-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAgentId === agent.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <span className="font-medium">{agent.name}</span>
                      </div>
                      {selectedAgentId === agent.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {agent.description || "No description provided"}
                    </p>
                  </div>
                ))}
              </ScrollArea>
            </div>
            
            {/* Lead Selection Column */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Select Leads to Call</h3>
                
                {selectedAgentId && selectedLeads.length > 0 && (
                  <Button 
                    variant="default"
                    className="bg-primary"
                    disabled={isCallingLead || callInProgress}
                    onClick={() => handleCallLead(selectedAgentId, selectedLeads[0].id)}
                  >
                    {isCallingLead ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Calling...
                      </>
                    ) : (
                      <>
                        <PhoneOutgoing className="h-4 w-4 mr-2" />
                        Call Selected Lead
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {leadsLoading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : leadsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load leads data
                  </AlertDescription>
                </Alert>
              ) : leads && leads.length > 0 ? (
                <ScrollArea className="h-[60vh] rounded-md border p-4">
                  {leads.map(lead => (
                    <div 
                      key={lead.id}
                      className={`p-4 mb-3 rounded-lg border cursor-pointer transition-all ${
                        selectedLeads.some(l => l.id === lead.id)
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleSelectLead(lead)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{lead.full_name}</div>
                          <div className="text-sm text-muted-foreground">{lead.phone_number}</div>
                          {lead.email && <div className="text-sm text-muted-foreground">{lead.email}</div>}
                        </div>
                        
                        <div className="flex gap-2">
                          {selectedLeads.some(l => l.id === lead.id) && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                          
                          {selectedAgentId && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-primary"
                              disabled={isCallingLead || callInProgress}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallLead(selectedAgentId, lead.id);
                              }}
                            >
                              <PhoneCall className="h-4 w-4 mr-1" /> Call
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {lead.status && (
                        <Badge variant="outline" className="mt-2">
                          {lead.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <p className="mb-4">No leads found</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/dashboard')}
                  >
                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Active Agents Tab */}
        <TabsContent value="active-agents" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {userAgents
              .filter(agent => agent.is_active)
              .map(agent => (
                <Card key={agent.id} className="overflow-hidden transition-all hover:shadow-md border-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {agent.description || "No description provided"}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      {agent.phone_number_id && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>Connected Phone Number</span>
                        </div>
                      )}
                      
                      {agent.last_active && (
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Last active: {formatDistanceToNow(new Date(agent.last_active), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewDetails(agent.id)}
                    >
                      <Info className="h-4 w-4 mr-1" /> Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-primary"
                      onClick={() => setSelectedTab("agent-leads")}
                    >
                      <PhoneCall className="h-4 w-4 mr-1" /> Connect to Leads
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              
            {userAgents.filter(agent => agent.is_active).length === 0 && (
              <div className="col-span-full text-center p-8 text-muted-foreground">
                <p className="mb-4">No active agents found</p>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/personality')}
                >
                  Create a new agent <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Agent Details Modal */}
      <AgentDetailsModal 
        agentId={selectedAgentId} 
        isOpen={isDetailsModalOpen} 
        onClose={handleCloseDetails} 
      />
      
      {/* Edit Agent Modal */}
      {selectedAgentId && (
        <AgentEditForm
          agentId={selectedAgentId}
          isOpen={isEditModalOpen}
          onClose={handleCloseEdit}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        title="Delete AI Agent"
        description="Are you sure you want to delete this AI agent? This action cannot be undone and all associated data will be permanently lost."
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteAgent}
        forceOption={true}
        forceDescription="If standard deletion fails, use force deletion to remove dependent records first."
      />
      
      {/* Nuclear Delete Confirmation Dialog */}
      <NuclearDeleteConfirmationDialog
        isOpen={isNuclearDeleteModalOpen}
        isDeleting={isNuclearDeleting}
        title="⚠️ Nuclear Delete Agent ⚠️"
        description="You are about to permanently delete this agent using nuclear mode. This will directly remove all database records associated with this agent, bypassing normal safeguards. This action is irreversible and should only be used as a last resort."
        warningMessage="This is extremely destructive and may cause database inconsistencies. Only use this if standard and force deletion have both failed repeatedly."
        agentName={selectedAgent?.name || "this agent"}
        onClose={handleCloseNuclearDeleteModal}
        onConfirm={handleNuclearDeleteAgent}
      />
      
      {/* Delete All Agents Confirmation Dialog */}
      <DeleteAllAgentsConfirmationDialog
        isOpen={isDeleteAllModalOpen}
        title="Delete All Agents"
        description="Are you sure you want to delete all your AI agents? This action cannot be undone and all associated data will be permanently lost."
        onClose={handleCloseDeleteAllModal}
        onConfirm={handleDeleteAllAgents}
      />
      
      {/* Custom CSS for nuclear delete trigger */}
      <style>{`
        /* Show nuclear delete button on right-click (contextmenu) */
        .card:active .nuclear-delete-trigger {
          display: flex !important;
          justify-content: center;
          align-items: center;
        }
        
        /* For desktop, also show on hover after a delay */
        @media (min-width: 768px) {
          .card:hover .nuclear-delete-trigger {
            display: flex !important;
            justify-content: center;
            align-items: center;
            opacity: 0;
            animation: fadeIn 2s ease-in forwards;
            animation-delay: 3s;
          }
          
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 0.3; }
          }
        }
      `}</style>
    </div>
  );
}

// Placeholder component for Create Agent view
function CreateAgentView() {
  const [isOpen, setIsOpen] = useState(true);
  const [_, setLocation] = useLocation();
  
  const handleClose = () => {
    setIsOpen(false);
    // Redirect back to main agents page after form is closed
    setTimeout(() => {
      setLocation("/my-agents");
    }, 300);
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Create New AI Agent</h1>
      <Card>
        <CardContent className="p-6">
          <AgentEditForm 
            agentId={null} 
            isOpen={isOpen} 
            onClose={handleClose} 
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Placeholder component for Manage Agents view
function ManageAgentsView() {
  const { userAgents, isLoading } = useUserAgents();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Manage Your AI Agents</h1>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {userAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Placeholder component for Delete Agents view
function DeleteAgentsView() {
  const { userAgents, isLoading } = useUserAgents();
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const handleSelectAgent = (agentId: number) => {
    if (selectedAgents.includes(agentId)) {
      setSelectedAgents(selectedAgents.filter(id => id !== agentId));
    } else {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Delete AI Agents</h1>
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Deleting agents is permanent and cannot be undone. All associated data will be lost.
        </AlertDescription>
      </Alert>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {userAgents.map((agent) => (
              <div 
                key={agent.id} 
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  selectedAgents.includes(agent.id) ? "bg-red-950/20 border-red-800/40" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    checked={selectedAgents.includes(agent.id)}
                    onChange={() => handleSelectAgent(agent.id)}
                    className="h-4 w-4"
                  />
                  <Bot className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.description || "No description"}</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            ))}
          </div>
          
          {selectedAgents.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button variant="destructive">
                Delete Selected ({selectedAgents.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Placeholder component for Call History view
function CallHistoryView() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">AI Agent Call History</h1>
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <PhoneOutgoing className="h-12 w-12 mx-auto mb-4 text-primary/50" />
            <h3 className="text-lg font-medium mb-2">Call History</h3>
            <p className="text-muted-foreground">Your AI agent call history will appear here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Placeholder component for Connect Leads view
function ConnectLeadsView() {
  const { userAgents, isLoading: agentsLoading } = useUserAgents();
  const { leads, isLoading: leadsLoading } = useLeads();
  
  if (agentsLoading || leadsLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Connect AI Agents to Leads</h1>
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Select Agent</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {userAgents.map((agent) => (
                  <div key={agent.id} className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <h4 className="font-medium">{agent.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{agent.description || "No description"}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Select Leads</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4" />
                      <h4 className="font-medium">{lead.full_name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{lead.phone_number}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button>
              <PhoneCall className="h-4 w-4 mr-2" />
              Connect and Call
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Placeholder component for Phone Settings view
function PhoneSettingsView() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Phone Settings</h1>
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Phone className="h-12 w-12 mx-auto mb-4 text-primary/50" />
            <h3 className="text-lg font-medium mb-2">Phone Settings</h3>
            <p className="text-muted-foreground">Configure your AI agents' phone settings here.</p>
            <Button className="mt-4">
              Add Phone Number
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}