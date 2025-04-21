import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SEOKeywordTracker from './SEOKeywordTracker';
import { seoKeywordService } from '@/lib/seo-service';
import { SeoKeyword, ContentLink } from '@/types/seoTypes';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react';

interface SeoKeywordsTabProps {
  partnerId?: number; // Made optional with a more explicit type
  toast: any; // Toast function from useToast
}

export default function SeoKeywordsTab({ partnerId, toast }: SeoKeywordsTabProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch all keywords for this partner
  const { 
    data: keywords, 
    isLoading, 
    isError,
    error: queryError 
  } = useQuery({
    queryKey: ['/api/seo-keywords', partnerId ? partnerId : 'my'],
    queryFn: () => seoKeywordService.getKeywordsByPartnerId(partnerId),
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Create mutation for saving keywords
  const saveKeywordMutation = useMutation({
    mutationFn: async (keyword: SeoKeyword) => {
      if (keyword.id) {
        // Update existing keyword - handle undefined partnerId
        const partnerIdValue = partnerId !== undefined ? partnerId : null;
        
        // Ensure we have a valid numeric ID (not NaN)
        let keywordId;
        try {
          keywordId = typeof keyword.id === 'string' ? parseInt(keyword.id) : keyword.id;
          if (isNaN(keywordId)) {
            throw new Error(`Invalid keyword ID: ${keyword.id}`);
          }
        } catch (error) {
          console.error(`Error parsing keyword ID: ${keyword.id}`, error);
          throw new Error(`Cannot update keyword with invalid ID: ${keyword.id}`);
        }
        
        console.log(`Calling updateKeyword with ID: ${keywordId}, partnerId: ${partnerIdValue}`);
        return seoKeywordService.updateKeyword(keywordId, keyword, partnerIdValue);
      } else {
        // Create new keyword - handle undefined partnerId
        const partnerIdValue = partnerId !== undefined ? partnerId : null;
        console.log(`Calling createKeyword with partnerId: ${partnerIdValue}`);
        return seoKeywordService.createKeyword(keyword, partnerIdValue);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch keywords
      queryClient.invalidateQueries({ queryKey: ['/api/seo-keywords', partnerId ? partnerId : 'my'] });
    },
    onError: (error) => {
      console.error("Failed to save keyword:", error);
    }
  });

  // Delete mutation for keywords
  const deleteKeywordMutation = useMutation({
    mutationFn: (keywordId: string) => {
      // Handle undefined partnerId
      const partnerIdValue = partnerId !== undefined ? partnerId : null;
      
      // Ensure we have a valid numeric ID (not NaN)
      let parsedKeywordId;
      try {
        parsedKeywordId = parseInt(keywordId);
        if (isNaN(parsedKeywordId)) {
          throw new Error(`Invalid keyword ID: ${keywordId}`);
        }
      } catch (error) {
        console.error(`Error parsing keyword ID: ${keywordId}`, error);
        throw new Error(`Cannot delete keyword with invalid ID: ${keywordId}`);
      }
      
      console.log(`Calling deleteKeyword with ID: ${parsedKeywordId}, partnerId: ${partnerIdValue}`);
      return seoKeywordService.deleteKeyword(parsedKeywordId, partnerIdValue);
    },
    onSuccess: () => {
      // Invalidate and refetch keywords
      queryClient.invalidateQueries({ queryKey: ['/api/seo-keywords', partnerId ? partnerId : 'my'] });
    },
    onError: (error) => {
      console.error("Failed to delete keyword:", error);
    }
  });

  // Create mutation for saving content links
  const saveContentLinkMutation = useMutation({
    mutationFn: async ({ keywordId, link }: { keywordId: string, link: ContentLink }) => {
      // Handle undefined partnerId
      const partnerIdValue = partnerId !== undefined ? partnerId : null;
      
      // Ensure we have a valid numeric keywordId (not NaN)
      let parsedKeywordId;
      try {
        parsedKeywordId = parseInt(keywordId);
        if (isNaN(parsedKeywordId)) {
          throw new Error(`Invalid keyword ID: ${keywordId}`);
        }
      } catch (error) {
        console.error(`Error parsing keyword ID: ${keywordId}`, error);
        throw new Error(`Cannot manage content link with invalid keyword ID: ${keywordId}`);
      }
      
      if (link.id) {
        // Ensure we have a valid numeric link ID (not NaN)
        let parsedLinkId;
        try {
          parsedLinkId = typeof link.id === 'string' ? parseInt(link.id) : link.id;
          if (isNaN(parsedLinkId)) {
            throw new Error(`Invalid link ID: ${link.id}`);
          }
        } catch (error) {
          console.error(`Error parsing link ID: ${link.id}`, error);
          throw new Error(`Cannot update content link with invalid ID: ${link.id}`);
        }
        
        // Update existing content link
        console.log(`Calling updateContentLink with link ID: ${parsedLinkId}, keyword ID: ${parsedKeywordId}, partnerId: ${partnerIdValue}`);
        return seoKeywordService.updateContentLink(
          parsedLinkId, 
          link, 
          parsedKeywordId, 
          partnerIdValue
        );
      } else {
        // Create new content link
        console.log(`Calling createContentLink with keyword ID: ${parsedKeywordId}, partnerId: ${partnerIdValue}`);
        return seoKeywordService.createContentLink(
          parsedKeywordId, 
          link, 
          partnerIdValue
        );
      }
    },
    onSuccess: () => {
      // Invalidate and refetch keywords to update content links
      queryClient.invalidateQueries({ queryKey: ['/api/seo-keywords', partnerId ? partnerId : 'my'] });
    },
    onError: (error) => {
      console.error("Failed to save content link:", error);
    }
  });

  // Delete mutation for content links
  const deleteContentLinkMutation = useMutation({
    mutationFn: ({ keywordId, linkId }: { keywordId: string, linkId: string }) => {
      // Handle undefined partnerId
      const partnerIdValue = partnerId !== undefined ? partnerId : null;
      
      // Ensure we have valid numeric IDs (not NaN)
      let parsedKeywordId, parsedLinkId;
      
      try {
        parsedKeywordId = parseInt(keywordId);
        if (isNaN(parsedKeywordId)) {
          throw new Error(`Invalid keyword ID: ${keywordId}`);
        }
      } catch (error) {
        console.error(`Error parsing keyword ID: ${keywordId}`, error);
        throw new Error(`Cannot delete content link with invalid keyword ID: ${keywordId}`);
      }
      
      try {
        parsedLinkId = parseInt(linkId);
        if (isNaN(parsedLinkId)) {
          throw new Error(`Invalid link ID: ${linkId}`);
        }
      } catch (error) {
        console.error(`Error parsing link ID: ${linkId}`, error);
        throw new Error(`Cannot delete content link with invalid link ID: ${linkId}`);
      }
      
      console.log(`Calling deleteContentLink with link ID: ${parsedLinkId}, keyword ID: ${parsedKeywordId}, partnerId: ${partnerIdValue}`);
      return seoKeywordService.deleteContentLink(
        parsedLinkId, 
        parsedKeywordId, 
        partnerIdValue
      );
    },
    onSuccess: () => {
      // Invalidate and refetch keywords to update content links
      queryClient.invalidateQueries({ queryKey: ['/api/seo-keywords', partnerId ? partnerId : 'my'] });
    }
  });

  // Set error message if query fails
  useEffect(() => {
    if (isError && queryError) {
      console.error('Error fetching keywords:', queryError);
      if (queryError instanceof Error) {
        setError(queryError.message);
      } else {
        setError('Failed to load SEO keywords');
      }
    } else {
      setError(null);
    }
  }, [isError, queryError]);

  // Handlers for SEOKeywordTracker component
  const handleSaveKeyword = async (keyword: SeoKeyword) => {
    try {
      await saveKeywordMutation.mutateAsync(keyword);
      toast({
        title: "Keyword Saved",
        description: `Your keyword "${keyword.text}" has been saved successfully.`,
      });
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving keyword:', error);
      toast({
        title: "Error Saving Keyword",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    try {
      await deleteKeywordMutation.mutateAsync(keywordId);
      toast({
        title: "Keyword Deleted",
        description: "The keyword has been deleted successfully.",
      });
      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast({
        title: "Error Deleting Keyword",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  };

  const handleSaveContentLink = async (keywordId: string, link: ContentLink) => {
    try {
      await saveContentLinkMutation.mutateAsync({ keywordId, link });
      toast({
        title: "Content Link Saved",
        description: `Your content link for "${link.title}" has been saved successfully.`,
      });
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving content link:', error);
      toast({
        title: "Error Saving Content Link",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  };

  const handleDeleteContentLink = async (keywordId: string, linkId: string) => {
    try {
      await deleteContentLinkMutation.mutateAsync({ keywordId, linkId });
      toast({
        title: "Content Link Deleted",
        description: "The content link has been deleted successfully.",
      });
      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting content link:', error);
      toast({
        title: "Error Deleting Content Link",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <div className="flex justify-center mt-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  try {
    return (
      <SEOKeywordTracker 
        initialKeywords={keywords || []}
        onSaveKeyword={handleSaveKeyword}
        onDeleteKeyword={handleDeleteKeyword}
        onSaveContentLink={handleSaveContentLink}
        onDeleteContentLink={handleDeleteContentLink}
      />
    );
  } catch (err) {
    console.error("Error rendering SEOKeywordTracker:", err);
    
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          There was a problem rendering the SEO Keyword Tracker. Please try refreshing the page.
          {err instanceof Error ? ` Error: ${err.message}` : ''}
        </AlertDescription>
      </Alert>
    );
  }
}