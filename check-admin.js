/**
 * Check admin user status
 */

import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

async function checkAdminUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('Checking admin user status...');
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@warmleadnetwork.com']);
    
    if (result.rows.length === 0) {
      console.log('Admin user not found!');
      return;
    }
    
    const admin = result.rows[0];
    console.log('Admin user details:');
    console.log(`ID: ${admin.id}`);
    console.log(`Username: ${admin.username}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Is Admin: ${admin.is_admin}`);
    
    // To set the user as admin if not already
    if (!admin.is_admin) {
      console.log('Updating user to have admin privileges...');
      await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [admin.id]);
      console.log('Admin privileges granted.');
    } else {
      console.log('User already has admin privileges.');
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
  } finally {
    await pool.end();
  }
}

checkAdminUser();