import { Router } from 'express';
import { db } from './db';
import { isPartner, checkPartnerStatus, PartnerRequest } from './lib/partner-middleware';
import { storage } from './storage';
import { 
  partners, users, referrals, partnerCommissions, partnerPayments, referralClicks,
  savedReferralLinks, partnerSeoKeywords,
  ReferralStatus, CommissionStatus
} from '@shared/schema';
import { eq, and, desc, sum, count, gte, lte, sql } from 'drizzle-orm';

const router = Router();

// Simple endpoint to check partner status (doesn't require partner to be active)
router.get('/status', checkPartnerStatus);

// Get partner dashboard data
router.get('/dashboard', isPartner, async (req: PartnerRequest, res) => {
  try {
    const partner = req.partner;
    
    // Return basic partner information
    res.json({
      id: partner.id,
      company_name: partner.company_name,
      contact_name: partner.contact_name,
      email: partner.email || req.user?.email,
      referral_code: partner.referral_code,
      status: partner.status,
      commission_rate: partner.commission_rate,
      created_at: partner.created_at,
      earnings_balance: partner.earnings_balance || 0,
      total_earnings: partner.total_earnings || 0
    });
  } catch (error) {
    console.error('Error fetching partner dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch partner dashboard data' });
  }
});

// Get partner statistics
router.get('/stats', isPartner, async (req: PartnerRequest, res) => {
  try {
    const partner = req.partner;
    const timeRange = req.query.timeRange || 'all';
    
    // Define date range based on timeRange parameter
    let startDate: Date | null = null;
    const now = new Date();
    
    if (timeRange === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'year') {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    // Base query conditions
    let referralCondition = eq(referrals.partner_id, partner.id);
    let commissionCondition = eq(partnerCommissions.partner_id, partner.id);
    
    // Add date filters if needed
    if (startDate) {
      referralCondition = and(
        referralCondition,
        gte(referrals.created_at, startDate.toISOString())
      );
      commissionCondition = and(
        commissionCondition,
        gte(partnerCommissions.created_at, startDate.toISOString())
      );
    }
    
    // Get total referrals
    const totalReferrals = await db.select({ count: count() })
      .from(referrals)
      .where(referralCondition);
    
    // Get active referrals (converted to customers)
    const activeReferrals = await db.select({ count: count() })
      .from(referrals)
      .where(and(
        referralCondition,
        eq(referrals.status, ReferralStatus.CONVERTED)
      ));
    
    // Get total commission
    const totalCommission = await db.select({ total: sum(partnerCommissions.amount) })
      .from(partnerCommissions)
      .where(commissionCondition);
    
    // Get pending commission
    const pendingCommission = await db.select({ total: sum(partnerCommissions.amount) })
      .from(partnerCommissions)
      .where(and(
        commissionCondition,
        eq(partnerCommissions.status, CommissionStatus.PENDING)
      ));
    
    // Get paid commission
    const paidCommission = await db.select({ total: sum(partnerCommissions.amount) })
      .from(partnerCommissions)
      .where(and(
        commissionCondition,
        eq(partnerCommissions.status, CommissionStatus.PAID)
      ));
    
    // Calculate conversion rate
    const conversionRate = totalReferrals[0].count > 0 
      ? (activeReferrals[0].count / totalReferrals[0].count) * 100 
      : 0;
    
    // Generate trend data (in a real application, this would come from actual data)
    // For demonstration purposes, we'll create sample trend data
    const generateTrendData = (days: number, min: number, max: number) => {
      const data = [];
      const today = new Date();
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        // Generate a somewhat realistic random value
        const value = Math.floor(min + Math.random() * (max - min));
        
        data.push({
          date: date.toISOString().split('T')[0],
          value: value
        });
      }
      
      return data;
    };
    
    // Number of days for trend data
    let days = 30;
    if (timeRange === 'week') days = 7;
    if (timeRange === 'year') days = 365;
    
    // Response with statistics
    res.json({
      totalCommission: totalCommission[0].total || 0,
      pendingCommission: pendingCommission[0].total || 0,
      paidCommission: paidCommission[0].total || 0,
      totalReferrals: totalReferrals[0].count || 0,
      activeReferrals: activeReferrals[0].count || 0,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      trendData: {
        referrals: generateTrendData(days, 0, 5),
        clicks: generateTrendData(days, 0, 10),
        commissions: generateTrendData(days, 0, 100),
        conversions: generateTrendData(days, 0, 3)
      },
      referralSources: [
        { name: 'Email', value: 42, color: '#38BDF8' },
        { name: 'Social Media', value: 28, color: '#A855F7' },
        { name: 'Website', value: 15, color: '#10B981' },
        { name: 'Direct', value: 10, color: '#F59E0B' },
        { name: 'Other', value: 5, color: '#6366F1' }
      ]
    });
  } catch (error) {
    console.error('Error fetching partner stats:', error);
    res.status(500).json({ error: 'Failed to fetch partner statistics' });
  }
});

