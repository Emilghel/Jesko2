/**
 * User ID Verification Script
 * 
 * This script checks if a specific user ID exists in the database
 * and provides details about their authentication tokens.
 * 
 * Run with: node check-user-id.js [userId]
 */

import { pool } from './server/db.js';

async function checkUserId(userId) {
  console.log(`Checking database for user ID: ${userId}`);
  
  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, username, email, "displayName", "isAdmin", "lastLogin" FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User ID ${userId} does not exist in the database`);
    } else {
      const user = userResult.rows[0];
      console.log(`✅ User ID ${userId} exists:`);
      console.log(user);
      
      // Check for tokens
      const tokenResult = await pool.query(
        'SELECT token, expires_at FROM auth_tokens WHERE user_id = $1',
        [userId]
      );
      
      if (tokenResult.rows.length === 0) {
        console.log(`No tokens found for user ID ${userId}`);
      } else {
        console.log(`Found ${tokenResult.rows.length} tokens for user ID ${userId}:`);
        tokenResult.rows.forEach((token, index) => {
          const expiry = new Date(token.expires_at);
          const isExpired = expiry < new Date();
          console.log(`Token ${index + 1}: ${token.token.substring(0, 10)}... expires: ${expiry.toISOString()} ${isExpired ? '(EXPIRED)' : '(VALID)'}`);
        });
      }
    }
    
    // List all available users (top 10)
    const allUsersResult = await pool.query(
      'SELECT id, username, email FROM users ORDER BY id LIMIT 10'
    );
    
    console.log('\nAvailable Users (first 10):');
    allUsersResult.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
    });
    
    // Count total users
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\nTotal users in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Database query error:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Get userId from command line argument or use default 20
const userId = process.argv[2] || 20;
checkUserId(parseInt(userId));