import { apiRequest } from './queryClient';
import { SeoKeyword, ContentLink } from '@/types/seoTypes';

/**
 * Service for SEO keywords management
 * Handles all API calls related to SEO keywords and content links
 */
export const seoKeywordService = {
  /**
   * Get all keywords for a partner
   */
  async getKeywordsByPartnerId(partnerId: number | undefined | null): Promise<SeoKeyword[]> {
    try {
      // If partnerId is undefined or null, use the current partner endpoint
      const url = (partnerId === undefined || partnerId === null) 
        ? `/api/seo-keywords/my-keywords` 
        : `/api/seo-keywords/${partnerId}`;
      
      console.log(`Fetching SEO keywords from: ${url}`);
      const response = await apiRequest('GET', url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to fetch keywords: ${response.status}`);
      }
      
      // Parse and validate the data as much as possible
      const data = await response.json();
      
      // Return an empty array if data is null or undefined
      if (!data) return [];
      
      // Ensure the response is an array
      if (!Array.isArray(data)) {
        console.error('Unexpected response format, expected array:', data);
        return [];
      }
      
      // Map the data to ensure it matches our expected format
      return data.map(keyword => ({
        id: keyword.id,
        text: keyword.text || 'Unknown Keyword',
        searchVolume: keyword.searchVolume || 0,
        difficulty: keyword.difficulty || 0,
        status: keyword.status || 'new',
        notes: keyword.notes || '',
        dateAdded: keyword.dateAdded || new Date().toISOString(),
        contentLinks: Array.isArray(keyword.contentLinks) ? keyword.contentLinks : [],
        tags: Array.isArray(keyword.tags) ? keyword.tags : []
      }));
    } catch (error) {
      console.error('Error fetching SEO keywords:', error);
      throw error;
    }
  },

  /**
   * Get a single keyword by ID
   */
  async getKeywordById(keywordId: number, partnerId: number | null): Promise<SeoKeyword> {
    try {
      // If partnerId is null, use the current partner endpoint
      const url = partnerId === null 
        ? `/api/seo-keywords/${keywordId}`
        : `/api/seo-keywords/${partnerId}/${keywordId}`;
        
      const response = await apiRequest('GET', url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch keyword: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching SEO keyword ${keywordId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new keyword for a partner
   */
  async createKeyword(keyword: SeoKeyword, partnerId: number | null): Promise<SeoKeyword> {
    try {
      // Always use the base endpoint for creating keywords
      // The server will automatically assign the partnerId for the current user if not provided
      const url = `/api/seo-keywords`;
      
      // If partnerId is explicitly provided, include it in the request
      const keywordData = partnerId !== null 
        ? { ...keyword, partnerId } 
        : keyword;
        
      console.log(`Creating keyword with URL: ${url}`, keywordData);
      const response = await apiRequest('POST', url, keywordData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from server:', errorData);
        throw new Error(errorData.message || `Failed to create keyword: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating SEO keyword:', error);
      throw error;
    }
  },

  /**
   * Update an existing keyword
   */
  async updateKeyword(keywordId: number, keyword: SeoKeyword, partnerId: number | null): Promise<SeoKeyword> {
    try {
      // If partnerId is null, use the current partner endpoint
      const url = partnerId === null 
        ? `/api/seo-keywords/${keywordId}`
        : `/api/seo-keywords/${partnerId}/${keywordId}`;
        
      console.log(`Updating keyword with URL: ${url}`);
      const response = await apiRequest('PUT', url, keyword);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update keyword: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error updating SEO keyword ${keywordId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a keyword
   */
  async deleteKeyword(keywordId: number, partnerId: number | null): Promise<void> {
    try {
      // If partnerId is null, use the current partner endpoint
      const url = partnerId === null 
        ? `/api/seo-keywords/${keywordId}`
        : `/api/seo-keywords/${partnerId}/${keywordId}`;
        
      console.log(`Deleting keyword with URL: ${url}`);
      const response = await apiRequest('DELETE', url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete keyword: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting SEO keyword ${keywordId}:`, error);
      throw error;
    }
  },

  /**
   * Get all content links for a keyword
   */
  async getContentLinksByKeywordId(keywordId: number, partnerId: number | null): Promise<ContentLink[]> {
    try {
      // If partnerId is null, use the current partner endpoint
      const url = partnerId === null 
        ? `/api/seo-keywords/keyword/${keywordId}/links`
        : `/api/seo-keywords/${partnerId}/keyword/${keywordId}/links`;
        
      console.log(`Fetching content links with URL: ${url}`);
      const response = await apiRequest('GET', url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server returned error:", errorData);
        throw new Error(errorData.message || errorData.error || `Failed to fetch content links: ${response.status}`);
      }
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error(`Error fetching content links for keyword ${keywordId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new content link for a keyword
   */
  async createContentLink(keywordId: number, link: ContentLink, partnerId: number | null): Promise<ContentLink> {
    try {
      // Always use the standard URL for content link creation
      // The server endpoint already checks permissions based on the keywordId
      const url = `/api/seo-keywords/keyword/${keywordId}/links`;
      
      // Make sure we're sending keywordId with the link
      const linkData = { 
        ...link,
        keywordId 
      };
        
      console.log(`Creating content link with URL: ${url}`, JSON.stringify(linkData));
      const response = await apiRequest('POST', url, linkData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server returned error:", errorData);
        throw new Error(errorData.message || errorData.error || `Failed to create content link: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error creating content link for keyword ${keywordId}:`, error);
      throw error;
    }
  },

  /**
   * Update an existing content link
   */
  async updateContentLink(linkId: number, link: ContentLink, keywordId: number, partnerId: number | null): Promise<ContentLink> {
    try {
      // If partnerId is null, use the current partner endpoint
      const url = partnerId === null 
        ? `/api/seo-keywords/keyword/${keywordId}/links/${linkId}`
        : `/api/seo-keywords/${partnerId}/keyword/${keywordId}/links/${linkId}`;
        
      console.log(`Updating content link with URL: ${url}`, JSON.stringify(link));
      const response = await apiRequest('PUT', url, link);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server returned error:", errorData);
        throw new Error(errorData.message || errorData.error || `Failed to update content link: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error updating content link ${linkId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a content link
   */
  async deleteContentLink(linkId: number, keywordId: number, partnerId: number | null): Promise<void> {
    try {
      // The server endpoint for deleting content links doesn't require partnerId or keywordId
      // It verifies permission based on the link ID
      const url = `/api/seo-keywords/links/${linkId}`;
        
      console.log(`Deleting content link with URL: ${url}`);
      const response = await apiRequest('DELETE', url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server returned error:", errorData);
        throw new Error(errorData.message || errorData.error || `Failed to delete content link: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting content link ${linkId}:`, error);
      throw error;
    }
  },

  /**
   * Get performance history for a content link
   */
  async getLinkPerformanceHistory(linkId: number, keywordId: number, partnerId: number | null): Promise<any[]> {
    try {
      // The server endpoint for getting link history doesn't require partnerId or keywordId
      // It verifies permission based on the link ID
      const url = `/api/seo-keywords/links/${linkId}/history`;
        
      console.log(`Fetching link performance with URL: ${url}`);
      const response = await apiRequest('GET', url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server returned error:", errorData);
        throw new Error(errorData.message || errorData.error || `Failed to fetch link performance: ${response.status}`);
      }
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error(`Error fetching performance history for link ${linkId}:`, error);
      throw error;
    }
  },

  /**
   * Update performance metrics for a content link
   */
  async updateLinkPerformance(
    linkId: number, 
    keywordId: number, 
    partnerId: number | null, 
    performanceData: any
  ): Promise<any> {
    try {
      // If partnerId is null, use the current partner endpoint
      const url = partnerId === null 
        ? `/api/seo-keywords/keyword/${keywordId}/links/${linkId}/performance`
        : `/api/seo-keywords/${partnerId}/keyword/${keywordId}/links/${linkId}/performance`;
        
      console.log(`Updating link performance with URL: ${url}`, JSON.stringify(performanceData));
      const response = await apiRequest('POST', url, performanceData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server returned error:", errorData);
        throw new Error(errorData.message || errorData.error || `Failed to update link performance: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error updating performance for link ${linkId}:`, error);
      throw error;
    }
  }
};