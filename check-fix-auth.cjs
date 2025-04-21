/**
 * Authentication/User Check and Fix Script
 * 
 * This script checks for database user availability and handles user token issues
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize DB connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkAndFixAuthIssues() {
  try {
    console.log("=== Authentication Issue Diagnosis ===");
    
    // 1. Check if user ID 20 exists
    console.log("\nChecking for user ID 20...");
    const userResult = await pool.query(
      'SELECT id, username, email, display_name, last_login FROM users WHERE id = $1',
      [20]
    );
    
    if (userResult.rows.length === 0) {
      console.log("❌ User ID 20 does not exist in the database");
      
      // Check for any tokens for non-existent user
      const tokenResult = await pool.query(
        'SELECT token, expires_at FROM auth_tokens WHERE user_id = $1',
        [20]
      );
      
      if (tokenResult.rows.length > 0) {
        console.log(`Found ${tokenResult.rows.length} tokens for non-existent user ID 20. These should be removed.`);
        
        // Remove invalid tokens
        const deleteResult = await pool.query(
          'DELETE FROM auth_tokens WHERE user_id = $1 RETURNING token',
          [20]
        );
        
        console.log(`✅ Removed ${deleteResult.rowCount} invalid tokens for non-existent user.`);
      } else {
        console.log("No tokens found for non-existent user ID 20.");
      }
    } else {
      console.log("✅ User ID 20 exists:", userResult.rows[0]);
    }
    
    // 2. Show available users (top 10)
    console.log("\nAvailable Users (first 10):");
    const usersResult = await pool.query(
      'SELECT id, username, email FROM users ORDER BY id LIMIT 10'
    );
    
    usersResult.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
    });
    
    // 3. Count active tokens
    const tokensCountResult = await pool.query('SELECT COUNT(*) FROM auth_tokens');
    console.log(`\nTotal active tokens in database: ${tokensCountResult.rows[0].count}`);
    
    // 4. Remove expired tokens
    const now = new Date();
    const expiredTokensResult = await pool.query(
      'DELETE FROM auth_tokens WHERE expires_at < $1 RETURNING token',
      [now]
    );
    
    if (expiredTokensResult.rowCount > 0) {
      console.log(`✅ Cleaned up ${expiredTokensResult.rowCount} expired tokens`);
    } else {
      console.log("No expired tokens found to clean up");
    }
    
    console.log("\n=== Authentication Diagnostics Complete ===");
    
  } catch (error) {
    console.error("Database error:", error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the diagnostics
checkAndFixAuthIssues();