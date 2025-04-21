/**
 * Calendar Integration Service
 * 
 * This service handles the integration with external calendar providers like Google Calendar.
 * It provides functionality to authenticate, create/update/delete events, and manage calendars.
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import { calendarIntegrations, scheduledAppointments, CalendarProvider, AppointmentStatus } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Google OAuth2 scopes needed for calendar operations
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Get Google OAuth2 client configured with the appropriate credentials
 * 
 * Note: For user-level OAuth, each user will authorize their own calendar
 * through the Google OAuth flow. We just need a consistent OAuth client ID/secret
 * to facilitate the exchange of auth codes for tokens.
 */
function getOAuth2Client(redirectUrl: string): OAuth2Client {
  // For user-level OAuth, these would be credentials for your application
  // Each user will explicitly grant access to their calendar
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || "YOUR_CLIENT_ID";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "YOUR_CLIENT_SECRET";

  // In production, these should be properly configured
  // For development/testing, we can use placeholder values
  return new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
}

/**
 * Generate OAuth URL for Google Calendar authorization
 */
export function getGoogleAuthUrl(userId: number, redirectUrl: string): string {
  const oauth2Client = getOAuth2Client(redirectUrl);
  
  // Generate a URL for user to authorize the application
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token as well
    scope: SCOPES,
    // Include user ID in state to identify the user when they return
    state: JSON.stringify({ userId }),
    prompt: 'consent', // Force consent screen to ensure refresh token
  });
  
  return authUrl;
}

/**
 * Process OAuth callback and save tokens in database
 */
export async function processGoogleAuthCallback(code: string, redirectUrl: string, state: string): Promise<{userId: number, email: string}> {
  const oauth2Client = getOAuth2Client(redirectUrl);
  
  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens || !tokens.access_token) {
    throw new Error('Failed to retrieve access token');
  }
  
  oauth2Client.setCredentials(tokens);
  
  // Get user ID from state
  const { userId } = JSON.parse(state);
  
  // Get user's email and primary calendar ID
  const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
  const calendarListResponse = await calendarApi.calendarList.list();
  const primaryCalendar = calendarListResponse.data.items?.find(cal => cal.primary);
  
  if (!primaryCalendar || !primaryCalendar.id) {
    throw new Error('Could not find primary calendar');
  }
  
  // Get user info to get email
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfoResponse = await oauth2.userinfo.get();
  
  if (!userInfoResponse.data.email) {
    throw new Error('Could not retrieve user email');
  }
  
  // Save integration to database
  await db.insert(calendarIntegrations).values({
    user_id: userId,
    provider: CalendarProvider.GOOGLE,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    calendar_id: primaryCalendar.id,
    email: userInfoResponse.data.email,
    display_name: primaryCalendar.summary || 'Google Calendar',
  });
  
  return { userId, email: userInfoResponse.data.email };
}

/**
 * Get a configured OAuth2 client with valid credentials for a specific user
 */
export async function getAuthorizedClient(userId: number): Promise<OAuth2Client | null> {
  // Retrieve user's calendar integration record
  const integrations = await db
    .select()
    .from(calendarIntegrations)
    .where(and(
      eq(calendarIntegrations.user_id, userId),
      eq(calendarIntegrations.provider, CalendarProvider.GOOGLE),
      eq(calendarIntegrations.is_active, true)
    ));
  
  if (integrations.length === 0) {
    return null; // No integration found
  }
  
  const integration = integrations[0];
  
  const oauth2Client = getOAuth2Client(''); // Redirect URL not needed for token refresh
  
  // Set existing credentials
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: integration.token_expiry?.getTime(),
  });
  
  // Check if token is expired and refresh if needed
  if (integration.token_expiry && integration.token_expiry < new Date()) {
    try {
      const { tokens } = await oauth2Client.refreshToken(integration.refresh_token!);
      
      // Update the stored tokens
      if (tokens.access_token) {
        await db
          .update(calendarIntegrations)
          .set({
            access_token: tokens.access_token,
            token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
            updated_at: new Date(),
          })
          .where(eq(calendarIntegrations.id, integration.id));
        
        // Update the client credentials
        oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: integration.refresh_token,
          expiry_date: tokens.expiry_date,
        });
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }
  
  return oauth2Client;
}

/**
 * Create a new event in the user's Google Calendar
 */
