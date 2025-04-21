/**
 * Automated Call Routes
 * 
 * API routes for managing automated call settings and schedules
 */

import express, { Router, Request, Response } from 'express';
import { db } from "./db";
import { LogLevel, AutomationStatus, automatedCallSettings, automatedCallRuns } from "@shared/schema";
import { sql, eq, and } from "drizzle-orm";
import { insertAutomatedCallSettingsSchema } from '@shared/schema';
import { runAutomationScheduler, executeAutomation } from './lib/automated-call-service';
import { isAuthenticated } from './lib/auth-simple';

// Create router
const automatedCallRouter = Router();

// Get all automated call settings for the current user
automatedCallRouter.get('/settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const settings = await db.query.automatedCallSettings.findMany({
      where: (settings, { eq }) => eq(settings.user_id, user.id),
      orderBy: (settings, { desc }) => [desc(settings.created_at)]
    });
    
    return res.json(settings);
  } catch (error) {
    console.error('Error fetching automated call settings:', error);
    return res.status(500).json({ error: 'Failed to fetch automated call settings' });
  }
});

// Get a specific automation setting by ID
automatedCallRouter.get('/settings/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const settingId = parseInt(req.params.id);
    
    if (isNaN(settingId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const setting = await db.query.automatedCallSettings.findFirst({
      where: (settings, { and, eq }) => and(
        eq(settings.id, settingId),
        eq(settings.user_id, user.id)
      )
    });
    
    if (!setting) {
      return res.status(404).json({ error: 'Automation setting not found' });
    }
    
    return res.json(setting);
  } catch (error) {
    console.error('Error fetching automation setting:', error);
    return res.status(500).json({ error: 'Failed to fetch automation setting' });
  }
});

// Create a new automated call setting
automatedCallRouter.post('/settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    console.log("Creating automation settings for user:", user.id);
    console.log("Request body:", req.body);
    
    // Parse and validate the request body
    const parseResult = insertAutomatedCallSettingsSchema.safeParse({
      ...req.body,
      user_id: user.id
    });
    
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.format());
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: parseResult.error.format()
      });
    }
    
    console.log("Validated data:", parseResult.data);
    
    // Declare a variable to store the new setting
    let newSetting: any;
    
    try {
      // Create new automation settings
      // Use schema reference from the imported automatedCallSettings
      const [insertedSetting] = await db.insert(automatedCallSettings)
        .values(parseResult.data)
        .returning();
      
      if (!insertedSetting) {
        console.error("No setting returned after insert");
        return res.status(500).json({ error: 'Failed to create automation settings' });
      }
      
      newSetting = insertedSetting;
      console.log("Created new setting:", newSetting);
    } catch (dbError) {
      console.error("Database error during insert:", dbError);
      return res.status(500).json({ error: 'Database error creating automation settings', details: String(dbError) });
    }
    
    // Calculate next run time if enabled
    if (newSetting.enabled) {
      const now = new Date();
      let nextRun: Date | null = null;
      
      // Simple calculation based on frequency, time, and days
      switch (newSetting.frequency) {
        case 'daily':
          nextRun = calculateNextRunTime(now, newSetting.run_time);
          break;
        case 'weekly':
          if (newSetting.run_days && newSetting.run_days.length > 0) {
            nextRun = calculateNextWeeklyRun(now, newSetting.run_time, newSetting.run_days);
          }
          break;
        case 'once':
          // For one-time runs, set next_run to now so it runs on the next scheduler check
          nextRun = new Date();
          break;
      }
      
      if (nextRun) {
        await db.update(automatedCallSettings)
          .set({ next_run: nextRun })
          .where(sql`id = ${newSetting.id}`);
          
        newSetting.next_run = nextRun;
      }
    }
    
    return res.status(201).json(newSetting);
  } catch (error) {
    console.error('Error creating automated call settings:', error);
    return res.status(500).json({ error: 'Failed to create automated call settings' });
  }
});

