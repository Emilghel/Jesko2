import { 
  users, calls, logs, apiMetrics, agents, agentTemplates, personalityPrompts,
  purchasedPhoneNumbers, userAgents, siteStatistics, coinTransactions,
  partners, referrals, partnerPayments, partnerCommissions, referralClicks, savedReferralLinks,
  referralConversions, stockVideos, videoHistory, leads, leadCalls,
  seoKeywords, contentLinks, contentPerformanceHistory, contentLinkClicks,
  type User, type InsertUser, 
  type Call, type InsertCall,
  type Log, type InsertLog,
  type ApiMetric, type InsertApiMetric,
  type Agent, type InsertAgent,
  type AgentTemplate, type InsertTemplate,
  type PersonalityPrompt, type InsertPersonalityPrompt,
  type PurchasedPhoneNumber, type InsertPhoneNumber,
  type UserAgent, type InsertUserAgent,
  type SiteStatistic, type InsertSiteStatistic,
  type CoinTransaction, type InsertCoinTransaction,
  type Partner, type InsertPartner,
  type Referral, type InsertReferral,
  type PartnerPayment, type InsertPartnerPayment,
  type PartnerCommission, type InsertPartnerCommission,
  type ReferralClick, type InsertReferralClick,
  type ReferralConversion, type InsertReferralConversion,
  type SavedReferralLink, type InsertSavedReferralLink,
  type StockVideo, type InsertStockVideo,
  type VideoHistory, type InsertVideoHistory,
  type Lead, type InsertLead,
  type LeadCall, type InsertLeadCall,
  type SeoKeyword, type InsertSeoKeyword,
  type ContentLink, type InsertContentLink,
  type ContentPerformanceHistory, type InsertContentPerformanceHistory,
  type ContentLinkClick, type InsertContentLinkClick,
  CallStatus, LogLevel, TransactionType, PartnerStatus, ReferralStatus,
  PaymentStatus, CommissionStatus, LeadStatus, SeoKeywordStatus
} from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { db } from './db';
export const getDb = () => db;
import { eq, and, desc, avg, count, sum, sql } from 'drizzle-orm';

// Configuration interface matching the client-side type
export interface Configuration {
  // Server settings
  serverPort: string;
  
  // Twilio settings
  twilioAccountSid: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  twilioWelcomeMessage?: string;
  
  // OpenAI settings
  openaiApiKey: string;
  openaiModel: string;
  temperature: number;
  contextWindow: number;
  systemPrompt?: string;
  maxTokens?: number;
  
  // ElevenLabs settings
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  stability?: number;
  similarity?: number;
  style?: number;
  speakerBoost?: boolean;
  modelId?: string;
  optimize_streaming_latency?: number;
  output_format?: string;
  voice_clarity?: number;
  voice_expressiveness?: number;
  voice_naturalness?: number;
  voice_emotion?: string;
  voice_speed?: number;
  voice_pitch?: number;
  
  // Homepage AI settings
  continuousConversation?: boolean;
  showTranscript?: boolean;
  greetingMessage?: string;
}

// API Metrics summary interface
export interface ApiMetricsSummary {
  twilioCallCount: number;
  twilioAvgDuration: string;
  openaiRequestCount: number;
  openaiAvgResponseTime: number;
  elevenLabsRequestCount: number;
  elevenLabsCharacterCount: number;
}

