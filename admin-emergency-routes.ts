/**
 * Emergency Admin Panel Routes
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

const router = Router();

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
    
    // No hardcoded bypass tokens - proper auth required
    // Validate through token verification system only
    // Verify the token exists in our active tokens
    if (activeTokens && activeTokens.has(token)) {
        const tokenInfo = activeTokens.get(token);
        console.log('Token info found:', tokenInfo);
        
        const user = await storage.getUser(tokenInfo.userId);
        console.log('User data:', user);
        
        if (user) {
          userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
          };
          
          console.log('Is admin check:', user.isAdmin, typeof user.isAdmin);
          
          if (user.isAdmin) {
            isAdmin = true;
          }
        }
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

// API route to get partner withdrawal requests for emergency panel
router.get('/api/admin-emergency/withdrawals', async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    
    // Validate admin access (similar to check-status)
    let isAdmin = false;
    
    // No hardcoded bypass tokens - proper auth required
    const activeTokens = (global as any).activeTokens;
    if (activeTokens && activeTokens.has(token)) {
        const tokenInfo = activeTokens.get(token);
        const user = await storage.getUser(tokenInfo.userId);
        
        if (user && user.isAdmin) {
          isAdmin = true;
        }
      }
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
    
    // Validate admin access
    let isAdmin = false;
    
    // No hardcoded bypass tokens - proper auth required
    const activeTokens = (global as any).activeTokens;
    if (activeTokens && activeTokens.has(token)) {
        const tokenInfo = activeTokens.get(token);
        const user = await storage.getUser(tokenInfo.userId);
        
        if (user && user.isAdmin) {
          isAdmin = true;
        }
      }
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
    
    // Validate admin access
    let isAdmin = false;
    let adminUserId = 0;
    
    // No hardcoded bypass tokens - proper auth required
    const activeTokens = (global as any).activeTokens;
      if (activeTokens && activeTokens.has(token)) {
        const tokenInfo = activeTokens.get(token);
        const user = await storage.getUser(tokenInfo.userId);
        
        if (user && user.isAdmin) {
          isAdmin = true;
          adminUserId = user.id;
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