// Update an existing automation setting
automatedCallRouter.put('/settings/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const settingId = parseInt(req.params.id);
    
    if (isNaN(settingId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if the setting exists and belongs to the user
    const existingSetting = await db.query.automatedCallSettings.findFirst({
      where: (settings, { and, eq }) => and(
        eq(settings.id, settingId),
        eq(settings.user_id, user.id)
      )
    });
    
    if (!existingSetting) {
      return res.status(404).json({ error: 'Automation setting not found' });
    }
    
    // Update the setting
    const [updatedSetting] = await db.update(automatedCallSettings)
      .set({
        ...req.body,
        updated_at: new Date()
      })
      .where(sql`id = ${settingId}`)
      .returning();
    
    if (!updatedSetting) {
      return res.status(500).json({ error: 'Failed to update automation settings' });
    }
    
    // Recalculate next run time if enabled and settings like frequency, run_time, or run_days changed
    if (updatedSetting.enabled && 
        (req.body.frequency !== undefined || 
         req.body.run_time !== undefined || 
         req.body.run_days !== undefined)) {
      
      const now = new Date();
      let nextRun: Date | null = null;
      
      switch (updatedSetting.frequency) {
        case 'daily':
          nextRun = calculateNextRunTime(now, updatedSetting.run_time);
          break;
        case 'weekly':
          if (updatedSetting.run_days && updatedSetting.run_days.length > 0) {
            nextRun = calculateNextWeeklyRun(now, updatedSetting.run_time, updatedSetting.run_days);
          }
          break;
        case 'once':
          // For one-time runs that haven't run yet
          if (!updatedSetting.last_run) {
            nextRun = new Date();
          }
          break;
      }
      
      if (nextRun) {
        await db.update(automatedCallSettings)
          .set({ next_run: nextRun })
          .where(sql`id = ${updatedSetting.id}`);
          
        updatedSetting.next_run = nextRun;
      }
    }
    
    return res.json(updatedSetting);
  } catch (error) {
    console.error('Error updating automation settings:', error);
    return res.status(500).json({ error: 'Failed to update automation settings' });
  }
});

// Delete an automation setting
automatedCallRouter.delete('/settings/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const settingId = parseInt(req.params.id);
    
    if (isNaN(settingId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if the setting exists and belongs to the user
    const existingSetting = await db.query.automatedCallSettings.findFirst({
      where: (settings, { and, eq }) => and(
        eq(settings.id, settingId),
        eq(settings.user_id, user.id)
      )
    });
    
    if (!existingSetting) {
      return res.status(404).json({ error: 'Automation setting not found' });
    }
    
    // Delete the setting
    await db.delete(automatedCallSettings)
      .where(sql`id = ${settingId}`);
    
    return res.json({ success: true, message: 'Automation setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting automation setting:', error);
    return res.status(500).json({ error: 'Failed to delete automation setting' });
  }
});

// Get automation history/runs for a specific setting
automatedCallRouter.get('/settings/:id/runs', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const settingId = parseInt(req.params.id);
    
    if (isNaN(settingId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if the setting exists and belongs to the user
    const existingSetting = await db.query.automatedCallSettings.findFirst({
      where: (settings, { and, eq }) => and(
        eq(settings.id, settingId),
        eq(settings.user_id, user.id)
      )
    });
    
    if (!existingSetting) {
      return res.status(404).json({ error: 'Automation setting not found' });
    }
    
    // Get runs for this setting
    const runs = await db.query.automatedCallRuns.findMany({
      where: (run, { eq }) => eq(run.settings_id, settingId),
      orderBy: (run, { desc }) => [desc(run.start_time)]
    });
    
    return res.json(runs);
  } catch (error) {
    console.error('Error fetching automation runs:', error);
    return res.status(500).json({ error: 'Failed to fetch automation runs' });
  }
});

// Manually trigger an automation to run immediately
automatedCallRouter.post('/settings/:id/run-now', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const settingId = parseInt(req.params.id);
    
    if (isNaN(settingId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if the setting exists and belongs to the user
    const existingSetting = await db.query.automatedCallSettings.findFirst({
      where: (settings, { and, eq }) => and(
        eq(settings.id, settingId),
        eq(settings.user_id, user.id)
      )
    });
    
    if (!existingSetting) {
      return res.status(404).json({ error: 'Automation setting not found' });
    }
    
    // Create a new run record
    const [run] = await db.insert(automatedCallRuns).values({
      settings_id: settingId,
      status: AutomationStatus.RUNNING,
    }).returning();
    
    if (!run) {
      return res.status(500).json({ error: 'Failed to create automation run record' });
    }
    
    // Execute the automation asynchronously
    setTimeout(async () => {
      try {
        await executeAutomation(existingSetting);
      } catch (error) {
        console.error(`Error executing automation ${settingId}:`, error);
      }
    }, 0);
    
    return res.status(202).json({ 
      success: true, 
      message: 'Automation execution started',
      runId: run.id
    });
  } catch (error) {
    console.error('Error triggering automation:', error);
    return res.status(500).json({ error: 'Failed to trigger automation' });
  }
});

// Run the scheduler manually (mostly for testing)
automatedCallRouter.post('/run-scheduler', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Only admins can manually trigger the scheduler
    const user = req.user as any;
    
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    
    // Run the scheduler asynchronously
    setTimeout(async () => {
      try {
        await runAutomationScheduler();
      } catch (error) {
        console.error('Error running automation scheduler:', error);
      }
    }, 0);
    
    return res.status(202).json({ 
      success: true, 
      message: 'Automation scheduler started'
    });
  } catch (error) {
    console.error('Error triggering scheduler:', error);
    return res.status(500).json({ error: 'Failed to trigger scheduler' });
  }
});

