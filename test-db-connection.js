/**
 * Database Connection Tester
 * 
 * This script tests the connection to the PostgreSQL database
 * and reports any issues it encounters.
 */
const { Pool } = require('pg');

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  // Check if DATABASE_URL is defined
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not defined.');
    console.log('Make sure to set DATABASE_URL in your Render.com environment variables.');
    process.exit(1);
  }

  // Create a database pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // Set a short timeout to quickly detect connection issues
    connectionTimeoutMillis: 5000
  });

  try {
    // Test the connection by executing a simple query
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // Get PostgreSQL server version
    const versionResult = await client.query('SELECT version()');
    console.log('Database connection successful!');
    console.log('PostgreSQL version:', versionResult.rows[0].version);
    
    // Check if any tables exist in the database
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('Warning: No tables found in the database. The database may be empty.');
    } else {
      console.log(`Found ${tablesResult.rows.length} tables in the database:`);
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    console.log('Database connection test completed successfully.');
    client.release();
  } catch (err) {
    console.error('Database connection error:', err.message);
    
    // Provide more helpful error messages based on common issues
    if (err.message.includes('password authentication failed')) {
      console.error('The username or password in your DATABASE_URL is incorrect.');
    } else if (err.message.includes('does not exist')) {
      console.error('The specified database does not exist. Check your DATABASE_URL.');
    } else if (err.message.includes('Connection timed out')) {
      console.error('Connection timed out. Verify your database is running and accessible from Render.com.');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
      console.error('Could not resolve the database hostname. Check your DATABASE_URL.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabaseConnection().catch(err => {
  console.error('Unhandled error in test script:', err);
  process.exit(1);
});