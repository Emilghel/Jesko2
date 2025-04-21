/**
 * Check Zack Partner Account Status
 * 
 * This script checks the Zack partner account to verify it exists
 * and is properly set up.
 */

// Use ES Modules syntax
import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';

// Configure Neon to use the ws package for WebSockets
neonConfig.webSocketConstructor = ws;

async function checkZackPartner() {
  try {
    console.log('Checking Zack partner account...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Check for user record
    const { rows: users } = await pool.query(`
      SELECT * FROM users WHERE email = $1
    `, ['zack@partner.com']);
    
    if (users.length === 0) {
      console.log('No user found with email zack@partner.com');
      await pool.end();
      return;
    }
    
    const user = users[0];
    console.log(`\nUser record found:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Is Admin: ${user.is_admin ? 'Yes' : 'No'}`);
    
    // Check password hash
    console.log(`\nPassword hash: ${user.password.slice(0, 20)}...`);
    console.log(`Verifying password 'zackwln34': `);
    const passwordValid = await bcrypt.compare('zackwln34', user.password);
    console.log(passwordValid ? '✅ Password correct' : '❌ Password incorrect');
    
    // Check partner record 
    const { rows: partnerRecords } = await pool.query(`
      SELECT * FROM partners WHERE user_id = $1
    `, [user.id]);
    
    if (partnerRecords.length === 0) {
      console.log('\nNo partner record found for this user');
      
      // Create partner record
      console.log('\nCreating new partner record...');
      
      const companyName = 'Zack Media Solutions';
      const referralCode = 'ZACKMEDIA2025';
      
      const { rows: newPartners } = await pool.query(`
        INSERT INTO partners (
          user_id, 
          company_name, 
          contact_name, 
          email, 
          referral_code, 
          status, 
          commission_rate,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [
        user.id,
        companyName,
        user.username || 'Zack Partner',
        user.email,
        referralCode,
        'ACTIVE',
        0.20 // Default 20% commission
      ]);
      
      console.log('Created new partner record:');
      console.log(`  ID: ${newPartners[0].id}`);
      console.log(`  Company: ${newPartners[0].company_name}`);
      console.log(`  Status: ${newPartners[0].status}`);
      console.log(`  Referral Code: ${newPartners[0].referral_code}`);
    } else {
      const partner = partnerRecords[0];
      console.log('\nPartner record found:');
      console.log(`  ID: ${partner.id}`);
      console.log(`  Company: ${partner.company_name}`);
      console.log(`  Status: ${partner.status}`);
      console.log(`  Referral Code: ${partner.referral_code}`);
      
      // Update partner status to ACTIVE if not already
      if (partner.status !== 'ACTIVE') {
        console.log(`\nUpdating partner status from ${partner.status} to ACTIVE`);
        
        await pool.query(`
          UPDATE partners
          SET status = 'ACTIVE', updated_at = NOW()
          WHERE id = $1
        `, [partner.id]);
        
        console.log('Status updated to ACTIVE');
      }
    }
    
    // Close the pool
    await pool.end();
    
  } catch (error) {
    console.error('Error checking Zack partner account:', error);
  }
}

checkZackPartner();