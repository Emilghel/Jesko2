const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdminUser() {
  try {
    // First check if admin user already exists
    const checkResult = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@warmleadnetwork.com']);
    
    if (checkResult.rows.length > 0) {
      console.log('Admin user already exists. Updating password...');
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash('emilwarm345', 10);
      
      // Update the existing user
      await pool.query(
        'UPDATE users SET password = $1, is_admin = true WHERE email = $2',
        [hashedPassword, 'admin@warmleadnetwork.com']
      );
      
      console.log('Admin password updated successfully!');
    } else {
      console.log('Creating new admin user...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('emilwarm345', 10);
      
      // Create new admin user
      await pool.query(
        'INSERT INTO users (username, email, password, display_name, is_admin, created_at, last_login) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        ['admin', 'admin@warmleadnetwork.com', hashedPassword, 'Admin User', true]
      );
      
      console.log('Admin user created successfully!');
    }
    
    // Verify the admin user exists
    const result = await pool.query('SELECT id, username, email, display_name as "displayName", is_admin as "isAdmin" FROM users WHERE email = $1', ['admin@warmleadnetwork.com']);
    console.log('Admin user details:', result.rows[0]);
    
  } catch (error) {
    console.error('Error creating/updating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();
