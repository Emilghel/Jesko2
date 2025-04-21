/**
 * Referral Tracking Middleware
 * 
 * This middleware captures referral parameters from URLs and stores them in:
 * 1. The user's session for conversion attribution
 * 2. The database for analytics purposes
 */

import { Request, Response, NextFunction } from 'express';
import { IStorage } from '../storage';
import { Session } from 'express-session';

// Extend the session type to include our custom properties
declare module 'express-session' {
  interface SessionData {
    referralInfo?: ReferralInfo;
  }
}

// Cookie name for storing referral data
const REFERRAL_COOKIE_NAME = 'wln_referral_data';
// Cookie expiration in days
const COOKIE_EXPIRATION_DAYS = 30;

/**
 * Interface for referral information stored in session/cookie
 */
export interface ReferralInfo {
  referralCode: string;
  partnerId: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  timestamp: string;
  landingPage?: string;
}

/**
 * Hash an IP address for privacy
 * This creates a one-way hash of the IP to preserve user privacy while still allowing
 * unique visitor tracking
 */
function hashIpAddress(ip: string): string {
  // Simple hash function for demo purposes
  // In production, use a proper crypto hash
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Create referral tracking middleware
 * @param storage Database storage interface
 */
export function createReferralTrackingMiddleware(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract referral parameters from query
      const ref = req.query.ref as string;
      const utmSource = req.query.utm_source as string;
      const utmMedium = req.query.utm_medium as string;
      const utmCampaign = req.query.utm_campaign as string;
      const utmTerm = req.query.utm_term as string;
      const utmContent = req.query.utm_content as string;
      
      // If a referral code is present
      if (ref) {
        // Look up partner by referral code
        const partner = await storage.getPartnerByReferralCode(ref);
        
        if (partner) {
          // Get client IP and user agent
          const clientIp = req.headers['x-forwarded-for'] as string || 
            req.socket.remoteAddress || 
            'unknown';
            
          const userAgent = req.headers['user-agent'] || 'unknown';
          const referrer = req.headers.referer || null;
          
          // Create referral info for session/cookie
          const referralInfo: ReferralInfo = {
            referralCode: ref,
            partnerId: partner.id,
            utmSource: utmSource || undefined,
            utmMedium: utmMedium || undefined,
            utmCampaign: utmCampaign || undefined,
            utmTerm: utmTerm || undefined,
            utmContent: utmContent || undefined,
            timestamp: new Date().toISOString(),
            landingPage: req.originalUrl
          };
          
          // Store in cookie (for routes without session)
          res.cookie(REFERRAL_COOKIE_NAME, JSON.stringify(referralInfo), {
            maxAge: COOKIE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
          
          // Store in session if available
          if (req.session) {
            req.session.referralInfo = referralInfo;
          }
          
          // Record click in database asynchronously (don't block request)
          storage.addReferralClick({
            partner_id: partner.id,
            referral_code: ref,
            ip_address: hashIpAddress(clientIp),
            user_agent: userAgent.substring(0, 255), // Prevent oversized entries
            referrer: referrer || null,
            base_url: req.protocol + '://' + req.get('host'),
            custom_url: req.path,
            utm_source: utmSource || null,
            utm_medium: utmMedium || null,
            utm_campaign: utmCampaign || null,
            utm_term: utmTerm || null,
            utm_content: utmContent || null
          }).catch((error: Error) => {
            console.error('Error recording referral click:', error);
          });
          
          // Log for debugging
          console.log(`Referral click recorded for partner ${partner.id} with code ${ref}`);
        } else {
          console.warn(`Invalid referral code used: ${ref}`);
        }
      }
      
      // Continue with the request
      next();
    } catch (error) {
      console.error('Error in referral tracking middleware:', error);
      // Don't fail the request if tracking fails
      next();
    }
  };
}

/**
 * Get referral information from request
 * Checks both session and cookie storage
 */
export function getReferralInfo(req: Request): ReferralInfo | null {
  // Check session first
  if (req.session && req.session.referralInfo) {
    return req.session.referralInfo;
  }
  
  // Fallback to cookie
  if (req.cookies && req.cookies[REFERRAL_COOKIE_NAME]) {
    try {
      return JSON.parse(req.cookies[REFERRAL_COOKIE_NAME]);
    } catch (error) {
      console.error('Error parsing referral cookie:', error);
      return null;
    }
  }
  
  return null;
}

/**
 * Attribution middleware for conversions
 * This should be used on routes that represent conversion events (e.g., signup, purchase)
 */
export function createConversionAttributionMiddleware(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for referral info
      const referralInfo = getReferralInfo(req);
      
      if (referralInfo) {
        // Store referral info in request for downstream handlers
        (req as any).referralInfo = referralInfo;
        
        // If we have a user ID (e.g., after signup/login), attach that too
        if ((req as any).user?.id) {
          // Record the conversion attribution
          await storage.attributeConversion({
            partner_id: referralInfo.partnerId,
            referral_code: referralInfo.referralCode,
            user_id: (req as any).user.id,
            conversion_type: req.path.includes('signup') ? 'signup' : 'purchase',
            value: null, // Optional monetary value of the conversion
            utm_source: referralInfo.utmSource || null,
            utm_medium: referralInfo.utmMedium || null,
            utm_campaign: referralInfo.utmCampaign || null,
            ip_address: null, // Will be auto-tracked by DB
            referrer: null,
            conversion_page: req.originalUrl
          });
          
          // Log for debugging
          console.log(`Conversion attributed to partner ${referralInfo.partnerId} with code ${referralInfo.referralCode}`);
        }
      }
      
      // Continue with the request
      next();
    } catch (error: unknown) {
      console.error('Error in conversion attribution middleware:', error);
      // Don't fail the request if attribution fails
      next();
    }
  };
}