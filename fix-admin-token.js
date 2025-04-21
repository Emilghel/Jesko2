/**
 * Fix Admin Token
 * 
 * This script fixes the admin token format to match what the auth system expects.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import crypto from 'crypto';

// Configure Neon to use the ws package for WebSockets
neonConfig.webSocketConstructor = ws;

async function fixAdminToken() {
  try {
    console.log('Fixing admin token...');
    
    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Check for admin user
    const { rows: adminUsers } = await pool.query(
      'SELECT id, email, username FROM users WHERE is_admin = true ORDER BY id ASC'
    );
    
    if (adminUsers.length === 0) {
      console.log('No admin users found in the database');
      await pool.end();
      return;
    }
    
    const adminUser = adminUsers[0];
    console.log(`Found admin user: ${adminUser.username} (${adminUser.email}) with ID ${adminUser.id}`);
    
    // Generate a new token with the exact format expected by the system
    // The system expects a 64-character token
    const tokenBytes = crypto.randomBytes(32); // 32 bytes = 64 hex chars
    const token = tokenBytes.toString('hex');
    
    console.log(`Generated new token: ${token.substring(0, 10)}...`);
    
    // Set expiration for 7 days in the future
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Delete existing tokens for this user to avoid conflicts
    await pool.query('DELETE FROM auth_tokens WHERE user_id = $1', [adminUser.id]);
    
    // Insert the new token
    await pool.query(
      'INSERT INTO auth_tokens (token, user_id, created_at, expires_at) VALUES ($1, $2, NOW(), $3)',
      [token, adminUser.id, expiresAt]
    );
    
    console.log(`\nAdmin token updated successfully!`);
    console.log(`\nAdmin token details:`);
    console.log(`User: ${adminUser.username} (${adminUser.email})`);
    console.log(`User ID: ${adminUser.id}`);
    console.log(`Token: ${token}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log(`\nTo use this token, include it in the Authorization header as:`);
    console.log(`Authorization: Bearer ${token}`);
    console.log(`\nOr access the admin panel in your browser directly at:`);
    console.log(`/admin-panel-1?token=${token}`);
    
    // Close database connection
    await pool.end();
    
  } catch (error) {
    console.error('Error fixing admin token:', error);
  }
}

// Run the function
fixAdminToken();