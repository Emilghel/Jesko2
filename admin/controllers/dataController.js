const { pool } = require('../../server/db');

// Get all users
async function getUsers(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, username, email, display_name as "displayName", created_at as "createdAt", is_admin as "isAdmin" FROM users ORDER BY id'
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// Get system statistics
async function getSystemStats(req, res) {
  try {
    // Get total user count
    const userCountResult = await pool.query('SELECT COUNT(*) as "userCount" FROM users');
    const userCount = parseInt(userCountResult.rows[0].userCount);
    
    // Get total agents count
    const agentCountResult = await pool.query('SELECT COUNT(*) as "agentCount" FROM user_agents');
    const agentCount = parseInt(agentCountResult.rows[0].agentCount);
    
    // Get total calls count
    const callCountResult = await pool.query('SELECT COUNT(*) as "callCount" FROM calls');
    const callCount = parseInt(callCountResult.rows[0].callCount);
    
    // Get active calls count
    const activeCallCountResult = await pool.query('SELECT COUNT(*) as "activeCallCount" FROM calls WHERE status = $1', ['active']);
    const activeCallCount = parseInt(activeCallCountResult.rows[0].activeCallCount);
    
    // Get site statistics (like member count)
    const siteStatsResult = await pool.query('SELECT name, value, last_updated as "lastUpdated" FROM site_statistics');
    const siteStats = siteStatsResult.rows;
    
    // Get total phone numbers
    const phoneNumberCountResult = await pool.query('SELECT COUNT(*) as "phoneNumberCount" FROM phone_numbers');
    const phoneNumberCount = parseInt(phoneNumberCountResult.rows[0].phoneNumberCount);
    
    // Get system logs (limited to last 100)
    const logsResult = await pool.query(
      'SELECT id, level, source, message, created_at as "createdAt" FROM system_logs ORDER BY created_at DESC LIMIT 100'
    );
    const recentLogs = logsResult.rows;
    
    return res.json({
      userCount,
      agentCount,
      callCount,
      activeCallCount,
      phoneNumberCount,
      siteStats,
      recentLogs
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
}

// Get call history (with pagination)
async function getCallHistory(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) as "totalCount" FROM calls');
    const totalCount = parseInt(countResult.rows[0].totalCount);
    
    // Get calls with pagination
    const result = await pool.query(
      `SELECT c.id, c.phone_from as "phoneFrom", c.phone_to as "phoneTo", 
       c.status, c.duration, c.recording_url as "recordingUrl", 
       c.created_at as "createdAt", c.ended_at as "endedAt",
       u.username as "userName", u.email as "userEmail",
       a.name as "agentName", a.id as "agentId"
       FROM calls c
       LEFT JOIN user_agents a ON c.agent_id = a.id
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    return res.json({
      calls: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    return res.status(500).json({ error: 'Failed to fetch call history' });
  }
}

// Get system logs (with filtering and pagination)
async function getSystemLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const level = req.query.level; // Filter by log level
    const source = req.query.source; // Filter by source
    
    // Build query conditions
    let conditions = [];
    let params = [];
    let paramCount = 1;
    
    if (level) {
      conditions.push(`level = $${paramCount}`);
      params.push(level);
      paramCount++;
    }
    
    if (source) {
      conditions.push(`source = $${paramCount}`);
      params.push(source);
      paramCount++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as "totalCount" FROM system_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].totalCount);
    
    // Get logs with filtering and pagination
    const logQuery = `
      SELECT id, level, source, message, created_at as "createdAt" 
      FROM system_logs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    
    const result = await pool.query(logQuery, [...params, limit, offset]);
    
    return res.json({
      logs: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return res.status(500).json({ error: 'Failed to fetch system logs' });
  }
}

module.exports = {
  getUsers,
  getSystemStats,
  getCallHistory,
  getSystemLogs
};