import { Request, Response, Router } from 'express';
import { db } from './db';
import { eq, desc, count, sql } from 'drizzle-orm';
import { users, partners, agents, coinTransactions } from '../shared/schema';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { storage } from './storage';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { activeTokens } from './lib/auth-simple';

// Convert exec to Promise-based
const execPromise = util.promisify(exec);

const router = Router();

// Admin authorization middleware
const adminAuthCheck = async (req: Request, res: Response, next: Function) => {
  try {
    // If the request is already authenticated via the session system
    if (req.user && req.user.isAdmin) {
      return next();
    }
    
    // Check for Bearer token authentication
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Check if token exists in the activeTokens map
      const tokenInfo = activeTokens.get(token);
      if (tokenInfo) {
        // Check if token is expired
        if (tokenInfo.expiresAt < new Date()) {
          console.log('Admin API - Token expired');
          return res.status(401).json({ error: 'Token expired' });
        }
        
        // Get the user from the database
        try {
          const user = await storage.getUser(tokenInfo.userId);
          if (user && user.isAdmin) {
            // Attach the user to the request
            (req as any).user = user;
            return next();
          }
        } catch (err) {
          console.error('Error fetching user from token:', err);
        }
      }
      
      // No need for additional workarounds or exceptions for token verification
      // If the token wasn't recognized by the activeTokens system above,
      // it's not a valid token and access should be denied
      console.log('Admin API - Unrecognized token');
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    // If all checks fail, return 401 Unauthorized
    return res.status(401).json({ error: 'Unauthorized - Admin access required' });
  } catch (error) {
    console.error('Admin auth check error:', error);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
};

// Apply admin authentication middleware to all routes
router.use(adminAuthCheck);

// Get simplified dashboard stats (quick overview)
router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    console.log('Admin Dashboard API: Received request for dashboard stats');
    
    // Get user count
    const userCount = await db.select({ count: count() }).from(users);
    console.log('Admin Dashboard API: User count:', userCount[0].count);
    
    // Get partner count
    const partnerCount = await db.select({ count: count() }).from(partners);
    console.log('Admin Dashboard API: Partner count:', partnerCount[0].count);
    
    // Get total agents created count
    const agentCount = await db.select({ count: count() }).from(agents);
    console.log('Admin Dashboard API: Agent count:', agentCount[0].count);
    
    // Get total transactions
    const transactionCount = await db.select({ count: count() }).from(coinTransactions);
    console.log('Admin Dashboard API: Transaction count:', transactionCount[0].count);
    
    const response = {
      totalUsers: userCount[0].count || 0,
      totalPartners: partnerCount[0].count || 0, 
      totalAgents: agentCount[0].count || 0,
      totalTransactions: transactionCount[0].count || 0,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Admin Dashboard API: Sending response:', response);
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get dashboard overview statistics
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Get user count
    const userCountResult = await db
      .select({ count: count() })
      .from(users);
    
    const userCount = userCountResult[0].count;
    
    // Get user growth (users created in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(sql`created_at > ${thirtyDaysAgo.toISOString()}`);
    
    const newUsersCount = newUsersResult[0].count;
    const userGrowth = userCount > 0 ? (newUsersCount / userCount * 100).toFixed(1) : '0.0';
    
    // Get active partners count
    const partnersResult = await db
      .select({ count: count() })
      .from(partners)
      .where(eq(partners.status, 'ACTIVE'));
    
    const partnersCount = partnersResult[0].count;
    
    // Get partner growth (partners created in the last 30 days)
    const newPartnersResult = await db
      .select({ count: count() })
      .from(partners)
      .where(sql`created_at > ${thirtyDaysAgo.toISOString()} AND status = 'ACTIVE'`);
    
    const newPartnersCount = newPartnersResult[0].count;
    const partnerGrowth = partnersCount > 0 ? (newPartnersCount / partnersCount * 100).toFixed(1) : '0.0';
    
    // Calculate revenue (simplified, would need actual transaction data)
    // In a real implementation, you would sum transactions from a payments table
    const revenue = 34289;  
    const revenueGrowth = 5.3;
    
    // Count videos created (simplified, would need actual video data)
    // In a real implementation, you would count from a videos table
    const videosCreated = 12758;
    const videosGrowth = 18.9;
    
    // Return dashboard data
    res.json({
      users: {
        count: userCount,
        formattedCount: userCount.toLocaleString(),
        growth: userGrowth
      },
      partners: {
        count: partnersCount,
        formattedCount: partnersCount.toLocaleString(),
        growth: partnerGrowth
      },
      revenue: {
        amount: revenue,
        formattedAmount: '$' + revenue.toLocaleString(),
        growth: revenueGrowth
      },
      videos: {
        count: videosCreated,
        formattedCount: videosCreated.toLocaleString(),
        growth: videosGrowth
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get recent activities
router.get('/recent-activities', async (req: Request, res: Response) => {
  try {
    // Get most recent user registrations
    const recentUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt,
        type: sql<string>`'user_registration'`
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);
    
    // Get most recent partner registrations
    const recentPartners = await db
      .select({
        id: partners.id,
        username: sql<string>`company_name`, // Use company_name instead of name which doesn't exist
        email: sql<string>`''`, // Partners don't have a direct email field
        createdAt: partners.created_at, // Use created_at instead of createdAt
        type: sql<string>`'partner_registration'`
      })
      .from(partners)
      .orderBy(desc(partners.created_at))
      .limit(5);
    
    // Combine and sort activities
    const activities = [...recentUsers, ...recentPartners]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    // Format activities for display
    const formattedActivities = activities.map(activity => {
      const createdAt = new Date(activity.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      
      let timeAgo;
      if (diffMins < 1) {
        timeAgo = 'just now';
      } else if (diffMins < 60) {
        timeAgo = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }
      
      return {
        id: activity.id,
        name: activity.username,
        email: activity.email,
        type: activity.type,
        timeAgo,
        timestamp: activity.createdAt
      };
    });
    
    res.json({ activities: formattedActivities });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

// Get users list with pagination and filtering
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status?.toString() || 'all';
    const search = req.query.search?.toString() || '';
    const role = req.query.role?.toString() || 'all';
    
    console.log('Admin Dashboard API: Fetching users with filters:', { page, limit, status, search, role });
    
    // Build query based on filters
    let query = db.select().from(users);
    
    // Apply search filter if provided
    if (search) {
      query = query.where(
        sql`username ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'} OR "displayName" ILIKE ${'%' + search + '%'}`
      );
    }
    
    // Apply role filter if provided
    if (role === 'admin') {
      query = query.where(sql`"isAdmin" = true`);
    } else if (role === 'user') {
      query = query.where(sql`"isAdmin" = false OR "isAdmin" IS NULL`);
    }
    
    // Execute query with pagination
    const usersData = await query.limit(limit).offset(offset);
    console.log(`Admin Dashboard API: Found ${usersData.length} users`);
    
    // Count total users for pagination
    const countQuery = db.select({ count: count() }).from(users);
    
    // Apply the same filters to the count query
    if (search) {
      countQuery.where(
        sql`username ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'} OR "displayName" ILIKE ${'%' + search + '%'}`
      );
    }
    
    if (role === 'admin') {
      countQuery.where(sql`"isAdmin" = true`);
    } else if (role === 'user') {
      countQuery.where(sql`"isAdmin" = false OR "isAdmin" IS NULL`);
    }
    
    const countResult = await countQuery;
    const total = countResult[0].count;
    
    // Format user data for display
    const formattedUsers = usersData.map(user => {
      // Create initials from name (assuming displayName exists)
      const nameParts = (user.displayName || user.username || '').split(' ');
      const initials = nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : nameParts[0] ? nameParts[0][0].toUpperCase() : 'U';
      
      return {
        id: user.id,
        name: user.displayName || user.username,
        email: user.email,
        initials,
        status: 'Active', // No active flag in schema, defaulting to active
        role: user.isAdmin ? 'Admin' : 'User',
        verified: Boolean(user.email), // Simplified; normally would check email verification
        lastLogin: user.lastLogin || null,
        createdAt: user.createdAt,
        coins: user.coins || 0,
        profession: user.profession || '',
        stripeCustomerId: user.stripe_customer_id || null
      };
    });
    
    res.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users data:', error);
    res.status(500).json({ error: 'Failed to fetch users data' });
  }
});

// Create a new user or partner
router.post('/users', async (req: Request, res: Response) => {
  try {
    console.log('Admin Dashboard API: Creating new user with payload:', JSON.stringify(req.body));
    const { username, email, displayName, password, isAdmin, role, partnerInfo } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Hash the password using bcrypt or fallback to crypto if not available
    let hashedPassword;
    try {
      // Try using bcrypt if available
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (e) {
      console.log('Falling back to crypto for password hashing');
      // Fallback to crypto module for hashing
      const crypto = require('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      hashedPassword = `${hash}.${salt}`;
    }
    
    // Create user transaction to handle both user and partner creation if needed
    let newUser;
    let newPartner;

    // Special handling for creating partners
    // Check if this is a partner creation from admin dashboard
    const isPartnerCreation = role === 'partner' || (displayName && displayName.includes('Company'));
    
    if (isPartnerCreation) {
      console.log('Creating partner account with email:', email);
      
      // Start a transaction to create both user and partner in one operation
      await db.transaction(async (tx) => {
        // Create the user first with proper field mapping
        const [createdUser] = await tx.insert(users).values({
          username,
          email,
          displayName: displayName || username,
          password: hashedPassword,
          isAdmin: false, // Partners are never admins
          createdAt: new Date(),
          lastLogin: null,
          coins: 100, // Default starting coins
        }).returning();
        
        newUser = createdUser;
        
        // Determine company name
        const companyName = partnerInfo?.companyName || displayName || username;
        
        // Create a referral code
        const referralCode = generateReferralCode(companyName, createdUser.id);
        
        console.log('Creating partner record for user ID:', createdUser.id);
        
        // Now create the partner record with properly mapped fields according to schema
        const [createdPartner] = await tx.insert(partners).values({
          user_id: createdUser.id,
          company_name: companyName,
          contact_name: username,
          referral_code: referralCode,
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date(),
          commission_rate: partnerInfo?.commissionRate || 15, // Default 15%
          earnings_balance: 0,
          total_earnings: 0,
        }).returning();
        
        newPartner = createdPartner;
      });
      
      res.status(201).json({
        user: newUser,
        partner: newPartner,
        message: 'Partner account created successfully'
      });
    } else {
      // Just create a regular user
      const [createdUser] = await db.insert(users).values({
        username,
        email,
        displayName: displayName || username,
        password: hashedPassword,
        isAdmin: isAdmin === true, // Default to false
        createdAt: new Date(),
        lastLogin: null, 
        coins: 100, // Default starting coins
      }).returning();
      
      res.status(201).json({
        user: createdUser,
        message: 'User created successfully'
      });
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user. ' + (error instanceof Error ? error.message : String(error)) });
  }
});

// Helper function to generate a referral code
function generateReferralCode(companyName: string, userId: number): string {
  // Clean the company name and take the first 3-4 characters
  const prefix = companyName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase();
  
  // Add a timestamp component and user ID
  const timestamp = Date.now().toString().slice(-4);
  const idPart = userId.toString().padStart(4, '0');
  
  return `${prefix}${timestamp}${idPart}`;
}

// Get a single user by ID
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    console.log(`Admin Dashboard API: Fetching user with ID ${userId}`);
    
    const [userData] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!userData) {
      console.log(`Admin Dashboard API: User with ID ${userId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user transactions
    const transactions = await db
      .select()
      .from(coinTransactions)
      .where(eq(coinTransactions.user_id, userId))
      .orderBy(desc(coinTransactions.created_at))
      .limit(10);
    
    // Check if user is a partner
    const [partnerData] = await db
      .select()
      .from(partners)
      .where(eq(partners.user_id, userId));
    
    // Format user data for response
    const nameParts = (userData.displayName || userData.username || '').split(' ');
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : nameParts[0] ? nameParts[0][0].toUpperCase() : 'U';
      
    const formattedUser = {
      id: userData.id,
      username: userData.username,
      displayName: userData.displayName || userData.username,
      email: userData.email,
      initials,
      isAdmin: userData.isAdmin || false,
      status: 'Active',
      verified: Boolean(userData.email),
      lastLogin: userData.lastLogin || null,
      createdAt: userData.createdAt,
      coins: userData.coins || 0,
      profession: userData.profession || '',
      stripeCustomerId: userData.stripe_customer_id || null,
      isPartner: Boolean(partnerData),
      partnerDetails: partnerData || null,
      recentTransactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        createdAt: tx.created_at
      }))
    };
    
    console.log(`Admin Dashboard API: Successfully fetched user ${userId}`);
    res.json(formattedUser);
  } catch (error) {
    console.error(`Error fetching user ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Update a user
router.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const {
      username,
      email,
      displayName,
      isAdmin,
      coins,
      profession
    } = req.body;
    
    console.log(`Admin Dashboard API: Updating user ${userId}:`, req.body);
    
    // Verify user exists
    const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!existingUser) {
      console.log(`Admin Dashboard API: User with ID ${userId} not found for update`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prepare update data
    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    if (coins !== undefined) updateData.coins = coins;
    if (profession !== undefined) updateData.profession = profession;
    
    // Update the user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`Admin Dashboard API: User ${userId} updated successfully`);
    res.json(updatedUser);
  } catch (error) {
    console.error(`Error updating user ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete a user
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    console.log(`Admin Dashboard API: Deleting user ${userId}`);
    
    // Verify user exists
    const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!existingUser) {
      console.log(`Admin Dashboard API: User with ID ${userId} not found for deletion`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is an admin - prevent accidental admin deletion
    if (existingUser.isAdmin) {
      console.log(`Admin Dashboard API: Prevented deletion of admin user ${userId}`);
      return res.status(403).json({ 
        error: 'Cannot delete admin users. Remove admin privileges first.' 
      });
    }
    
    // Delete the user
    await db.delete(users).where(eq(users.id, userId));
    
    console.log(`Admin Dashboard API: User ${userId} deleted successfully`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(`Error deleting user ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get partners list with pagination and filtering
router.get('/partners', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status?.toString() || 'all';
    const search = req.query.search?.toString() || '';
    
    console.log('Admin Dashboard API: Fetching partners with filters:', { page, limit, status, search });
    
    // Build query based on filters
    let query = db.select({
      ...partners,
      // Also get user data for the partner
      user_email: sql`(SELECT email FROM users WHERE users.id = ${partners.user_id})`,
      user_display_name: sql`(SELECT display_name FROM users WHERE users.id = ${partners.user_id})`
    }).from(partners);
    
    // Apply status filter if provided
    if (status !== 'all') {
      query = query.where(eq(partners.status, status.toUpperCase()));
    }
    
    // Apply search filter if provided
    if (search) {
      query = query.where(
        sql`company_name ILIKE ${'%' + search + '%'} OR 
            contact_name ILIKE ${'%' + search + '%'} OR
            (SELECT email FROM users WHERE users.id = ${partners.user_id}) ILIKE ${'%' + search + '%'}`
      );
    }
    
    // Execute query with pagination
    const partnersData = await query.orderBy(desc(partners.created_at)).limit(limit).offset(offset);
    console.log(`Admin Dashboard API: Found ${partnersData.length} partners`);
    
    // Count total partners for pagination (with same filters)
    let countQuery = db.select({ count: count() }).from(partners);
    
    if (status !== 'all') {
      countQuery = countQuery.where(eq(partners.status, status.toUpperCase()));
    }
    
    if (search) {
      countQuery = countQuery.where(
        sql`company_name ILIKE ${'%' + search + '%'} OR 
            contact_name ILIKE ${'%' + search + '%'} OR
            (SELECT email FROM users WHERE users.id = ${partners.user_id}) ILIKE ${'%' + search + '%'}`
      );
    }
    
    const countResult = await countQuery;
    const total = countResult[0].count;
    
    // Get referral counts for each partner
    const referralCounts = await Promise.all(
      partnersData.map(async (partner) => {
        const countResult = await db
          .select({ count: count() })
          .from(sql`referrals`)
          .where(sql`partner_id = ${partner.id}`);
        return { partnerId: partner.id, count: countResult[0]?.count || 0 };
      })
    );
    
    // Format partner data for display
    const formattedPartners = partnersData.map(partner => {
      // Create initials from company name
      const nameParts = (partner.company_name || '').split(' ');
      const initials = nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : nameParts[0] ? nameParts[0][0].toUpperCase() : 'P';
      
      // Get referral count for this partner
      const referralCount = referralCounts.find(r => r.partnerId === partner.id)?.count || 0;
      
      return {
        id: partner.id,
        userId: partner.user_id,
        userEmail: partner.user_email,
        userDisplayName: partner.user_display_name,
        name: partner.company_name,
        contactName: partner.contact_name,
        initials,
        status: partner.status,
        referrals: referralCount,
        earningsBalance: partner.earnings_balance || 0,
        commissionRate: partner.commission_rate || 0,
        commission: '$' + ((partner.earnings_balance || 0) / 100).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        joined: partner.created_at,
        referralCode: partner.referral_code,
        lastUpdated: partner.updated_at,
        paymentInfo: partner.payment_info,
        bio: partner.bio,
        website: partner.website,
        logoUrl: partner.logo_url,
        stripeAccountId: partner.stripe_account_id
      };
    });
    
    res.json({
      partners: formattedPartners,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching partners data:', error);
    res.status(500).json({ error: 'Failed to fetch partners data' });
  }
});

// Get a single partner by ID
router.get('/partners/:id', async (req: Request, res: Response) => {
  try {
    const partnerId = Number(req.params.id);
    if (isNaN(partnerId)) {
      return res.status(400).json({ error: 'Invalid partner ID' });
    }
    
    console.log(`Admin Dashboard API: Fetching partner with ID ${partnerId}`);
    
    // Get partner data
    const [partnerData] = await db
      .select({
        ...partners,
        user_email: sql`(SELECT email FROM users WHERE users.id = ${partners.user_id})`,
        user_display_name: sql`(SELECT display_name FROM users WHERE users.id = ${partners.user_id})`
      })
      .from(partners)
      .where(eq(partners.id, partnerId));
    
    if (!partnerData) {
      console.log(`Admin Dashboard API: Partner with ID ${partnerId} not found`);
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    // Get referral data for this partner
    const referrals = await db
      .select()
      .from(sql`referrals`)
      .where(sql`partner_id = ${partnerId}`)
      .orderBy(sql`created_at DESC`)
      .limit(10);
    
    // Get payment history for this partner
    const payments = await db
      .select()
      .from(sql`partner_payments`)
      .where(sql`partner_id = ${partnerId}`)
      .orderBy(sql`payment_date DESC`)
      .limit(10);
    
    // Format partner data for display
    const nameParts = (partnerData.company_name || '').split(' ');
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : nameParts[0] ? nameParts[0][0].toUpperCase() : 'P';
    
    const referralCount = await db
      .select({ count: count() })
      .from(sql`referrals`)
      .where(sql`partner_id = ${partnerId}`);
    
    const formattedPartner = {
      id: partnerData.id,
      userId: partnerData.user_id,
      userEmail: partnerData.user_email,
      userDisplayName: partnerData.user_display_name,
      name: partnerData.company_name,
      contactName: partnerData.contact_name,
      initials,
      status: partnerData.status,
      referrals: referralCount[0]?.count || 0,
      earningsBalance: partnerData.earnings_balance || 0,
      commissionRate: partnerData.commission_rate || 0,
      commission: '$' + ((partnerData.earnings_balance || 0) / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      joined: partnerData.created_at,
      referralCode: partnerData.referral_code,
      lastUpdated: partnerData.updated_at,
      paymentInfo: partnerData.payment_info,
      bio: partnerData.bio,
      website: partnerData.website,
      logoUrl: partnerData.logo_url,
      stripeAccountId: partnerData.stripe_account_id,
      recentReferrals: referrals.map(r => ({
        id: r.id,
        source: r.source || 'Direct',
        status: r.status,
        convertedUserId: r.converted_user_id,
        createdAt: r.created_at,
        conversionDate: r.conversion_date
      })),
      recentPayments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        formattedAmount: '$' + (p.amount / 100).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        status: p.status,
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        transactionId: p.transaction_id,
        notes: p.notes
      }))
    };
    
    console.log(`Admin Dashboard API: Successfully fetched partner ${partnerId}`);
    res.json(formattedPartner);
  } catch (error) {
    console.error(`Error fetching partner ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch partner data' });
  }
});

// Update a partner
router.patch('/partners/:id', async (req: Request, res: Response) => {
  try {
    const partnerId = Number(req.params.id);
    if (isNaN(partnerId)) {
      return res.status(400).json({ error: 'Invalid partner ID' });
    }
    
    const {
      company_name,
      contact_name,
      status,
      commission_rate,
      bio,
      website,
      logo_url,
      payment_info
    } = req.body;
    
    console.log(`Admin Dashboard API: Updating partner ${partnerId}:`, req.body);
    
    // Verify partner exists
    const [existingPartner] = await db.select().from(partners).where(eq(partners.id, partnerId));
    
    if (!existingPartner) {
      console.log(`Admin Dashboard API: Partner with ID ${partnerId} not found for update`);
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    // Prepare update data
    const updateData: any = {};
    if (company_name !== undefined) updateData.company_name = company_name;
    if (contact_name !== undefined) updateData.contact_name = contact_name;
    if (status !== undefined) updateData.status = status;
    if (commission_rate !== undefined) updateData.commission_rate = commission_rate;
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (payment_info !== undefined) updateData.payment_info = payment_info;
    updateData.updated_at = new Date();
    
    // Update the partner
    const [updatedPartner] = await db
      .update(partners)
      .set(updateData)
      .where(eq(partners.id, partnerId))
      .returning();
    
    console.log(`Admin Dashboard API: Partner ${partnerId} updated successfully`);
    res.json(updatedPartner);
  } catch (error) {
    console.error(`Error updating partner ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update partner' });
  }
});

// Add payment to a partner
router.post('/partners/:id/payments', async (req: Request, res: Response) => {
  try {
    const partnerId = Number(req.params.id);
    if (isNaN(partnerId)) {
      return res.status(400).json({ error: 'Invalid partner ID' });
    }
    
    const { amount, payment_method, status, notes, transaction_id } = req.body;
    
    console.log(`Admin Dashboard API: Adding payment for partner ${partnerId}:`, req.body);
    
    // Verify partner exists
    const [existingPartner] = await db.select().from(partners).where(eq(partners.id, partnerId));
    
    if (!existingPartner) {
      console.log(`Admin Dashboard API: Partner with ID ${partnerId} not found for payment`);
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    // Create payment record
    const [payment] = await db
      .insert(sql`partner_payments`)
      .values({
        partner_id: partnerId,
        amount,
        payment_method,
        status: status || 'COMPLETED',
        payment_date: new Date(),
        notes,
        transaction_id
      })
      .returning();
    
    // Update partner earnings balance if payment was completed
    if (status === 'COMPLETED' || status === undefined) {
      await db
        .update(partners)
        .set({
          earnings_balance: sql`GREATEST(0, earnings_balance - ${amount})`,
          updated_at: new Date()
        })
        .where(eq(partners.id, partnerId));
    }
    
    console.log(`Admin Dashboard API: Payment added for partner ${partnerId}`);
    res.json(payment);
  } catch (error) {
    console.error(`Error adding payment for partner ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

// Get AI models information
router.get('/ai-models', async (req: Request, res: Response) => {
  try {
    // Provide predefined model data since there's no ai_models table in the schema
    const predefinedModels = [
      {
        id: 1,
        provider: 'OpenAI',
        name: 'GPT-4o',
        status: 'Active',
        lastUsed: new Date().toISOString(),
        expiration: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
        usage: {
          tokens: 23452345,
          cost: 4532.67
        }
      },
      {
        id: 2,
        provider: 'Anthropic',
        name: 'Claude 3.7 Sonnet',
        status: 'Active',
        lastUsed: new Date().toISOString(),
        expiration: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(),
        usage: {
          tokens: 13289500,
          cost: 2876.24
        }
      },
      {
        id: 3,
        provider: 'DeepSeek',
        name: 'DeepSeek-LLM-67B',
        status: 'Active',
        lastUsed: new Date().toISOString(), 
        expiration: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString(),
        usage: {
          tokens: 7865432,
          cost: 1532.87
        }
      },
      {
        id: 4,
        provider: 'Google',
        name: 'Gemini Pro',
        status: 'Active',
        lastUsed: new Date().toISOString(),
        expiration: new Date(new Date().setMonth(new Date().getMonth() + 9)).toISOString(),
        usage: {
          tokens: 9876543,
          cost: 1789.65
        }
      },
      {
        id: 5,
        provider: 'xAI',
        name: 'Grok-1.5',
        status: 'Active',
        lastUsed: new Date().toISOString(),
        expiration: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString(),
        usage: {
          tokens: 3456789,
          cost: 876.43
        }
      }
    ];
    
    res.json({ models: predefinedModels });
  } catch (error) {
    console.error('Error fetching AI models data:', error);
    res.status(500).json({ error: 'Failed to fetch AI models data' });
  }
});

// Get system health information
router.get('/system-health', async (req: Request, res: Response) => {
  try {
    console.log('Admin Dashboard API: Collecting system health data');
    
    // Collect CPU information
    const cpuInfo = os.cpus();
    const cpuCount = cpuInfo.length;
    const cpuModel = cpuInfo[0]?.model || 'Unknown CPU';
    const loadAvg = os.loadavg();
    const cpuUsagePercent = Math.min(100, Math.round((loadAvg[0] / cpuCount) * 100));
    
    // Collect memory information
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);
    
    // Collect disk information using df command
    const { stdout: dfOutput } = await execPromise('df -h / | tail -n 1');
    const dfParts = dfOutput.trim().split(/\s+/);
    const diskTotal = dfParts[1] || '?';
    const diskUsed = dfParts[2] || '?';
    const diskUsagePercent = parseInt(dfParts[4]) || 42; // fallback to 42% if parsing fails
    
    // Get network interface statistics
    const networkInterfaces = os.networkInterfaces();
    const networkStats = Object.values(networkInterfaces)
      .flat()
      .filter(Boolean)
      .map(iface => ({
        name: iface.family === 'IPv4' ? 'IPv4' : 'IPv6',
        address: iface.address,
        internal: iface.internal
      }));
    
    // Get uptime information
    const uptimeSeconds = os.uptime();
    const uptimeDays = Math.floor(uptimeSeconds / 86400);
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeFormatted = `${uptimeDays} days, ${uptimeHours} hours, ${uptimeMinutes} minutes`;
    
    // Server information
    const hostname = os.hostname();
    const platform = os.platform();
    const release = os.release();
    const type = os.type();
    const arch = os.arch();
    
    // Get Node.js version
    const nodeVersion = process.version;
    const npmVersion = await getNpmVersion();
    
    // Get recent database performance stats
    const dbStats = await getDbStats();
    
    // Get active connections count
    const activeConnections = await getActiveConnectionsCount();
    
    // Get API performance metrics (average response time, request count)
    const apiMetrics = await getApiMetrics();
    
    // Get recent errors (last 24 hours)
    const recentErrors = await getRecentErrors();
    
    console.log('Admin Dashboard API: System health data collected');
    
    // Format response
    res.json({
      system: {
        hostname,
        platform,
        release,
        type,
        arch,
        uptime: {
          seconds: uptimeSeconds,
          formatted: uptimeFormatted
        },
        versions: {
          node: nodeVersion,
          npm: npmVersion
        }
      },
      resources: {
        cpu: {
          model: cpuModel,
          cores: cpuCount,
          usage: cpuUsagePercent,
          loadAverage: loadAvg,
          status: getResourceStatus(cpuUsagePercent)
        },
        memory: {
          total: formatBytes(totalMemory),
          free: formatBytes(freeMemory),
          used: formatBytes(usedMemory),
          usagePercent: memoryUsagePercent,
          status: getResourceStatus(memoryUsagePercent)
        },
        disk: {
          total: diskTotal,
          used: diskUsed,
          usagePercent: diskUsagePercent,
          status: getResourceStatus(diskUsagePercent)
        },
        network: {
          interfaces: networkStats
        }
      },
      database: dbStats,
      api: apiMetrics,
      errors: recentErrors,
      activeConnections
    });
  } catch (error) {
    console.error('Error collecting system health data:', error);
    res.status(500).json({ error: 'Failed to collect system health data' });
  }
});

// Helper functions for system health data collection
async function getNpmVersion(): Promise<string> {
  try {
    const { stdout } = await execPromise('npm --version');
    return stdout.trim();
  } catch (error) {
    console.error('Error getting npm version:', error);
    return 'Unknown';
  }
}

async function getDbStats() {
  try {
    // Get database version
    const versionResult = await db.execute(sql`SELECT version()`);
    const dbVersion = versionResult.rows[0]?.version || 'Unknown';
    
    // Get database size
    const sizeResult = await db.execute(sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as size_bytes
    `);
    const dbSize = sizeResult.rows[0]?.size || 'Unknown';
    const dbSizeBytes = parseInt(sizeResult.rows[0]?.size_bytes) || 0;
    
    // Get connection count
    const connectionResult = await db.execute(sql`
      SELECT count(*) as connection_count
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);
    const connectionCount = parseInt(connectionResult.rows[0]?.connection_count) || 0;
    
    // Get table counts
    const tableCountResult = await db.execute(sql`
      SELECT count(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tableCount = parseInt(tableCountResult.rows[0]?.table_count) || 0;
    
    // Get row counts for key tables
    const userCountResult = await db.select({ count: count() }).from(users);
    const userCount = userCountResult[0].count;
    
    const partnerCountResult = await db.select({ count: count() }).from(partners);
    const partnerCount = partnerCountResult[0].count;
    
    const agentCountResult = await db.select({ count: count() }).from(agents);
    const agentCount = agentCountResult[0].count;
    
    // Get index usage statistics
    const indexUsageResult = await db.execute(sql`
      SELECT relname as table_name,
             idx_scan as index_scans,
             seq_scan as sequential_scans,
             idx_tup_read as index_tuples_read,
             seq_tup_read as sequential_tuples_read
      FROM pg_stat_user_tables
      ORDER BY sequential_scans DESC
      LIMIT 5
    `);
    
    // Get slow queries
    const slowQueriesResult = await db.execute(sql`
      SELECT query, calls, mean_exec_time, rows
      FROM pg_stat_statements
      ORDER BY mean_exec_time DESC
      LIMIT 5
    `).catch(() => ({ rows: [] })); // May fail if pg_stat_statements extension not enabled
    
    return {
      version: dbVersion,
      size: dbSize,
      sizeBytes: dbSizeBytes,
      connections: connectionCount,
      tables: tableCount,
      records: {
        users: userCount,
        partners: partnerCount,
        agents: agentCount
      },
      performance: {
        indexUsage: indexUsageResult.rows || [],
        slowQueries: slowQueriesResult.rows || []
      },
      status: getResourceStatus(connectionCount > 100 ? 90 : Math.min(connectionCount, 50)) // Simple heuristic
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      version: 'Unknown',
      size: 'Unknown',
      connections: 0,
      tables: 0,
      records: { users: 0, partners: 0, agents: 0 },
      performance: { indexUsage: [], slowQueries: [] },
      status: 'unknown'
    };
  }
}

async function getActiveConnectionsCount() {
  const websocketConnections = Object.keys(clients || {}).length;
  
  // TODO: Add session count when sessionStore.length() is implemented
  const sessionCount = 0;
  
  return {
    websocket: websocketConnections,
    sessions: sessionCount,
    total: websocketConnections + sessionCount
  };
}

async function getApiMetrics() {
  try {
    // Get last 100 API requests from logs
    const apiLogs = await db.execute(sql`
      SELECT path, method, status_code, response_time, created_at
      FROM api_logs
      ORDER BY created_at DESC
      LIMIT 100
    `).catch(() => ({ rows: [] }));
    
    // Calculate metrics
    const requestCount = apiLogs.rows.length;
    let totalResponseTime = 0;
    const statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    const pathStats = {};
    
    apiLogs.rows.forEach(log => {
      // Add to total response time
      totalResponseTime += log.response_time || 0;
      
      // Count by status code
      const statusPrefix = Math.floor(log.status_code / 100);
      statusCodes[`${statusPrefix}xx`] = (statusCodes[`${statusPrefix}xx`] || 0) + 1;
      
      // Count by path
      if (!pathStats[log.path]) {
        pathStats[log.path] = {
          count: 0,
          totalTime: 0,
          methods: {}
        };
      }
      
      pathStats[log.path].count += 1;
      pathStats[log.path].totalTime += log.response_time || 0;
      
      // Count by method
      if (!pathStats[log.path].methods[log.method]) {
        pathStats[log.path].methods[log.method] = 0;
      }
      pathStats[log.path].methods[log.method] += 1;
    });
    
    // Calculate average response time
    const avgResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
    
    // Calculate endpoints with slowest average response time
    const endpointPerformance = Object.entries(pathStats).map(([path, stats]) => ({
      path,
      count: stats.count,
      avgResponseTime: stats.totalTime / stats.count,
      methods: stats.methods
    })).sort((a, b) => b.avgResponseTime - a.avgResponseTime).slice(0, 5);
    
    return {
      recentRequests: requestCount,
      avgResponseTime,
      statusCodes,
      slowestEndpoints: endpointPerformance,
      samples: apiLogs.rows.slice(0, 10) // Return the 10 most recent logs
    };
  } catch (error) {
    console.error('Error getting API metrics:', error);
    return {
      recentRequests: 0,
      avgResponseTime: 0,
      statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
      slowestEndpoints: [],
      samples: []
    };
  }
}

async function getRecentErrors() {
  try {
    // Get last 20 errors from logs
    const errorLogs = await db.execute(sql`
      SELECT id, level, source, message, stack_trace, created_at
      FROM error_logs
      WHERE level = 'error' OR level = 'fatal'
      ORDER BY created_at DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));
    
    return errorLogs.rows;
  } catch (error) {
    console.error('Error getting recent errors:', error);
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to determine resource status based on usage percentage
 */
function getResourceStatus(usagePercent: number): string {
  if (usagePercent < 50) return 'healthy';
  if (usagePercent < 80) return 'warning';
  return 'critical';
}

// Replacement for system-health endpoint
router.get('/system-health', async (req: Request, res: Response) => {
  try {
    console.log('Admin Dashboard API: Collecting system health data');
    
    // Collect CPU information
    const cpuInfo = os.cpus();
    const cpuCount = cpuInfo.length;
    const cpuModel = cpuInfo[0]?.model || 'Unknown CPU';
    const loadAvg = os.loadavg();
    const cpuUsagePercent = Math.min(100, Math.round((loadAvg[0] / cpuCount) * 100));
    
    // Collect memory information
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);
    
    // Collect disk information using df command
    let diskTotal = '?';
    let diskUsed = '?';
    let diskUsagePercent = 50; // default value
    
    try {
      const { stdout: dfOutput } = await execPromise('df -h / | tail -n 1');
      const dfParts = dfOutput.trim().split(/\s+/);
      diskTotal = dfParts[1] || '?';
      diskUsed = dfParts[2] || '?';
      diskUsagePercent = parseInt(dfParts[4]) || 50;
    } catch (diskError) {
      console.error('Error collecting disk information:', diskError);
    }
    
    // Get network interface statistics
    const networkInterfaces = os.networkInterfaces();
    const networkStats = Object.values(networkInterfaces || {})
      .flat()
      .filter(Boolean)
      .map(iface => ({
        name: iface?.family === 'IPv4' ? 'IPv4' : 'IPv6',
        address: iface?.address || 'unknown',
        internal: iface?.internal || false
      }));
    
    // Get uptime information
    const uptimeSeconds = os.uptime();
    const uptimeDays = Math.floor(uptimeSeconds / 86400);
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeFormatted = `${uptimeDays} days, ${uptimeHours} hours, ${uptimeMinutes} minutes`;
    
    // Server information
    const hostname = os.hostname();
    const platform = os.platform();
    const release = os.release();
    const type = os.type();
    const arch = os.arch();
    
    // Get Node.js version
    const nodeVersion = process.version;
    
    // Simple database status
    const dbStatus = {
      version: 'PostgreSQL',
      connections: 0,
      tables: 0,
      records: { users: 0, partners: 0, agents: 0 },
      status: 'healthy'
    };
    
    try {
      const userCountResult = await db.select({ count: count() }).from(users);
      const partnerCountResult = await db.select({ count: count() }).from(partners);
      const agentCountResult = await db.select({ count: count() }).from(agents);
      
      dbStatus.records.users = userCountResult[0]?.count || 0;
      dbStatus.records.partners = partnerCountResult[0]?.count || 0;
      dbStatus.records.agents = agentCountResult[0]?.count || 0;
    } catch (dbError) {
      console.error('Error getting database counts:', dbError);
    }
    
    console.log('Admin Dashboard API: System health data collected');
    
    // Format response
    res.json({
      system: {
        hostname,
        platform,
        release,
        type,
        arch,
        uptime: {
          seconds: uptimeSeconds,
          formatted: uptimeFormatted
        },
        versions: {
          node: nodeVersion
        }
      },
      resources: {
        cpu: {
          model: cpuModel,
          cores: cpuCount,
          usage: cpuUsagePercent,
          loadAverage: loadAvg,
          status: getResourceStatus(cpuUsagePercent)
        },
        memory: {
          total: formatBytes(totalMemory),
          free: formatBytes(freeMemory),
          used: formatBytes(usedMemory),
          usagePercent: memoryUsagePercent,
          status: getResourceStatus(memoryUsagePercent)
        },
        disk: {
          total: diskTotal,
          used: diskUsed,
          usagePercent: diskUsagePercent,
          status: getResourceStatus(diskUsagePercent)
        },
        network: {
          interfaces: networkStats
        }
      },
      database: dbStatus
    });
  } catch (error) {
    console.error('Error collecting system health data:', error);
    res.status(500).json({ error: 'Failed to collect system health data' });
  }
});

// Get API performance information
router.get('/api-performance', async (req: Request, res: Response) => {
  try {
    // This would typically come from monitoring tools
    // Here we're providing example data
    const apiEndpoints = [
      {
        endpoint: '/api/auth',
        avgResponse: 126,
        percentile99: 198,
        successRate: 99.8,
        status: 'healthy'
      },
      {
        endpoint: '/api/user',
        avgResponse: 84,
        percentile99: 156,
        successRate: 99.9,
        status: 'healthy'
      },
      {
        endpoint: '/api/partner',
        avgResponse: 173,
        percentile99: 267,
        successRate: 99.7,
        status: 'healthy'
      },
      {
        endpoint: '/api/video',
        avgResponse: 892,
        percentile99: 1856,
        successRate: 97.2,
        status: 'degraded'
      },
      {
        endpoint: '/api/ai',
        avgResponse: 1243,
        percentile99: 2134,
        successRate: 98.5,
        status: 'degraded'
      }
    ];
    
    res.json({ endpoints: apiEndpoints });
  } catch (error) {
    console.error('Error fetching API performance data:', error);
    res.status(500).json({ error: 'Failed to fetch API performance data' });
  }
});

// Get error logs
router.get('/error-logs', async (req: Request, res: Response) => {
  try {
    // This would typically come from application logging
    // Here we're providing example data
    const errorLogs = [
      {
        level: 'error',
        message: 'OpenAI API Rate Limit Exceeded',
        details: 'Error in /api/ai/generate: Status 429 - Rate limit exceeded. Please try again in 20s. (req_id: 3ba7f4c2)',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        level: 'warning',
        message: 'Database Connection Warning',
        details: 'Warning: Connection pool approaching limit (38/40). Consider increasing max connections.',
        timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString()
      },
      {
        level: 'error',
        message: 'Video Processing Failed',
        details: 'Error in /api/video/process: FFmpeg process exited with code 1. Input file format not recognized.',
        timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString()
      },
      {
        level: 'error',
        message: 'Authentication Failed',
        details: 'Error: Multiple failed login attempts from IP 182.44.211.95. Suspected brute force attack.',
        timestamp: new Date(Date.now() - 1000 * 60 * 93).toISOString()
      },
      {
        level: 'warning',
        message: 'Slow Query Warning',
        details: 'Warning: Query execution time: 3.42s for SELECT * FROM partner_transactions WHERE created_at > \'2025-01-01\'',
        timestamp: new Date(Date.now() - 1000 * 60 * 116).toISOString()
      }
    ];
    
    res.json({ logs: errorLogs });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

// Get security information
router.get('/security', async (req: Request, res: Response) => {
  try {
    // Security score and issues would typically come from security scanning tools
    // Here we're providing example data
    const securityScore = 87;
    const securityIssues = [
      {
        id: 1,
        severity: 'high',
        title: 'Critical: API Keys Exposed in Client Code',
        description: 'API keys were found in client-side JavaScript code. This poses a security risk as keys can be extracted and misused.',
        detected: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        id: 2,
        severity: 'medium',
        title: 'Warning: Outdated Password Policy',
        description: 'Current password policy does not enforce sufficient complexity. Update to require special characters and minimum length of 12.',
        detected: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
      },
      {
        id: 3,
        severity: 'medium',
        title: 'Warning: Session Timeout Too Long',
        description: 'User sessions remain active for 7 days without re-authentication. Recommended setting is 1 day maximum for security.',
        detected: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString()
      }
    ];
    
    // Last security audit information
    const lastAudit = {
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      nextAudit: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(),
      daysUntilNext: 25
    };
    
    // Access control information
    const accessControl = {
      mfaEnabled: true,
      adminCount: 14,
      activeAdmins: 3
    };
    
    // Login attempts
    const loginAttempts = [
      {
        time: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        ip: '128.127.112.38',
        username: 'admin',
        location: 'New York, US',
        success: true
      },
      {
        time: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        ip: '84.210.192.117',
        username: 'michael.johnson',
        location: 'London, GB',
        success: true
      },
      {
        time: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        ip: '202.156.12.35',
        username: 'sarah.miller',
        location: 'Singapore, SG',
        success: true
      },
      {
        time: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
        ip: '182.44.211.95',
        username: 'admin',
        location: 'Unknown',
        success: false
      },
      {
        time: new Date(Date.now() - 1000 * 60 * 51).toISOString(),
        ip: '182.44.211.95',
        username: 'admin',
        location: 'Unknown',
        success: false
      }
    ];
    
    res.json({
      score: securityScore,
      issues: securityIssues,
      audit: lastAudit,
      accessControl,
      loginAttempts
    });
  } catch (error) {
    console.error('Error fetching security data:', error);
    res.status(500).json({ error: 'Failed to fetch security data' });
  }
});

// Get financial reporting information
router.get('/financial', async (req: Request, res: Response) => {
  try {
    console.log('Admin Dashboard API: Fetching financial data');
    
    // Get total revenue stats
    const revenueStats = {
      totalRevenue: 0,
      monthlyRevenue: 0,
      currentQuarterRevenue: 0,
      previousQuarterRevenue: 0,
      yearToDateRevenue: 0
    };
    
    // Get transaction counts and average values
    const transactionStats = {
      totalTransactions: 0,
      averageTransactionValue: 0,
      subscriptionCount: 0,
      oneTimePaymentCount: 0
    };
    
    // Get monthly revenue data for the past 12 months
    const monthlyData = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = month.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      try {
        // Sample transaction data for this month
        // In a real system, we would query the database
        const monthResult = await db.execute(sql`
          SELECT SUM(amount) as total, COUNT(*) as count 
          FROM transactions 
          WHERE EXTRACT(MONTH FROM created_at) = ${month.getMonth() + 1}
          AND EXTRACT(YEAR FROM created_at) = ${month.getFullYear()}
        `).catch(() => ({ rows: [{ total: 0, count: 0 }] }));
        
        const monthlyTotal = parseInt(monthResult.rows[0]?.total || '0') / 100;
        const monthlyCount = parseInt(monthResult.rows[0]?.count || '0');
        
        monthlyData.push({
          month: monthStr,
          revenue: monthlyTotal,
          transactions: monthlyCount
        });
        
        // Add to total stats
        if (i === 0) {
          revenueStats.monthlyRevenue = monthlyTotal;
        }
        
        // Add to year-to-date
        if (month.getFullYear() === now.getFullYear()) {
          revenueStats.yearToDateRevenue += monthlyTotal;
        }
        
        // Add to total
        revenueStats.totalRevenue += monthlyTotal;
        transactionStats.totalTransactions += monthlyCount;
        
        // Calculate quarterly data
        const quarter = Math.floor(month.getMonth() / 3);
        const currentQuarter = Math.floor(now.getMonth() / 3);
        
        if (month.getFullYear() === now.getFullYear() && quarter === currentQuarter) {
          revenueStats.currentQuarterRevenue += monthlyTotal;
        } else if (
          (month.getFullYear() === now.getFullYear() && quarter === currentQuarter - 1) ||
          (now.getMonth() < 3 && month.getFullYear() === now.getFullYear() - 1 && quarter === 3)
        ) {
          revenueStats.previousQuarterRevenue += monthlyTotal;
        }
      } catch (monthError) {
        console.error(`Error getting data for month ${monthStr}:`, monthError);
        monthlyData.push({
          month: monthStr,
          revenue: 0,
          transactions: 0
        });
      }
    }
    
    // Get subscription data
    let subscriptionData = [];
    
    try {
      const subResult = await db.execute(sql`
        SELECT subscription_plan, COUNT(*) as count, AVG(amount) as avg_amount
        FROM subscriptions
        WHERE status = 'active'
        GROUP BY subscription_plan
      `).catch(() => ({ rows: [] }));
      
      subscriptionData = subResult.rows.map(row => ({
        plan: row.subscription_plan || 'Unknown',
        count: parseInt(row.count || '0'),
        averageValue: parseInt(row.avg_amount || '0') / 100
      }));
      
      transactionStats.subscriptionCount = subscriptionData.reduce((sum, item) => sum + item.count, 0);
    } catch (subError) {
      console.error('Error getting subscription data:', subError);
    }
    
    // Get one-time payment data
    try {
      const paymentResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM transactions WHERE transaction_type = 'one_time'
      `).catch(() => ({ rows: [{ count: 0 }] }));
      
      transactionStats.oneTimePaymentCount = parseInt(paymentResult.rows[0]?.count || '0');
    } catch (payError) {
      console.error('Error getting one-time payment data:', payError);
    }
    
    // Calculate averages
    if (transactionStats.totalTransactions > 0) {
      transactionStats.averageTransactionValue = revenueStats.totalRevenue / transactionStats.totalTransactions;
    }
    
    // Get recent transactions
    let recentTransactions = [];
    
    try {
      const txResult = await db.execute(sql`
        SELECT id, user_id, amount, transaction_type, status, created_at
        FROM transactions
        ORDER BY created_at DESC
        LIMIT 10
      `).catch(() => ({ rows: [] }));
      
      recentTransactions = await Promise.all(
        txResult.rows.map(async tx => {
          // Get user information if available
          let username = 'Unknown';
          let email = 'Unknown';
          
          if (tx.user_id) {
            try {
              const [user] = await db.select().from(users).where(eq(users.id, tx.user_id));
              if (user) {
                username = user.username || 'Unknown';
                email = user.email || 'Unknown';
              }
            } catch (userError) {
              console.error(`Error getting user info for user ${tx.user_id}:`, userError);
            }
          }
          
          return {
            id: tx.id,
            userId: tx.user_id,
            username,
            email,
            amount: parseInt(tx.amount || '0') / 100,
            formattedAmount: `$${(parseInt(tx.amount || '0') / 100).toFixed(2)}`,
            type: tx.transaction_type || 'unknown',
            status: tx.status || 'unknown',
            date: tx.created_at
          };
        })
      );
    } catch (txError) {
      console.error('Error getting recent transactions:', txError);
    }
    
    // Get partner commission payouts
    let partnerPayouts = [];
    
    try {
      const payoutResult = await db.execute(sql`
        SELECT partner_id, SUM(amount) as total, COUNT(*) as count
        FROM partner_payments
        WHERE status = 'COMPLETED'
        GROUP BY partner_id
        ORDER BY total DESC
        LIMIT 5
      `).catch(() => ({ rows: [] }));
      
      partnerPayouts = await Promise.all(
        payoutResult.rows.map(async payout => {
          let partnerName = 'Unknown';
          
          try {
            const [partner] = await db.select().from(partners).where(eq(partners.id, payout.partner_id));
            if (partner) {
              partnerName = partner.company_name || 'Unknown';
            }
          } catch (partnerError) {
            console.error(`Error getting partner info for partner ${payout.partner_id}:`, partnerError);
          }
          
          return {
            partnerId: payout.partner_id,
            partnerName,
            totalPaid: parseInt(payout.total || '0') / 100,
            formattedTotal: `$${(parseInt(payout.total || '0') / 100).toFixed(2)}`,
            paymentCount: parseInt(payout.count || '0')
          };
        })
      );
    } catch (payoutError) {
      console.error('Error getting partner payouts:', payoutError);
    }
    
    console.log('Admin Dashboard API: Financial data collected');
    
    res.json({
      revenue: revenueStats,
      transactions: transactionStats,
      monthlyData,
      subscriptions: subscriptionData,
      recentTransactions,
      partnerPayouts
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

// Get AI model usage statistics
router.get('/ai-usage', async (req: Request, res: Response) => {
  try {
    console.log('Admin Dashboard API: Fetching AI usage data');
    
    // Get AI usage statistics
    const totalCalls = {
      'gpt-4o': 0,
      'claude-3-7-sonnet-20250219': 0,
      'whisper-1': 0,
      'dall-e-3': 0,
      total: 0
    };
    
    // Get monthly usage data 
    const monthlyUsage = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = month.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      try {
        // Sample usage data for this month
        // In a real system, we would query the database
        const monthResult = await db.execute(sql`
          SELECT model, COUNT(*) as count 
          FROM ai_model_usage 
          WHERE EXTRACT(MONTH FROM created_at) = ${month.getMonth() + 1}
          AND EXTRACT(YEAR FROM created_at) = ${month.getFullYear()}
          GROUP BY model
        `).catch(() => ({ rows: [] }));
        
        const monthData = {
          month: monthStr,
          'gpt-4o': 0,
          'claude-3-7-sonnet-20250219': 0,
          'whisper-1': 0,
          'dall-e-3': 0,
          total: 0
        };
        
        monthResult.rows.forEach(row => {
          const model = row.model || 'unknown';
          const count = parseInt(row.count || '0');
          
          if (model in monthData) {
            monthData[model] = count;
            monthData.total += count;
            
            // Add to total stats
            totalCalls[model] += count;
            totalCalls.total += count;
          }
        });
        
        monthlyUsage.push(monthData);
      } catch (monthError) {
        console.error(`Error getting AI usage for month ${monthStr}:`, monthError);
        monthlyUsage.push({
          month: monthStr,
          'gpt-4o': 0,
          'claude-3-7-sonnet-20250219': 0,
          'whisper-1': 0,
          'dall-e-3': 0,
          total: 0
        });
      }
    }
    
    // Get usage by feature
    const featureUsage = [];
    
    try {
      const featureResult = await db.execute(sql`
        SELECT feature, model, COUNT(*) as count
        FROM ai_model_usage
        GROUP BY feature, model
        ORDER BY count DESC
      `).catch(() => ({ rows: [] }));
      
      // Group by feature
      const featureMap = {};
      
      featureResult.rows.forEach(row => {
        const feature = row.feature || 'unknown';
        const model = row.model || 'unknown';
        const count = parseInt(row.count || '0');
        
        if (!featureMap[feature]) {
          featureMap[feature] = {
            feature,
            total: 0,
            models: {}
          };
        }
        
        featureMap[feature].models[model] = count;
        featureMap[feature].total += count;
      });
      
      // Convert map to array
      for (const feature in featureMap) {
        featureUsage.push(featureMap[feature]);
      }
      
      // Sort by total usage
      featureUsage.sort((a, b) => b.total - a.total);
    } catch (featureError) {
      console.error('Error getting feature usage:', featureError);
    }
    
    // Get usage by user (top users)
    const userUsage = [];
    
    try {
      const userResult = await db.execute(sql`
        SELECT user_id, COUNT(*) as count
        FROM ai_model_usage
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 10
      `).catch(() => ({ rows: [] }));
      
      userUsage.push(...await Promise.all(
        userResult.rows.map(async row => {
          let username = 'Unknown';
          let email = 'Unknown';
          
          if (row.user_id) {
            try {
              const [user] = await db.select().from(users).where(eq(users.id, row.user_id));
              if (user) {
                username = user.username || 'Unknown';
                email = user.email || 'Unknown';
              }
            } catch (userError) {
              console.error(`Error getting user info for user ${row.user_id}:`, userError);
            }
          }
          
          return {
            userId: row.user_id,
            username,
            email,
            callCount: parseInt(row.count || '0')
          };
        })
      ));
    } catch (userError) {
      console.error('Error getting user usage:', userError);
    }
    
    console.log('Admin Dashboard API: AI usage data collected');
    
    res.json({
      totalCalls,
      monthlyUsage,
      featureUsage,
      topUsers: userUsage
    });
  } catch (error) {
    console.error('Error fetching AI usage data:', error);
    res.status(500).json({ error: 'Failed to fetch AI usage data' });
  }
});

// System Status endpoint for the admin dashboard
router.get('/system-status', async (req: Request, res: Response) => {
  try {
    // Get user count - custom value for dashboard as requested
    const userCount = 2256;
    
    // Get active partners count - custom value for dashboard
    const activePartners = 68;
    
    // Get total models used count - custom value for dashboard
    const aiModelUsage = 12758;
    
    // Get total revenue (monthly) - custom value for dashboard
    const totalRevenue = 34289;
    
    // Get system uptime
    const uptime = os.uptime();
    const uptimeStr = formatUptime(uptime);
    
    // Check system health
    const cpuUsage = os.loadavg()[0] / os.cpus().length; // Normalized CPU usage
    const memoryUsage = 1 - (os.freemem() / os.totalmem()); // Memory usage percentage
    
    // Determine system status based on resource usage
    let systemStatus = 'Healthy';
    if (cpuUsage > 0.8 || memoryUsage > 0.9) {
      systemStatus = 'Critical';
    } else if (cpuUsage > 0.6 || memoryUsage > 0.7) {
      systemStatus = 'Warning';
    }
    
    const response = {
      userCount,
      activePartners,
      aiModelUsage,
      totalRevenue,
      systemStatus,
      uptime: uptimeStr,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

// System monitoring endpoint with detailed metrics
router.get('/system-monitoring', async (req: Request, res: Response) => {
  try {
    // Get CPU information
    const cpuCount = os.cpus().length;
    const cpuLoad = os.loadavg()[0];
    const cpuUsage = Math.min(100, Math.round((cpuLoad / cpuCount) * 100));
    
    // Get memory information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = Math.round((usedMem / totalMem) * 100);
    
    // Get disk usage (simulated as we don't have direct access through Node)
    // In production, you would use a library like 'diskusage' or shell commands
    const diskUsage = 68; // Simulated percentage
    
    // Get process information
    const processUptime = process.uptime();
    const uptimeStr = formatUptime(processUptime);
    
    // Active sessions (simulated)
    const activeSessions = 124;
    
    // Request rate (simulated - in real system would be from an in-memory counter or monitoring system)
    const requestRate = 247;
    
    // Error rate (simulated)
    const errorRate = 1.2;
    
    res.json({
      cpuUsage,
      memoryUsage,
      diskUsage,
      activeSessions,
      requestRate,
      errorRate,
      uptime: uptimeStr,
      nodeVersion: process.version,
      platform: process.platform,
      systemDetails: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        cpus: cpuCount,
        totalMemory: formatBytes(totalMem),
        architecture: os.arch()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system monitoring data:', error);
    res.status(500).json({ error: 'Failed to fetch system monitoring data' });
  }
});

// AI Models endpoint
router.get('/ai-models', async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would fetch from a models table in the database
    // Here we'll return simulated data
    const models = [
      {
        id: 1,
        name: 'GPT-4o',
        provider: 'OpenAI',
        type: 'Text/Multimodal',
        usageCount: 15429,
        costPerUse: 0.0035,
        status: 'ACTIVE',
        dateAdded: '2025-01-15T00:00:00.000Z'
      },
      {
        id: 2,
        name: 'CLAUDE-3-7-SONNET',
        provider: 'Anthropic',
        type: 'Text/Multimodal',
        usageCount: 8274,
        costPerUse: 0.0028,
        status: 'ACTIVE',
        dateAdded: '2025-02-24T00:00:00.000Z'
      },
      {
        id: 3,
        name: 'DEEPSEEK-LLM',
        provider: 'DeepSeek',
        type: 'Text',
        usageCount: 5126,
        costPerUse: 0.0017,
        status: 'ACTIVE',
        dateAdded: '2025-03-10T00:00:00.000Z'
      },
      {
        id: 4,
        name: 'GEMINI-PRO',
        provider: 'Google',
        type: 'Text/Multimodal',
        usageCount: 6812,
        costPerUse: 0.0025,
        status: 'ACTIVE',
        dateAdded: '2025-01-20T00:00:00.000Z'
      },
      {
        id: 5,
        name: 'GROK-2',
        provider: 'x.AI',
        type: 'Text',
        usageCount: 3921,
        costPerUse: 0.0019,
        status: 'ACTIVE',
        dateAdded: '2025-02-05T00:00:00.000Z'
      },
      {
        id: 6,
        name: 'DALL-E-3',
        provider: 'OpenAI',
        type: 'Image',
        usageCount: 9871,
        costPerUse: 0.0080,
        status: 'ACTIVE',
        dateAdded: '2024-12-01T00:00:00.000Z'
      },
      {
        id: 7,
        name: 'WHISPER-V3',
        provider: 'OpenAI',
        type: 'Audio',
        usageCount: 6245,
        costPerUse: 0.0010,
        status: 'ACTIVE',
        dateAdded: '2025-01-10T00:00:00.000Z'
      },
      {
        id: 8,
        name: 'SORA-GEN-1',
        provider: 'OpenAI',
        type: 'Video',
        usageCount: 2871,
        costPerUse: 0.0650,
        status: 'ACTIVE',
        dateAdded: '2025-03-01T00:00:00.000Z'
      }
    ];
    
    res.json(models);
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({ error: 'Failed to fetch AI models data' });
  }
});

// Videos endpoint
router.get('/videos', async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would fetch from a videos table in the database
    // Here we'll return simulated data
    const videos = [
      {
        id: 1,
        title: 'Product Demo - Enterprise Plan',
        userId: 45,
        username: 'james.wilson',
        createdAt: '2025-04-15T14:23:12.000Z',
        duration: '2:34',
        status: 'COMPLETE',
        url: 'https://storage.warmleadnetwork.com/videos/enterprise-demo-v2.mp4'
      },
      {
        id: 2,
        title: 'Sales Pitch - SaaS Edition',
        userId: 28,
        username: 'sarah.johnson',
        createdAt: '2025-04-14T09:45:31.000Z',
        duration: '1:48',
        status: 'COMPLETE',
        url: 'https://storage.warmleadnetwork.com/videos/saas-pitch-final.mp4'
      },
      {
        id: 3,
        title: 'Customer Testimonial Animation',
        userId: 37,
        username: 'david.chen',
        createdAt: '2025-04-18T11:12:09.000Z',
        duration: '3:22',
        status: 'COMPLETE',
        url: 'https://storage.warmleadnetwork.com/videos/testimonial-anim-v1.mp4'
      },
      {
        id: 4,
        title: 'AI Features Overview',
        userId: 51,
        username: 'emma.taylor',
        createdAt: '2025-04-19T16:54:22.000Z',
        duration: '0:00',
        status: 'PROCESSING',
        url: null
      },
      {
        id: 5,
        title: 'Marketing Campaign - Q2',
        userId: 33,
        username: 'michael.brown',
        createdAt: '2025-04-10T10:30:45.000Z',
        duration: '4:11',
        status: 'COMPLETE',
        url: 'https://storage.warmleadnetwork.com/videos/q2-campaign-final.mp4'
      }
    ];
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos data:', error);
    res.status(500).json({ error: 'Failed to fetch videos data' });
  }
});

// Call logs endpoint
router.get('/calls', async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would fetch from a calls table in the database
    // Here we'll return simulated data
    const calls = [
      {
        id: 1,
        phone: '+1-555-123-4567',
        agentName: 'Sales Assistant Pro',
        userId: 45,
        username: 'james.wilson',
        callTime: '2025-04-19T14:23:12.000Z',
        duration: '5:12',
        status: 'COMPLETED',
        notes: 'Discussed enterprise plan options, customer showed interest in premium features.'
      },
      {
        id: 2,
        phone: '+1-555-987-6543',
        agentName: 'Lead Qualifier',
        userId: 28,
        username: 'sarah.johnson',
        callTime: '2025-04-19T15:45:31.000Z',
        duration: '3:48',
        status: 'COMPLETED',
        notes: 'Customer requested follow-up email with pricing information.'
      },
      {
        id: 3,
        phone: '+1-555-456-7890',
        agentName: 'Customer Success Bot',
        userId: 37,
        username: 'david.chen',
        callTime: '2025-04-20T10:12:09.000Z',
        duration: '0:00',
        status: 'IN_PROGRESS',
        notes: null
      },
      {
        id: 4,
        phone: '+1-555-789-0123',
        agentName: 'Support Assistant',
        userId: 51,
        username: 'emma.taylor',
        callTime: '2025-04-18T16:54:22.000Z',
        duration: '4:32',
        status: 'COMPLETED',
        notes: 'Resolved technical issue with integration. Customer satisfied with solution.'
      },
      {
        id: 5,
        phone: '+1-555-234-5678',
        agentName: 'Meeting Scheduler',
        userId: 33,
        username: 'michael.brown',
        callTime: '2025-04-17T10:30:45.000Z',
        duration: '2:15',
        status: 'COMPLETED',
        notes: 'Scheduled demo for next Tuesday with management team.'
      }
    ];
    
    res.json(calls);
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});

// Payments endpoint
router.get('/payments', async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would fetch from a payments table in the database
    // Here we'll return simulated data
    const payments = [
      {
        id: 'pi_3O4PqR2eZvKYlo2C1A7xMj9E',
        userId: 45,
        username: 'james.wilson',
        type: 'SUBSCRIPTION',
        amount: 199.99,
        currency: 'USD',
        status: 'COMPLETED',
        timestamp: '2025-04-15T14:23:12.000Z',
        paymentMethod: 'VISA **** 4242',
        plan: 'Enterprise'
      },
      {
        id: 'pi_3O4QtS2eZvKYlo2C0M8pLk7F',
        userId: 28,
        username: 'sarah.johnson',
        type: 'ONE_TIME',
        amount: 49.99,
        currency: 'USD',
        status: 'COMPLETED',
        timestamp: '2025-04-14T09:45:31.000Z',
        paymentMethod: 'MASTERCARD **** 5555',
        plan: 'Tokens Package'
      },
      {
        id: 'pi_3O4RuT2eZvKYlo2C9N1rXj3D',
        userId: 37,
        username: 'david.chen',
        type: 'SUBSCRIPTION',
        amount: 99.99,
        currency: 'USD',
        status: 'COMPLETED',
        timestamp: '2025-04-18T11:12:09.000Z',
        paymentMethod: 'AMEX **** 6789',
        plan: 'Business'
      },
      {
        id: 'pi_3O4SvU2eZvKYlo2C8A2qWi2C',
        userId: 51,
        username: 'emma.taylor',
        type: 'SUBSCRIPTION',
        amount: 49.99,
        currency: 'USD',
        status: 'PENDING',
        timestamp: '2025-04-20T16:54:22.000Z',
        paymentMethod: 'VISA **** 9876',
        plan: 'Pro'
      },
      {
        id: 'pi_3O4TwV2eZvKYlo2C7B3pVh1B',
        userId: 33,
        username: 'michael.brown',
        type: 'ONE_TIME',
        amount: 29.99,
        currency: 'USD',
        status: 'COMPLETED',
        timestamp: '2025-04-10T10:30:45.000Z',
        paymentMethod: 'PAYPAL',
        plan: 'Add-on Feature'
      }
    ];
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments data:', error);
    res.status(500).json({ error: 'Failed to fetch payments data' });
  }
});

// Partner list endpoint
router.get('/partners', async (req: Request, res: Response) => {
  try {
    const partnerRecords = await db.select().from(partners).orderBy(desc(partners.created_at)).limit(20);
    
    // If no partners found, return empty array
    if (!partnerRecords || partnerRecords.length === 0) {
      return res.json([]);
    }
    
    // Format partners for response
    const formattedPartners = partnerRecords.map(partner => {
      return {
        id: partner.id,
        companyName: partner.company_name,
        email: partner.email || 'unknown',
        referralCode: partner.referral_code,
        referralCount: partner.referral_count || 0,
        totalCommission: partner.total_commission || 0,
        status: partner.status,
        createdAt: partner.created_at
      };
    });
    
    res.json(formattedPartners);
  } catch (error) {
    console.error('Error fetching partners data:', error);
    res.status(500).json({ error: 'Failed to fetch partners data' });
  }
});

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else {
    return `${minutes}m ${remainingSeconds}s`;
  }
}

// Helper function formatBytes is already defined above - don't redefine it

export default router;