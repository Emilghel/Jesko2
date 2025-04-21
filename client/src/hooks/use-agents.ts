import { useQuery } from '@tanstack/react-query';
import { setAuthHeaders } from '@/lib/auth';

interface Agent {
  id: number;
  user_id: number;
  name: string;
  description: string;
  personality: string;
  created_at: string;
  updated_at: string;
  voice_id: string | null;
  knowledge_base: string | null;
}

export function useAgents() {
  return useQuery({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      try {
        // Create headers with authentication
        const headers = setAuthHeaders({
          'Content-Type': 'application/json'
        });
        
        const response = await fetch('/api/agents', {
          headers,
          credentials: 'include',
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            // Return empty array for authentication errors to prevent crashes
            return [] as Agent[];
          }
          throw new Error('Failed to fetch AI agents');
        }
        
        return response.json() as Promise<Agent[]>;
      } catch (error) {
        console.error("Error fetching AI agents:", error);
        // Return empty array on errors to prevent crashes
        return [] as Agent[];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once on failure
  });
}