/**
 * Simple Agent Deletion Functionality
 * 
 * This module provides a direct database-level approach to delete agents
 * that bypasses the ORM and directly uses SQL transactions to ensure
 * proper cleanup of all related records.
 */

import { pool } from './db';
import { LogLevel } from '@shared/schema';
import { QueryResult } from 'pg';

/**
 * Delete all automation settings for a specific agent
 * 
 * @param agentId The ID of the agent
 * @returns Result of the deletion operation
 */
export async function deleteAutomationSettingsForAgent(agentId: number): Promise<{
  success: boolean;
  deleted: number;
}> {
  try {
    console.log(`Deleting all automation settings for agent ${agentId}`);
    
    // First, find all automation settings that use this agent
    const settingsResult = await pool.query(
      'SELECT id FROM automated_call_settings WHERE agent_id = $1',
      [agentId]
    );
    
    if (!settingsResult.rows || settingsResult.rows.length === 0) {
      console.log(`No automation settings found for agent ${agentId}`);
      return { success: true, deleted: 0 };
    }
    
    const settingIds = settingsResult.rows.map(row => row.id);
    console.log(`Found ${settingIds.length} automation settings to delete: ${settingIds.join(', ')}`);
    
    // Delete all related automation runs first
    await pool.query(
      'DELETE FROM automated_call_runs WHERE settings_id IN (SELECT id FROM automated_call_settings WHERE agent_id = $1)',
      [agentId]
    );
    
    // Now delete the settings themselves
    const deleteResult = await pool.query(
      'DELETE FROM automated_call_settings WHERE agent_id = $1',
      [agentId]
    );
    
    return {
      success: true,
      deleted: deleteResult.rowCount || 0
    };
  } catch (error) {
    console.error(`Error deleting automation settings for agent ${agentId}:`, error);
    return {
      success: false,
      deleted: 0
    };
  }
}

/**
 * Delete an agent directly using transactions to ensure proper cleanup
 * 
 * @param agentId The ID of the agent to delete
 * @returns Result of the deletion operation
 */
export async function simpleDeleteAgent(agentId: number): Promise<{
  success: boolean;
  message: string;
}> {
  // Get a client from the pool for transaction
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log(`Starting simple delete transaction for agent ${agentId}`);
    
    // First, delete all related automation settings and runs
    await client.query(`
      DELETE FROM automated_call_runs 
      WHERE settings_id IN (SELECT id FROM automated_call_settings WHERE agent_id = $1)
    `, [agentId]);
    
    await client.query(`
      DELETE FROM automated_call_settings 
      WHERE agent_id = $1
    `, [agentId]);
    
    // Release any assigned phone numbers
    await client.query(`
      UPDATE purchased_phone_numbers 
      SET assigned_to_agent_id = NULL 
      WHERE assigned_to_agent_id = $1
    `, [agentId]);
    
    // Remove any API metrics linked to this agent
    await client.query(`
      DELETE FROM api_metrics 
      WHERE agent_id = $1
    `, [agentId]);
    
    // Remove any calls linked to this agent
    await client.query(`
      DELETE FROM calls 
      WHERE agent_id = $1
    `, [agentId]);
    
    // Finally delete the agent itself
    const deleteResult = await client.query(`
      DELETE FROM user_agents 
      WHERE id = $1 
      RETURNING id, name
    `, [agentId]);
    
    // If nothing was deleted, the agent didn't exist
    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: `Agent ${agentId} not found or could not be deleted`
      };
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    const agentName = deleteResult.rows[0]?.name || `Agent #${agentId}`;
    return {
      success: true,
      message: `Successfully deleted agent "${agentName}" (ID: ${agentId})`
    };
  } catch (error) {
    // If anything goes wrong, roll back the transaction
    await client.query('ROLLBACK');
    console.error(`Simple delete transaction failed for agent ${agentId}:`, error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during deletion'
    };
  } finally {
    // Release the client back to the pool
    client.release();
  }
}