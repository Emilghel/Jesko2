import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@shared/schema";

export function useAgent() {
  const { toast } = useToast();
  
  // Fetch user agent
  const { 
    data: agent, 
    isLoading, 
    isError, 
    error 
  } = useQuery<Agent>({
    queryKey: ['/api/user/agent'],
    retry: 1,
  });

  // Mutation to update agent
  const updateAgentMutation = useMutation({
    mutationFn: async (agentData: Partial<Agent>) => {
      const response = await apiRequest('PATCH', '/api/user/agent', agentData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/user/agent'], data);
      toast({
        title: "Agent updated",
        description: "Your agent settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch agent templates
  const { 
    data: templates, 
    isLoading: isLoadingTemplates 
  } = useQuery({
    queryKey: ['/api/agent-templates'],
    retry: 1,
  });

  return {
    agent,
    templates,
    isLoading: isLoading || isLoadingTemplates,
    isError,
    error,
    updateAgent: updateAgentMutation.mutate,
    isUpdating: updateAgentMutation.isPending,
  };
}