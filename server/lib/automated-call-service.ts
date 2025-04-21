/**
 * Automated Call Service
 * 
 * This service handles scheduling and executing automated calls to leads
 * based on configurable settings.
 */

import { 
  AutomatedCallSettings, 
  AutomatedCallRun, 
  AutomationStatus,
  LeadStatus,
  LogLevel as SchemaLogLevel
} from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { db } from "../db";
import { automatedCallSettings, automatedCallRuns, logs } from "@shared/schema";
import { initiateOutboundCall } from "./twilio";

// Define log source
const LOG_SOURCE = "AutomatedCallService";

// Define our own log levels for use internally
const LogLevel = {
  INFO: "info",
  WARN: "warn",
  ERROR: "error"
};

// Create a logging function to capture service logs
async function logMessage(level: string, source: string, message: string): Promise<void> {
  try {
    // Console log for immediate visibility
    console.log(`[${level.toUpperCase()}] [${source}] ${message}`);
    
    // Database log for persistence
    await db.insert(logs).values({
      timestamp: new Date(),
      level: level.toUpperCase(),
      source: source,
      message: message
    });
  } catch (error) {
    // Fallback to console if database logging fails
    console.error(`Failed to log to database: ${error}`);
    console.log(`[${level.toUpperCase()}] [${source}] ${message}`);
  }
}

/**
 * Get automated call settings that are due to run
 */
export async function getDueAutomations(): Promise<AutomatedCallSettings[]> {
  try {
    const now = new Date();
    
    // Format current time as HH:MM for comparison
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDayOfWeek = daysOfWeek[now.getDay()];
    
    // Use a simpler query approach to avoid SQL syntax issues
    // First get all enabled automations
    const enabledSettings = await db
      .select()
      .from(automatedCallSettings)
      .where(eq(automatedCallSettings.enabled, true));
    
    // Then filter them in memory based on the complex conditions
    const dueAutomations = enabledSettings.filter(setting => {
      // Check next_run condition
      const nextRunCondition = !setting.next_run || new Date(setting.next_run) <= now;
      if (!nextRunCondition) return false;
      
      // For daily automations
      if (setting.frequency === 'daily') {
        // Check if current time is within 5 minutes of run_time
        const runTimeParts = setting.run_time.split(':');
        const runTimeHour = parseInt(runTimeParts[0]);
        const runTimeMinute = parseInt(runTimeParts[1]);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const timeDiffMinutes = Math.abs(
          (runTimeHour * 60 + runTimeMinute) - (currentHour * 60 + currentMinute)
        );
        
        return timeDiffMinutes <= 5;
      }
      
      // For weekly automations
      if (setting.frequency === 'weekly') {
        // Check if current day is in run_days
        if (!setting.run_days || !setting.run_days.includes(currentDayOfWeek)) {
          return false;
        }
        
        // Check if current time is within 5 minutes of run_time
        const runTimeParts = setting.run_time.split(':');
        const runTimeHour = parseInt(runTimeParts[0]);
        const runTimeMinute = parseInt(runTimeParts[1]);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const timeDiffMinutes = Math.abs(
          (runTimeHour * 60 + runTimeMinute) - (currentHour * 60 + currentMinute)
        );
        
        return timeDiffMinutes <= 5;
      }
      
      // For one-time automations
      if (setting.frequency === 'once') {
        return !setting.last_run;
      }
      
      return false;
    });
    
    return dueAutomations;
  } catch (error) {
    console.error("Error getting due automations:", error);
    await logMessage(LogLevel.ERROR, LOG_SOURCE, `Error getting due automations: ${error}`);
    return [];
  }
}

/**
 * Execute an automation run for a specific automation setting
 */
