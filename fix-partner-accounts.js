/**
 * Partner Account Fixer
 * 
 * This script finds all users with "@partner" in their email
 * and ensures they have a corresponding partner record with ACTIVE status.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';

// Configure Neon to use the ws package for WebSockets
neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function generateReferralCode(companyName, id) {
  // Create referral code from company name and current year
  const baseCode = companyName
    .replace(/[^a-zA-Z0-9]/g, '')  // Remove special chars
    .substring(0, 10)               // Take first 10 chars
    .toUpperCase();                 // Make uppercase
  
  // Add current year and unique identifier
  return `${baseCode}${new Date().getFullYear()}${id ? '-' + id : ''}`;
}

async function fixPartnerAccounts() {
  try {
    console.log('Starting partner account fix process...');
    
    // 1. Find all users with "@partner" in their email
    const { rows: partnerUsers } = await pool.query(`
      SELECT * FROM users 
      WHERE email LIKE '%@partner%'
    `);
    
    console.log(`Found ${partnerUsers.length} users with partner emails`);
    
    // Track created/updated partners
    let createdCount = 0;
    let updatedCount = 0;
    
    // 2. Check each user and ensure they have a partner record
    for (const user of partnerUsers) {
      // Check if partner record exists
      const { rows: partnerRecords } = await pool.query(`
        SELECT * FROM partners 
        WHERE user_id = $1
      `, [user.id]);
      
      if (partnerRecords.length === 0) {
        // Create partner record
        console.log(`Creating partner record for user ${user.id} (${user.email})`);
        
        // Generate company name from email if not available
        const companyName = user.company || user.email.split('@')[0] + ' Solutions';
        
        // Generate referral code
        const referralCode = generateReferralCode(companyName, user.id);
        
        // Create partner record
        await pool.query(`
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
        `, [
          user.id,
          companyName,
          user.username || user.email.split('@')[0],
          user.email,
          referralCode,
          'ACTIVE',
          0.20 // Default 20% commission
        ]);
        
        console.log(`Created partner record for ${user.email} with referral code ${referralCode}`);
        createdCount++;
      } else {
        // Update partner status to ACTIVE if not already
        const partner = partnerRecords[0];
        if (partner.status !== 'ACTIVE') {
          console.log(`Updating partner status for ${user.email} from ${partner.status} to ACTIVE`);
          
          await pool.query(`
            UPDATE partners
            SET status = 'ACTIVE', updated_at = NOW()
            WHERE id = $1
          `, [partner.id]);
          
          updatedCount++;
        }
      }
    }
    
    console.log('\nFix partner accounts summary:');
    console.log('----------------------------------------');
    console.log(`Total partner users found: ${partnerUsers.length}`);
    console.log(`Created new partner records: ${createdCount}`);
    console.log(`Updated existing partner records: ${updatedCount}`);
    console.log('----------------------------------------');
    
  } catch (error) {
    console.error('Error fixing partner accounts:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

fixPartnerAccounts();