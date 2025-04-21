/**
 * Create or Update Admin as Partner
 * 
 * This script transforms the admin user into both an admin AND a partner account,
 * allowing dual access to both admin and partner features.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import bcrypt from 'bcrypt';

// Configure Neon to use the ws package for WebSockets
neonConfig.webSocketConstructor = ws;

// Helper to generate referral code
function generateReferralCode(companyName, id) {
  // Clean up company name for use in referral code
  const baseCode = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // remove special chars
    .substring(0, 8); // get first 8 chars
  
  // Add user ID and random suffix for uniqueness
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${baseCode}-${id}-${randomSuffix}`;
}

async function setupAdminPartner() {
  try {
    console.log('Setting up Admin as Partner...');
    
    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Get admin user
    const { rows: adminUsers } = await pool.query(
      'SELECT id, email, username, display_name FROM users WHERE is_admin = true ORDER BY id ASC'
    );
    
    if (adminUsers.length === 0) {
      console.log('No admin users found');
      await pool.end();
      return;
    }
    
    const adminUser = adminUsers[0];
    console.log(`Found admin user: ${adminUser.username} (${adminUser.email})`);
    
    // Check if admin is already a partner
    const { rows: existingPartners } = await pool.query(
      'SELECT id, status FROM partners WHERE user_id = $1',
      [adminUser.id]
    );
    
    if (existingPartners.length > 0) {
      // Just ensure partner status is ACTIVE
      if (existingPartners[0].status !== 'ACTIVE') {
        await pool.query(
          'UPDATE partners SET status = $1 WHERE id = $2',
          ['ACTIVE', existingPartners[0].id]
        );
        console.log(`Updated existing partner record to ACTIVE status`);
      } else {
        console.log(`Admin is already a partner with ACTIVE status`);
      }
    } else {
      // Create partner record for admin
      const companyName = adminUser.display_name || 'Admin Solutions';
      const referralCode = generateReferralCode(companyName, adminUser.id);
      
      const { rows: newPartner } = await pool.query(
        `INSERT INTO partners (
          user_id, company_name, contact_name, status, referral_code, 
          commission_rate, earnings_balance, total_earnings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          adminUser.id,
          companyName,
          'System Administrator', // Contact name
          'ACTIVE',
          referralCode,
          0.25, // 25% commission rate
          100.00, // Starting balance
          0.00 // Total earnings
        ]
      );
      
      console.log(`Created new partner record for admin with ID: ${newPartner[0].id}`);
    }
    
    // Ensure admin has a known password for regular login
    const knownPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(knownPassword, 10);
    
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, adminUser.id]
    );
    
    console.log(`Updated admin password for regular login`);
    
    console.log(`\nAdmin account is now ready for partner login!`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${knownPassword}`);
    console.log(`\nYou can now log in as this user from the partner login page`);
    
    // Close database connection
    await pool.end();
    
  } catch (error) {
    console.error('Error setting up admin partner:', error);
  }
}

// Run the function
setupAdminPartner();