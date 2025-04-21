const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateAdminPassword(email, password) {
  try {
    // Check if email and password were provided
    if (!email || !password) {
      console.error('Usage: node update-password.cjs <email> <new_password>');
      process.exit(1);
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the existing user
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, username, email, display_name as "displayName", is_admin as "isAdmin"',
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('Admin password updated successfully!');
      console.log('Admin user details:', result.rows[0]);
    } else {
      console.log('User not found with email:', email);
    }
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await pool.end();
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];

// Run the update function
updateAdminPassword(email, password);
