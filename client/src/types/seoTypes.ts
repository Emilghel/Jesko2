// SEO Keyword Tracker Types

// Enum for keyword status
export enum SeoKeywordStatus {
  NEW = "new",
  IN_PROGRESS = "in-progress",
  PUBLISHED = "published"
}

// ContentLink interface matching the current component requirements
export interface ContentLink {
  id?: number; // ID is optional for new content links (server will assign it)
  url: string;
  title: string;
  publishDate: string;
  notes?: string;
  performance?: {
    clicks?: number;
    impressions?: number;
    position?: number;
    lastUpdated?: string;
  };
}

// SEO Keyword interface matching the current component requirements
export interface SeoKeyword {
  id?: number; // ID is optional for new keywords (server will assign it)
  text: string;
  searchVolume?: number;
  difficulty?: number;
  status: 'new' | 'in-progress' | 'published';
  notes?: string;
  dateAdded: string;
  contentLinks?: ContentLink[];
  tags?: string[];
}

// Performance history for a content link
export interface ContentPerformanceHistory {
  id: number;
  contentLinkId: number;
  date: string;
  clicks: number;
  impressions: number;
  position: number;
}