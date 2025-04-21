import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useUserAgents } from '@/hooks/use-user-agents';
import { useToast } from '@/hooks/use-toast';
import { getAuthToken } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { SimpleDeleteButton } from '@/components/SimpleDeleteButton';
import { getGoogleOAuthUrl, useCalendarIntegrations, useDeleteCalendarIntegration } from '@/hooks/use-calendar';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow
} from '@/components/ui/table';

// Icons
import { 
  Clock, Repeat, Calendar, ChevronDown, CheckCircle, 
  XCircle, Play, Edit, Trash2, Plus, AlertCircle, Bot,
  Phone, PhoneCall, CalendarClock, Users, AlertTriangle
} from 'lucide-react';

// Types
interface AutomatedCallSetting {
  id: number;
  user_id: number;
  name: string;
  enabled: boolean;
  agent_id: number;
  lead_statuses: string[];
  frequency: 'daily' | 'weekly' | 'once';
  run_time: string;
  run_days: string[];
  max_calls_per_run: number;
  created_at: string;
  updated_at: string;
  last_run: string | null;
  next_run: string | null;
  active_campaign: boolean;
}

interface AutomatedCallRun {
  id: number;
  settings_id: number;
  start_time: string;
  end_time: string | null;
  status: 'running' | 'completed' | 'failed';
  leads_processed: number;
  calls_initiated: number;
  calls_connected: number;
  calls_failed: number;
  error_message: string | null;
}

// Using the type provided by useUserAgents hook

const daysOfWeek = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

const leadStatuses = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'rejected', label: 'Rejected' },
];

// Helper function to format dates
const formatDate = (date: string | null) => {
  if (!date) return 'Not scheduled';
  return new Date(date).toLocaleString();
};