// Storage interface with all required methods
export interface IStorage {
  // Stripe-related functions
  updateUserStripeCustomerId(userId: number, stripeCustomerId: string): Promise<boolean>;
  getPaymentByExternalId(paymentIntentId: string): Promise<any | null>;
  recordStripePayment(data: {
    userId: number;
    amount: number;
    description: string;
    paymentMethod: string;
    paymentIntentId: string;
    tokensGranted: number;
    partnerId?: number | null;
  }): Promise<boolean>;
  // Configuration methods
  getConfig(): Promise<Configuration>;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  
  // Coin-related methods
  getUserCoins(userId: number): Promise<number>;
  deductUserCoins(userId: number, amount: number, description: string): Promise<boolean>;
  addUserCoins(userId: number, amount: number, transactionType: TransactionType, description: string, packageId?: string, paymentId?: string): Promise<boolean>;
  getCoinTransactions(userId: number, limit?: number): Promise<CoinTransaction[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  updateUserGoogleId(userId: number, googleId: string): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  addLog(log: InsertLog): Promise<Log>;
  saveAuthToken(token: { token: string, userId: number, expiresAt: Date }): Promise<any>;
  
  // Partner methods
  getPartnerByUserId(userId: number): Promise<Partner | undefined>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  updatePartner(id: number, data: Partial<Partner>): Promise<Partner>;
  getPartnerStats(partnerId: number): Promise<any>;
  getReferralsByPartnerId(partnerId: number): Promise<any[]>;
  getPartnerCommissions(partnerId: number): Promise<PartnerCommission[]>;
  getPartnerPayments(partnerId: number): Promise<PartnerPayment[]>;
  createPartnerPayment(payment: InsertPartnerPayment): Promise<PartnerPayment>;
  getPartnerWithdrawalRequests(): Promise<any[]>;
  getPartnerWithdrawalById(id: number): Promise<any | undefined>;
  getPartnerWithdrawalRequest(id: number): Promise<any | undefined>; 
  updatePartnerWithdrawal(id: number, updates: Partial<PartnerPayment>): Promise<PartnerPayment | undefined>;
  updatePartnerWithdrawalRequest(id: number, updates: any): Promise<any>;
  getUserCount(): Promise<number>;
  getPartnerCount(): Promise<number>;
  getPendingWithdrawalCount(): Promise<number>;
  addToPartnerBalance(partnerId: number, amount: number): Promise<void>;
  addPartnerPendingCommission(partnerId: number, amount: number): Promise<void>;
  updatePartnerCommissionStatus(partnerId: number, amount: number): Promise<void>;
  createAdminNotification(notification: any): Promise<any>;
  getPartnerByReferralCode(referralCode: string): Promise<Partner | undefined>;
  
  // User Agents methods
  getUserAgents(userId: number): Promise<UserAgent[]>;
  getUserAgent(userId: number): Promise<UserAgent | undefined>;
  getUserAgentById(agentId: number): Promise<UserAgent | undefined>;
  createUserAgent(userAgent: InsertUserAgent): Promise<UserAgent>;
  
  // Phone Number methods
  getPurchasedPhoneNumbers(userId: number): Promise<PurchasedPhoneNumber[]>;
  
  // Referral tracking methods
  addReferralClick(click: InsertReferralClick): Promise<ReferralClick>;
  getReferralClicksByPartnerId(partnerId: number, limit?: number): Promise<ReferralClick[]>;
  getReferralClickStats(partnerId: number): Promise<any>;
  attributeConversion(data: InsertReferralConversion): Promise<ReferralConversion>;
  
  // Saved referral links methods
  getSavedReferralLinks(partnerId: number): Promise<SavedReferralLink[]>;
  getSavedReferralLinkById(id: number): Promise<SavedReferralLink | undefined>;
  createSavedReferralLink(data: InsertSavedReferralLink): Promise<SavedReferralLink>;
  updateSavedReferralLink(id: number, data: Partial<SavedReferralLink>): Promise<SavedReferralLink>;
  deleteSavedReferralLink(id: number): Promise<boolean>;
  incrementSavedReferralLinkClickCount(id: number): Promise<boolean>;
  
  // Site statistics methods
  getSiteStatistic(name: string): Promise<SiteStatistic | undefined>;
  updateSiteStatistic(name: string, value: number): Promise<SiteStatistic | undefined>;
  incrementSiteStatistic(name: string, amount?: number): Promise<SiteStatistic | undefined>;
  
  // SEO Keywords methods
  getSeoKeywordsByPartnerId(partnerId: number): Promise<SeoKeyword[]>;
  getSeoKeywordById(id: number): Promise<SeoKeyword | undefined>;
  createSeoKeyword(keyword: InsertSeoKeyword): Promise<SeoKeyword>;
  updateSeoKeyword(id: number, data: Partial<SeoKeyword>): Promise<SeoKeyword>;
  deleteSeoKeyword(id: number): Promise<boolean>;
  
  // Content Links methods
  getContentLinksByKeywordId(keywordId: number): Promise<ContentLink[]>;
  getContentLinkById(id: number): Promise<ContentLink | undefined>;
  createContentLink(link: InsertContentLink): Promise<ContentLink>;
  updateContentLink(id: number, data: Partial<ContentLink>): Promise<ContentLink>;
  deleteContentLink(id: number): Promise<boolean>;
  incrementContentLinkClickCount(id: number): Promise<boolean>;
  getContentPerformanceHistory(linkId: number): Promise<ContentPerformanceHistory[]>;
  createContentPerformanceHistory(data: InsertContentPerformanceHistory): Promise<ContentPerformanceHistory>;
  incrementContentLinkClicks(historyId: number): Promise<boolean>;
  saveContentLinkClickDetails(data: any): Promise<any>;
  getContentLinkClickStats(linkId: number): Promise<any>;
}

// Implementation of the storage interface using PostgreSQL
export class DatabaseStorage implements IStorage {
  private configCache: Configuration | null = null;
  
  // Stripe-related methods
  async updateUserStripeCustomerId(userId: number, stripeCustomerId: string): Promise<boolean> {
    try {
      await db.update(users)
        .set({ stripe_customer_id: stripeCustomerId })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error('Error updating user Stripe customer ID:', error);
      return false;
    }
  }
  
  async getPaymentByExternalId(paymentIntentId: string): Promise<any | null> {
    try {
      // Use raw query since we don't have a schema for payments table yet
      const { pool } = await import('./db');
      const result = await pool.query(
        'SELECT * FROM payments WHERE payment_intent_id = $1 LIMIT 1',
        [paymentIntentId]
      );
      
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting payment by external ID:', error);
      return null;
    }
  }
  
