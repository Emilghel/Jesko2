/**
 * Create Admin User
 * 
 * This script creates or updates an admin user account.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';
import crypto from 'crypto';

// Configure Neon to use the ws package for WebSockets
neonConfig.webSocketConstructor = ws;

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Admin credentials
    const email = 'admin@warmleadnetwork.com';
    const username = 'admin';
    const password = 'admin123'; // Simple password for testing
    const displayName = 'System Administrator';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if admin user already exists
    const { rows: existingUsers } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    let userId;
    
    if (existingUsers.length > 0) {
      // Update existing admin user
      userId = existingUsers[0].id;
      console.log(`Admin user already exists with ID ${userId}, updating password...`);
      
      await pool.query(
        'UPDATE users SET password = $1, is_admin = true, display_name = $2, username = $3 WHERE id = $4',
        [hashedPassword, displayName, username, userId]
      );
      
      console.log('Admin user updated successfully');
    } else {
      // Create new admin user
      console.log('Creating new admin user...');
      
      const { rows } = await pool.query(
        `INSERT INTO users (
          email, 
          username, 
          password, 
          display_name, 
          is_admin, 
          created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, NOW()) 
        RETURNING id`,
        [email, username, hashedPassword, displayName, true]
      );
      
      userId = rows[0].id;
      console.log(`Admin user created with ID ${userId}`);
    }
    
    // Create an auth token for the admin
    const token = crypto.randomBytes(32).toString('base64');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days
    
    // Delete any existing tokens for this user
    await pool.query('DELETE FROM auth_tokens WHERE user_id = $1', [userId]);
    
    // Insert new token
    await pool.query(
      `INSERT INTO auth_tokens (
        user_id,
        token,
        created_at,
        expires_at
      ) VALUES ($1, $2, NOW(), $3)`,
      [userId, token, expiresAt]
    );
    
    console.log(`\nAdmin login credentials:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`\nAdmin auth token (valid for 7 days):`);
    console.log(token);
    
    // Close the database connection
    await pool.end();
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Run the function
createAdminUser();