// Helper function to calculate next run time for daily automation
function calculateNextRunTime(now: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const nextRun = new Date(now);
  
  nextRun.setHours(hours);
  nextRun.setMinutes(minutes);
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);
  
  // If the calculated time is in the past, move to the next day
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}

// Helper function to calculate next run time for weekly automation
function calculateNextWeeklyRun(now: Date, timeString: string, runDays: string[]): Date | null {
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Convert time string to hours and minutes
  if (isNaN(hours) || isNaN(minutes)) {
    return null;
  }
  
  // Map day strings to day indices (0 = Sunday, 1 = Monday, etc.)
  const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const runDayIndices = runDays
    .map(day => daysOfWeek.indexOf(day))
    .filter(index => index !== -1) // Filter out invalid days
    .sort((a, b) => a - b); // Sort in ascending order
  
  if (runDayIndices.length === 0) {
    return null;
  }
  
  const currentDayIndex = now.getDay();
  let nextDayIndex = runDayIndices.find(day => 
    day > currentDayIndex || 
    (day === currentDayIndex && (now.getHours() < hours || (now.getHours() === hours && now.getMinutes() < minutes)))
  );
  
  let daysToAdd: number;
  
  if (nextDayIndex !== undefined) {
    // Found a day later this week
    daysToAdd = nextDayIndex - currentDayIndex;
    if (daysToAdd === 0) {
      // Same day, but need to check if the time has already passed
      const todayRunTime = new Date(now);
      todayRunTime.setHours(hours);
      todayRunTime.setMinutes(minutes);
      todayRunTime.setSeconds(0);
      todayRunTime.setMilliseconds(0);
      
      if (todayRunTime <= now) {
        // Time has passed, go to next week
        daysToAdd = 7;
      }
    }
  } else {
    // Wrap around to the first day next week
    nextDayIndex = runDayIndices[0];
    daysToAdd = 7 - currentDayIndex + nextDayIndex;
  }
  
  const nextRun = new Date(now);
  nextRun.setDate(nextRun.getDate() + daysToAdd);
  nextRun.setHours(hours);
  nextRun.setMinutes(minutes);
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);
  
  return nextRun;
}

export default automatedCallRouter;