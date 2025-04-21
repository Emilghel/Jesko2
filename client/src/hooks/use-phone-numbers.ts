import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

export interface PhoneNumber {
  id: number;
  phone_number: string;
  friendly_name: string | null;
  is_active: boolean;
  created_at: Date;
  user_id: number;
}

export function usePhoneNumbers() {
  const {
    data: phoneNumbers = [],
    isLoading,
    isError,
    error,
  } = useQuery<PhoneNumber[]>({
    queryKey: ['/api/phone-numbers'],
    retry: 1,
  });

  const { mutate: purchasePhoneNumber, isPending: isPurchasing } = useMutation({
    mutationFn: async (areaCode?: string) => {
      const response = await fetch('/api/phone-numbers/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ areaCode }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to purchase phone number');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({
        title: "Phone number purchased",
        description: "New phone number has been added to your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error purchasing phone number",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: releasePhoneNumber, isPending: isReleasing } = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/phone-numbers/${id}/release`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to release phone number');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({
        title: "Phone number released",
        description: "Phone number has been released from your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error releasing phone number",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    phoneNumbers,
    isLoading,
    isError,
    error,
    purchasePhoneNumber,
    isPurchasing,
    releasePhoneNumber,
    isReleasing,
  };
}