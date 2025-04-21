import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

export type Lead = {
  id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
  status: string | null;
  notes: string | null;
  created_at: Date;
  user_id: number;
  source?: string;
  tags?: string[];
  updated_at?: Date;
  last_contacted?: Date | null;
};

export interface LeadFormData {
  full_name: string;
  phone_number: string;
  email?: string;
  status?: string;
  notes?: string;
  source?: string;
  tags?: string[];
}

export function useLeads() {
  const { 
    data: leads = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
    retry: 1,
  });

  const { mutate: createLead, isPending: isCreating } = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create lead');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Lead created",
        description: "New lead has been successfully added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: updateLead, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<LeadFormData> }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update lead');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Lead updated",
        description: "Lead information has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteLead, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete lead');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Lead deleted",
        description: "Lead has been removed from your list.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    leads,
    isLoading,
    isError,
    error,
    createLead,
    isCreating,
    updateLead,
    isUpdating,
    deleteLead,
    isDeleting,
  };
}