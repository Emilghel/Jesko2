import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Check, Filter, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  isAIGenerated: boolean;
  downloadCount: number;
  userId?: number | null;
  promptUsed?: string | null;
  sourceImageUrl?: string | null;
  modelUsed?: string | null;
  createdAt: string;
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

const SimpleStockVideosPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [preloadedVideos, setPreloadedVideos] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch videos from API
  const fetchVideos = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      if (activeTab === 'ai-generated') {
        params.append('isAIGenerated', 'true');
      }
      
      const response = await fetch(`/api/stock-videos?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      return await response.json() as StockVideosResponse;
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  };

  const { data, isLoading, error, refetch } = useQuery<StockVideosResponse, Error>({
    queryKey: ['/api/stock-videos', activeTab, selectedCategory, page],
    queryFn: fetchVideos
  });

  // Simpler hover playback approach without complex preloading
  useEffect(() => {
    if (!data?.videos || data.videos.length === 0) return;
    
    console.log('Videos loaded, ready for hover playback');
    
    // We don't need to do manual preloading - modern browsers handle this well
    // We'll just rely on the browser's built-in preloading and buffering
    
    // Instead, just mark all videos as "ready" after a short delay 
    // so that we get immediate playback on hover
    const timer = setTimeout(() => {
      const videoUrls = data.videos.slice(0, 6).map(v => v.videoUrl);
      console.log('Marking videos as ready for playback:', videoUrls.length);
      setPreloadedVideos(videoUrls);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [data]);

  // Format duration (seconds to MM:SS)
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (video: StockVideo) => {
    try {
      // Record the download in the database
      await fetch(`/api/stock-videos/${video.id}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Create a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = video.videoUrl;
      downloadLink.download = `${video.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast({
        title: "Download started",
        description: `Downloading ${video.title}`,
      });
      
      // Refetch to update the download count
      refetch();
    } catch (error) {
      console.error('Error downloading video:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the video. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Free Stock Videos</h1>
          <p className="text-muted-foreground">
            Browse and download free stock videos for your projects
          </p>
        </div>
        
        {/* Tabs and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start justify-between border-b pb-4">
          <Tabs 
            defaultValue="all" 
            className="w-full md:w-auto"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList>
              <TabsTrigger value="all">All Videos</TabsTrigger>
              <TabsTrigger value="ai-generated">AI Generated</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Filters */}
          {data?.categories && data.categories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {data.categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mt-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden flex flex-col h-full">
                <div className="relative overflow-hidden aspect-video">
                  <Skeleton className="h-full w-full" />
                </div>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3 mb-3" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load videos. Please try again.</p>
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && !error && data?.videos && data.videos.length === 0 && (
          <div className="text-center py-12">
            <p>No videos found. Try changing your filters.</p>
          </div>
        )}
        
        {/* Videos Grid */}
        {!isLoading && !error && data?.videos && data.videos.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mt-6">
              {data.videos.map((video) => (
                <Card key={video.id} className="overflow-hidden flex flex-col h-full video-playing">
                  <div className="relative overflow-hidden aspect-video">
                    <video 
                      src={video.videoUrl}
                      poster={video.thumbnailUrl}
                      className="w-full h-full object-cover cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                      muted
                      loop
                      autoPlay
                      preload="auto" 
                      playsInline
                    />

                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-0.5 text-xs rounded">
                      {formatDuration(video.duration)}
                    </div>
                    {video.isAIGenerated && (
                      <div className="absolute top-2 left-2 bg-blue-500/90 text-white px-2 py-0.5 text-xs rounded-full">
                        AI Generated
                      </div>
                    )}
                    {video.promptUsed && (
                      <div className="absolute top-2 right-2 bg-purple-500/90 text-white px-2 py-0.5 text-xs rounded-full">
                        AI Prompt
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
                    {video.promptUsed && (
                      <p className="text-xs italic text-purple-400 mt-1 line-clamp-1">
                        "{video.promptUsed}"
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
                      {video.modelUsed && (
                        <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded">
                          {video.modelUsed}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto pt-4 flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        {video.downloadCount || 0} downloads
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleDownload(video)}
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
            
            {/* Pagination */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.min(prev + 1, data.pagination.totalPages))}
                  disabled={page === data.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SimpleStockVideosPage;