export async function executeAutomation(automation: AutomatedCallSettings): Promise<void> {
  try {
    // Create a new run record
    const [run] = await db.insert(automatedCallRuns).values({
      settings_id: automation.id,
      status: AutomationStatus.RUNNING,
    }).returning();
    
    if (!run) {
      throw new Error(`Failed to create automation run record for automation ${automation.id}`);
    }
    
    await logMessage(LogLevel.INFO, LOG_SOURCE, `Starting automation run ${run.id} for automation ${automation.name}`);
    
    try {
      // Get eligible leads based on automation settings
      const eligibleLeads = await getEligibleLeads(automation);
      
      // Track metrics
      let processedCount = 0;
      let initiatedCount = 0;
      let failedCount = 0;
      
      // Process up to max_calls_per_run leads
      const maxCalls = automation.max_calls_per_run;
      const leadsToProcess = eligibleLeads.slice(0, maxCalls);
      
      // Set the webhook base URL (assumption, may need to be adjusted)
      const hostEnv = process.env.HOST_URL || 'localhost:5000';
      const protocol = hostEnv.includes('localhost') ? 'http' : 'https';
      const webhookBaseUrl = `${protocol}://${hostEnv}`;
      
      // Process each lead
      for (const lead of leadsToProcess) {
        processedCount++;
        
        try {
          console.log(`Initiating automated call to ${lead.full_name} (${lead.phone_number})`);
          
          // Initiate the call
          const call = await initiateOutboundCall(
            automation.agent_id,
            lead.phone_number,
            webhookBaseUrl
          );
          
          if (call && call.sid) {
            // Update lead status to "contacted"
            await db.execute(sql`
              UPDATE leads SET 
                status = ${LeadStatus.CONTACTED},
                last_contacted = NOW()
              WHERE id = ${lead.id}
            `);
            
            initiatedCount++;
            
            await logMessage(
              LogLevel.INFO, 
              LOG_SOURCE, 
              `Automated call initiated: ${call.sid} to ${lead.full_name} (${lead.phone_number})`
            );
          } else {
            failedCount++;
            await logMessage(
              LogLevel.ERROR, 
              LOG_SOURCE, 
              `Failed to initiate automated call to ${lead.full_name} (${lead.phone_number})`
            );
          }
          
          // Add a small delay between calls to avoid overwhelming the Twilio API
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (callError) {
          failedCount++;
          await logMessage(
            LogLevel.ERROR, 
            LOG_SOURCE, 
            `Error during automated call to ${lead.full_name}: ${callError}`
          );
        }
      }
      
      // Update the run record with results
      await db.update(automatedCallRuns)
        .set({
          end_time: new Date(),
          status: AutomationStatus.COMPLETED,
          leads_processed: processedCount,
          calls_initiated: initiatedCount,
          calls_failed: failedCount,
        })
        .where(sql`id = ${run.id}`);
      
      // Update the automation last_run and next_run times
      await updateAutomationSchedule(automation);
      
      await logMessage(
        LogLevel.INFO, 
        LOG_SOURCE, 
        `Completed automation run ${run.id}: Processed ${processedCount}, Initiated ${initiatedCount}, Failed ${failedCount}`
      );
      
    } catch (runError) {
      // Update run record with error
      await db.update(automatedCallRuns)
        .set({
          end_time: new Date(),
          status: AutomationStatus.FAILED,
          error_message: runError instanceof Error ? runError.message : String(runError),
        })
        .where(sql`id = ${run.id}`);
      
      // Log the error
      await logMessage(
        LogLevel.ERROR, 
        LOG_SOURCE, 
        `Error in automation run ${run.id}: ${runError}`
      );
      
      // Rethrow so the parent function knows there was an error
      throw runError;
    }
    
  } catch (error) {
    console.error(`Error executing automation ${automation.id} (${automation.name}):`, error);
    await logMessage(
      LogLevel.ERROR, 
      LOG_SOURCE, 
      `Error executing automation ${automation.id} (${automation.name}): ${error}`
    );
  }
}

/**
 * Calculate and update the next scheduled run time for an automation
 */
async function updateAutomationSchedule(automation: AutomatedCallSettings): Promise<void> {
  try {
    const now = new Date();
    let nextRun: Date | null = null;
    
    // Calculate next run time based on frequency
    switch (automation.frequency) {
      case 'daily':
        // Next run is tomorrow at the same time
        nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + 1);
        setTimeFromString(nextRun, automation.run_time);
        break;
        
      case 'weekly':
        if (automation.run_days && automation.run_days.length > 0) {
          // Find the next day from run_days that's after today
          const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          const currentDayIndex = now.getDay();
          
          // Convert run_days strings to day indices
          const runDayIndices = automation.run_days.map(day => daysOfWeek.indexOf(day));
          
          // Sort indices
          runDayIndices.sort((a, b) => a - b);
          
          // Find the next day index after the current day
          let nextDayIndex = runDayIndices.find(day => day > currentDayIndex);
          
          if (nextDayIndex !== undefined) {
            // Found a day later this week
            const daysToAdd = nextDayIndex - currentDayIndex;
            nextRun = new Date(now);
            nextRun.setDate(nextRun.getDate() + daysToAdd);
          } else {
            // Wrap around to the first day next week
            nextDayIndex = runDayIndices[0];
            const daysToAdd = 7 - currentDayIndex + nextDayIndex;
            nextRun = new Date(now);
            nextRun.setDate(nextRun.getDate() + daysToAdd);
          }
          
          // Set the time
          setTimeFromString(nextRun, automation.run_time);
        }
        break;
        
      case 'once':
        // No next run for one-time automations
        nextRun = null;
        break;
    }
    
    // Update the automation record
    await db.update(automatedCallSettings)
      .set({
        last_run: now,
        next_run: nextRun,
        updated_at: now,
      })
      .where(sql`id = ${automation.id}`);
      
  } catch (error) {
    console.error(`Error updating automation schedule for ${automation.id}:`, error);
    await logMessage(
      LogLevel.ERROR, 
      LOG_SOURCE, 
      `Error updating automation schedule for ${automation.id}: ${error}`
    );
  }
}

