const { pool } = require('./server/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function createPartnerWithTokens() {
  try {
    // Generate a random referral code
    const generateReferralCode = (companyName) => {
      const sanitizedName = companyName.replace(/\W+/g, '').toUpperCase();
      const prefix = sanitizedName.substring(0, 3);
      const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
      return `${prefix}-${randomBytes}`;
    };
    
    // Create a new partner
    const partnerId = crypto.randomBytes(16).toString('hex');
    const partnerUsername = 'partner_' + Math.floor(Math.random() * 10000);
    const partnerEmail = `${partnerUsername}@example.com`;
    const partnerPassword = 'partner123'; // Simple password for demo purposes
    const partnerCompany = 'Jesko Partner';
    const partnerReferralCode = generateReferralCode(partnerCompany);
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(partnerPassword, saltRounds);
    
    // Insert partner into users table
    const userInsertResult = await pool.query(
      `INSERT INTO "users" (id, username, email, password, "createdAt", "updatedAt", role, "referralCode", company) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id`,
      [
        partnerId,
        partnerUsername,
        partnerEmail,
        hashedPassword,
        new Date(),
        new Date(),
        'partner',
        partnerReferralCode,
        partnerCompany
      ]
    );
    
    if (!userInsertResult.rows[0]) {
      throw new Error('Failed to create partner user');
    }

    // Add 500 tokens to the partner's account
    await pool.query(
      `INSERT INTO "userTokens" (user_id, tokens, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4)`,
      [partnerId, 500, new Date(), new Date()]
    );
    
    console.log('==== PARTNER ACCOUNT CREATED ====');
    console.log('Username:', partnerUsername);
    console.log('Password:', partnerPassword);
    console.log('Email:', partnerEmail);
    console.log('Referral Code:', partnerReferralCode);
    console.log('Tokens:', 500);
    console.log('================================');
    
    // Close the database connection
    await pool.end();
    
  } catch (error) {
    console.error('Error creating partner account:', error);
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing pool:', err);
    }
  }
}

createPartnerWithTokens();