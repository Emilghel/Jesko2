/**
 * Emergency Admin Panel Routes - Fixed Version
 * 
 * These routes provide a direct HTML-based admin interface that doesn't
 * depend on WebSockets or React, intended as a fallback when the main
 * admin interface is unavailable.
 */

import express, { Request, Response, Router } from 'express';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { pool } from './db';

const router = Router();

// Special bypass token for emergency access from environment variable
// Default to a secure random token if not set in environment
const ADMIN_BYPASS_TOKEN = process.env.ADMIN_EMERGENCY_TOKEN || 
  crypto.randomBytes(32).toString('hex');

// Serve the emergency admin panel HTML
router.get('/admin-emergency', (req: Request, res: Response) => {
  try {
    console.log('Serving admin emergency panel HTML');
    const htmlPath = path.join(process.cwd(), 'public', 'admin-emergency.html');
    
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      console.error('Admin emergency panel HTML file not found at:', htmlPath);
      res.status(404).send('Admin panel not found');
    }
  } catch (error) {
    console.error('Error serving admin emergency panel:', error);
    res.status(500).send('Server error');
  }
});

// Helper function to check if user is admin
async function isUserAdmin(userId: number): Promise<boolean> {
  try {
    // First try via storage
    const user = await storage.getUser(userId);
    if (user && user.isAdmin) {
      return true;
    }
    
    // If that fails, try direct DB query as backup
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    if (result.rows.length > 0 && result.rows[0].is_admin) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
}

// API route to check if authentication is working
router.get('/api/admin-emergency/check-status', async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    
    // Get active tokens map
    const activeTokens = (global as any).activeTokens;
    let isAdmin = false;
    let userData = null;
    
    // Special bypass token for emergencies
    if (token === ADMIN_BYPASS_TOKEN) {
      isAdmin = true;
      userData = { id: 0, username: 'Admin Bypass', isAdmin: true };
    } 
    // Check regular auth
    else if (activeTokens && activeTokens.has(token)) {
      const tokenInfo = activeTokens.get(token);
      console.log('Token info found:', tokenInfo);
      
      // Check admin status
      if (tokenInfo && tokenInfo.userId) {
        isAdmin = await isUserAdmin(tokenInfo.userId);
        console.log(`User ${tokenInfo.userId} admin status:`, isAdmin);
        
        // Get user data if admin check passed
        if (isAdmin) {
          const user = await storage.getUser(tokenInfo.userId);
          if (user) {
            userData = {
              id: user.id,
              username: user.username,
              email: user.email,
              isAdmin: true
            };
          }
        }
      }
    }
    // Direct DB check as fallback
    else if (token) {
      // Check for token in database
      const tokenResult = await pool.query(
        'SELECT user_id, expires_at FROM auth_tokens WHERE token = $1 AND expires_at > NOW()',
        [token]
      );
      
      if (tokenResult.rows.length > 0) {
        const userId = tokenResult.rows[0].user_id;
        isAdmin = await isUserAdmin(userId);
        console.log(`Direct DB check - User ${userId} admin status:`, isAdmin);
        
        if (isAdmin) {
          const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            userData = {
              id: user.id,
              username: user.username,
              email: user.email,
              isAdmin: true
            };
          }
        }
      }
    }
    
    // Check if this is a known admin email in the database
    if (!isAdmin && userData && userData.email) {
      try {
        const { rows } = await pool.query(
          'SELECT is_admin FROM users WHERE email = $1',
          [userData.email]
        );
        
        if (rows.length > 0 && rows[0].is_admin) {
          console.log('Granting admin access to verified admin email');
          isAdmin = true;
          userData.isAdmin = true;
        }
      } catch (error) {
        console.error('Error verifying admin status by email:', error);
      }
    }
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Return user data and token info
    return res.json({
      authenticated: true,
      user: userData,
      tokenExpires: activeTokens?.get(token)?.expiresAt || new Date(Date.now() + 86400000)
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// API route for direct admin login
router.post('/api/admin-emergency/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Check for admin credentials - should use environment variables or database
    try {
      // Try to find the user in the database first
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND is_admin = true',
        [email]
      );
      
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Compare password with bcrypt
      const user = rows[0];
      const bcrypt = require('bcrypt');
      
      // Check if password matches
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate a unique token for this admin session
      const token = crypto.randomBytes(48).toString('base64');
      
      // Set expiration (12 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);
      
      // Register token in memory (if activeTokens is available)
      const activeTokens = (global as any).activeTokens;
      if (activeTokens) {
        activeTokens.set(token, {
          userId: user.id,
          expiresAt
        });
        
        // Since storage.saveAuthToken is not available, we'll save the token in memory only
        console.log('Emergency admin token saved in memory, valid until:', expiresAt);
      }
      
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: true
        }
      });
    } catch (dbError) {
      console.error('Database error during authentication:', dbError);
      return res.status(500).json({ error: 'Database error during authentication' });
    }
  } catch (error) {
    console.error('Error in emergency admin login:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// API route to get partner withdrawal requests for emergency panel
router.get('/api/admin-emergency/withdrawals', async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    
    // Quick check for bypass token
    if (token === ADMIN_BYPASS_TOKEN) {
      try {
        const withdrawals = await storage.getPartnerWithdrawalRequests();
        
        // Map to simplified format for the emergency panel
        const simplifiedWithdrawals = withdrawals.map((w: any) => ({
          id: w.id,
          partnerId: w.partnerId,
          partnerName: w.partnerName || 'Unknown Partner',
          amount: w.amount,
          status: w.status,
          method: w.paymentMethod,
          paymentDetails: w.paymentDetails,
          createdAt: w.createdAt,
          processedAt: w.processedAt
        }));
        
        return res.json(simplifiedWithdrawals);
      } catch (dbError) {
        console.error('Error fetching withdrawal requests:', dbError);
        return res.status(500).json({ error: 'Database error' });
      }
    }
    
    // Check active tokens
    const activeTokens = (global as any).activeTokens;
    let isAdmin = false;
    
    if (activeTokens && activeTokens.has(token)) {
      const tokenInfo = activeTokens.get(token);
      isAdmin = await isUserAdmin(tokenInfo.userId);
    }
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get withdrawal requests from database
    try {
      const withdrawals = await storage.getPartnerWithdrawalRequests();
      
      // Map to simplified format for the emergency panel
      const simplifiedWithdrawals = withdrawals.map((w: any) => ({
        id: w.id,
        partnerId: w.partnerId,
        partnerName: w.partnerName || 'Unknown Partner',
        amount: w.amount,
        status: w.status,
        method: w.paymentMethod,
        paymentDetails: w.paymentDetails,
        createdAt: w.createdAt,
        processedAt: w.processedAt
      }));
      
      return res.json(simplifiedWithdrawals);
    } catch (dbError) {
      console.error('Error fetching withdrawal requests:', dbError);
      return res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    console.error('Error in admin-emergency withdrawals:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// API route to get counts/stats for admin dashboard
router.get('/api/admin-emergency/stats', async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    
    // Quick check for bypass token
    if (token === ADMIN_BYPASS_TOKEN) {
      try {
        // Get stats
        const userCount = await storage.getUserCount();
        const partnerCount = await storage.getPartnerCount();
        const withdrawalCount = await storage.getPendingWithdrawalCount();
        
        return res.json({
          userCount,
          partnerCount,
          withdrawalCount
        });
      } catch (dbError) {
        console.error('Error fetching admin stats:', dbError);
        return res.status(500).json({ error: 'Database error' });
      }
    }
    
    // Check active tokens
    const activeTokens = (global as any).activeTokens;
    let isAdmin = false;
    
    if (activeTokens && activeTokens.has(token)) {
      const tokenInfo = activeTokens.get(token);
      isAdmin = await isUserAdmin(tokenInfo.userId);
    }
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get stats from database
    try {
      // Get user count
      const userCount = await storage.getUserCount();
      
      // Get partner count
      const partnerCount = await storage.getPartnerCount();
      
      // Get pending withdrawal count
      const withdrawalCount = await storage.getPendingWithdrawalCount();
      
      return res.json({
        userCount,
        partnerCount,
        withdrawalCount
      });
    } catch (dbError) {
      console.error('Error fetching admin stats:', dbError);
      return res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    console.error('Error in admin-emergency stats:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// API route to process a withdrawal request
router.post('/api/admin-emergency/withdrawals/:id/process', async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    
    // Check for admin
    let isAdmin = false;
    let adminUserId = 0;
    
    // Quick check for bypass token
    if (token === ADMIN_BYPASS_TOKEN) {
      isAdmin = true;
      try {
        // Get a valid admin user ID from the database
        const { rows } = await pool.query(
          'SELECT id FROM users WHERE is_admin = true ORDER BY id LIMIT 1'
        );
        if (rows.length > 0) {
          adminUserId = rows[0].id;
        }
      } catch (error) {
        console.error('Error getting admin user ID:', error);
        // Fallback value only if database query fails
        adminUserId = 1;
      }
    } else {
      const activeTokens = (global as any).activeTokens;
      
      if (activeTokens && activeTokens.has(token)) {
        const tokenInfo = activeTokens.get(token);
        isAdmin = await isUserAdmin(tokenInfo.userId);
        
        if (isAdmin) {
          adminUserId = tokenInfo.userId;
        }
      }
    }
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Process the withdrawal request
    const { id } = req.params;
    const { action, notes } = req.body;
    
    if (!action || !['approve', 'reject', 'paid'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action, must be either "approve", "reject", or "paid"' });
    }
    
    try {
      // Get current status
      const withdrawal = await storage.getPartnerWithdrawalRequest(parseInt(id));
      
      if (!withdrawal) {
        return res.status(404).json({ error: 'Withdrawal request not found' });
      }
      
      // Update withdrawal status based on action
      let updatedWithdrawal;
      
      if (action === 'approve') {
        updatedWithdrawal = await storage.updatePartnerWithdrawalRequest(parseInt(id), {
          status: 'APPROVED',
          processedBy: adminUserId,
          notes: notes || 'Approved via Emergency Admin Panel'
        });
      } else if (action === 'reject') {
        updatedWithdrawal = await storage.updatePartnerWithdrawalRequest(parseInt(id), {
          status: 'REJECTED',
          processedBy: adminUserId,
          notes: notes || 'Rejected via Emergency Admin Panel'
        });
        
        // For rejected withdrawals, add the amount back to the partner's balance
        await storage.addToPartnerBalance(withdrawal.partnerId, withdrawal.amount);
      } else if (action === 'paid') {
        updatedWithdrawal = await storage.updatePartnerWithdrawalRequest(parseInt(id), {
          status: 'PAID',
          processedBy: adminUserId,
          notes: notes || 'Marked as paid via Emergency Admin Panel'
        });
      }
      
      return res.json({
        success: true,
        message: `Withdrawal request ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'marked as paid'}`,
        withdrawal: updatedWithdrawal
      });
    } catch (dbError) {
      console.error('Error processing withdrawal request:', dbError);
      return res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    console.error('Error in admin-emergency process withdrawal:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;