/**
 * Helper to set time on a Date object from a string in format "HH:MM"
 */
function setTimeFromString(date: Date, timeString: string): void {
  const [hours, minutes] = timeString.split(':').map(Number);
  
  if (!isNaN(hours) && !isNaN(minutes)) {
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
  }
}

/**
 * Get eligible leads for an automation based on its settings
 */
async function getEligibleLeads(automation: AutomatedCallSettings) {
  try {
    // Query for leads that:
    // 1. Belong to the user_id of the automation
    // 2. Have a status that's in the automation's lead_statuses array
    // 3. Have either never been contacted, or haven't been contacted in the last 24 hours
    
    const leads = await db.query.leads.findMany({
      where: (lead, { and, eq, inArray, or, isNull, lt }) => and(
        eq(lead.user_id, automation.user_id),
        inArray(lead.status, automation.lead_statuses),
        or(
          isNull(lead.last_contacted),
          lt(lead.last_contacted, new Date(Date.now() - 24 * 60 * 60 * 1000)) // 24 hours ago
        )
      ),
      orderBy: (lead, { asc }) => [
        asc(lead.last_contacted),
        asc(lead.created_at)
      ]
    });
    
    return leads;
  } catch (error) {
    console.error(`Error getting eligible leads for automation ${automation.id}:`, error);
    await logMessage(
      LogLevel.ERROR, 
      LOG_SOURCE, 
      `Error getting eligible leads for automation ${automation.id}: ${error}`
    );
    return [];
  }
}

/**
 * Scheduler function that checks for and runs due automations
 * This should be called periodically (e.g., every 5 minutes)
 */
export async function runAutomationScheduler(): Promise<void> {
  try {
    // Check if there are any automations due to run
    const dueAutomations = await getDueAutomations();
    
    if (dueAutomations.length === 0) {
      // No automations due, nothing to do
      return;
    }
    
    console.log(`Found ${dueAutomations.length} automations due to run`);
    await logMessage(LogLevel.INFO, LOG_SOURCE, `Starting execution of ${dueAutomations.length} due automations`);
    
    // Execute each automation
    for (const automation of dueAutomations) {
      try {
        await executeAutomation(automation);
      } catch (error) {
        // Log but continue with other automations
        console.error(`Error executing automation ${automation.id} (${automation.name}):`, error);
        await logMessage(
          LogLevel.ERROR, 
          LOG_SOURCE, 
          `Error executing automation ${automation.id} (${automation.name}): ${error}`
        );
      }
    }
    
    await logMessage(LogLevel.INFO, LOG_SOURCE, `Completed execution of ${dueAutomations.length} automations`);
  } catch (error) {
    console.error("Error in automation scheduler:", error);
    await logMessage(LogLevel.ERROR, LOG_SOURCE, `Error in automation scheduler: ${error}`);
  }
}