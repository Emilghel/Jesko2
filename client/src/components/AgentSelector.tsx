import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, Phone, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getQueryFn } from '@/lib/queryClient';
import type { Agent } from '@shared/schema';

export function AgentSelector() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('1'); // Default to first agent
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const { toast } = useToast();

  // Fetch agents
  const { data: agents = [], isLoading, refetch } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a name for your agent',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAgentName,
          phoneNumber: newAgentPhone,
          configuration: {}, // Default configuration
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create agent');
      }

      toast({
        title: 'Success',
        description: `Created new agent: ${newAgentName}`,
      });
      
      setCreateDialogOpen(false);
      setNewAgentName('');
      setNewAgentPhone('');
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create agent. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 animate-pulse">
        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">
          {agents.length > 0 ? agents[0].name : 'Default Agent'}
        </span>
      </div>
      
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => setCreateDialogOpen(true)}
        title="Create new agent"
      >
        <PlusCircle className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="outline" 
        size="icon" 
        title="Agent settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
      
      {/* Create Agent Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input 
                id="agent-name" 
                placeholder="My AI Assistant"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent-phone">Phone Number (optional)</Label>
              <Input 
                id="agent-phone" 
                placeholder="+1234567890"
                value={newAgentPhone}
                onChange={(e) => setNewAgentPhone(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Leave blank to configure later in settings
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAgent}>
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}