// Simple direct database deletion function
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Delete agent directly from database
 * @param {number} agentId - The ID of the agent to delete
 * @returns {Promise<boolean>} - Success status
 */
async function deleteAgentFromDatabase(agentId) {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log(`Direct DB Delete: Deleting agent ${agentId}`);
    
    // Delete dependencies first
    await client.query('DELETE FROM automated_call_runs WHERE agent_id = $1', [agentId]);
    await client.query('DELETE FROM automated_call_settings WHERE agent_id = $1', [agentId]);
    await client.query('DELETE FROM api_metrics WHERE agent_id = $1', [agentId]);
    await client.query('DELETE FROM calls WHERE agent_id = $1', [agentId]);
    await client.query('DELETE FROM purchased_phone_numbers WHERE agent_id = $1', [agentId]);
    await client.query('DELETE FROM referral_clicks WHERE agent_id = $1', [agentId]);
    
    // Finally delete the agent
    const result = await client.query('DELETE FROM agents WHERE id = $1', [agentId]);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log(`Direct DB Delete: Successfully deleted agent ${agentId}`);
    return true;
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error(`Direct DB Delete Error: ${error.message}`);
    return false;
  } finally {
    client.release();
  }
}

module.exports = {
  deleteAgentFromDatabase
};