const AutomatedCallScheduler: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<AutomatedCallSetting | null>(null);
  const [automationToDelete, setAutomationToDelete] = useState<AutomatedCallSetting | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['new']);
  const [connectCalendarLoading, setConnectCalendarLoading] = useState(false);
  const { toast } = useToast();
  
  // Calendar integration hooks
  const { data: calendarIntegrations, isLoading: calendarIntegrationsLoading } = useCalendarIntegrations();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    agent_id: '',
    frequency: 'daily',
    run_time: '09:00',
    max_calls_per_run: 5,
    enabled: true
  });

  // Get user agents
  const { userAgents, isLoading: isLoadingAgents } = useUserAgents();

  // Fetch the list of automation settings
  const { data: automations, isLoading: isLoadingAutomations, error: automationsError, refetch: refetchAutomations } = 
    useQuery({
      queryKey: ['/api/automated-calls/settings'],
      queryFn: async () => {
        const token = getAuthToken();
        if (!token) throw new Error('Authentication required');

        const response = await fetch('/api/automated-calls/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch automation settings');
        }

        return await response.json();
      }
    });

  // Fetch runs for a specific automation when selected
  const { data: automationRuns, isLoading: isLoadingRuns, refetch: refetchRuns } = 
    useQuery({
      queryKey: ['/api/automated-calls/settings', selectedAutomation?.id, 'runs'],
      queryFn: async () => {
        if (!selectedAutomation) return [];
        
        const token = getAuthToken();
        if (!token) throw new Error('Authentication required');

        const response = await fetch(`/api/automated-calls/settings/${selectedAutomation.id}/runs`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch automation runs');
        }

        return await response.json();
      },
      enabled: !!selectedAutomation
    });

  // Create a new automation setting
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication required');

      console.log("Submitting automation data:", data);

      const response = await fetch('/api/automated-calls/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to create automation:", errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to create automation');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Automated call schedule created successfully",
      });
      setIsCreateDialogOpen(false);
      refetchAutomations();
      resetForm();
    },
    onError: (error: Error) => {
      console.error("Create automation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create automation",
        variant: "destructive"
      });
    }
  });

  // Run a specific automation now
  const runNowMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/automated-calls/settings/${id}/run-now`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to run automation');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Automated call job started successfully",
      });
      setIsRunDialogOpen(false);
      refetchAutomations();
      if (selectedAutomation) {
        refetchRuns();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run automation",
        variant: "destructive"
      });
    }
  });

  // Toggle automation enabled status
  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number, enabled: boolean }) => {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/automated-calls/settings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update automation');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Automation status updated",
      });
      refetchAutomations();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update automation",
        variant: "destructive"
      });
    }
  });

  // Delete an automation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/automated-calls/settings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete automation');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Automation deleted successfully",
      });
      refetchAutomations();
      setSelectedAutomation(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete automation",
        variant: "destructive"
      });
    }
  });

  const handleCreateSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.agent_id || !formData.run_time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // For weekly frequency, require at least one day
    if (formData.frequency === 'weekly' && selectedDays.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one day of the week",
        variant: "destructive"
      });
      return;
    }

    // Submit the data
    const dataToSubmit = {
      ...formData,
      agent_id: parseInt(formData.agent_id),
      lead_statuses: selectedStatuses,
      run_days: formData.frequency === 'weekly' ? selectedDays : [],
      max_calls_per_run: parseInt(formData.max_calls_per_run.toString())
    };

    createMutation.mutate(dataToSubmit);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      agent_id: '',
      frequency: 'daily',
      run_time: '09:00',
      max_calls_per_run: 5,
      enabled: true
    });
    setSelectedDays([]);
    setSelectedStatuses(['new']);
  };

  const handleViewRuns = (automation: AutomatedCallSetting) => {
    setSelectedAutomation(automation);
    setIsHistoryDialogOpen(true);
  };

  const handleRunNow = (automation: AutomatedCallSetting) => {
    setSelectedAutomation(automation);
    setIsRunDialogOpen(true);
  };

  const confirmRunNow = () => {
    if (selectedAutomation) {
      runNowMutation.mutate(selectedAutomation.id);
    }
  };

  const toggleAutomationStatus = (automation: AutomatedCallSetting) => {
    toggleEnabledMutation.mutate({ 
      id: automation.id, 
      enabled: !automation.enabled 
    });
  };

  // Get direct agent deletion function from the hook
  const { deleteUserAgent } = useUserAgents();

  // This mutation is no longer needed since we're using SimpleDeleteButton
  // The SimpleDeleteButton handles its own error handling and success notifications

  // Agent deletion is now handled directly by the SimpleDeleteButton component

  // Already defined at the top level

  const handleDeleteClick = (automation: AutomatedCallSetting) => {
    setAutomationToDelete(automation);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (automationToDelete) {
      // Start the deletion process
      deleteMutation.mutate(automationToDelete.id);
      // Close the dialog
      setIsDeleteDialogOpen(false);
      setAutomationToDelete(null);
    }
  };
  
  // Calendar connection handler
  const handleConnectCalendar = () => {
    setConnectCalendarLoading(true);
    try {
      // Get the Google OAuth URL and redirect the user
      const googleAuthUrl = getGoogleOAuthUrl();
      // Redirect the user to Google's authorization page
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error('Error initiating calendar connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize calendar connection. Please try again.',
        variant: 'destructive',
      });
      setConnectCalendarLoading(false);
    }
    // Note: We don't set connectLoading to false here because we're redirecting away from the page
  };

  // Render status badges
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Running</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 hover:bg-red-600">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Automated Call Scheduling</h3>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          New Schedule
        </Button>
      </div>

      {/* List of automations */}
      <div className="space-y-4">
        {isLoadingAutomations ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : automationsError ? (
          <div className="flex items-center justify-center p-4 text-red-500">
            <AlertCircle className="mr-2" size={18} />
            Error loading automations
          </div>
        ) : automations?.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>AI Agent</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.map((automation: AutomatedCallSetting) => (
                <TableRow key={automation.id}>
                  <TableCell className="font-medium">{automation.name}</TableCell>
                  <TableCell>
                    {userAgents?.find((a: any) => a.id === automation.agent_id)?.name || `Agent #${automation.agent_id}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      {automation.frequency === 'daily' ? (
                        <span className="flex items-center gap-1">
                          <Repeat size={14} />
                          Daily at {automation.run_time}
                        </span>
                      ) : automation.frequency === 'weekly' ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Weekly at {automation.run_time}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Once at {automation.run_time}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={automation.enabled}
                      onCheckedChange={() => toggleAutomationStatus(automation)}
                    />
                  </TableCell>
                  <TableCell>{automation.last_run ? formatDate(automation.last_run) : 'Never'}</TableCell>
                  <TableCell>{formatDate(automation.next_run)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRuns(automation)}
                        title="View History"
                      >
                        <Clock size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNow(automation)}
                        title="Run Now"
                      >
                        <Play size={16} />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(automation)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <CalendarClock size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Automated Schedules</h3>
              <p className="text-muted-foreground mb-4">
                Create automated call schedules to reach your leads automatically at specific times.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Your First Schedule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create new automation dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Automated Call Schedule</DialogTitle>
            <DialogDescription>
              Set up automated calling for your leads based on a schedule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Schedule Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Morning Follow-up Calls"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent">AI Agent</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={formData.agent_id}
                      onValueChange={(value) => setFormData({...formData, agent_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an AI agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingAgents ? (
                          <div className="flex justify-center p-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          </div>
                        ) : userAgents?.length > 0 ? (
                          userAgents.map((agent) => (
                            <SelectItem 
                              key={agent.id} 
                              value={agent.id.toString()}
                              className="flex items-center justify-between"
                            >
                              <div className="flex-1 truncate">{agent.name}</div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm">No agents found</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.agent_id && (
                    <SimpleDeleteButton
                      agentId={parseInt(formData.agent_id)}
                      agentName={userAgents?.find((a: any) => a.id === parseInt(formData.agent_id))?.name || `Agent #${formData.agent_id}`}
                      size="icon"
                      label=""
                      onDelete={() => {
                        // Reset the form's agent selection after deletion
                        setFormData({
                          ...formData,
                          agent_id: ''
                        });
                        // Refresh the list of available agents
                        queryClient.invalidateQueries({ queryKey: ['/api/user-agents'] });
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lead Statuses to Call</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {leadStatuses.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={selectedStatuses.includes(status.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStatuses([...selectedStatuses, status.value]);
                          } else {
                            setSelectedStatuses(
                              selectedStatuses.filter((s) => s !== status.value)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={`status-${status.value}`} className="text-sm font-normal">
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: string) => setFormData({...formData, frequency: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="once">Run Once</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {daysOfWeek.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={selectedDays.includes(day.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDays([...selectedDays, day.value]);
                            } else {
                              setSelectedDays(
                                selectedDays.filter((d) => d !== day.value)
                              );
                            }
                          }}
                        />
                        <Label htmlFor={`day-${day.value}`} className="text-sm font-normal">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="run_time">Time</Label>
                <Input
                  id="run_time"
                  type="time"
                  value={formData.run_time}
                  onChange={(e) => setFormData({...formData, run_time: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_calls">Maximum Calls Per Run</Label>
                <Input
                  id="max_calls"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.max_calls_per_run}
                  onChange={(e) => setFormData({...formData, max_calls_per_run: parseInt(e.target.value)})}
                />
                <p className="text-sm text-muted-foreground">
                  Limit the number of calls this automation will make each time it runs
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
                />
                <Label htmlFor="enabled">Enable this schedule immediately</Label>
              </div>
              
              {/* Calendar Integration Section */}
              <div className="pt-4">
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Calendar Integration</h4>
                      <p className="text-xs text-muted-foreground">
                        Connect your calendar to allow AI agents to schedule appointments during calls
                      </p>
                    </div>
                  </div>
                  
                  {calendarIntegrationsLoading ? (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  ) : calendarIntegrations && calendarIntegrations.length > 0 ? (
                    <div className="space-y-2">
                      {calendarIntegrations.map((integration) => (
                        <div key={integration.id} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <div>
                              <div className="text-sm font-medium">{integration.display_name}</div>
                              <div className="text-xs text-muted-foreground">{integration.email}</div>
                            </div>
                          </div>
                          <Badge variant={integration.is_active ? "default" : "secondary"} className="text-xs">
                            {integration.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="flex flex-col items-center justify-center text-center">
                        <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                        <h3 className="text-sm font-medium">No calendar connected</h3>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">
                          Connect your Google Calendar to enable AI agents to schedule appointments.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleConnectCalendar}
                          disabled={connectCalendarLoading}
                        >
                          {connectCalendarLoading ? (
                            <>
                              <div className="animate-spin mr-2 h-3 w-3 border-2 border-b-transparent rounded-full"></div>
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Calendar className="mr-2 h-3 w-3" />
                              Connect Google Calendar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                  Creating...
                </>
              ) : (
                'Create Schedule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run automation dialog */}
      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Run Automation Now</DialogTitle>
            <DialogDescription>
              This will start the automation process immediately
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="mb-4">
              Are you sure you want to run the automation "{selectedAutomation?.name}" now?
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Agent:</span>
                <span className="text-sm">
                  {userAgents?.find((a: any) => a.id === selectedAutomation?.agent_id)?.name || `Agent #${selectedAutomation?.agent_id}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Max Calls:</span>
                <span className="text-sm">{selectedAutomation?.max_calls_per_run}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lead Statuses:</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {selectedAutomation?.lead_statuses.map((status) => (
                    <Badge key={status} variant="outline" className="text-xs">
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRunNow} disabled={runNowMutation.isPending}>
              {runNowMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                  Starting...
                </>
              ) : (
                'Run Now'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call History - {selectedAutomation?.name}</DialogTitle>
            <DialogDescription>
              History of automated call runs for this schedule
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isLoadingRuns ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : automationRuns?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Leads Processed</TableHead>
                    <TableHead>Calls Made</TableHead>
                    <TableHead>Success Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automationRuns.map((run: AutomatedCallRun) => {
                    // Calculate duration
                    let duration = 'In progress';
                    if (run.end_time) {
                      const startTime = new Date(run.start_time).getTime();
                      const endTime = new Date(run.end_time).getTime();
                      const durationMs = endTime - startTime;
                      const minutes = Math.floor(durationMs / (1000 * 60));
                      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
                      duration = `${minutes}m ${seconds}s`;
                    }

                    // Calculate success rate
                    const successRate = run.calls_initiated > 0
                      ? Math.round((run.calls_initiated - run.calls_failed) / run.calls_initiated * 100)
                      : 0;

                    return (
                      <TableRow key={run.id}>
                        <TableCell>{new Date(run.start_time).toLocaleString()}</TableCell>
                        <TableCell>{renderStatusBadge(run.status)}</TableCell>
                        <TableCell>{duration}</TableCell>
                        <TableCell>{run.leads_processed}</TableCell>
                        <TableCell>{run.calls_initiated}</TableCell>
                        <TableCell>
                          {run.calls_initiated > 0 ? (
                            <div className="flex items-center gap-2">
                              <progress 
                                className="w-12 h-2"
                                value={successRate} 
                                max="100"
                              />
                              <span>{successRate}%</span>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-4">
                <p className="text-muted-foreground">No history found for this automated schedule</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete automation confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The automation will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="mb-4">
              Are you sure you want to delete the automation "{automationToDelete?.name}"?
            </p>
            {automationToDelete && (
              <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Agent:</span>
                  <span className="text-sm">
                    {userAgents?.find((a: any) => a.id === automationToDelete?.agent_id)?.name || `Agent #${automationToDelete?.agent_id}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Schedule:</span>
                  <span className="text-sm">
                    {automationToDelete.frequency === 'daily' ? 'Daily' : 
                     automationToDelete.frequency === 'weekly' ? 'Weekly' : 'Once'} at {automationToDelete.run_time}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setAutomationToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete} 
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                  Deleting...
                </>
              ) : (
                'Delete Automation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* We don't need the old delete agent dialog anymore as we use SimpleDeleteButton directly */}
    </div>
  );
};

export default AutomatedCallScheduler;