import { useQuery } from "@tanstack/react-query";

export interface Voice {
  id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  gender?: string;
  accent?: string;
}

export function useVoices() {
  const {
    data: voices = [],
    isLoading,
    isError,
    error,
  } = useQuery<Voice[]>({
    queryKey: ['/api/elevenlabs/voices'],
    retry: 1,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return {
    voices,
    isLoading,
    isError,
    error,
  };
}