  async recordStripePayment(data: {
    userId: number;
    amount: number;
    description: string;
    paymentMethod: string;
    paymentIntentId: string;
    tokensGranted: number;
    partnerId?: number | null;
  }): Promise<boolean> {
    try {
      const { userId, amount, description, paymentMethod, paymentIntentId, tokensGranted, partnerId } = data;
      const { pool } = await import('./db');
      
      // Start a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Insert the payment record
        await client.query(
          `INSERT INTO payments (
            user_id, amount, payment_method, payment_intent_id, 
            description, tokens_granted, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [userId, amount, paymentMethod, paymentIntentId, description, tokensGranted]
        );
        
        // Add the tokens to the user's account
        await client.query(
          'UPDATE users SET coins = coins + $1 WHERE id = $2',
          [tokensGranted, userId]
        );
        
        // Record the coin transaction
        await client.query(
          `INSERT INTO coin_transactions (
            user_id, amount, transaction_type, description, created_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [userId, tokensGranted, 'purchase', description]
        );
        
        // If there's a partner, record commission
        if (partnerId) {
          const partnerResult = await client.query(
            'SELECT commission_rate FROM partners WHERE id = $1',
            [partnerId]
          );
          
          if (partnerResult.rows.length > 0) {
            const commissionRate = partnerResult.rows[0].commission_rate;
            const commissionAmount = amount * (commissionRate / 100);
            
            await client.query(
              `INSERT INTO partner_commissions (
                partner_id, amount, status, description, created_at
              ) VALUES ($1, $2, $3, $4, NOW())`,
              [partnerId, commissionAmount, 'pending', `Commission for ${description}`]
            );
            
            await client.query(
              'UPDATE partners SET earnings_balance = earnings_balance + $1 WHERE id = $2',
              [commissionAmount, partnerId]
            );
          }
        }
        
        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording Stripe payment:', error);
        return false;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error in recordStripePayment:', error);
      return false;
    }
  }
  
  constructor() {
    // Initialize default configuration in memory for faster access
    this.configCache = {
      serverPort: "5000",
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || "",
      openaiModel: "gpt-4o", // Updated to use the latest GPT-4o model
      elevenLabsVoiceId: "EXAVITQu4vr4xnSDxMaL", // Rachel voice as default
      temperature: 0.7,
      contextWindow: 10
    };
  }
  
  // Get the system configuration
  async getConfig(): Promise<Configuration> {
    console.log('Retrieving system configuration');
    
    // For now, we're using the in-memory configuration
    // In the future, this could be stored in the database
    if (this.configCache) {
      return this.configCache;
    }
    
    // If configCache is somehow null, initialize with defaults
    this.configCache = {
      serverPort: "5000",
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || "",
      openaiModel: "gpt-4o",
      elevenLabsVoiceId: "EXAVITQu4vr4xnSDxMaL",
      temperature: 0.7,
      contextWindow: 10
    };
    
    return this.configCache;
  }
  
  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }
  
  async updateUserGoogleId(userId: number, googleId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ googleId })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  async addLog(log: InsertLog): Promise<Log> {
    // Add timestamp if not provided
    const logWithTimestamp = {
      ...log,
      timestamp: log.timestamp || new Date()
    };
    
    const [newLog] = await db.insert(logs).values(logWithTimestamp).returning();
    return newLog;
  }
  
