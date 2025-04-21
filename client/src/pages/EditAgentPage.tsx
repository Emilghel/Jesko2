import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useUserAgentDetails } from '@/hooks/use-user-agent-details';
import { useUserAgents } from '@/hooks/use-user-agents';
import { useVoices } from '@/hooks/use-voices';
import { usePhoneNumbers } from '@/hooks/use-phone-numbers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserAgent } from '@shared/schema';
import { Loader2, Bot, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define schema for agent form
const agentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  system_prompt: z.string().min(1, 'System prompt is required'),
  is_active: z.boolean().default(false),
  voice_id: z.string().optional(),
  phone_number_id: z.string().optional(),
  greeting_message: z.string().optional(),
  greeting_message_required: z.boolean().default(true),
  second_message: z.string().optional(),
  second_message_required: z.boolean().default(false),
  third_message: z.string().optional(),
  third_message_required: z.boolean().default(false),
});

type AgentFormValues = z.infer<typeof agentSchema>;

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const agentId = id ? parseInt(id) : null;
  
  // Get agent data
  const { 
    agent, 
    isLoading: agentLoading, 
    isError: agentError,
    refetch: refetchAgent
  } = useUserAgentDetails(agentId);
  
  // Get additional data
  const { 
    voices, 
    isLoading: voicesLoading, 
    isError: voicesError 
  } = useVoices();
  
  const { 
    phoneNumbers, 
    isLoading: phoneNumbersLoading, 
    isError: phoneNumbersError 
  } = usePhoneNumbers();
  
  // Get update and delete mutations
  const { 
    updateUserAgent, 
    isUpdating,
    deleteUserAgent,
    isDeleting,
    refetch: refetchAgents
  } = useUserAgents();
  
  const { toast } = useToast();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Initialize form
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      description: '',
      system_prompt: '',
      is_active: false,
      voice_id: '',
      phone_number_id: '',
      greeting_message: 'Hello, how can I help you today?',
      greeting_message_required: true,
      second_message: '',
      second_message_required: false,
      third_message: '',
      third_message_required: false,
    },
  });
  
  // Update form values when agent data is loaded
  useEffect(() => {
    // Fetch agent data on mount
    if (agentId) {
      console.log(`EditAgentPage: Fetching data for agent ID ${agentId}`);
      refetchAgent();
    }
    
    // Set form values when agent data is available
    if (agent) {
      console.log(`EditAgentPage: Setting form values for agent "${agent.name}"`);
      form.reset({
        name: agent.name,
        description: agent.description || '',
        system_prompt: agent.system_prompt || '',
        is_active: agent.is_active || false,
        voice_id: agent.voice_id || '',
        phone_number_id: agent.phone_number_id ? String(agent.phone_number_id) : '',
        greeting_message: agent.greeting_message || 'Hello, how can I help you today?',
        greeting_message_required: agent.greeting_message_required ?? true,
        second_message: agent.second_message || '',
        second_message_required: agent.second_message_required ?? false,
        third_message: agent.third_message || '',
        third_message_required: agent.third_message_required ?? false,
      });
    }
  }, [agentId, agent, form, refetchAgent]);
  
  // Form submission handler
  const onSubmit = async (data: AgentFormValues) => {
    if (!agentId) {
      toast({
        title: 'Error',
        description: 'Agent ID is missing',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Convert phone_number_id to number or null
      const phoneNumberId = data.phone_number_id && data.phone_number_id !== '' 
        ? parseInt(data.phone_number_id) 
        : null;
      
      // Prepare agent data for update
      const agentData: Partial<UserAgent> = {
        name: data.name,
        description: data.description,
        system_prompt: data.system_prompt,
        is_active: data.is_active,
        voice_id: data.voice_id || null,
        phone_number_id: phoneNumberId,
        greeting_message: data.greeting_message,
        greeting_message_required: data.greeting_message_required,
        second_message: data.second_message,
        second_message_required: data.second_message_required,
        third_message: data.third_message,
        third_message_required: data.third_message_required,
      };
      
      // Call update mutation
      await updateUserAgent({ 
        id: agentId, 
        data: agentData 
      });
      
      // Refetch agent to update the UI
      refetchAgent();
      
      toast({
        title: 'Success',
        description: 'Agent has been updated successfully',
      });
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update agent',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteAgent = async () => {
    if (!agentId) return;
    
    try {
      await deleteUserAgent({ id: agentId });
      toast({
        title: 'Success',
        description: 'Agent has been deleted successfully',
      });
      // Redirect back to dashboard after deletion
      setLocation('/dashboard');
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete agent',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteConfirmOpen(false);
    }
  };
  
  const handleCancel = () => {
    setLocation('/dashboard');
  };
  
  const isLoading = agentLoading || voicesLoading || phoneNumbersLoading;
  const hasError = agentError || voicesError || phoneNumbersError;
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading agent data...</span>
        </div>
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load agent data. Please try again.
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4"
          onClick={() => setLocation('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }
  
  if (!agent) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTitle>Agent Not Found</AlertTitle>
          <AlertDescription>
            The requested agent could not be found.
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4"
          onClick={() => setLocation('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="mr-4"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Edit AI Agent</h1>
        </div>
        <Button 
          variant="destructive" 
          onClick={() => setIsDeleteConfirmOpen(true)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            'Delete Agent'
          )}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Bot className="mr-2 h-5 w-5 text-primary" />
            {agent.name}
          </CardTitle>
          <CardDescription>
            Update your AI agent's settings and personality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="AI Assistant" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of your AI agent
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this agent does"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional description of your agent's purpose
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* System Prompt */}
                <FormField
                  control={form.control}
                  name="system_prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Prompt</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="You are an AI assistant..."
                          className="resize-none min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Instructions that define how your AI agent behaves
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Active Status */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          Enable or disable this agent
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Voice and Phone Settings */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-medium">Voice & Phone Settings</h3>
                
                {/* Voice Selection */}
                <FormField
                  control={form.control}
                  name="voice_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a voice" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {voicesLoading ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : voices?.length > 0 ? (
                            [
                              { id: '', name: 'None' },
                              ...voices.map(voice => ({ id: voice.id, name: voice.name }))
                            ].map((voice) => (
                              <SelectItem 
                                key={voice.id} 
                                value={voice.id}
                              >
                                {voice.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="">No voices available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select a voice for your AI agent
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Phone Number Selection */}
                <FormField
                  control={form.control}
                  name="phone_number_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a phone number" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {phoneNumbersLoading ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : phoneNumbers?.length > 0 ? (
                            [
                              { id: '', number: 'None' },
                              ...phoneNumbers.map(phone => ({
                                id: phone.id.toString(),
                                number: phone.phone_number
                              }))
                            ].map((phone) => (
                              <SelectItem 
                                key={phone.id} 
                                value={phone.id}
                              >
                                {phone.number}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="">No phone numbers available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Assign a phone number to this agent
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Message Configuration */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-medium">Message Configuration</h3>
                
                {/* Greeting Message */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="greeting_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Greeting Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Hello, how can I help you today?"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          First message the agent will say when starting a conversation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="greeting_message_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Required Greeting
                          </FormLabel>
                          <FormDescription>
                            If enabled, the greeting will always be used at the start of a conversation
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Second Message */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="second_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Second Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Optional second predefined message"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Second message the agent can say (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="second_message_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Required Second Message
                          </FormLabel>
                          <FormDescription>
                            If enabled, this message will always be used after the greeting
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Third Message */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="third_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Third Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Optional third predefined message"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Third message the agent can say (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="third_message_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Required Third Message
                          </FormLabel>
                          <FormDescription>
                            If enabled, this message will always be used after the second message
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <CardFooter className="flex justify-between pt-6">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this agent? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAgent}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}