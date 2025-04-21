/**
 * Calendar Integration Routes
 * 
 * This file contains API routes for handling calendar integration functionality:
 * - Google Calendar OAuth flow
 * - Getting/managing calendar integrations
 * - Managing appointments
 */

import express from 'express';
import { z } from 'zod';
import { isAuthenticated } from './lib/auth-simple';
import { db } from './db';
import { 
  getGoogleAuthUrl, 
  processGoogleAuthCallback, 
  createAppointment, 
  getUpcomingAppointments,
  hasCalendarIntegration,
  getUserCalendarIntegrations,
  deleteCalendarIntegration
} from './lib/calendar-integration';
import { scheduledAppointments, AppointmentStatus } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const calendarRouter = express.Router();

// Schema for creating appointments
const createAppointmentSchema = z.object({
  agentId: z.number(),
  calendarIntegrationId: z.number(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)),
  leadId: z.number().optional(),
  attendees: z.array(z.string().email()).optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  notes: z.string().optional(),
  callSid: z.string().optional(),
});

/**
 * Get Google Calendar auth URL
 * This begins the OAuth flow to connect a Google Calendar
 * 
 * Note: For user-level OAuth, this can now be handled directly in the frontend
 * by redirecting the user to Google's authorization page with the appropriate parameters.
 * However, we maintain this endpoint for backward compatibility and to allow for future
 * server-side enhancements of the OAuth flow.
 */
calendarRouter.get('/google/auth-url', isAuthenticated, (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Create a redirect URL back to our application
    const redirectUrl = `${req.protocol}://${req.headers.host}/api/calendar/google/callback`;
    
    const authUrl = getGoogleAuthUrl(userId, redirectUrl);
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * Google Calendar OAuth callback
 * This handles the redirect from Google after user grants permission
 */
calendarRouter.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    // Parse the state parameter to get additional information
    let stateObj;
    let returnTo = '/settings/calendar'; // Default return path
    
    try {
      stateObj = JSON.parse(decodeURIComponent(state));
      if (stateObj.returnTo) {
        returnTo = stateObj.returnTo;
      }
    } catch (err) {
      console.warn('Could not parse state parameter:', err);
      // Continue with default returnTo path
    }
    
    const redirectUrl = `${req.protocol}://${req.headers.host}/api/calendar/google/callback`;
    const result = await processGoogleAuthCallback(code, redirectUrl, state);
    
    // Redirect to the specified return path with success message
    res.redirect(`${returnTo}?success=true`);
  } catch (error) {
    console.error('Error processing callback:', error);
    // Try to extract returnTo from state even in error case
    let returnTo = '/settings/calendar';
    if (req.query.state && typeof req.query.state === 'string') {
      try {
        const stateObj = JSON.parse(decodeURIComponent(req.query.state as string));
        if (stateObj.returnTo) {
          returnTo = stateObj.returnTo;
        }
      } catch (err) {
        // Continue with default returnTo path
      }
    }
    
    res.redirect(`${returnTo}?error=true`);
  }
});

/**
 * Create a new appointment
 */
calendarRouter.post('/appointments', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate input
    const validatedData = createAppointmentSchema.parse(req.body);
    
    // Create the appointment
    const appointmentId = await createAppointment(
      userId,
      validatedData.agentId,
      validatedData.calendarIntegrationId,
      validatedData.title,
      validatedData.description || '',
      validatedData.startTime,
      validatedData.endTime,
      validatedData.leadId,
      validatedData.attendees || [],
      validatedData.location,
      validatedData.meetingLink,
      validatedData.notes,
      validatedData.callSid
    );
    
    if (!appointmentId) {
      return res.status(500).json({ error: 'Failed to create appointment' });
    }
    
    res.status(201).json({ appointmentId });
  } catch (error) {
    console.error('Error creating appointment:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

/**
 * Get upcoming appointments
 */
calendarRouter.get('/appointments/upcoming', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const appointments = await getUpcomingAppointments(userId, limit);
    
    res.json({ appointments });
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

/**
 * Check if user has calendar integration
 */
calendarRouter.get('/status', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const hasIntegration = await hasCalendarIntegration(userId);
    
    res.json({ hasIntegration });
  } catch (error) {
    console.error('Error checking integration status:', error);
    res.status(500).json({ error: 'Failed to check integration status' });
  }
});

/**
 * Get user's calendar integrations
 */
calendarRouter.get('/integrations', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const integrations = await getUserCalendarIntegrations(userId);
    
    // Remove sensitive data
    const safeIntegrations = integrations.map(integration => ({
      id: integration.id,
      provider: integration.provider,
      email: integration.email,
      display_name: integration.display_name,
      created_at: integration.created_at,
      is_active: integration.is_active,
      last_synced: integration.last_synced,
    }));
    
    res.json({ integrations: safeIntegrations });
  } catch (error) {
    console.error('Error getting integrations:', error);
    res.status(500).json({ error: 'Failed to retrieve calendar integrations' });
  }
});

/**
 * Delete a calendar integration
 */
calendarRouter.delete('/integrations/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const integrationId = parseInt(req.params.id);
    
    if (isNaN(integrationId)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }
    
    const result = await deleteCalendarIntegration(integrationId, userId);
    
    res.json({ success: result });
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ error: 'Failed to delete calendar integration' });
  }
});

/**
 * Update appointment status
 */
calendarRouter.patch('/appointments/:id/status', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const appointmentId = parseInt(req.params.id);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }
    
    const { status } = req.body;
    
    if (!status || !Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Update the appointment status
    await db
      .update(scheduledAppointments)
      .set({ 
        status: status as AppointmentStatus,
        updated_at: new Date()
      })
      .where(and(
        eq(scheduledAppointments.id, appointmentId),
        eq(scheduledAppointments.user_id, userId)
      ));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

export default calendarRouter;