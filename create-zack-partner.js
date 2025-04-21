/**
 * Create Zack Partner Account with Specific Password
 * 
 * This script creates or updates a partner account with the email zack@partner.com
 * and the specified password.
 */

import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createZackPartner() {
  try {
    console.log("Creating or updating Zack partner account...");
    
    // User defined credentials
    const email = 'zack@partner.com';
    const password = 'zackwln34';
    const displayName = 'Zack Partner';
    const companyName = 'Zack Media Solutions';
    
    // Check if user already exists
    let result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    let userId;
    
    if (result.rows.length === 0) {
      // Create new user
      console.log(`Creating new user with email: ${email}`);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert new user
      const userResult = await pool.query(
        `INSERT INTO users 
        (username, email, password, display_name, is_admin, coins, created_at, last_login) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          email.split('@')[0], // username from email
          email,
          hashedPassword,
          displayName,
          false, // not admin
          500, // initial coins
          new Date(),
          new Date()
        ]
      );
      
      userId = userResult.rows[0].id;
      console.log(`Created user with ID: ${userId}`);
    } else {
      // User exists, update password
      userId = result.rows[0].id;
      console.log(`User exists with ID: ${userId}, updating password`);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update user password
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, userId]
      );
      
      console.log(`Updated password for user ID: ${userId}`);
    }
    
    // Check if partner record exists
    result = await pool.query(
      'SELECT id FROM partners WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create partner record
      console.log(`Creating partner record for user ID: ${userId}`);
      
      // Generate a referral code
      const referralCode = 'ZACK2025';
      
      // Insert partner record
      const partnerResult = await pool.query(
        `INSERT INTO partners
        (user_id, company_name, contact_name, referral_code, commission_rate, status, 
         created_at, earnings_balance, total_earnings, website, bio)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          userId,
          companyName,
          displayName,
          referralCode,
          0.25, // 25% commission
          'ACTIVE', // active status
          new Date(),
          0, // initial earnings
          0, // total earnings
          'https://zackmedia.com',
          'Zack Media Solutions - Partner Account'
        ]
      );
      
      const partnerId = partnerResult.rows[0].id;
      console.log(`Created partner with ID: ${partnerId}`);
    } else {
      // Partner exists, update to active
      const partnerId = result.rows[0].id;
      console.log(`Partner exists with ID: ${partnerId}, updating status`);
      
      // Update partner status to active
      await pool.query(
        'UPDATE partners SET status = $1 WHERE id = $2',
        ['ACTIVE', partnerId]
      );
      
      console.log(`Updated partner status to ACTIVE for partner ID: ${partnerId}`);
    }
    
    console.log("\nZack Partner Account Setup Complete:");
    console.log("========================================");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Company: ${companyName}`);
    console.log("========================================");
    console.log("You can now login using these credentials.");
    
  } catch (error) {
    console.error('Error creating Zack partner:', error);
  } finally {
    // Close database connection
    pool.end();
  }
}

// Run the function
createZackPartner()
  .catch(error => {
    console.error('Top-level error:', error);
    process.exit(1);
  });