export async function createCalendarEvent(
  userId: number,
  calendarIntegrationId: number,
  title: string,
  description: string,
  startTime: Date,
  endTime: Date,
  attendees: string[] = [],
  location?: string,
): Promise<string | null> {
  const oauth2Client = await getAuthorizedClient(userId);
  
  if (!oauth2Client) {
    throw new Error('User is not authorized with Google Calendar');
  }
  
  // Get the calendar integration record
  const integrations = await db
    .select()
    .from(calendarIntegrations)
    .where(eq(calendarIntegrations.id, calendarIntegrationId));
  
  if (integrations.length === 0) {
    throw new Error('Calendar integration not found');
  }
  
  const integration = integrations[0];
  
  // Create the calendar API instance
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  // Format attendees
  const formattedAttendees = attendees.map(email => ({ email }));
  
  // Create the event
  const event: calendar_v3.Schema$Event = {
    summary: title,
    description,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    attendees: formattedAttendees,
    location,
    reminders: {
      useDefault: true,
    },
  };
  
  try {
    const response = await calendar.events.insert({
      calendarId: integration.calendar_id || 'primary',
      requestBody: event,
      sendUpdates: 'all', // Send email notifications to attendees
    });
    
    if (response.data.id) {
      // Update the last synced timestamp
      await db
        .update(calendarIntegrations)
        .set({ last_synced: new Date() })
        .where(eq(calendarIntegrations.id, integration.id));
      
      return response.data.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

/**
 * Create an appointment and add it to the calendar
 */
export async function createAppointment(
  userId: number,
  agentId: number,
  calendarIntegrationId: number,
  title: string,
  description: string,
  startTime: Date,
  endTime: Date,
  leadId?: number,
  attendees: string[] = [],
  location?: string,
  meetingLink?: string,
  notes?: string,
  callSid?: string,
): Promise<number | null> {
  try {
    // First create the event in Google Calendar
    const calendarEventId = await createCalendarEvent(
      userId,
      calendarIntegrationId,
      title,
      description,
      startTime,
      endTime,
      attendees,
      location
    );
    
    if (!calendarEventId) {
      throw new Error('Failed to create calendar event');
    }
    
    // Then save the appointment in our database
    const result = await db.insert(scheduledAppointments).values({
      user_id: userId,
      agent_id: agentId,
      calendar_integration_id: calendarIntegrationId,
      lead_id: leadId,
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      status: AppointmentStatus.SCHEDULED,
      calendar_event_id: calendarEventId,
      meeting_link: meetingLink,
      location,
      attendees: attendees.map(email => ({ email })),
      created_during_call_sid: callSid,
      notes,
    }).returning({ id: scheduledAppointments.id });
    
    if (result.length > 0) {
      return result[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

/**
 * Get a list of upcoming appointments for a user
 */
export async function getUpcomingAppointments(userId: number, limit = 10): Promise<any[]> {
  const now = new Date();
  
  const appointments = await db
    .select()
    .from(scheduledAppointments)
    .where(and(
      eq(scheduledAppointments.user_id, userId),
      eq(scheduledAppointments.status, AppointmentStatus.SCHEDULED)
    ))
    .orderBy(scheduledAppointments.start_time)
    .limit(limit);
  
  return appointments;
}

/**
 * Check if a user has calendar integration set up
 */
export async function hasCalendarIntegration(userId: number): Promise<boolean> {
  const integrations = await db
    .select({ id: calendarIntegrations.id })
    .from(calendarIntegrations)
    .where(and(
      eq(calendarIntegrations.user_id, userId),
      eq(calendarIntegrations.is_active, true)
    ));
  
  return integrations.length > 0;
}

/**
 * Get a list of a user's calendar integrations
 */
export async function getUserCalendarIntegrations(userId: number): Promise<any[]> {
  const integrations = await db
    .select()
    .from(calendarIntegrations)
    .where(eq(calendarIntegrations.user_id, userId));
  
  return integrations;
}

/**
 * Delete a calendar integration
 */
export async function deleteCalendarIntegration(integrationId: number, userId: number): Promise<boolean> {
  const result = await db
    .update(calendarIntegrations)
    .set({ is_active: false })
    .where(and(
      eq(calendarIntegrations.id, integrationId),
      eq(calendarIntegrations.user_id, userId)
    ));
  
  return true;
}