// Get partner referrals
router.get('/referrals', isPartner, async (req: PartnerRequest, res) => {
  try {
    const partner = req.partner;
    const timeRange = req.query.timeRange || 'all';
    
    // Define date filter
    let startDate: Date | null = null;
    const now = new Date();
    
    if (timeRange === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'year') {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    // Check if referrals table exists
    let hasReferralsTable = false;
    try {
      // Attempt to query the table
      await db.select().from(referrals).limit(1);
      hasReferralsTable = true;
    } catch (err) {
      console.log('Referrals table not found or not accessible');
      // Return empty array if table doesn't exist
      return res.json({ referrals: [] });
    }
    
    if (hasReferralsTable) {
      // Build query condition
      let condition = eq(referrals.partner_id, partner.id);
      if (startDate) {
        condition = and(
          condition, 
          gte(referrals.created_at, startDate.toISOString())
        );
      }
      
      // Get referrals
      const partnerReferrals = await db
        .select({
          id: referrals.id,
          user_id: referrals.user_id,
          status: referrals.status,
          created_at: referrals.created_at,
          first_purchase_date: referrals.first_purchase_date,
          total_purchases: referrals.total_purchases,
          email: users.email
        })
        .from(referrals)
        .leftJoin(users, eq(referrals.user_id, users.id))
        .where(condition)
        .orderBy(desc(referrals.created_at));
      
      // Format the response
      const result = partnerReferrals.map(ref => ({
        id: ref.id,
        referred_user_id: ref.user_id,
        user_email: ref.email,
        status: ref.status,
        created_at: ref.created_at,
        first_purchase_date: ref.first_purchase_date,
        total_purchases: ref.total_purchases || 0
      }));
      
      res.json({ referrals: result });
    } else {
      // Return empty array as fallback
      res.json({ referrals: [] });
    }
  } catch (error) {
    console.error('Error fetching partner referrals:', error);
    // Return empty array instead of error for better UX
    res.json({ referrals: [] });
  }
});

// Get partner commissions
router.get('/commissions', isPartner, async (req: PartnerRequest, res) => {
  try {
    const partner = req.partner;
    const timeRange = req.query.timeRange || 'all';
    
    // Define date filter
    let startDate: Date | null = null;
    const now = new Date();
    
    if (timeRange === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'year') {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    // Check if commissions table exists
    let hasCommissionsTable = false;
    try {
      // Attempt to query the table
      await db.select().from(partnerCommissions).limit(1);
      hasCommissionsTable = true;
    } catch (err) {
      console.log('Partner commissions table not found or not accessible');
      // Return empty array if table doesn't exist
      return res.json({ commissions: [] });
    }
    
    if (hasCommissionsTable) {
      // Build query condition
      let condition = eq(partnerCommissions.partner_id, partner.id);
      if (startDate) {
        condition = and(
          condition, 
          gte(partnerCommissions.created_at, startDate.toISOString())
        );
      }
      
      // Get commissions
      const commissions = await db
        .select()
        .from(partnerCommissions)
        .where(condition)
        .orderBy(desc(partnerCommissions.created_at));
      
      res.json({ commissions });
    } else {
      // Return empty array as fallback
      res.json({ commissions: [] });
    }
  } catch (error) {
    console.error('Error fetching partner commissions:', error);
    // Return empty array instead of error for better UX
    res.json({ commissions: [] });
  }
});

// Get partner payments
router.get('/payments', isPartner, async (req: PartnerRequest, res) => {
  try {
    const partner = req.partner;
    
    // Check if payments table exists
    let hasPaymentsTable = false;
    try {
      // Attempt to query the table 
      await db.select().from(partnerPayments).limit(1);
      hasPaymentsTable = true;
    } catch (err) {
      console.log('Partner payments table not found or not accessible');
      // Return empty array if table doesn't exist
      return res.json({ payments: [] });
    }
    
    if (hasPaymentsTable) {
      // Get payments
      const payments = await db
        .select()
        .from(partnerPayments)
        .where(eq(partnerPayments.partner_id, partner.id))
        .orderBy(desc(partnerPayments.created_at));
      
      res.json({ payments });
    } else {
      // Return empty array as fallback
      res.json({ payments: [] });
    }
  } catch (error) {
    console.error('Error fetching partner payments:', error);
    // Return empty array instead of error for better UX
    res.json({ payments: [] });
  }
});

// Generate referral URL
router.post('/generate-referral', isPartner, async (req: PartnerRequest, res) => {
  try {
    const partner = req.partner;
    const { campaignName, targetUrl } = req.body;
    
    if (!campaignName || !targetUrl) {
      return res.status(400).json({ error: "Campaign name and target URL are required" });
    }
    
    // Generate a unique tracking ID
    const trackingId = `${partner.referral_code}-${Date.now().toString(36)}`;
    
    // Create referral URL
    const referralUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}ref=${partner.referral_code}&tid=${trackingId}`;
    
    // Try to save the referral link to the database if the table exists
    try {
      // Check if table exists
      await db.select().from(savedReferralLinks).limit(1);
      
      // Save the referral link
      await db.insert(savedReferralLinks).values({
        partner_id: partner.id,
        tracking_id: trackingId,
        campaign_name: campaignName,
        target_url: targetUrl,
        referral_url: referralUrl,
        created_at: new Date().toISOString()
      });
    } catch (dbError) {
      // Just log the error and continue - saving to DB is optional
      console.log('Could not save referral link to database:', dbError);
    }
    
    // Return the generated referral URL
    res.json({
      referralUrl,
      trackingId,
      referralCode: partner.referral_code
    });
  } catch (error) {
    console.error('Error generating referral URL:', error);
    res.status(500).json({ error: 'Failed to generate referral URL' });
  }
});

// Partner marketing resources
router.get('/marketing', isPartner, async (req: PartnerRequest, res) => {
  try {
    // Return marketing resources
    res.json({
      brandAssets: [
        {
          id: 1,
          name: "WarmLeadNetwork Logo",
          type: "image",
          url: "/assets/marketing/logo.png",
          description: "Official logo in PNG format"
        },
        {
          id: 2,
          name: "WarmLeadNetwork Vector Logo",
          type: "vector",
          url: "/assets/marketing/logo.svg",
          description: "Vector logo in SVG format"
        },
        {
          id: 3,
          name: "Brand Guidelines",
          type: "document",
          url: "/assets/marketing/brand-guidelines.pdf",
          description: "Complete brand guidelines and usage rules"
        }
      ],
      banners: [
        {
          id: 1,
          name: "Leaderboard Banner",
          size: "728x90",
          url: "/assets/marketing/banners/leaderboard.jpg",
          description: "Ideal for website headers"
        },
        {
          id: 2,
          name: "Sidebar Banner",
          size: "300x600",
          url: "/assets/marketing/banners/sidebar.jpg",
          description: "Perfect for sidebar placements"
        },
        {
          id: 3,
          name: "Mobile Banner",
          size: "320x50",
          url: "/assets/marketing/banners/mobile.jpg",
          description: "Optimized for mobile devices"
        }
      ],
      emailTemplates: [
        {
          id: 1,
          name: "Introduction Email",
          subject: "Boost Your Sales with WarmLeadNetwork",
          previewUrl: "/assets/marketing/emails/intro-preview.jpg",
          templateUrl: "/assets/marketing/emails/intro-template.html"
        },
        {
          id: 2,
          name: "Special Offer",
          subject: "Limited Time: 30% Off WarmLeadNetwork Subscription",
          previewUrl: "/assets/marketing/emails/offer-preview.jpg",
          templateUrl: "/assets/marketing/emails/offer-template.html"
        },
        {
          id: 3,
          name: "Case Study",
          subject: "How Company X Tripled Their Sales with WarmLeadNetwork",
          previewUrl: "/assets/marketing/emails/case-study-preview.jpg",
          templateUrl: "/assets/marketing/emails/case-study-template.html"
        }
      ],
      productSheets: [
        {
          id: 1,
          name: "AI Lead Generation Overview",
          url: "/assets/marketing/product-sheets/ai-lead-gen.pdf",
          description: "Complete breakdown of our AI lead generation capabilities"
        },
        {
          id: 2,
          name: "Video Marketing Feature Sheet",
          url: "/assets/marketing/product-sheets/video-marketing.pdf",
          description: "Detailed information about video marketing features"
        },
        {
          id: 3,
          name: "Pricing Comparison Guide",
          url: "/assets/marketing/product-sheets/pricing-comparison.pdf",
          description: "Value proposition and pricing comparison with competitors"
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching marketing resources:', error);
    res.status(500).json({ error: 'Failed to fetch marketing resources' });
  }
});

export default router;