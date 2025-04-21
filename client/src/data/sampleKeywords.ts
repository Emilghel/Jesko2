// Sample keyword data for demonstration purposes
// This would be replaced with real API data in production

export interface ContentLink {
  id: string;
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

export interface Keyword {
  id: string;
  text: string;
  searchVolume?: number;
  difficulty?: number;
  status: 'new' | 'in-progress' | 'published';
  notes?: string;
  dateAdded: string;
  contentLinks?: ContentLink[];
  tags?: string[];
}

export const sampleKeywords: Keyword[] = [
  {
    id: '1',
    text: 'ai video generation',
    searchVolume: 12500,
    difficulty: 68,
    status: 'published',
    notes: 'High competition but relevant to our core product. Focus on specific use cases and tutorials.',
    dateAdded: '2025-03-15T10:30:00Z',
    tags: ['product', 'high-volume', 'competitive'],
    contentLinks: [
      {
        id: '101',
        url: 'https://example.com/blog/ai-video-generation-guide',
        title: 'The Complete Guide to AI Video Generation in 2025',
        publishDate: '2025-03-20T14:20:00Z',
        notes: 'Comprehensive guide covering all aspects of our platform',
        performance: {
          clicks: 587,
          impressions: 4350,
          position: 4.2,
          lastUpdated: '2025-04-10T08:00:00Z'
        }
      },
      {
        id: '102',
        url: 'https://example.com/tutorials/image-to-video',
        title: 'How to Transform Still Images into Dynamic Videos Using AI',
        publishDate: '2025-03-25T09:15:00Z',
        performance: {
          clicks: 342,
          impressions: 2800,
          position: 5.7,
          lastUpdated: '2025-04-10T08:00:00Z'
        }
      }
    ]
  },
  {
    id: '2',
    text: 'ai voice synthesis',
    searchVolume: 8400,
    difficulty: 52,
    status: 'published',
    dateAdded: '2025-03-10T08:45:00Z',
    tags: ['product', 'medium-volume'],
    contentLinks: [
      {
        id: '201',
        url: 'https://example.com/blog/ai-voice-synthesis-explained',
        title: 'AI Voice Synthesis: From Text to Realistic Speech',
        publishDate: '2025-03-18T11:30:00Z',
        performance: {
          clicks: 426,
          impressions: 3100,
          position: 3.1,
          lastUpdated: '2025-04-10T08:00:00Z'
        }
      }
    ]
  },
  {
    id: '3',
    text: 'how to create ai marketing videos',
    searchVolume: 5200,
    difficulty: 41,
    status: 'in-progress',
    notes: 'Long-tail keyword with good conversion potential. Focus on step-by-step tutorial.',
    dateAdded: '2025-03-25T15:20:00Z',
    tags: ['tutorial', 'marketing', 'long-tail'],
    contentLinks: []
  },
  {
    id: '4',
    text: 'best ai video editors',
    searchVolume: 18900,
    difficulty: 75,
    status: 'new',
    dateAdded: '2025-04-02T09:10:00Z',
    tags: ['product comparison', 'high-volume', 'competitive'],
    contentLinks: []
  },
  {
    id: '5',
    text: 'ai dubbing for videos',
    searchVolume: 4600,
    difficulty: 39,
    status: 'published',
    dateAdded: '2025-03-08T16:45:00Z',
    tags: ['product', 'localization', 'international'],
    contentLinks: [
      {
        id: '501',
        url: 'https://example.com/blog/ai-dubbing-multiple-languages',
        title: 'How to Dub Your Videos in 20+ Languages with AI',
        publishDate: '2025-03-12T10:00:00Z',
        notes: 'Emphasizes our multilingual capabilities',
        performance: {
          clicks: 315,
          impressions: 2450,
          position: 2.8,
          lastUpdated: '2025-04-10T08:00:00Z'
        }
      }
    ]
  },
  {
    id: '6',
    text: 'ai generated video cost',
    searchVolume: 6300,
    difficulty: 44,
    status: 'in-progress',
    notes: 'Price-sensitive audience. Highlight our coin-based system and value proposition.',
    dateAdded: '2025-03-30T11:20:00Z',
    tags: ['pricing', 'comparison', 'commercial'],
    contentLinks: []
  },
  {
    id: '7',
    text: 'video to text transcription ai',
    searchVolume: 7800,
    difficulty: 48,
    status: 'new',
    dateAdded: '2025-04-05T14:30:00Z',
    tags: ['product', 'accessibility'],
    contentLinks: []
  },
  {
    id: '8',
    text: 'ai video call agent',
    searchVolume: 3200,
    difficulty: 35,
    status: 'published',
    dateAdded: '2025-03-20T13:15:00Z',
    tags: ['product', 'sales', 'business'],
    contentLinks: [
      {
        id: '801',
        url: 'https://example.com/blog/ai-sales-agents-guide',
        title: 'Creating Effective AI Sales Agents for Video Calls',
        publishDate: '2025-03-23T09:30:00Z',
        performance: {
          clicks: 278,
          impressions: 1950,
          position: 3.4,
          lastUpdated: '2025-04-10T08:00:00Z'
        }
      }
    ]
  }
];