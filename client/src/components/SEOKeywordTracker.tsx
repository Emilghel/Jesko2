import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Check, ChevronDown, ChevronUp, Copy, Edit, ExternalLink, FileText, Link, Plus, Search, Trash2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { SeoKeyword, ContentLink } from '@/types/seoTypes';

interface SEOKeywordTrackerProps {
  initialKeywords?: SeoKeyword[];
  onSaveKeyword?: (keyword: SeoKeyword) => Promise<void>;
  onDeleteKeyword?: (keywordId: string) => Promise<void>;
  onSaveContentLink?: (keywordId: string, link: ContentLink) => Promise<void>;
  onDeleteContentLink?: (keywordId: string, linkId: string) => Promise<void>;
}

export default function SEOKeywordTracker({
  initialKeywords = [],
  onSaveKeyword,
  onDeleteKeyword,
  onSaveContentLink,
  onDeleteContentLink
}: SEOKeywordTrackerProps) {
  
  // Safety check for proper initialKeywords format
  if (!Array.isArray(initialKeywords)) {
    console.error('initialKeywords is not an array:', initialKeywords);
    initialKeywords = []; // Fallback to empty array to prevent errors
  }
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<SeoKeyword[]>(initialKeywords);
  const [activeTab, setActiveTab] = useState<string>('all-keywords');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredKeywords, setFilteredKeywords] = useState<SeoKeyword[]>(keywords);
  const [currentKeyword, setCurrentKeyword] = useState<SeoKeyword | null>(null);
  const [isAddingKeyword, setIsAddingKeyword] = useState<boolean>(false);
  const [isAddingContentLink, setIsAddingContentLink] = useState<boolean>(false);
  const [isViewingKeywordDetails, setIsViewingKeywordDetails] = useState<boolean>(false);
  const [showKeywordForm, setShowKeywordForm] = useState<boolean>(false);
  const [editingContentLinkId, setEditingContentLinkId] = useState<string | null>(null);
  
  // Form states
  const [keywordFormData, setKeywordFormData] = useState({
    id: '',
    text: '',
    searchVolume: '',
    difficulty: '',
    status: 'new',
    notes: '',
    tags: '',
    // Include initial content link fields
    initialContentLink: {
      url: '',
      title: '',
      enabled: false
    }
  });
  
  const [contentLinkFormData, setContentLinkFormData] = useState({
    id: '',
    url: '',
    title: '',
    notes: '',
    clicks: '',
    impressions: '',
    position: ''
  });
  
  // Filter keywords when search query or keywords change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredKeywords(keywords);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredKeywords(
        keywords.filter(keyword => 
          keyword.text.toLowerCase().includes(query) ||
          keyword.tags?.some(tag => tag.toLowerCase().includes(query)) ||
          keyword.notes?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, keywords]);
  
  // Filter keywords based on active tab
  const getTabFilteredKeywords = () => {
    if (activeTab === 'all-keywords') return filteredKeywords;
    if (activeTab === 'new-keywords') return filteredKeywords.filter(k => k.status === 'new');
    if (activeTab === 'in-progress') return filteredKeywords.filter(k => k.status === 'in-progress');
    if (activeTab === 'published') return filteredKeywords.filter(k => k.status === 'published');
    return filteredKeywords;
  };
  
  // Reset form states
  const resetKeywordForm = () => {
    setKeywordFormData({
      id: '',
      text: '',
      searchVolume: '',
      difficulty: '',
      status: 'new',
      notes: '',
      tags: '',
      initialContentLink: {
        url: '',
        title: '',
        enabled: false
      }
    });
  };
  
  const resetContentLinkForm = () => {
    setContentLinkFormData({
      id: '',
      url: '',
      title: '',
      notes: '',
      clicks: '',
      impressions: '',
      position: ''
    });
  };
  
  // Handle opening the keyword form for adding/editing
  const handleOpenKeywordForm = (keyword?: SeoKeyword) => {
    if (keyword) {
      // Edit existing keyword
      setKeywordFormData({
        id: keyword.id,
        text: keyword.text,
        searchVolume: keyword.searchVolume?.toString() || '',
        difficulty: keyword.difficulty?.toString() || '',
        status: keyword.status || 'new',
        notes: keyword.notes || '',
        tags: keyword.tags?.join(', ') || '',
        initialContentLink: {
          url: '',
          title: '',
          enabled: false
        }
      });
      setIsAddingKeyword(false);
    } else {
      // Add new keyword
      resetKeywordForm();
      setIsAddingKeyword(true);
    }
    setShowKeywordForm(true);
  };
  
  // Handle opening the content link form for adding/editing
  const handleOpenContentLinkForm = (keywordId: string, contentLink?: ContentLink) => {
    setCurrentKeyword(keywords.find(k => k.id === keywordId) || null);
    
    if (contentLink) {
      // Edit existing content link
      setContentLinkFormData({
        id: contentLink.id,
        url: contentLink.url,
        title: contentLink.title,
        notes: contentLink.notes || '',
        clicks: contentLink.performance?.clicks?.toString() || '',
        impressions: contentLink.performance?.impressions?.toString() || '',
        position: contentLink.performance?.position?.toString() || ''
      });
      setEditingContentLinkId(contentLink.id);
    } else {
      // Add new content link
      resetContentLinkForm();
      setEditingContentLinkId(null);
    }
    setIsAddingContentLink(true);
  };
  
  // Handle saving a keyword
  const handleSaveKeyword = async () => {
    try {
      // Validate form
      if (!keywordFormData.text.trim()) {
        toast({
          title: "Keyword required",
          description: "Please enter a keyword",
          variant: "destructive",
        });
        return;
      }
      
      // Validate content link if enabled
      if (keywordFormData.initialContentLink.enabled) {
        if (!keywordFormData.initialContentLink.url.trim() || !keywordFormData.initialContentLink.title.trim()) {
          toast({
            title: "Content link fields required",
            description: "Please enter both URL and title for the content link",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Create initial content link if enabled
      const contentLinks: ContentLink[] = keywordFormData.id ? 
        keywords.find(k => k.id === keywordFormData.id)?.contentLinks || [] : 
        [];
      
      // Add the initial content link if enabled
      if (keywordFormData.initialContentLink.enabled) {
        // Important: Don't set the ID for new content links - let the server assign a numeric ID
        const newContentLink: ContentLink = {
          url: keywordFormData.initialContentLink.url.trim(),
          title: keywordFormData.initialContentLink.title.trim(),
          publishDate: new Date().toISOString(),
          performance: {
            clicks: 0,
            impressions: 0,
            lastUpdated: new Date().toISOString()
          }
        };
        contentLinks.push(newContentLink);
      }
      
      // Create keyword object
      const keywordToSave: SeoKeyword = {
        // For existing keywords, use the existing ID
        // For new keywords, don't specify the ID field - let the server assign a numeric ID
        ...(keywordFormData.id ? { id: keywordFormData.id } : {}),
        text: keywordFormData.text.trim(),
        searchVolume: keywordFormData.searchVolume ? parseInt(keywordFormData.searchVolume) : undefined,
        difficulty: keywordFormData.difficulty ? parseInt(keywordFormData.difficulty) : undefined,
        status: keywordFormData.status as 'new' | 'in-progress' | 'published',
        notes: keywordFormData.notes.trim() || undefined,
        dateAdded: keywordFormData.id ? 
          keywords.find(k => k.id === keywordFormData.id)?.dateAdded || new Date().toISOString() : 
          new Date().toISOString(),
        tags: keywordFormData.tags ? 
          keywordFormData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : 
          undefined,
        contentLinks
      };
      
      // Call the save callback if provided
      if (onSaveKeyword) {
        await onSaveKeyword(keywordToSave);
      }
      
      // No need to explicitly call onSaveContentLink here as the keywordToSave already includes the content link
      // The backend will save the entire keyword with any content links
      // This prevents the issue with calling `/api/seo-keywords/undefined/NaN`
      
      // Update local state
      setKeywords(prev => {
        if (keywordFormData.id) {
          // Update existing keyword
          return prev.map(k => k.id === keywordFormData.id ? keywordToSave : k);
        } else {
          // Add new keyword
          return [...prev, keywordToSave];
        }
      });
      
      let successMessage = keywordFormData.id ? 
        "Your keyword has been updated successfully" : 
        "Your new keyword has been added successfully";
      
      if (keywordFormData.initialContentLink.enabled) {
        successMessage += ". Content link was also created.";
      }
      
      toast({
        title: keywordFormData.id ? "Keyword updated" : "Keyword added",
        description: successMessage,
      });
      
      setShowKeywordForm(false);
      resetKeywordForm();
      
    } catch (error) {
      console.error('Error saving keyword:', error);
      toast({
        title: "Error",
        description: "Failed to save keyword. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle saving a content link
  const handleSaveContentLink = async () => {
    try {
      // Validate form
      if (!contentLinkFormData.url.trim() || !contentLinkFormData.title.trim()) {
        toast({
          title: "Required fields missing",
          description: "Please enter both URL and title",
          variant: "destructive",
        });
        return;
      }
      
      if (!currentKeyword) {
        toast({
          title: "Error",
          description: "No keyword selected for this content link",
          variant: "destructive",
        });
        return;
      }
      
      // Create content link object
      const contentLinkToSave: ContentLink = {
        // Only include ID if we're updating an existing content link
        ...(contentLinkFormData.id ? { id: contentLinkFormData.id } : {}),
        url: contentLinkFormData.url.trim(),
        title: contentLinkFormData.title.trim(),
        publishDate: contentLinkFormData.id ? 
          currentKeyword.contentLinks?.find(cl => cl.id === contentLinkFormData.id)?.publishDate || 
          new Date().toISOString() : 
          new Date().toISOString(),
        notes: contentLinkFormData.notes.trim() || undefined,
        performance: {
          clicks: contentLinkFormData.clicks ? parseInt(contentLinkFormData.clicks) : undefined,
          impressions: contentLinkFormData.impressions ? parseInt(contentLinkFormData.impressions) : undefined,
          position: contentLinkFormData.position ? parseFloat(contentLinkFormData.position) : undefined,
          lastUpdated: new Date().toISOString()
        }
      };
      
      // Call the save callback if provided
      if (onSaveContentLink) {
        await onSaveContentLink(currentKeyword.id, contentLinkToSave);
      }
      
      // Update local state
      setKeywords(prev => {
        return prev.map(k => {
          if (k.id === currentKeyword.id) {
            const existingLinks = k.contentLinks || [];
            let updatedLinks;
            
            if (contentLinkFormData.id) {
              // Update existing link
              updatedLinks = existingLinks.map(cl => 
                cl.id === contentLinkFormData.id ? contentLinkToSave : cl
              );
            } else {
              // Add new link
              updatedLinks = [...existingLinks, contentLinkToSave];
            }
            
            return {
              ...k,
              contentLinks: updatedLinks
            };
          }
          return k;
        });
      });
      
      toast({
        title: contentLinkFormData.id ? "Content link updated" : "Content link added",
        description: contentLinkFormData.id ? 
          "Your content link has been updated successfully" : 
          "Your new content link has been added successfully",
      });
      
      setIsAddingContentLink(false);
      resetContentLinkForm();
      
    } catch (error) {
      console.error('Error saving content link:', error);
      toast({
        title: "Error",
        description: "Failed to save content link. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle deleting a keyword
  const handleDeleteKeyword = async (keywordId: string) => {
    try {
      // Call the delete callback if provided
      if (onDeleteKeyword) {
        await onDeleteKeyword(keywordId);
      }
      
      // Update local state
      setKeywords(prev => prev.filter(k => k.id !== keywordId));
      
      toast({
        title: "Keyword deleted",
        description: "The keyword has been removed successfully",
      });
      
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast({
        title: "Error",
        description: "Failed to delete keyword. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle deleting a content link
  const handleDeleteContentLink = async (keywordId: string, linkId: string) => {
    try {
      // Call the delete callback if provided
      if (onDeleteContentLink) {
        await onDeleteContentLink(keywordId, linkId);
      }
      
      // Update local state
      setKeywords(prev => {
        return prev.map(k => {
          if (k.id === keywordId && k.contentLinks) {
            return {
              ...k,
              contentLinks: k.contentLinks.filter(cl => cl.id !== linkId)
            };
          }
          return k;
        });
      });
      
      toast({
        title: "Content link deleted",
        description: "The content link has been removed successfully",
      });
      
    } catch (error) {
      console.error('Error deleting content link:', error);
      toast({
        title: "Error",
        description: "Failed to delete content link. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // View keyword details
  const handleViewKeywordDetails = (keyword: SeoKeyword) => {
    setCurrentKeyword(keyword);
    setIsViewingKeywordDetails(true);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800/30">New</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="bg-amber-900/20 text-amber-400 border-amber-800/30">In Progress</Badge>;
      case 'published':
        return <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800/30">Published</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-900/20 text-gray-400 border-gray-800/30">{status}</Badge>;
    }
  };
  
  // Get difficulty indicator
  const getDifficultyIndicator = (difficulty?: number) => {
    if (difficulty === undefined) return 'Not set';
    
    if (difficulty <= 30) {
      return <span className="text-green-400">Easy ({difficulty})</span>;
    } else if (difficulty <= 70) {
      return <span className="text-amber-400">Medium ({difficulty})</span>;
    } else {
      return <span className="text-red-400">Hard ({difficulty})</span>;
    }
  };
  
  return (
    <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
          style={{ 
            background: 'rgba(20, 20, 30, 0.7)', 
            boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
          }}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-white flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-opacity-20 mr-3" 
                style={{ 
                  backgroundColor: 'rgba(96, 165, 250, 0.2)',
                  animation: 'iconFloat 3s ease-in-out infinite',
                  boxShadow: '0 0 15px 5px rgba(96, 165, 250, 0.3)'
                }}>
              <Search className="h-6 w-6 text-blue-400" />
            </div>
            <span>SEO Keyword Tracker</span>
          </CardTitle>
          <CardDescription>
            Manage keywords and track content created for SEO optimization
          </CardDescription>
        </div>
        <Button 
          onClick={() => handleOpenKeywordForm()}
          className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Keyword
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Search and filter */}
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              placeholder="Search keywords, tags, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800/50 border-gray-700"
            />
            <Select defaultValue={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-[180px] bg-gray-800/50 border-gray-700">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all-keywords">All Keywords</SelectItem>
                <SelectItem value="new-keywords">New</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Keywords Table */}
          <div className="rounded-md overflow-hidden border border-gray-700/50">
            <Table>
              <TableHeader className="bg-gray-800/50">
                <TableRow className="hover:bg-gray-800/70 border-gray-700/50">
                  <TableHead className="text-gray-300">Keyword</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Search Volume</TableHead>
                  <TableHead className="text-gray-300">Difficulty</TableHead>
                  <TableHead className="text-gray-300">Content Links</TableHead>
                  <TableHead className="text-gray-300">Added</TableHead>
                  <TableHead className="text-right text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getTabFilteredKeywords().length > 0 ? (
                  getTabFilteredKeywords().map((keyword) => (
                    <TableRow 
                      key={keyword.id}
                      className="hover:bg-gray-800/70 border-gray-700/50 cursor-pointer"
                      onClick={() => handleViewKeywordDetails(keyword)}
                    >
                      <TableCell className="font-medium text-white">
                        {keyword.text}
                        {keyword.tags && keyword.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {keyword.tags.slice(0, 2).map((tag, i) => (
                              <Badge key={i} variant="outline" className="bg-gray-800/50 text-gray-300 border-gray-700 text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {keyword.tags.length > 2 && (
                              <Badge variant="outline" className="bg-gray-800/50 text-gray-300 border-gray-700 text-xs">
                                +{keyword.tags.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(keyword.status)}</TableCell>
                      <TableCell className="text-gray-300">
                        {keyword.searchVolume !== undefined ? 
                          <span className={keyword.searchVolume > 1000 ? "text-green-400" : "text-gray-300"}>
                            {keyword.searchVolume.toLocaleString()}
                          </span> : 
                          <span className="text-gray-500">Not set</span>
                        }
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {getDifficultyIndicator(keyword.difficulty)}
                      </TableCell>
                      <TableCell>
                        {keyword.contentLinks && keyword.contentLinks.length > 0 ? (
                          <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800/30">
                            {keyword.contentLinks.length}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-900/30 text-gray-400 border-gray-700/30">
                            0
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">{formatDate(keyword.dateAdded)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-800">
                                <span className="sr-only">Open menu</span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                              <DropdownMenuItem 
                                onClick={() => handleViewKeywordDetails(keyword)}
                                className="text-gray-300 hover:text-white cursor-pointer"
                              >
                                <Search className="mr-2 h-4 w-4" />
                                <span>View Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleOpenKeywordForm(keyword)}
                                className="text-blue-400 hover:text-blue-300 cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit Keyword</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleOpenContentLinkForm(keyword.id)}
                                className="text-green-400 hover:text-green-300 cursor-pointer"
                              >
                                <Link className="mr-2 h-4 w-4" />
                                <span>Add Content Link</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteKeyword(keyword.id)}
                                className="text-red-400 hover:text-red-300 cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Keyword</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      {searchQuery ? (
                        <>
                          <Search className="h-12 w-12 text-gray-500 mx-auto mb-3 opacity-50" />
                          <p>No keywords match your search criteria</p>
                        </>
                      ) : (
                        <>
                          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3 opacity-50" />
                          <p>No keywords in this category</p>
                          <Button 
                            variant="link" 
                            className="text-blue-400 hover:text-blue-300 mt-2"
                            onClick={() => handleOpenKeywordForm()}
                          >
                            Add your first keyword
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Add/Edit Keyword Dialog */}
        <Dialog open={showKeywordForm} onOpenChange={setShowKeywordForm}>
          <DialogContent className="bg-gray-900 text-white border-gray-800 sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{isAddingKeyword ? "Add New Keyword" : "Edit Keyword"}</DialogTitle>
              <DialogDescription>
                {isAddingKeyword 
                  ? "Add a new keyword to track for your SEO content creation"
                  : "Update the details for this keyword"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="keyword">Keyword</Label>
                <Input
                  id="keyword"
                  value={keywordFormData.text}
                  onChange={(e) => setKeywordFormData({...keywordFormData, text: e.target.value})}
                  placeholder="Enter keyword or phrase"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="searchVolume">Search Volume</Label>
                  <Input
                    id="searchVolume"
                    type="number"
                    value={keywordFormData.searchVolume}
                    onChange={(e) => setKeywordFormData({...keywordFormData, searchVolume: e.target.value})}
                    placeholder="Monthly searches"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="difficulty">Difficulty (0-100)</Label>
                  <Input
                    id="difficulty"
                    type="number"
                    min="0"
                    max="100"
                    value={keywordFormData.difficulty}
                    onChange={(e) => setKeywordFormData({...keywordFormData, difficulty: e.target.value})}
                    placeholder="Ranking difficulty"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={keywordFormData.status} 
                  onValueChange={(value) => setKeywordFormData({...keywordFormData, status: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={keywordFormData.tags}
                  onChange={(e) => setKeywordFormData({...keywordFormData, tags: e.target.value})}
                  placeholder="e.g. technical, beginner, strategy"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={keywordFormData.notes}
                  onChange={(e) => setKeywordFormData({...keywordFormData, notes: e.target.value})}
                  placeholder="Any additional notes about this keyword"
                  className="bg-gray-800 border-gray-700"
                  rows={3}
                />
              </div>
              
              {/* Add content link section */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center mb-3">
                  <Switch
                    id="enable-content-link"
                    checked={keywordFormData.initialContentLink.enabled}
                    onCheckedChange={(checked) => 
                      setKeywordFormData({
                        ...keywordFormData, 
                        initialContentLink: {
                          ...keywordFormData.initialContentLink,
                          enabled: checked
                        }
                      })
                    }
                    className="mr-2"
                  />
                  <Label htmlFor="enable-content-link" className="font-medium">
                    Add Content Link
                  </Label>
                </div>
                
                {keywordFormData.initialContentLink.enabled && (
                  <div className="space-y-3 pl-1">
                    <div className="grid gap-2">
                      <Label htmlFor="link-url">URL</Label>
                      <Input
                        id="link-url"
                        value={keywordFormData.initialContentLink.url}
                        onChange={(e) => 
                          setKeywordFormData({
                            ...keywordFormData, 
                            initialContentLink: {
                              ...keywordFormData.initialContentLink,
                              url: e.target.value
                            }
                          })
                        }
                        placeholder="https://example.com/your-content"
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="link-title">Title</Label>
                      <Input
                        id="link-title"
                        value={keywordFormData.initialContentLink.title}
                        onChange={(e) => 
                          setKeywordFormData({
                            ...keywordFormData, 
                            initialContentLink: {
                              ...keywordFormData.initialContentLink,
                              title: e.target.value
                            }
                          })
                        }
                        placeholder="Content Title"
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowKeywordForm(false)} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                Cancel
              </Button>
              <Button onClick={handleSaveKeyword} className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700">
                {isAddingKeyword ? "Add Keyword" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Add/Edit Content Link Dialog */}
        <Dialog open={isAddingContentLink} onOpenChange={setIsAddingContentLink}>
          <DialogContent className="bg-gray-900 text-white border-gray-800 sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{editingContentLinkId ? "Edit Content Link" : "Add Content Link"}</DialogTitle>
              <DialogDescription>
                {editingContentLinkId
                  ? "Update the details for this content link"
                  : `Add a content link for the keyword: ${currentKeyword?.text}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={contentLinkFormData.url}
                  onChange={(e) => setContentLinkFormData({...contentLinkFormData, url: e.target.value})}
                  placeholder="https://example.com/your-content"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={contentLinkFormData.title}
                  onChange={(e) => setContentLinkFormData({...contentLinkFormData, title: e.target.value})}
                  placeholder="Content Title"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={contentLinkFormData.notes}
                  onChange={(e) => setContentLinkFormData({...contentLinkFormData, notes: e.target.value})}
                  placeholder="Any additional notes about this content"
                  className="bg-gray-800 border-gray-700"
                  rows={2}
                />
              </div>
              
              <Separator className="bg-gray-700 my-2" />
              
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <span>Performance Metrics (Optional)</span>
                </Label>
                
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="clicks" className="text-xs">Clicks</Label>
                    <Input
                      id="clicks"
                      type="number"
                      value={contentLinkFormData.clicks}
                      onChange={(e) => setContentLinkFormData({...contentLinkFormData, clicks: e.target.value})}
                      placeholder="0"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="impressions" className="text-xs">Impressions</Label>
                    <Input
                      id="impressions"
                      type="number"
                      value={contentLinkFormData.impressions}
                      onChange={(e) => setContentLinkFormData({...contentLinkFormData, impressions: e.target.value})}
                      placeholder="0"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="position" className="text-xs">Avg Position</Label>
                    <Input
                      id="position"
                      type="number"
                      step="0.1"
                      value={contentLinkFormData.position}
                      onChange={(e) => setContentLinkFormData({...contentLinkFormData, position: e.target.value})}
                      placeholder="0.0"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingContentLink(false)} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                Cancel
              </Button>
              <Button onClick={handleSaveContentLink} className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700">
                {editingContentLinkId ? "Save Changes" : "Add Content Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Keyword Details Dialog */}
        <Dialog open={isViewingKeywordDetails} onOpenChange={setIsViewingKeywordDetails}>
          <DialogContent className="bg-gray-900 text-white border-gray-800 sm:max-w-[700px]">
            {currentKeyword && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <Search className="h-5 w-5 text-blue-400" />
                    <span>{currentKeyword.text}</span>
                    {getStatusBadge(currentKeyword.status)}
                  </DialogTitle>
                  <DialogDescription>
                    Added on {formatDate(currentKeyword.dateAdded)}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Keyword Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-gray-800/50 p-4 border border-gray-700/50">
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Search Volume</h4>
                      <p className="text-xl font-semibold text-white">
                        {currentKeyword.searchVolume !== undefined ? 
                          currentKeyword.searchVolume.toLocaleString() : 
                          <span className="text-gray-500 text-base">Not set</span>
                        }
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-800/50 p-4 border border-gray-700/50">
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Difficulty</h4>
                      <p className="text-xl font-semibold">
                        {getDifficultyIndicator(currentKeyword.difficulty)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Keyword tags */}
                  {currentKeyword.tags && currentKeyword.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentKeyword.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="bg-gray-800/70 text-gray-300 border-gray-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Keyword notes */}
                  {currentKeyword.notes && (
                    <div className="rounded-lg bg-gray-800/30 p-4 border border-gray-700/50">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Notes</h4>
                      <p className="text-gray-300 text-sm whitespace-pre-line">{currentKeyword.notes}</p>
                    </div>
                  )}
                  
                  {/* Content Links */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-300">Content Links</h4>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700"
                        onClick={() => handleOpenContentLinkForm(currentKeyword.id)}
                      >
                        <Plus className="mr-2 h-3 w-3" /> Add Link
                      </Button>
                    </div>
                    
                    {(!currentKeyword.contentLinks || currentKeyword.contentLinks.length === 0) ? (
                      <div className="text-center py-6 rounded-lg bg-gray-800/30 border border-gray-700/50">
                        <Link className="h-10 w-10 text-gray-500 mx-auto mb-2 opacity-50" />
                        <p className="text-gray-400">No content links yet</p>
                        <p className="text-gray-500 text-sm mt-1">Add content links to track your SEO performance</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {currentKeyword.contentLinks.map((link) => (
                          <div key={link.id} className="rounded-lg bg-gray-800/50 p-3 border border-gray-700/30">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-white">{link.title}</h3>
                                <a 
                                  href={link.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 text-sm flex items-center mt-1 hover:text-blue-300"
                                >
                                  {link.url.length > 40 ? `${link.url.substring(0, 40)}...` : link.url}
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </a>
                              </div>
                              <div className="flex">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20"
                                  onClick={() => handleOpenContentLinkForm(currentKeyword.id, link)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                                  onClick={() => handleDeleteContentLink(currentKeyword.id, link.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {link.notes && (
                              <p className="text-sm text-gray-400 mt-1 mb-2">{link.notes}</p>
                            )}
                            
                            {link.performance && (
                              <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-gray-700/30">
                                <div>
                                  <p className="text-xs text-gray-400">Clicks</p>
                                  <p className="text-blue-400 font-medium">
                                    {link.performance.clicks !== undefined ? link.performance.clicks.toLocaleString() : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Impressions</p>
                                  <p className="text-gray-300 font-medium">
                                    {link.performance.impressions !== undefined ? link.performance.impressions.toLocaleString() : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Position</p>
                                  <p className={`font-medium ${
                                    link.performance.position !== undefined 
                                      ? (link.performance.position <= 10 
                                          ? 'text-green-400' 
                                          : link.performance.position <= 30 
                                            ? 'text-amber-400' 
                                            : 'text-red-400')
                                      : 'text-gray-400'
                                  }`}>
                                    {link.performance.position !== undefined ? link.performance.position.toFixed(1) : '—'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter className="flex justify-between">
                  <div>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        handleDeleteKeyword(currentKeyword.id);
                        setIsViewingKeywordDetails(false);
                      }}
                      className="bg-red-900/40 text-red-400 hover:bg-red-900/60 hover:text-red-300"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Keyword
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsViewingKeywordDetails(false)}
                      className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Close
                    </Button>
                    <Button 
                      onClick={() => {
                        handleOpenKeywordForm(currentKeyword);
                        setIsViewingKeywordDetails(false);
                      }}
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Keyword
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}