import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useUserAgentDetails } from "@/hooks/use-user-agent-details";
import { useVoices } from "../hooks/use-voices";
import { usePhoneNumbers } from "../hooks/use-phone-numbers";

const agentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  is_active: z.boolean().optional(),
  voice_id: z.string(),
  phone_number_id: z.string().optional(),
});

type AgentFormValues = z.infer<typeof agentSchema>;

interface AgentEditFormProps {
  agentId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentEditForm({ agentId, isOpen, onClose }: AgentEditFormProps) {
  const { 
    agent, 
    isLoading: agentLoading, 
    isError: agentError 
  } = useUserAgentDetails(agentId);
  
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "",
      is_active: false,
      voice_id: "",
      phone_number_id: "",
    },
  });
  
  // Update form values when agent data is loaded
  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        description: agent.description || "",
        systemPrompt: agent.system_prompt,
        is_active: agent.is_active || false,
        voice_id: agent.voice_id,
        phone_number_id: agent.phone_number_id ? String(agent.phone_number_id) : "",
      });
    }
  }, [agent, form]);
  
  const isLoading = agentLoading || voicesLoading || phoneNumbersLoading;
  const hasError = agentError || voicesError || phoneNumbersError;
  
  const onSubmit = async (data: AgentFormValues) => {
    if (!agentId) return;
    
    try {
      setIsSubmitting(true);
      
      // Convert phone_number_id to number or null
      const phoneNumberId = data.phone_number_id ? parseInt(data.phone_number_id, 10) : null;
      
      const response = await fetch(`/api/user/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          system_prompt: data.systemPrompt,
          is_active: data.is_active,
          voice_id: data.voice_id,
          phone_number_id: phoneNumberId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update agent');
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/agents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/user/agents/${agentId}`] });
      
      toast({
        title: "Agent updated",
        description: "Your AI agent has been successfully updated.",
      });
      
      // Close the modal
      onClose();
      
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: "Update failed",
        description: "There was a problem updating your agent.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit AI Agent</DialogTitle>
          <DialogDescription>
            Update your AI agent's settings and capabilities.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hasError ? (
          <div className="text-center py-4 text-red-500">
            Error loading agent data. Please try again.
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="AI Agent Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this agent does" 
                        {...field} 
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Instructions for how the agent should behave" 
                        {...field} 
                        className="min-h-[120px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="voice_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voice</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {voices && voices.map(voice => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone_number_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a phone number (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {phoneNumbers && phoneNumbers.map(phone => (
                          <SelectItem key={phone.id} value={phone.id.toString()}>
                            {phone.phone_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        When active, this agent can be used in automated systems.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}