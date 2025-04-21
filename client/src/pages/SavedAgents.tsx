import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, AlertTriangle, Trash } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Agent {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  is_active: boolean;
  last_active?: string | null;
  call_count: number;
  phone_number_id?: number | null;
  voice_id?: string | null;
  personality_id?: number | null;
}

export default function SavedAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  // Load agents when the component mounts
  useEffect(() => {
    loadAgents();
  }, []);

  // Function to load agents
  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/agents');
      
      if (!response.ok) {
        throw new Error('Failed to load agents');
      }
      
      const data = await response.json();
      setAgents(data);
      setIsError(false);
    } catch (error) {
      console.error('Error loading agents:', error);
      setIsError(true);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a single agent
  const handleDeleteAgent = async (agentId: number) => {
    if (!confirm(`Are you sure you want to delete this agent? This cannot be undone.`)) {
      return;
    }

    toast({
      title: "Deleting agent...",
      description: "Please wait while we remove this agent"
    });

    try {
      // Using plain fetch with manual redirect handling
      const response = await fetch(`/api/direct-db-delete/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        redirect: 'manual'  // Don't follow redirects
      });
      
      if (response.status === 200 || response.status === 204) {
        toast({
          title: "Agent deleted",
          description: "The agent has been successfully deleted"
        });
        
        // Refresh the local state
        setAgents(agents.filter(agent => agent.id !== agentId));
        
        // Also invalidate the query cache
        queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      } else {
        let errorMessage = "Failed to delete agent";
        
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          // Ignore JSON parsing errors
        }
        
        toast({
          title: "Delete failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
      
      toast({
        title: "Delete error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  // Function to delete all agents
  const handleDeleteAllAgents = async () => {
    if (!confirm(`Are you sure you want to delete ALL agents? This cannot be undone and will permanently remove all ${agents.length} agents.`)) {
      return;
    }

    toast({
      title: "Deleting all agents...",
      description: "Please wait while we remove all your agents"
    });

    let successCount = 0;
    
    for (const agent of agents) {
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
    
    // Refresh the list regardless of success/failure
    await loadAgents();
    
    // Show results
    toast({
      title: successCount === agents.length ? "All agents deleted" : "Deletion partially complete",
      description: `Successfully deleted ${successCount} of ${agents.length} agents`,
      variant: successCount === agents.length ? "default" : "destructive"
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error loading agents</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="container mx-auto p-6 text-center">
        <div className="bg-card rounded-lg p-8 shadow-sm">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-medium mb-2">No Saved Agents</h2>
          <p className="text-muted-foreground mb-4">
            You haven't created any AI agents yet. Create one from the personality tab to get started.
          </p>
          <Button 
            className="bg-primary text-white" 
            onClick={() => window.location.href = "/personality"}
          >
            Create Your First Agent
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Saved Agents</h1>
          <p className="text-muted-foreground">Manage and delete your saved AI agents</p>
        </div>
        {agents.length > 0 && (
          <Button 
            variant="destructive" 
            onClick={handleDeleteAllAgents}
            className="bg-red-900 hover:bg-red-800"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Delete All Agents
          </Button>
        )}
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <Card key={agent.id} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                {agent.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {agent.description || "No description provided"}
              </p>
              <div className="flex items-center text-sm text-muted-foreground mb-4">
                <span>Calls: {agent.call_count}</span>
                <span className="mx-2">•</span>
                <span>{agent.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex gap-2 justify-end">
                <Link href={`/agent-details/${agent.id}`}>
                  <Button 
                    variant="outline" 
                    size="sm"
                  >
                    View Details
                  </Button>
                </Link>
                <Link href={`/edit-agent/${agent.id}`}>
                  <Button 
                    variant="secondary" 
                    size="sm"
                  >
                    Edit
                  </Button>
                </Link>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="flex items-center gap-1"
                >
                  <Trash className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}