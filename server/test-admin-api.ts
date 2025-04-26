import { Request, Response, Router } from 'express';
import { db } from './db';
import { eq, desc, count, sql } from 'drizzle-orm';
import { users, partners, agents, coinTransactions } from '../shared/schema';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { storage } from './storage';
import bcrypt from 'bcrypt';
import { activeTokens } from './lib/auth-simple';

// Convert exec to Promise-based
const execPromise = util.promisify(exec);

const router = Router();

// Admin authorization middleware
const adminAuthCheck = async (req: Request, res: Response, next: Function) => {
  try {
    console.log('Admin Dashboard API: Auth check middleware invoked');
    
    // If the request is already authenticated via the session system
    if (req.user && req.user.isAdmin) {
      console.log('Admin Dashboard API: User authenticated via session');
      return next();
    }
    
    // Check if HTTP Basic authentication is used (admin-dashboard-v2.html uses this)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');
      
      console.log(`Admin Dashboard API: Checking Basic auth for username: ${username}`);
      
      // Rather than using hardcoded credentials, verify against database
      try {
        const user = await storage.getUserByUsername(username);
        if (user && user.isAdmin) {
          // Verify password with bcrypt
          const passwordValid = await bcrypt.compare(password, user.password);
          if (passwordValid) {
            console.log('Admin Dashboard API: Basic auth successful for admin user');
            return next();
          }
        }
        console.log('Admin Dashboard API: Basic auth failed - invalid credentials');
      } catch (err) {
        console.error('Admin Dashboard API: Error during Basic auth:', err);
      }
    }
    
    // Also check for direct auth token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Show first 10 chars of token for debugging
      console.log(`Admin Dashboard API: Checking Bearer token: ${token.substring(0, 10)}...`);
      
      // Check if it's a valid admin token from the activeTokens map
      try {
        // Get token info from the activeTokens map
        const tokenInfo = activeTokens.get(token);
        
        if (tokenInfo) {
          // Check if the token is expired
          if (tokenInfo.expiresAt < new Date()) {
            console.log('Admin Dashboard API: Token expired');
            res.status(401).json({ error: 'Token expired' });
            return;
          }
          
          // Get the user from the database
          const user = await storage.getUser(tokenInfo.userId);
          
          // Check if the user exists and is an admin
          if (user && user.isAdmin) {
            console.log('Admin Dashboard API: Valid admin token');
            return next();
          } else {
            console.log('Admin Dashboard API: Token user not found or not admin');
          }
        } else {
          console.log('Admin Dashboard API: Token not found in activeTokens');
        }
      } catch (err) {
        console.error('Error verifying token:', err);
      }
    }
    
    // If all authentication methods fail, return 401
    console.log('Admin Dashboard API: Authentication failed');
    res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    console.error('Error in adminAuthCheck middleware:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Dashboard stats endpoint (simplified stats for quick dashboard overview)
router.get('/dashboard/stats', adminAuthCheck, async (req: Request, res: Response) => {
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

// AI models endpoint
router.get('/ai-models', adminAuthCheck, async (req: Request, res: Response) => {
  try {
    console.log('Admin Dashboard API: Received request for AI models');
    
    // Define hardcoded models data (this could come from a database in the future)
    const models = [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        type: 'language',
        status: 'active',
        costPerToken: 0.00005,
        contextSize: 128000,
        capabilities: ['text generation', 'reasoning', 'code generation', 'vision'],
        usageStats: {
          totalCalls: 45893,
          averageResponseTime: 2.3,
          lastDayUsage: 1523
        }
      },
      {
        id: 'claude-3-7-sonnet',
        name: 'Claude 3.7 Sonnet',
        provider: 'Anthropic',
        type: 'language',
        status: 'active',
        costPerToken: 0.00003,
        contextSize: 200000,
        capabilities: ['text generation', 'reasoning', 'code generation', 'vision'],
        usageStats: {
          totalCalls: 38290,
          averageResponseTime: 1.9,
          lastDayUsage: 1209
        }
      },
      {
        id: 'whisper-1',
        name: 'Whisper v1',
        provider: 'OpenAI',
        type: 'audio',
        status: 'active',
        costPerMinute: 0.006,
        capabilities: ['speech to text', 'language detection'],
        usageStats: {
          totalCalls: 29457,
          averageResponseTime: 4.1,
          lastDayUsage: 876
        }
      },
      {
        id: 'elevenlabs-v1',
        name: 'ElevenLabs v1',
        provider: 'ElevenLabs',
        type: 'voice',
        status: 'active',
        costPerCharacter: 0.00003,
        capabilities: ['text to speech', 'voice cloning', 'emotion control'],
        usageStats: {
          totalCalls: 34682,
          averageResponseTime: 2.7,
          lastDayUsage: 1105
        }
      },
      {
        id: 'runway-gen-2',
        name: 'Runway Gen-2',
        provider: 'Runway',
        type: 'image-to-video',
        status: 'active',
        costPerGeneration: 0.5,
        capabilities: ['image to video', 'motion generation'],
        usageStats: {
          totalCalls: 18365,
          averageResponseTime: 10.3,
          lastDayUsage: 429
        }
      }
    ];
    
    console.log('Admin Dashboard API: Sending AI models data');
    res.json(models);
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({ error: 'Failed to fetch AI models' });
  }
});

export default router;