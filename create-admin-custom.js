/**
 * Create Admin User with Custom Password
 * 
 * This script creates or updates an admin user account with
 * the specified credentials.
 */

import pg from 'pg';
const { Pool } = pg;
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
  // Create a new pool for direct database access
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Credentials
    const email = 'admin@warmleadnetwork.com';
    const password = 'emilwln34';
    const username = 'admin';
    const displayName = 'Admin User';
    
    console.log(`Creating/updating admin user with email: ${email}`);
    
    // First check if admin user already exists
    const checkResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (checkResult.rows.length > 0) {
      console.log('Admin user already exists. Updating password and admin status...');
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update the existing user with new password, ensure admin status, and set coins to 1000
      await pool.query(
        'UPDATE users SET password = $1, is_admin = true, coins = 1000 WHERE email = $2',
        [hashedPassword, email]
      );
      
      console.log('Admin password updated successfully!');
    } else {
      console.log('Creating new admin user...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new admin user
      await pool.query(
        'INSERT INTO users (username, email, password, display_name, is_admin, created_at, last_login, coins) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)',
        [username, email, hashedPassword, displayName, true, 1000]  // Give admin 1000 coins
      );
      
      console.log('Admin user created successfully!');
    }
    
    // Verify the admin user exists
    const result = await pool.query(
      'SELECT id, username, email, display_name as "displayName", is_admin as "isAdmin", coins FROM users WHERE email = $1', 
      [email]
    );
    console.log('Admin user details:', result.rows[0]);
    
  } catch (error) {
    console.error('Error creating/updating admin user:', error);
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

createAdminUser();