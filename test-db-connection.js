/**
 * Database Connection Test
 * 
 * This script tests the connection to the PostgreSQL database specified in the
 * DATABASE_URL environment variable. It's useful for verifying database connectivity
 * during deployment setup or when diagnosing connection issues.
 * 
 * Usage: node test-db-connection.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config();

const { Pool } = pg;

async function testDatabaseConnection() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set.');
    console.error('Please set the DATABASE_URL environment variable to your PostgreSQL connection string.');
    process.exit(1);
  }
  
  console.log('🔍 Testing database connection...');
  console.log(`DATABASE_URL format: ${maskConnectionString(process.env.DATABASE_URL)}`);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // SSL settings for some providers like Heroku or Render
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Test connection
    const client = await pool.connect();
    
    // Get PostgreSQL version
    const versionRes = await client.query('SELECT version()');
    const version = versionRes.rows[0].version;
    
    console.log('✅ Successfully connected to the database!');
    console.log(`📊 PostgreSQL server version: ${version}`);
    
    // Check table count
    const tablesRes = await client.query(`
      SELECT count(*) FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tableCount = parseInt(tablesRes.rows[0].count, 10);
    
    console.log(`📋 Number of tables in public schema: ${tableCount}`);
    
    // Close connection
    client.release();
    await pool.end();
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to the database:');
    console.error(error.message);
    
    // Provide more specific error messages based on common issues
    if (error.message.includes('password authentication failed')) {
      console.error('\n👉 HINT: The username or password in your DATABASE_URL is incorrect.');
    } else if (error.message.includes('does not exist')) {
      console.error('\n👉 HINT: The database name in your DATABASE_URL might not exist. Check the database name or create it first.');
    } else if (error.message.includes('connect ECONNREFUSED')) {
      console.error('\n👉 HINT: Could not reach the database server. Check the host and port in your DATABASE_URL.');
    } else if (error.message.includes('no pg_hba.conf entry')) {
      console.error('\n👉 HINT: Your IP address is not allowed to connect to the database. Update the firewall rules on your database server.');
    }
    
    return false;
  }
}

// Helper function to mask sensitive parts of the connection string
function maskConnectionString(connectionString) {
  try {
    // This will not modify the original string, just creates a masked version for display
    return connectionString
      .replace(/:(.*?)@/, ':****@')  // Mask password
      .replace(/\/([^?/]*)/, '/****'); // Mask database name
  } catch (e) {
    return 'Invalid connection string format';
  }
}

// Run the test if this script is executed directly
if (process.argv[1].includes('test-db-connection')) {
  testDatabaseConnection()
    .then(success => {
      if (!success) {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

export default testDatabaseConnection;