  // Save authentication token to database
  async saveAuthToken(tokenData: { token: string, userId: number, expiresAt: Date }): Promise<any> {
    try {
      // Use raw query since we don't have a Drizzle schema for auth_tokens
      // Import the pool from db.ts
      const { pool } = await import('./db');
      
      const result = await pool.query(
        'INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET expires_at = $3, user_id = $2 RETURNING *',
        [tokenData.token, tokenData.userId, tokenData.expiresAt]
      );
      
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
      
      throw new Error('Failed to save auth token');
    } catch (error) {
      console.error('Error saving auth token to database:', error);
      throw error;
    }
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          ...data,
          // If lastLogin is provided, use it, otherwise use current time
          lastLogin: data.lastLogin || new Date()
        })
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async getPartnerByUserId(userId: number): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.user_id, userId));
    return partner;
  }
  
  async createPartner(partner: InsertPartner): Promise<Partner> {
    const [newPartner] = await db.insert(partners).values(partner).returning();
    return newPartner;
  }
  
  async updatePartner(id: number, data: Partial<Partner>): Promise<Partner> {
    const [updatedPartner] = await db.update(partners)
      .set(data)
      .where(eq(partners.id, id))
      .returning();
    return updatedPartner;
  }
  
  // Partner statistics and referrals
  async getPartnerStats(partnerId: number): Promise<any> {
    // Get total commission
    const [commissionResult] = await db
      .select({ 
        totalCommission: sum(partnerCommissions.commission_amount).mapWith(Number) 
      })
      .from(partnerCommissions)
      .where(eq(partnerCommissions.partner_id, partnerId));
    
    // Get pending commission
    const [pendingResult] = await db
      .select({ 
        pendingCommission: sum(partnerCommissions.commission_amount).mapWith(Number) 
      })
      .from(partnerCommissions)
      .where(and(
        eq(partnerCommissions.partner_id, partnerId),
        eq(partnerCommissions.status, 'pending')
      ));
    
    // Get paid commission
    const [paidResult] = await db
      .select({ 
        paidCommission: sum(partnerCommissions.commission_amount).mapWith(Number) 
      })
      .from(partnerCommissions)
      .where(and(
        eq(partnerCommissions.partner_id, partnerId),
        eq(partnerCommissions.status, 'paid')
      ));
    
    // Get referral counts
    const [referralResult] = await db
      .select({ 
        totalReferrals: count().mapWith(Number) 
      })
      .from(referrals)
      .where(eq(referrals.partner_id, partnerId));
    
    // Get active referrals count
    const [activeReferralResult] = await db
      .select({ 
        activeReferrals: count().mapWith(Number) 
      })
      .from(referrals)
      .where(and(
        eq(referrals.partner_id, partnerId),
        eq(referrals.status, 'active')
      ));
    
    return {
      totalCommission: commissionResult?.totalCommission || 0,
      pendingCommission: pendingResult?.pendingCommission || 0,
      paidCommission: paidResult?.paidCommission || 0,
      totalReferrals: referralResult?.totalReferrals || 0,
      activeReferrals: activeReferralResult?.activeReferrals || 0,
      conversionRate: referralResult?.totalReferrals ? 
        (activeReferralResult?.activeReferrals / referralResult.totalReferrals) * 100 : 0
    };
  }
  
  async getReferralsByPartnerId(partnerId: number): Promise<any[]> {
    // Join referrals with users to get email
    const result = await db
      .select({
        id: referrals.id,
        partner_id: referrals.partner_id,
        referred_user_id: referrals.referred_user_id,
        user_email: users.email,
        status: referrals.status,
        created_at: referrals.created_at,
        first_purchase_date: referrals.first_purchase_date,
        total_purchases: referrals.total_purchases
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referred_user_id, users.id))
      .where(eq(referrals.partner_id, partnerId))
      .orderBy(desc(referrals.created_at));
    
    return result;
  }
  
  async getPartnerCommissions(partnerId: number): Promise<PartnerCommission[]> {
    return db
      .select()
      .from(partnerCommissions)
      .where(eq(partnerCommissions.partner_id, partnerId))
      .orderBy(desc(partnerCommissions.created_at));
  }
  
  async getPartnerPayments(partnerId: number): Promise<PartnerPayment[]> {
    return db
      .select()
      .from(partnerPayments)
      .where(eq(partnerPayments.partner_id, partnerId))
      .orderBy(desc(partnerPayments.payment_date));
  }
  
  async createPartnerPayment(payment: InsertPartnerPayment): Promise<PartnerPayment> {
    const [result] = await db.insert(partnerPayments).values(payment).returning();
    return result;
  }
  
  async getPartnerWithdrawalRequests(): Promise<any[]> {
    // Get all withdrawal requests with partner details
    const results = await db
      .select({
        id: partnerPayments.id,
        partnerId: partnerPayments.partner_id,
        amount: partnerPayments.amount,
        paymentMethod: partnerPayments.payment_method,
        paymentDetails: partnerPayments.payment_details,
        status: partnerPayments.status,
        requestDate: partnerPayments.request_date,
        processedDate: partnerPayments.payment_date,
        notes: partnerPayments.notes,
        partnerName: partners.company_name,
        partnerEmail: partners.email
      })
      .from(partnerPayments)
      .leftJoin(partners, eq(partnerPayments.partner_id, partners.id))
      .orderBy(desc(partnerPayments.request_date));
    
    return results;
  }
  
  async getPartnerWithdrawalById(id: number): Promise<any | undefined> {
    const [result] = await db
      .select({
        id: partnerPayments.id,
        partnerId: partnerPayments.partner_id,
        amount: partnerPayments.amount,
        paymentMethod: partnerPayments.payment_method,
        paymentDetails: partnerPayments.payment_details,
        status: partnerPayments.status,
        requestDate: partnerPayments.request_date,
        processedDate: partnerPayments.payment_date,
        notes: partnerPayments.notes,
        partnerName: partners.company_name,
        partnerEmail: partners.email
      })
      .from(partnerPayments)
      .leftJoin(partners, eq(partnerPayments.partner_id, partners.id))
      .where(eq(partnerPayments.id, id));
    
    return result;
  }
  
  async updatePartnerWithdrawal(id: number, updates: Partial<PartnerPayment>): Promise<PartnerPayment | undefined> {
    const [updated] = await db
      .update(partnerPayments)
      .set(updates)
      .where(eq(partnerPayments.id, id))
      .returning();
    
    return updated;
  }
  
  async getPartnerWithdrawalRequest(id: number): Promise<any | undefined> {
    try {
      const [result] = await db
        .select({
          id: partnerPayments.id,
          partnerId: partnerPayments.partner_id,
          amount: partnerPayments.amount,
          paymentMethod: partnerPayments.payment_method,
          paymentDetails: partnerPayments.payment_details,
          status: partnerPayments.status,
          createdAt: partnerPayments.request_date,
          processedAt: partnerPayments.payment_date,
          notes: partnerPayments.notes,
          processedBy: partnerPayments.processed_by
        })
        .from(partnerPayments)
        .where(eq(partnerPayments.id, id));
      
      if (!result) {
        return undefined;
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching withdrawal request:', error);
      throw error;
    }
  }
  
  async updatePartnerWithdrawalRequest(id: number, updates: any): Promise<any> {
    try {
      const setClause = {};
      
      if (updates.status) {
        setClause['status'] = updates.status;
      }
      
      if (updates.processedBy) {
        setClause['processed_by'] = updates.processedBy;
      }
      
      if (updates.notes) {
        setClause['notes'] = updates.notes;
      }
      
      // If we're updating the status to APPROVED, REJECTED, or PAID, also update the payment_date
      if (updates.status && ['APPROVED', 'REJECTED', 'PAID'].includes(updates.status)) {
        setClause['payment_date'] = new Date();
      }
      
      const [updated] = await db
        .update(partnerPayments)
        .set(setClause)
        .where(eq(partnerPayments.id, id))
        .returning();
      
      return {
        id: updated.id,
        partnerId: updated.partner_id,
        amount: updated.amount,
        paymentMethod: updated.payment_method,
        paymentDetails: updated.payment_details,
        status: updated.status,
        createdAt: updated.request_date,
        processedAt: updated.payment_date,
        notes: updated.notes,
        processedBy: updated.processed_by
      };
    } catch (error) {
      console.error('Error updating withdrawal request:', error);
      throw error;
    }
  }
  
  async getUserCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(users);
      
      return Number(result?.count || 0);
    } catch (error) {
      console.error('Error getting user count:', error);
      return 0;
    }
  }
  
  async getPartnerCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(partners);
      
      return Number(result?.count || 0);
    } catch (error) {
      console.error('Error getting partner count:', error);
      return 0;
    }
  }
  
  async getPendingWithdrawalCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(partnerPayments)
        .where(eq(partnerPayments.status, 'PENDING'));
      
      return Number(result?.count || 0);
    } catch (error) {
      console.error('Error getting pending withdrawal count:', error);
      return 0;
    }
  }
  
  async addToPartnerBalance(partnerId: number, amount: number): Promise<void> {
    try {
      await db
        .update(partners)
        .set({ 
          earnings_balance: sql`${partners.earnings_balance} + ${amount}` 
        })
        .where(eq(partners.id, partnerId));
    } catch (error) {
      console.error(`Error adding ${amount} to partner ${partnerId} balance:`, error);
      throw error;
    }
  }
  
  async addPartnerPendingCommission(partnerId: number, amount: number): Promise<void> {
    // Update partner's pending commission balance
    await db
      .update(partners)
      .set({
        earnings_balance: sql`${partners.earnings_balance} + ${amount}`
      })
      .where(eq(partners.id, partnerId));
  }
  
  async updatePartnerCommissionStatus(partnerId: number, amount: number): Promise<void> {
    // Reduce partner's earnings balance and increment total earnings
    await db
      .update(partners)
      .set({
        earnings_balance: sql`${partners.earnings_balance} - ${amount}`,
        total_earnings: sql`${partners.total_earnings} + ${amount}`
      })
      .where(eq(partners.id, partnerId));
    
    // Update all pending commissions to paid up to the amount
    const pendingCommissions = await db
      .select()
      .from(partnerCommissions)
      .where(
        and(
          eq(partnerCommissions.partner_id, partnerId),
          eq(partnerCommissions.status, CommissionStatus.PENDING)
        )
      )
      .orderBy(partnerCommissions.created_at);
    
    let remainingAmount = amount;
    
    for (const commission of pendingCommissions) {
      if (remainingAmount <= 0) break;
      
      if (commission.commission_amount <= remainingAmount) {
        // Mark entire commission as paid
        await db
          .update(partnerCommissions)
          .set({ status: CommissionStatus.PAID })
          .where(eq(partnerCommissions.id, commission.id));
        
        remainingAmount -= commission.commission_amount;
      }
    }
  }
  
  async createAdminNotification(notification: any): Promise<any> {
    // For now, we'll just log the notification
    console.log('ADMIN NOTIFICATION:', notification);
    return notification;
  }
  
  // Referral tracking methods
  async getPartnerByReferralCode(referralCode: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.referral_code, referralCode));
    return partner;
  }
  
  async addReferralClick(click: InsertReferralClick): Promise<ReferralClick> {
    const [newClick] = await db.insert(referralClicks).values(click).returning();
    return newClick;
  }
  
  async getReferralClicksByPartnerId(partnerId: number, limit: number = 10): Promise<ReferralClick[]> {
    return db
      .select()
      .from(referralClicks)
      .where(eq(referralClicks.partner_id, partnerId))
      .orderBy(desc(referralClicks.created_at))
      .limit(limit);
  }
  
  async getReferralClickStats(partnerId: number): Promise<any> {
    // Get total clicks
    const [totalResult] = await db
      .select({ total: count() })
      .from(referralClicks)
      .where(eq(referralClicks.partner_id, partnerId));
    
    // Get unique clicks (based on IP address)
    const uniqueIPs = await db
      .select({ ip: referralClicks.ip_address })
      .from(referralClicks)
      .where(and(
        eq(referralClicks.partner_id, partnerId),
        sql`${referralClicks.ip_address} IS NOT NULL`
      ))
      .groupBy(referralClicks.ip_address);
    
    // Get clicks by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const clicksByDay = await db
      .select({
        date: sql`DATE(${referralClicks.created_at})`,
        clicks: count()
      })
      .from(referralClicks)
      .where(and(
        eq(referralClicks.partner_id, partnerId),
        sql`${referralClicks.created_at} >= ${thirtyDaysAgo.toISOString()}`
      ))
      .groupBy(sql`DATE(${referralClicks.created_at})`)
      .orderBy(sql`DATE(${referralClicks.created_at})`);
    
    // Get clicks by source
    const clicksBySource = await db
      .select({
        source: referralClicks.utm_source,
        clicks: count()
      })
      .from(referralClicks)
      .where(and(
        eq(referralClicks.partner_id, partnerId),
        sql`${referralClicks.utm_source} IS NOT NULL`
      ))
      .groupBy(referralClicks.utm_source)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    
    // Get clicks by medium
    const clicksByMedium = await db
      .select({
        medium: referralClicks.utm_medium,
        clicks: count()
      })
      .from(referralClicks)
      .where(and(
        eq(referralClicks.partner_id, partnerId),
        sql`${referralClicks.utm_medium} IS NOT NULL`
      ))
      .groupBy(referralClicks.utm_medium)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    
    // Get clicks by campaign
    const clicksByCampaign = await db
      .select({
        campaign: referralClicks.utm_campaign,
        clicks: count()
      })
      .from(referralClicks)
      .where(and(
        eq(referralClicks.partner_id, partnerId),
        sql`${referralClicks.utm_campaign} IS NOT NULL`
      ))
      .groupBy(referralClicks.utm_campaign)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    
    // Calculate conversion rate (if there are any conversions)
    const [conversionResult] = await db
      .select({ count: count() })
      .from(referralConversions)
      .where(eq(referralConversions.partner_id, partnerId));
    
    const totalClicks = totalResult?.total || 0;
    const uniqueClicks = uniqueIPs.length;
    const conversions = conversionResult?.count || 0;
    const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;
    
    return {
      totalClicks,
      uniqueClicks,
      conversionRate,
      clicksByDay,
      clicksBySource,
      clicksByMedium,
      clicksByCampaign
    };
  }
  
  async attributeConversion(data: InsertReferralConversion): Promise<ReferralConversion> {
    const [conversion] = await db.insert(referralConversions).values(data).returning();
    return conversion;
  }
  
  async getSavedReferralLinks(partnerId: number): Promise<SavedReferralLink[]> {
    return db
      .select()
      .from(savedReferralLinks)
      .where(eq(savedReferralLinks.partner_id, partnerId))
      .orderBy(desc(savedReferralLinks.created_at));
  }
  
  async getSavedReferralLinkById(id: number): Promise<SavedReferralLink | undefined> {
    const [link] = await db
      .select()
      .from(savedReferralLinks)
      .where(eq(savedReferralLinks.id, id));
    return link;
  }
  
  async createSavedReferralLink(data: InsertSavedReferralLink): Promise<SavedReferralLink> {
    const [link] = await db.insert(savedReferralLinks).values(data).returning();
    return link;
  }
  
  async updateSavedReferralLink(id: number, data: Partial<SavedReferralLink>): Promise<SavedReferralLink> {
    const [link] = await db
      .update(savedReferralLinks)
      .set(data)
      .where(eq(savedReferralLinks.id, id))
      .returning();
    return link;
  }
  
  async deleteSavedReferralLink(id: number): Promise<boolean> {
    await db.delete(savedReferralLinks).where(eq(savedReferralLinks.id, id));
    return true;
  }
  
  async incrementSavedReferralLinkClickCount(id: number): Promise<boolean> {
    const [link] = await db
      .update(savedReferralLinks)
      .set({
        click_count: sql`${savedReferralLinks.click_count} + 1`
      })
      .where(eq(savedReferralLinks.id, id))
      .returning();
    
    return !!link;
  }
  
  // Site Statistics Methods
  async getSiteStatistic(name: string): Promise<SiteStatistic | undefined> {
    try {
      const [statistic] = await db.select().from(siteStatistics).where(eq(siteStatistics.name, name));
      return statistic;
    } catch (error) {
      console.error(`Error getting site statistic ${name}:`, error);
      return undefined;
    }
  }
  
  async updateSiteStatistic(name: string, value: number): Promise<SiteStatistic | undefined> {
    try {
      // Try to update existing record
      const result = await db
        .update(siteStatistics)
        .set({ 
          value: value,
          last_updated: new Date()
        })
        .where(eq(siteStatistics.name, name))
        .returning();
      
      if (result.length > 0) {
        return result[0];
      }
      
      // If no record was updated, create a new one
      const [newStat] = await db
        .insert(siteStatistics)
        .values({
          name: name,
          value: value,
        })
        .returning();
      
      return newStat;
    } catch (error) {
      console.error(`Error updating site statistic ${name}:`, error);
      return undefined;
    }
  }
  
  async incrementSiteStatistic(name: string, amount: number = 1): Promise<SiteStatistic | undefined> {
    try {
      // Try to update existing record
      const result = await db.execute(sql`
        UPDATE site_statistics 
        SET value = value + ${amount}, last_updated = NOW()
        WHERE name = ${name}
        RETURNING *
      `);
      
      if (result.rows.length > 0) {
        return result.rows[0] as SiteStatistic;
      }
      
      // If no record was updated, create a new one
      const [newStat] = await db
        .insert(siteStatistics)
        .values({
          name: name,
          value: amount,
        })
        .returning();
      
      return newStat;
    } catch (error) {
      console.error(`Error incrementing site statistic ${name}:`, error);
      return undefined;
    }
  }

  // SEO Keywords methods
  async getSeoKeywordsByPartnerId(partnerId: number): Promise<SeoKeyword[]> {
    try {
      return db
        .select()
        .from(seoKeywords)
        .where(eq(seoKeywords.partnerId, partnerId));
        // Removing orderBy as it's causing SQL syntax errors
    } catch (error) {
      console.error(`Error getting SEO keywords for partner ${partnerId}:`, error);
      return [];
    }
  }

  async getSeoKeywordById(id: number): Promise<SeoKeyword | undefined> {
    try {
      const [keyword] = await db
        .select()
        .from(seoKeywords)
        .where(eq(seoKeywords.id, id));
      return keyword;
    } catch (error) {
      console.error(`Error getting SEO keyword ${id}:`, error);
      return undefined;
    }
  }

  async createSeoKeyword(keyword: InsertSeoKeyword): Promise<SeoKeyword> {
    try {
      const [newKeyword] = await db
        .insert(seoKeywords)
        .values(keyword)
        .returning();
      return newKeyword;
    } catch (error) {
      console.error('Error creating SEO keyword:', error);
      throw error;
    }
  }

  async updateSeoKeyword(id: number, data: Partial<SeoKeyword>): Promise<SeoKeyword> {
    try {
      const [updatedKeyword] = await db
        .update(seoKeywords)
        .set(data)
        .where(eq(seoKeywords.id, id))
        .returning();
      return updatedKeyword;
    } catch (error) {
      console.error(`Error updating SEO keyword ${id}:`, error);
      throw error;
    }
  }

  async deleteSeoKeyword(id: number): Promise<boolean> {
    try {
      // First delete any associated content links
      await db.delete(contentLinks).where(eq(contentLinks.keywordId, id));
      
      // Then delete the keyword
      await db.delete(seoKeywords).where(eq(seoKeywords.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting SEO keyword ${id}:`, error);
      return false;
    }
  }

  // Content Links methods
  async getContentLinksByKeywordId(keywordId: number): Promise<ContentLink[]> {
    try {
      return db
        .select()
        .from(contentLinks)
        .where(eq(contentLinks.keywordId, keywordId));
        // Removing orderBy as it's causing SQL syntax errors
    } catch (error) {
      console.error(`Error getting content links for keyword ${keywordId}:`, error);
      return [];
    }
  }

  async getContentLinkById(id: number): Promise<ContentLink | undefined> {
    try {
      const [link] = await db
        .select()
        .from(contentLinks)
        .where(eq(contentLinks.id, id));
      return link;
    } catch (error) {
      console.error(`Error getting content link ${id}:`, error);
      return undefined;
    }
  }

  async createContentLink(link: InsertContentLink): Promise<ContentLink> {
    try {
      const [newLink] = await db
        .insert(contentLinks)
        .values(link)
        .returning();
      return newLink;
    } catch (error) {
      console.error('Error creating content link:', error);
      throw error;
    }
  }

  async updateContentLink(id: number, data: Partial<ContentLink>): Promise<ContentLink> {
    try {
      const [updatedLink] = await db
        .update(contentLinks)
        .set(data)
        .where(eq(contentLinks.id, id))
        .returning();
      return updatedLink;
    } catch (error) {
      console.error(`Error updating content link ${id}:`, error);
      throw error;
    }
  }

  async deleteContentLink(id: number): Promise<boolean> {
    try {
      // Delete any performance history first
      await db.delete(contentPerformanceHistory).where(eq(contentPerformanceHistory.content_link_id, id));
      
      // Also delete any click details
      await db.delete(contentLinkClicks).where(eq(contentLinkClicks.content_link_id, id));
      
      // Then delete the link
      await db.delete(contentLinks).where(eq(contentLinks.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting content link ${id}:`, error);
      return false;
    }
  }

  async getContentPerformanceHistory(linkId: number): Promise<ContentPerformanceHistory[]> {
    try {
      return db
        .select()
        .from(contentPerformanceHistory)
        .where(eq(contentPerformanceHistory.content_link_id, linkId));
        // Removing orderBy as it's causing SQL syntax errors
    } catch (error) {
      console.error(`Error getting performance history for link ${linkId}:`, error);
      return [];
    }
  }

  async createContentPerformanceHistory(data: InsertContentPerformanceHistory): Promise<ContentPerformanceHistory> {
    try {
      const [newRecord] = await db
        .insert(contentPerformanceHistory)
        .values(data)
        .returning();
      
      return newRecord;
    } catch (error) {
      console.error('Error creating content performance history:', error);
      throw error;
    }
  }

  async incrementContentLinkClicks(historyId: number): Promise<boolean> {
    try {
      await db
        .update(contentPerformanceHistory)
        .set({
          clicks: sql`${contentPerformanceHistory.clicks} + 1`
        })
        .where(eq(contentPerformanceHistory.id, historyId));
      
      return true;
    } catch (error) {
      console.error('Error incrementing content link clicks:', error);
      return false;
    }
  }

  async incrementContentLinkClickCount(id: number): Promise<boolean> {
    try {
      await db
        .update(contentLinks)
        .set({
          click_count: sql`${contentLinks.click_count} + 1`,
          last_clicked: new Date()
        })
        .where(eq(contentLinks.id, id));
      
      return true;
    } catch (error) {
      console.error('Error incrementing content link click count:', error);
      return false;
    }
  }

  async saveContentLinkClickDetails(data: InsertContentLinkClick): Promise<ContentLinkClick> {
    try {
      const [newClickDetail] = await db
        .insert(contentLinkClicks)
        .values(data)
        .returning();
        
      return newClickDetail;
    } catch (error) {
      console.error('Error saving content link click details:', error);
      throw error;
    }
  }

  async getContentLinkClickStats(linkId: number): Promise<any> {
    try {
      // Get total clicks from the link
      const [link] = await db
        .select({
          clickCount: contentLinks.click_count,
          lastClicked: contentLinks.last_clicked
        })
        .from(contentLinks)
        .where(eq(contentLinks.id, linkId));
      
      // Calculate stats based on performance history
      const history = await this.getContentPerformanceHistory(linkId);
      
      // Calculate total clicks across all history entries
      const historyClicks = history.reduce((sum, entry) => sum + (entry.clicks || 0), 0);
      
      // Use impressions from content links table instead of views
      const impressions = link?.impressions || 0;
      
      // Calculate CTR (Click-Through Rate)
      const ctr = impressions > 0 ? (historyClicks / impressions) * 100 : 0;
      
      // Get clicks by day for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentHistory = history.filter(entry => new Date(entry.date) >= thirtyDaysAgo);
      
      return {
        total_clicks: link?.clickCount || 0,
        last_clicked: link?.lastClicked || null,
        total_impressions: impressions,
        ctr: ctr,
        recent_history: recentHistory,
        average_position: history.length > 0 
          ? history.reduce((sum, entry) => sum + (entry.position || 0), 0) / history.length 
          : 0
      };
    } catch (error) {
      console.error(`Error getting click stats for link ${linkId}:`, error);
      return {
        total_clicks: 0,
        total_impressions: 0,
        ctr: 0,
        recent_history: [],
        average_position: 0
      };
    }
  }
  
  // Coin-related methods implementation
  async getUserCoins(userId: number): Promise<number> {
    try {
      const user = await this.getUser(userId);
      return user?.coins || 0;
    } catch (error) {
      console.error(`Error getting user coins for userId ${userId}:`, error);
      return 0;
    }
  }
  
  async deductUserCoins(userId: number, amount: number, description: string): Promise<boolean> {
    try {
      // Get current coins
      const user = await this.getUser(userId);
      if (!user) return false;
      
      // Check if user has enough coins
      if (user.coins < amount) return false;
      
      // Update user coins
      const newCoinBalance = user.coins - amount;
      await db.update(users)
        .set({ coins: newCoinBalance })
        .where(eq(users.id, userId));
      
      // Record transaction
      await db.insert(coinTransactions).values({
        user_id: userId,
        amount: -amount, // Negative amount for deduction
        description: description,
        type: TransactionType.USAGE, // Column name is 'type', not 'transaction_type'
        created_at: new Date()
      });
      
      return true;
    } catch (error) {
      console.error(`Error deducting coins for userId ${userId}:`, error);
      return false;
    }
  }
  
  async addUserCoins(userId: number, amount: number, transactionType: TransactionType, description: string, packageId?: string, paymentId?: string): Promise<boolean> {
    try {
      // Get current coins
      const user = await this.getUser(userId);
      if (!user) return false;
      
      // Update user coins
      const newCoinBalance = user.coins + amount;
      await db.update(users)
        .set({ coins: newCoinBalance })
        .where(eq(users.id, userId));
      
      // Record transaction
      await db.insert(coinTransactions).values({
        user_id: userId,
        amount: amount,
        description: description,
        type: transactionType, // Column name is 'type', not 'transaction_type'
        package_id: packageId,
        payment_id: paymentId,
        created_at: new Date()
      });
      
      return true;
    } catch (error) {
      console.error(`Error adding coins for userId ${userId}:`, error);
      return false;
    }
  }
  
  async getCoinTransactions(userId: number, limit: number = 10): Promise<CoinTransaction[]> {
    try {
      return db.select()
        .from(coinTransactions)
        .where(eq(coinTransactions.user_id, userId))
        .orderBy(desc(coinTransactions.created_at))
        .limit(limit);
    } catch (error) {
      console.error(`Error getting coin transactions for userId ${userId}:`, error);
      return [];
    }
  }
  
  // API Metrics implementation
  async incrementApiMetric(service: string, duration: number): Promise<void> {
    try {
      const timestamp = new Date();
      await db.insert(apiMetrics).values({
        service,
        duration,
        timestamp
      });
    } catch (error) {
      console.error(`Error incrementing API metric for ${service}:`, error);
    }
  }
  
  // User Agents methods
  async getUserAgents(userId: number): Promise<UserAgent[]> {
    try {
      return await db.select()
        .from(userAgents)
        .where(eq(userAgents.user_id, userId))
        .orderBy(desc(userAgents.created_at));
    } catch (error) {
      console.error(`Error getting user agents for userId ${userId}:`, error);
      return [];
    }
  }
  
  async getUserAgent(userId: number): Promise<UserAgent | undefined> {
    try {
      // Get the default (or only) agent for a user
      const [agent] = await db.select()
        .from(userAgents)
        .where(eq(userAgents.user_id, userId))
        .limit(1);
      return agent;
    } catch (error) {
      console.error(`Error getting user agent for userId ${userId}:`, error);
      return undefined;
    }
  }
  
  async getUserAgentById(agentId: number): Promise<UserAgent | undefined> {
    try {
      const [agent] = await db.select()
        .from(userAgents)
        .where(eq(userAgents.id, agentId));
      return agent;
    } catch (error) {
      console.error(`Error getting user agent by ID ${agentId}:`, error);
      return undefined;
    }
  }
  
  async createUserAgent(userAgent: InsertUserAgent): Promise<UserAgent> {
    try {
      const [newAgent] = await db.insert(userAgents)
        .values({
          ...userAgent,
          created_at: userAgent.created_at || new Date()
        })
        .returning();
      return newAgent;
    } catch (error) {
      console.error('Error creating user agent:', error);
      throw error;
    }
  }
  
  // Phone Number methods
  async getPurchasedPhoneNumbers(userId: number): Promise<PurchasedPhoneNumber[]> {
    try {
      // Use raw SQL query to avoid syntax issues with Drizzle orderBy
      const { pool } = await import('./db');
      const result = await pool.query(
        'SELECT * FROM purchased_phone_numbers WHERE user_id = $1 ORDER BY purchased_at DESC',
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error(`Error getting purchased phone numbers for userId ${userId}:`, error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
