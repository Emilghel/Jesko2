/**
 * Direct Database Operations
 * 
 * This file contains functions that interact directly with the database
 * for emergency operations like agent deletion. These functions bypass
 * the normal ORM and storage interfaces and should ONLY be used when
 * absolutely necessary for fixing critical issues.
 */

import pg from 'pg';
import { db } from './db';
import { sql } from 'drizzle-orm';

const { Pool } = pg;

// Define LogLevel enum if not already defined elsewhere
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Simple logging function that works without the full logging module
async function logMessage(level: LogLevel, category: string, message: string): Promise<void> {
  console.log(`[${level.toUpperCase()}] [${category}] ${message}`);
  
  try {
    // Also log to database if possible
    await db.execute(sql`
      INSERT INTO logs (level, category, message)
      VALUES (${level}, ${category}, ${message})
    `);
  } catch (error) {
    // If database logging fails, just continue with console logging
    console.error('Failed to write log to database:', error);
  }
}

/**
 * Direct database pool for emergency operations
 */
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // More aggressive timeouts to prevent hanging
  statement_timeout: 30000, // 30 seconds
  query_timeout: 30000 // 30 seconds
});

/**
 * Emergency database delete of an agent with all its dependencies
 * 
 * This function directly deletes an agent from the database using SQL
 * bypassing all standard deletion paths and constraints
 * 
 * @param agentId The ID of the agent to delete
 * @param userId The ID of the user who owns the agent
 * @returns Result of the deletion operation
 */
export async function directDatabaseDeleteAgent(agentId: number, userId: number): Promise<{
  success: boolean;
  message: string;
  deletedTables?: string[];
}> {
  const client = await pool.connect();
  
  try {
    // Log the emergency operation
    console.log(`🚨 EMERGENCY DIRECT DB DELETE: Starting for agent ${agentId} of user ${userId}`);
    await logMessage(LogLevel.WARN, 'Maintenance', `Emergency direct DB deletion of agent ${agentId} initiated for user ${userId}`);
    
    // Start a transaction to ensure atomicity
    await client.query('BEGIN');
    
    // First verify ownership of the agent to prevent unauthorized deletion
    const ownerCheck = await client.query(
      'SELECT user_id FROM user_agents WHERE id = $1',
      [agentId]
    );
    
    if (ownerCheck.rows.length === 0) {
      // Agent doesn't exist, so nothing to delete
      await client.query('ROLLBACK');
      return {
        success: true,
        message: `Agent ${agentId} not found in database, considering it already deleted`
      };
    }
    
    if (ownerCheck.rows[0].user_id !== userId) {
      // Not the owner
      await client.query('ROLLBACK');
      return {
        success: false,
        message: `Not authorized: Agent ${agentId} belongs to user ID ${ownerCheck.rows[0].user_id}, not ${userId}`
      };
    }
    
    // Temporarily disable foreign key checks
    await client.query('SET CONSTRAINTS ALL DEFERRED');
    
    // List of tables with possible agent_id foreign keys
    const dependentTables = [
      'automated_call_runs',
      'automated_call_settings',
      'api_metrics',
      'calls',
      'purchased_phone_numbers',
      'referral_clicks',
      'agent_voice_settings',
      'agent_personalities',
      'agent_permissions',
      'agent_messages',
      'agent_logs'
    ];
    
    const deletedTables: string[] = [];
    
    // Delete from all dependent tables first
    for (const table of dependentTables) {
      try {
        const result = await client.query(
          `DELETE FROM ${table} WHERE agent_id = $1`,
          [agentId]
        );
        
        if (result.rowCount > 0) {
          console.log(`Deleted ${result.rowCount} rows from ${table}`);
          deletedTables.push(`${table} (${result.rowCount} rows)`);
        }
      } catch (error) {
        // Log but continue if a particular table fails - it might not exist
        console.warn(`Failed to delete from ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Finally delete the agent itself
    const deleteResult = await client.query(
      'DELETE FROM user_agents WHERE id = $1',
      [agentId]
    );
    
    if (deleteResult.rowCount === 0) {
      // Agent wasn't found or already deleted
      await client.query('ROLLBACK');
      return {
        success: false,
        message: `Agent ${agentId} could not be deleted or doesn't exist`
      };
    }
    
    // Commit the transaction if we got this far
    await client.query('COMMIT');
    
    console.log(`🎉 EMERGENCY DIRECT DB DELETE: Successfully deleted agent ${agentId}`);
    await logMessage(LogLevel.INFO, 'Maintenance', `Emergency direct DB deletion of agent ${agentId} successful`);
    
    return {
      success: true,
      message: `Successfully deleted agent ${agentId} and all related records`,
      deletedTables
    };
    
  } catch (error) {
    // If anything goes wrong, roll back the transaction
    await client.query('ROLLBACK');
    
    console.error(`EMERGENCY DIRECT DB DELETE FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    await logMessage(LogLevel.ERROR, 'Maintenance', `Emergency direct DB deletion of agent ${agentId} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown database error during emergency deletion'
    };
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

/**
 * Check if an agent still exists in the database
 * 
 * @param agentId The ID of the agent to check
 * @returns Whether the agent exists
 */
export async function checkAgentExists(agentId: number): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`SELECT EXISTS(SELECT 1 FROM user_agents WHERE id = ${agentId})`
    );
    
    return result[0]?.exists === true;
  } catch (error) {
    console.error(`Error checking if agent exists: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}