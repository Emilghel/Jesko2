import { db, pool } from './server/db.js';
import bcrypt from 'bcrypt';

async function createPhilPartner() {
  try {
    console.log('Creating partner account for phil@partner.com...');
    
    // Partner info
    const email = 'phil@partner.com';
    const password = 'Olivia7045';
    const displayName = 'Phil Partner';
    const companyName = 'Phil Partners LLC';
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    let userId;
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      userId = existingUser.rows[0].id;
      await pool.query(
        'UPDATE users SET password = $1, display_name = $2, coins = 500 WHERE id = $3',
        [hashedPassword, displayName, userId]
      );
      console.log('Updated existing user account');
    } else {
      // Create new user
      const userResult = await pool.query(
        'INSERT INTO users (username, email, password, display_name, created_at, last_login, is_admin, coins, profession) VALUES ($1, $2, $3, $4, NOW(), NOW(), false, 500, $5) RETURNING id',
        ['phil', email, hashedPassword, displayName, 'Partner']
      );
      userId = userResult.rows[0].id;
      console.log('Created new user account with ID:', userId);
    }
    
    // Check if partner already exists
    const existingPartner = await pool.query(
      'SELECT * FROM partners WHERE user_id = $1',
      [userId]
    );
    
    if (existingPartner.rows.length > 0) {
      // Update existing partner
      await pool.query(
        'UPDATE partners SET company_name = $1, status = $2 WHERE user_id = $3',
        [companyName, 'active', userId]
      );
      console.log('Updated existing partner account');
    } else {
      // Create new partner
      await pool.query(
        'INSERT INTO partners (user_id, company_name, contact_name, referral_code, commission_rate, earnings_balance, total_earnings, status, created_at, updated_at, bio, website) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9, $10)',
        [userId, companyName, 'Phil', 'PHIL500', 0.20, 0, 0, 'active', 'Partner account with 500 tokens', 'https://philpartners.example.com']
      );
      console.log('Created new partner account for user ID:', userId);
    }
    
    // Create auth token
    await pool.query(
      'INSERT INTO auth_tokens (user_id, token, created_at, expires_at) VALUES ($1, $2, NOW(), NOW() + INTERVAL \'30 days\')',
      [userId, 'phil-partner-token-' + Math.random().toString(36).substring(2)]
    );
    
    console.log('==== PARTNER ACCOUNT CREATED ====');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Company:', companyName);
    console.log('Tokens: 500');
    console.log('================================');
    
  } catch (error) {
    console.error('Error creating partner account:', error);
  } finally {
    // Don't close the pool as it might be used by the server
    console.log('Done!');
  }
}

// Run the function
createPhilPartner();