import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimplePagination } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Filter, Search } from 'lucide-react';

// Types
interface StockVideo {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  aspectRatio: string;
  category: string;
  tags: string[];
  createdAt: string;
  userId: number | null;
  downloadCount: number;
  isAIGenerated: boolean;
  promptUsed: string | null;
  sourceImageUrl: string | null;
  modelUsed: string;
}

interface StockVideosResponse {
  videos: StockVideo[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalVideos: number;
    videosPerPage: number;
  };
  categories: string[];
}

const FreeStockVideosPage: React.FC = () => {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState<string>('all');  // Changed from empty string to 'all'
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Query stock videos
  const { data, isLoading, error, refetch } = useQuery<StockVideosResponse>({
    queryKey: [
      '/api/stock-videos', 
      currentPage,
      category,
      search,
      sortBy,
      sortOrder,
      activeTab === 'ai' ? true : (activeTab === 'user' ? false : undefined)
    ],
    queryFn: async () => {
      let url = `/api/stock-videos?page=${currentPage}&limit=50`;
      
      if (category && category !== 'all') {
        url += `&category=${encodeURIComponent(category)}`;
      }
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      if (sortBy) {
        url += `&sortBy=${sortBy}`;
      }
      
      if (sortOrder) {
        url += `&sortOrder=${sortOrder}`;
      }
      
      // Filter by AI generated if tab is set
      if (activeTab === 'ai') {
        url += '&isAIGenerated=true';
      } else if (activeTab === 'user') {
        url += '&isAIGenerated=false';
      }
      
      console.log('Fetching stock videos with URL:', url);
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Stock videos API error:', errorText);
          throw new Error(`Failed to fetch stock videos: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Stock videos data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching stock videos:', error);
        throw error;
      }
    }
  });
  
  // Handle category change
  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setCurrentPage(1); // Reset to first page when changing filters
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    refetch();
  };
  
  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending when changing sort field
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page when changing sort
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when changing tabs
  };
  
  // Handle download
  const handleDownload = async (video: StockVideo) => {
    try {
      // First, update the download count via the API
      const response = await fetch(`/api/stock-videos/${video.id}/download`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to process download');
      }
      
      // Use the direct video URL from the video object for downloading
      // This ensures we get exactly the video that's being shown
      const videoUrl = video.videoUrl;
      
      if (!videoUrl) {
        throw new Error('Video URL not found');
      }
      
      console.log('Downloading video from URL:', videoUrl);
      
      // Create a download link and click it
      const downloadLink = document.createElement('a');
      downloadLink.href = videoUrl;
      downloadLink.download = `${video.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast({
        title: 'Download started',
        description: 'Your video download has started.'
      });
      
      // Refetch to update download count in the UI
      setTimeout(() => refetch(), 1000);
      
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'There was an error downloading the video.',
        variant: 'destructive'
      });
    }
  };
  
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Error loading stock videos</h1>
          <p className="mt-2">{(error as Error).message || 'Something went wrong'}</p>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Free Stock Videos</h1>
            <p className="text-muted-foreground">
              Browse and download free stock videos for your projects
            </p>
          </div>
          
          {/* Search form */}
          <form onSubmit={handleSearch} className="flex w-full md:w-auto gap-2">
            <Input
              placeholder="Search videos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64"
            />
            <Button type="submit" variant="default">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
        
        <Separator />
        
        {/* Tabs for filtering */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <TabsList>
              <TabsTrigger value="all">All Videos</TabsTrigger>
              <TabsTrigger value="ai">AI Generated</TabsTrigger>
              <TabsTrigger value="user">User Uploaded</TabsTrigger>
            </TabsList>
            
            <div className="flex flex-wrap gap-2">
              {/* Filter dropdown */}
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {data && data.categories && data.categories
                    .filter(cat => cat && cat.trim() !== '')
                    .map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              {/* Sort dropdown */}
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest First</SelectItem>
                  <SelectItem value="title">Alphabetical</SelectItem>
                  <SelectItem value="downloadCount">Most Downloaded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <TabsContent value="all" className="mt-6">
            <StockVideoGrid 
              videos={data?.videos || []} 
              isLoading={isLoading} 
              onDownload={handleDownload}
            />
          </TabsContent>
          
          <TabsContent value="ai" className="mt-6">
            <StockVideoGrid 
              videos={(data?.videos || []).filter(v => v.isAIGenerated)}
              isLoading={isLoading}
              onDownload={handleDownload}
            />
          </TabsContent>
          
          <TabsContent value="user" className="mt-6">
            <StockVideoGrid 
              videos={(data?.videos || []).filter(v => !v.isAIGenerated)}
              isLoading={isLoading}
              onDownload={handleDownload}
            />
          </TabsContent>
        </Tabs>
        
        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <SimplePagination
              currentPage={currentPage}
              totalPages={data.pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
        
        {/* Video count and stats */}
        {data && (
          <div className="text-center text-sm text-muted-foreground mt-4">
            Showing {(currentPage - 1) * 50 + 1}-
            {Math.min(currentPage * 50, data.pagination.totalVideos)} of{' '}
            {data.pagination.totalVideos} videos
          </div>
        )}
      </div>
    </div>
  );
};

// Stock Video Grid Component
interface StockVideoGridProps {
  videos: StockVideo[];
  isLoading: boolean;
  onDownload: (video: StockVideo) => void;
}

// Format duration (seconds to MM:SS)
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const StockVideoGrid: React.FC<StockVideoGridProps> = ({ videos, isLoading, onDownload }) => {
  // State to keep track of loaded videos
  const [videoRefs, setVideoRefs] = useState<Record<number, HTMLVideoElement | null>>({});
  const [videosReady, setVideosReady] = useState<boolean>(false);
  
  // Function to initialize the video refs
  useEffect(() => {
    if (!isLoading && videos.length > 0) {
      // Initialize with empty refs
      const initialRefs = videos.reduce((acc, video) => {
        acc[video.id] = null;
        return acc;
      }, {} as Record<number, HTMLVideoElement | null>);
      
      setVideoRefs(initialRefs);
    }
  }, [videos, isLoading]);
  
  // Set up intersection observer to play videos when they're visible
  useEffect(() => {
    if (videos.length === 0 || !videosReady) return;
    
    // Function to play videos in viewport for browsers that don't support IntersectionObserver
    const playVisibleVideos = () => {
      Object.values(videoRefs).forEach(videoEl => {
        if (!videoEl) return;
        
        const rect = videoEl.getBoundingClientRect();
        const isVisible = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
        
        if (isVisible) {
          if (videoEl.paused) {
            videoEl.play().catch(error => {
              console.log('Auto-play prevented:', error);
            });
          }
        } else {
          if (!videoEl.paused) {
            videoEl.pause();
          }
        }
      });
    };
    
    // Check if IntersectionObserver is available
    if ('IntersectionObserver' in window) {
      const options = {
        root: null,
        rootMargin: '50px', // Preload videos when they're close to the viewport
        threshold: 0.1
      };
      
      // Callback for when a video becomes visible
      const handleIntersection = (entries: IntersectionObserverEntry[]) => {
        entries.forEach(entry => {
          const videoElement = entry.target as HTMLVideoElement;
          
          if (entry.isIntersecting) {
            // Play the video when it becomes visible
            if (videoElement.paused) {
              videoElement.play().catch(error => {
                console.log('Auto-play prevented:', error);
              });
            }
          } else {
            // Pause the video when it's no longer visible
            if (!videoElement.paused) {
              videoElement.pause();
            }
          }
        });
      };
      
      // Create observer
      const observer = new IntersectionObserver(handleIntersection, options);
      
      // Observe all video elements
      Object.values(videoRefs).forEach(videoEl => {
        if (videoEl) {
          observer.observe(videoEl);
        }
      });
      
      console.log('Videos loaded, ready for automatic playback');
      
      // Clean up observer on unmount
      return () => {
        observer.disconnect();
      };
    } else {
      // Fallback for browsers without intersection observer
      // Use scroll and resize events to trigger visibility checks
      if (typeof window !== 'undefined') {
        // Use type assertion to help TypeScript understand that window is defined in this context
        const win = window as Window & typeof globalThis;
        win.addEventListener('scroll', playVisibleVideos);
        win.addEventListener('resize', playVisibleVideos);
        
        // Initial check
        playVisibleVideos();
        
        // Clean up event listeners on unmount
        return () => {
          win.removeEventListener('scroll', playVisibleVideos);
          win.removeEventListener('resize', playVisibleVideos);
        };
      }
      
      return undefined;
    }
  }, [videoRefs, videosReady, videos]);
  
  // When all videos are set up, mark them as ready
  useEffect(() => {
    if (videos.length > 0 && Object.keys(videoRefs).length === videos.length) {
      const allRefsSet = Object.values(videoRefs).every(ref => ref !== null);
      if (allRefsSet) {
        setVideosReady(true);
        console.log('Marking videos as ready for playback:', Object.keys(videoRefs).length);
      }
    }
  }, [videoRefs, videos]);
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-video bg-muted animate-pulse" />
            <CardContent className="p-4">
              <div className="h-5 bg-muted animate-pulse rounded-md mb-2" />
              <div className="h-4 bg-muted animate-pulse rounded-md w-3/4" />
              <div className="flex justify-between items-center mt-4">
                <div className="h-8 bg-muted animate-pulse rounded-md w-1/4" />
                <div className="h-8 bg-muted animate-pulse rounded-md w-1/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium">No videos found</h3>
        <p className="text-muted-foreground mt-2">
          Try changing your search or filter criteria
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <Card key={video.id} className="overflow-hidden flex flex-col h-full group">
          <div className="relative overflow-hidden aspect-video">
            <video 
              ref={el => {
                if (el && videoRefs) {
                  setVideoRefs(prev => ({...prev, [video.id]: el}));
                }
              }}
              src={video.videoUrl}
              poster={video.thumbnailUrl}
              className="w-full h-full object-cover transform transition-transform group-hover:scale-105"
              muted
              loop
              playsInline
            />
            {/* Play indicator */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-2 left-2 text-white text-xs flex items-center">
                <div className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                <span>Video playing</span>
              </div>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-0.5 text-xs rounded">
              {formatDuration(video.duration)}
            </div>
            {video.isAIGenerated && (
              <div className="absolute top-2 left-2 bg-blue-500/90 text-white px-2 py-0.5 text-xs rounded-full">
                AI Generated
              </div>
            )}
          </div>
          <CardContent className="p-4 flex-grow flex flex-col">
            <h3 className="font-semibold line-clamp-1">{video.title}</h3>
            {video.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {video.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                {video.aspectRatio}
              </span>
              {video.category && (
                <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                  {video.category}
                </span>
              )}
            </div>
            <div className="mt-auto pt-4 flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {video.downloadCount} downloads
              </div>
              <Button 
                size="sm" 
                onClick={() => onDownload(video)}
                className="ml-2"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FreeStockVideosPage;