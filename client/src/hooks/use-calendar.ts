import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

export interface CalendarIntegration {
  id: number;
  provider: 'google' | 'calendly' | 'outlook';
  email: string;
  display_name: string;
  created_at: string;
  is_active: boolean;
  last_synced: string | null;
}

export interface Appointment {
  id: number;
  user_id: number;
  agent_id: number;
  calendar_integration_id: number;
  lead_id: number | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'pending';
  calendar_event_id: string;
  meeting_link: string | null;
  location: string | null;
  attendees: { email: string }[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

// Note: For user-level OAuth, we can use direct redirection instead of going through the backend
// This simplifies the implementation and avoids needing to store sensitive client secrets
export function getGoogleOAuthUrl() {
  // The client ID should be configured in your Google Cloud Console
  // This should be a public client ID safe to include in frontend code
  // In production, replace YOUR_GOOGLE_OAUTH_CLIENT_ID with the actual client ID
  // This is the OAuth client ID from your Google Cloud Console project
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || "YOUR_GOOGLE_OAUTH_CLIENT_ID";
  
  // The redirect URI should be configured in Google Cloud Console
  // For development, the URI might be http://localhost:3000/api/calendar/google/callback
  // For production, it should be your deployed domain
  const redirectUri = encodeURIComponent(`${window.location.origin}/api/calendar/google/callback`);
  
  // Requesting calendar scope to allow viewing and managing calendars
  const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events");
  const responseType = "code";
  const accessType = "offline"; // Get refresh token to enable long-term access
  const prompt = "consent"; // Always show consent screen to ensure refresh token
  
  // Additional state parameter could be used to include user ID or return URL
  const state = encodeURIComponent(JSON.stringify({
    returnTo: window.location.pathname,
  }));
  
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&access_type=${accessType}&prompt=${prompt}&state=${state}`;
}

export function useCalendarIntegrationStatus() {
  return useQuery({
    queryKey: ['/api/calendar/status'],
    queryFn: async () => {
      const response = await apiRequest('/api/calendar/status', { method: 'GET' });
      return response.hasIntegration as boolean;
    },
  });
}

export function useCalendarIntegrations() {
  return useQuery({
    queryKey: ['/api/calendar/integrations'],
    queryFn: async () => {
      const response = await apiRequest('/api/calendar/integrations', { method: 'GET' });
      return response.integrations as CalendarIntegration[];
    },
  });
}

export function useDeleteCalendarIntegration() {
  return useMutation({
    mutationFn: async (integrationId: number) => {
      return apiRequest(`/api/calendar/integrations/${integrationId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      // Invalidate calendar integrations query
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/integrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/status'] });
    },
  });
}

export function useUpcomingAppointments() {
  return useQuery({
    queryKey: ['/api/calendar/appointments/upcoming'],
    queryFn: async () => {
      const response = await apiRequest('/api/calendar/appointments/upcoming', { method: 'GET' });
      return response.appointments as Appointment[];
    },
  });
}

export function useCreateAppointment() {
  return useMutation({
    mutationFn: async (appointmentData: {
      agentId: number;
      calendarIntegrationId: number;
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      leadId?: number;
      attendees?: string[];
      location?: string;
      meetingLink?: string;
      notes?: string;
      callSid?: string;
    }) => {
      return apiRequest('/api/calendar/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentData),
      });
    },
    onSuccess: () => {
      // Invalidate upcoming appointments query
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/appointments/upcoming'] });
    },
  });
}

export function useUpdateAppointmentStatus() {
  return useMutation({
    mutationFn: async ({ 
      appointmentId, 
      status 
    }: { 
      appointmentId: number; 
      status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'pending';
    }) => {
      return apiRequest(`/api/calendar/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      // Invalidate upcoming appointments query
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/appointments/upcoming'] });
    },
  });
}