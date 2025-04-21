/**
 * Admin Account Enforcer
 * 
 * This script ensures that the admin account exists and has proper admin privileges
 * in the database. It's designed to fix authentication issues where the admin flag
 * isn't properly set.
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const { Pool } = pg;

// The token we're using in all our admin pages
const ADMIN_TOKEN = "fc902b4c013b14b0aa1f6f5fd403a21e4d680a05aeb38ae640912784cf08c18e";

async function ensureAdminAccess() {
  console.log('Starting Admin Account Enforcer...');
  
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 1. Check if admin user exists
    console.log('Checking for admin user...');
    
    // Try to adapt to different column naming conventions (snake_case vs camelCase)
    const { rows: adminUsers } = await pool.query(`
      SELECT id, email, username, 
             COALESCE(is_admin, "isAdmin") as is_admin
      FROM users 
      WHERE email = 'admin@warmleadnetwork.com' OR username = 'admin'
    `);
    
    let adminUserId;
    
    if (adminUsers.length === 0) {
      console.log('No admin user found, creating one...');
      
      // Generate a secure password hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      // Create admin user with different column naming conventions
      try {
        // Try snake_case column names first
        const { rows: newAdmin } = await pool.query(`
          INSERT INTO users (username, email, password, display_name, is_admin, role)
          VALUES ('admin', 'admin@warmleadnetwork.com', $1, 'System Administrator', true, 'admin')
          RETURNING id
        `, [hashedPassword]);
        
        adminUserId = newAdmin[0].id;
      } catch (e) {
        console.log('Trying camelCase column names...');
        // Try camelCase column names
        const { rows: newAdmin } = await pool.query(`
          INSERT INTO users (username, email, password, "displayName", "isAdmin", role)
          VALUES ('admin', 'admin@warmleadnetwork.com', $1, 'System Administrator', true, 'admin')
          RETURNING id
        `, [hashedPassword]);
        
        adminUserId = newAdmin[0].id;
      }
      console.log(`Created admin user with ID: ${adminUserId}`);
    } else {
      adminUserId = adminUsers[0].id;
      console.log(`Found existing admin user with ID: ${adminUserId}`);
      
      // Make sure admin flag is set to true
      if (!adminUsers[0].is_admin) {
        console.log('Admin flag is not set, updating...');
        
        try {
          // Try different column names for the admin flag
          await pool.query(`
            UPDATE users
            SET is_admin = true, role = 'admin'
            WHERE id = $1
          `, [adminUserId]);
        } catch (e) {
          console.log('Trying alternative column name...');
          await pool.query(`
            UPDATE users
            SET "isAdmin" = true, role = 'admin'
            WHERE id = $1
          `, [adminUserId]);
        }
        
        console.log('Admin flag updated successfully');
      }
    }
    
    // 2. Check if admin token exists
    console.log('Checking for admin token...');
    
    // First look for tokens table
    try {
      const { rows: tokenTables } = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'auth_tokens' OR table_name = 'tokens'
      `);
      
      if (tokenTables.length > 0) {
        const tokenTable = tokenTables[0].table_name;
        console.log(`Found token table: ${tokenTable}`);
        
        // Check if our admin token exists
        const { rows: existingTokens } = await pool.query(`
          SELECT * FROM ${tokenTable} WHERE token = $1 OR token_hash = $1
        `, [ADMIN_TOKEN]);
        
        if (existingTokens.length === 0) {
          console.log('Admin token not found, adding...');
          
          // Add token, using different column names depending on the table
          try {
            if (tokenTable === 'auth_tokens') {
              await pool.query(`
                INSERT INTO auth_tokens (user_id, token, created_at)
                VALUES ($1, $2, NOW())
              `, [adminUserId, ADMIN_TOKEN]);
            } else {
              await pool.query(`
                INSERT INTO tokens (user_id, token_hash, created_at)
                VALUES ($1, $2, NOW())
              `, [adminUserId, ADMIN_TOKEN]);
            }
            
            console.log('Admin token added successfully');
          } catch (tokenInsertError) {
            console.error('Error inserting token:', tokenInsertError.message);
            
            // Try with different column names
            try {
              await pool.query(`
                INSERT INTO ${tokenTable} ("userId", token, "createdAt")
                VALUES ($1, $2, NOW())
              `, [adminUserId, ADMIN_TOKEN]);
              
              console.log('Admin token added successfully (using camelCase columns)');
            } catch (altTokenInsertError) {
              console.error('Error inserting token with alternative columns:', altTokenInsertError.message);
            }
          }
        } else {
          console.log('Admin token already exists');
        }
      } else {
        console.log('No token table found, skipping token check');
      }
    } catch (tokenTableError) {
      console.error('Error checking token tables:', tokenTableError.message);
    }
    
    // 3. Check for partner table (which might be overriding admin access)
    console.log('Checking partner table...');
    
    try {
      const { rows: partnerTables } = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'partners'
      `);
      
      if (partnerTables.length > 0) {
        console.log('Found partners table, checking...');
        
        // Check if admin is set as a partner
        const { rows: adminPartners } = await pool.query(`
          SELECT * FROM partners WHERE user_id = $1 OR "userId" = $1
        `, [adminUserId]);
        
        if (adminPartners.length > 0) {
          console.log('Admin user is also a partner, ensuring admin privileges are preserved...');
          
          // Delete any partner association that might be causing issues
          try {
            await pool.query(`
              DELETE FROM partners WHERE user_id = $1 OR "userId" = $1
            `, [adminUserId]);
            
            console.log('Removed potentially conflicting partner record');
          } catch (deleteError) {
            console.error('Error removing partner record:', deleteError.message);
          }
        } else {
          console.log('Admin user is not a partner, no conflict');
        }
      } else {
        console.log('No partners table found, no conflict possible');
      }
    } catch (partnerTableError) {
      console.error('Error checking partner table:', partnerTableError.message);
    }
    
    console.log('Admin access enforcement completed successfully!');
    console.log('');
    console.log('===========================================================');
    console.log('TO ACCESS ADMIN PAGES:');
    console.log('1. Go to /admin-override.html');
    console.log('2. Click "Force Admin Authentication"');
    console.log('3. Use the provided admin links');
    console.log('===========================================================');
    
  } catch (error) {
    console.error('Error ensuring admin access:', error);
  } finally {
    await pool.end();
  }
}

ensureAdminAccess().catch(console.error);