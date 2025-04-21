import { Request, Response } from 'express';
import { storage } from '../storage';
import { contentPerformanceHistory, contentLinkClicks, InsertContentLinkClick } from '../../shared/schema';
import { db } from '../db';
import { insertContentPerformanceHistorySchema } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Helper function to detect device type from user agent
 * @param userAgent User agent string
 * @returns Device type string (desktop, mobile, tablet)
 */
function detectDeviceType(userAgent: string): string {
  const mobileRegex = /android|iphone|ipad|ipod|blackberry|windows\s+phone/i;
  const tabletRegex = /ipad|android(?!.*mobile)/i;
  
  if (tabletRegex.test(userAgent)) {
    return 'tablet';
  } else if (mobileRegex.test(userAgent)) {
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * Helper function to detect browser from user agent
 * @param userAgent User agent string
 * @returns Browser name
 */
function detectBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari';
  } else if (userAgent.includes('Edg')) {
    return 'Edge';
  } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
    return 'Internet Explorer';
  }
  
  return 'Other';
}

/**
 * Helper function to detect OS from user agent
 * @param userAgent User agent string
 * @returns Operating system name
 */
function detectOS(userAgent: string): string {
  if (userAgent.includes('Windows')) {
    return 'Windows';
  } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
    return 'MacOS';
  } else if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
    return 'Linux';
  } else if (userAgent.includes('Android')) {
    return 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) {
    return 'iOS';
  }
  
  return 'Other';
}

/**
 * Register content link tracking routes
 * @param app Express application
 */
export function registerContentLinkTrackingRoutes(app: any) {
  // Track click on content link and redirect to the target URL
  app.get('/r/cl/:linkId', async (req: Request, res: Response) => {
    const { linkId } = req.params;
    
    if (!linkId || isNaN(parseInt(linkId))) {
      return res.status(400).json({ error: 'Invalid link ID' });
    }
    
    try {
      // Get the link from the database
      const link = await storage.getContentLinkById(parseInt(linkId));
      
      if (!link) {
        return res.status(404).json({ error: 'Link not found' });
      }
      
      // Record the click
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to beginning of day for aggregation purposes
      
      // Check if we already have a record for today
      const [existingRecord] = await db
        .select()
        .from(contentPerformanceHistory)
        .where(
          and(
            eq(contentPerformanceHistory.content_link_id, parseInt(linkId)),
            eq(contentPerformanceHistory.date, today)
          )
        );
      
      if (existingRecord) {
        // Update existing record with new click
        await storage.incrementContentLinkClicks(existingRecord.id);
      } else {
        // Create new record for today
        const newRecord = insertContentPerformanceHistorySchema.parse({
          content_link_id: parseInt(linkId),
          clicks: 1,
          position: 0, // We'll update this from external sources
        });
        
        await storage.createContentPerformanceHistory(newRecord);
      }
      
      // Increment overall click count on the link
      await storage.incrementContentLinkClickCount(parseInt(linkId));
      
      // Collect referrer and UTM data if available
      const referrer = req.get('Referrer') || 'direct';
      const utmSource = req.query.utm_source as string || 'none';
      const utmMedium = req.query.utm_medium as string || 'none';
      const utmCampaign = req.query.utm_campaign as string || 'none';

      // Store detailed click data
      await storage.saveContentLinkClickDetails({
        content_link_id: parseInt(linkId),
        referrer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: req.query.utm_term as string || null,
        utm_content: req.query.utm_content as string || null,
        ip_address: req.ip,
        user_agent: req.get('User-Agent') || '',
        device_type: detectDeviceType(req.get('User-Agent') || ''),
        browser: detectBrowser(req.get('User-Agent') || ''),
        country: null, // We could use a GeoIP service here
        city: null,
        os: detectOS(req.get('User-Agent') || '')
      });
      
      // Redirect to the target URL
      res.redirect(link.url);
    } catch (error) {
      console.error('Error tracking content link click:', error);
      return res.status(500).json({ error: 'Failed to track click' });
    }
  });

  // API to get content link performance data
  app.get('/api/content-links/:linkId/performance', async (req: Request, res: Response) => {
    const { linkId } = req.params;
    
    if (!linkId || isNaN(parseInt(linkId))) {
      return res.status(400).json({ error: 'Invalid link ID' });
    }
    
    try {
      // Get the performance history for this link
      const history = await storage.getContentPerformanceHistory(parseInt(linkId));
      
      // Get additional click stats
      const clickStats = await storage.getContentLinkClickStats(parseInt(linkId));
      
      res.json({
        performance_history: history,
        click_stats: clickStats
      });
    } catch (error) {
      console.error('Error getting content link performance:', error);
      return res.status(500).json({ error: 'Failed to get performance data' });
    }
  });

  // API to get content link performance data by keyword ID
  app.get('/api/keywords/:keywordId/content-links/performance', async (req: Request, res: Response) => {
    const { keywordId } = req.params;
    
    if (!keywordId || isNaN(parseInt(keywordId))) {
      return res.status(400).json({ error: 'Invalid keyword ID' });
    }
    
    try {
      // Get the content links for this keyword
      const links = await storage.getContentLinksByKeywordId(parseInt(keywordId));
      
      // Get performance data for each link
      const performance = await Promise.all(
        links.map(async (link) => {
          const history = await storage.getContentPerformanceHistory(link.id);
          const clickStats = await storage.getContentLinkClickStats(link.id);
          
          return {
            link,
            performance_history: history,
            click_stats: clickStats
          };
        })
      );
      
      res.json(performance);
    } catch (error) {
      console.error('Error getting keyword content link performance:', error);
      return res.status(500).json({ error: 'Failed to get performance data' });
    }
  });
}