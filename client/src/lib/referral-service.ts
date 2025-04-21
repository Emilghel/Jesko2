import { apiRequest } from "./queryClient";

export interface SavedReferralLink {
  id: number;
  partner_id: number;
  name: string;
  base_url: string;
  full_url: string;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  click_count: number;
  created_at: string;
}

export interface CreateSavedReferralLink {
  name: string;
  base_url: string;
  full_url: string;
  campaign?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

export interface ReferralClick {
  id: number;
  partner_id: number;
  referral_code: string;
  ip_address: string | null;
  user_agent: string | null;
  custom_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string | null;
  base_url: string;
  created_at: string;
  // Additional metadata properties
  is_unique?: boolean;
}

export interface ReferralClicksStats {
  totalClicks: number;
  uniqueClicks: number;
  conversionRate: number;
  clicksByDay: {
    date: string;
    clicks: number;
    uniqueClicks: number;
  }[];
  clicksBySource: {
    source: string;
    clicks: number;
  }[];
  clicksByMedium: {
    medium: string;
    clicks: number;
  }[];
  clicksByCampaign: {
    campaign: string;
    clicks: number;
  }[];
}

export interface ReferralClickRequest {
  referral_code: string;
  base_url?: string;
  custom_url?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Options for generating a referral link
 */
export interface ReferralLinkOptions {
  customPath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export const ReferralService = {
  /**
   * Track a referral click
   */
  async trackClick(data: ReferralClickRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiRequest('POST', '/api/track/referral-click', data);
      return await response.json();
    } catch (error) {
      console.error('Error tracking referral click:', error);
      return { success: false, error: 'Failed to track referral click' };
    }
  },

  /**
   * Get referral click statistics for the partner
   * Note: This requires partner authentication
   */
  async getClickStats(): Promise<ReferralClicksStats> {
    try {
      const response = await apiRequest('GET', '/api/partner/referral-clicks');
      
      if (!response.ok) {
        throw new Error('Failed to get referral click statistics');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting referral click statistics:', error);
      throw error;
    }
  },

  /**
   * Get recent referral clicks for the partner
   * Note: This requires partner authentication
   */
  async getRecentClicks(limit: number = 10): Promise<ReferralClick[]> {
    try {
      const response = await apiRequest('GET', `/api/partner/referral-clicks/recent?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to get recent referral clicks');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting recent referral clicks:', error);
      throw error;
    }
  },

  /**
   * Generate a referral link with the given parameters
   */
  generateReferralLink(referralCode: string, baseUrl: string, options?: ReferralLinkOptions): string {
    // Start with the base URL
    let url = baseUrl;
    
    // Add trailing slash if not present
    if (!url.endsWith('/')) {
      url += '/';
    }
    
    // Add custom path if provided
    if (options?.customPath) {
      // Remove leading slash if present
      const path = options.customPath.startsWith('/') ? options.customPath.substring(1) : options.customPath;
      url += path;
    }
    
    // Start building query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('ref', referralCode);
    
    // Add UTM parameters if provided
    if (options?.utmSource) queryParams.append('utm_source', options.utmSource);
    if (options?.utmMedium) queryParams.append('utm_medium', options.utmMedium);
    if (options?.utmCampaign) queryParams.append('utm_campaign', options.utmCampaign);
    if (options?.utmTerm) queryParams.append('utm_term', options.utmTerm);
    if (options?.utmContent) queryParams.append('utm_content', options.utmContent);
    
    // Add query parameters to URL
    return `${url}?${queryParams.toString()}`;
  },

  /**
   * Get all saved referral links for the partner
   * Note: This requires partner authentication
   */
  async getSavedReferralLinks(): Promise<SavedReferralLink[]> {
    try {
      const response = await apiRequest('GET', '/api/partner/saved-referral-links');
      
      if (!response.ok) {
        throw new Error('Failed to get saved referral links');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting saved referral links:', error);
      throw error;
    }
  },

  /**
   * Get a specific saved referral link by ID
   * Note: This requires partner authentication
   */
  async getSavedReferralLink(id: number): Promise<SavedReferralLink> {
    try {
      const response = await apiRequest('GET', `/api/partner/saved-referral-links/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to get saved referral link');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting saved referral link:', error);
      throw error;
    }
  },

  /**
   * Create a new saved referral link
   * Note: This requires partner authentication
   */
  async createSavedReferralLink(data: CreateSavedReferralLink): Promise<SavedReferralLink> {
    try {
      const response = await apiRequest('POST', '/api/partner/saved-referral-links', data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create saved referral link');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating saved referral link:', error);
      throw error;
    }
  },

  /**
   * Update an existing saved referral link
   * Note: This requires partner authentication
   */
  async updateSavedReferralLink(id: number, data: Partial<CreateSavedReferralLink>): Promise<SavedReferralLink> {
    try {
      const response = await apiRequest('PATCH', `/api/partner/saved-referral-links/${id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update saved referral link');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating saved referral link:', error);
      throw error;
    }
  },

  /**
   * Delete a saved referral link
   * Note: This requires partner authentication
   */
  async deleteSavedReferralLink(id: number): Promise<boolean> {
    try {
      const response = await apiRequest('DELETE', `/api/partner/saved-referral-links/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete saved referral link');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting saved referral link:', error);
      throw error;
    }
  },

  /**
   * Track a click on a saved referral link
   */
  async trackSavedLinkClick(id: number): Promise<{ success: boolean }> {
    try {
      const response = await apiRequest('POST', `/api/partner/saved-referral-links/${id}/click`);
      
      if (!response.ok) {
        throw new Error('Failed to track click on saved referral link');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error tracking click on saved referral link:', error);
      throw error;
    }
  }
};