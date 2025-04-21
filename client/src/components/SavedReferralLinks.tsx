import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReferralService, SavedReferralLink, CreateSavedReferralLink } from '@/lib/referral-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Edit, Trash2, ExternalLink, Plus, Share2, CheckCircle2 } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const createLinkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  base_url: z.string().url("Must be a valid URL").min(1, "Base URL is required"),
  full_url: z.string().url("Must be a valid URL").min(1, "Full URL is required"),
  campaign: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
});

type CreateLinkFormValues = z.infer<typeof createLinkSchema>;

export const SavedReferralLinks: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<SavedReferralLink | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);

  // Fetch saved referral links
  const { data: savedLinks = [], isLoading, error } = useQuery({
    queryKey: ['/api/partner/saved-referral-links'],
    queryFn: () => ReferralService.getSavedReferralLinks(),
  });

  // Create new saved link mutation
  const createLinkMutation = useMutation({
    mutationFn: (data: CreateSavedReferralLink) => ReferralService.createSavedReferralLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/saved-referral-links'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Referral link saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save referral link",
        variant: "destructive",
      });
    },
  });

  // Update saved link mutation
  const updateLinkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSavedReferralLink> }) => 
      ReferralService.updateSavedReferralLink(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/saved-referral-links'] });
      setIsEditDialogOpen(false);
      setSelectedLink(null);
      toast({
        title: "Success",
        description: "Referral link updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update referral link",
        variant: "destructive",
      });
    },
  });

  // Delete saved link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: (id: number) => ReferralService.deleteSavedReferralLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/saved-referral-links'] });
      toast({
        title: "Success",
        description: "Referral link deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete referral link",
        variant: "destructive",
      });
    },
  });

  // Track click mutation
  const trackClickMutation = useMutation({
    mutationFn: (id: number) => ReferralService.trackSavedLinkClick(id),
  });

  // Create form
  const createForm = useForm<CreateLinkFormValues>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      name: '',
      base_url: '',
      full_url: '',
      campaign: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      utm_term: '',
    },
  });

  // Edit form
  const editForm = useForm<CreateLinkFormValues>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      name: '',
      base_url: '',
      full_url: '',
      campaign: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      utm_term: '',
    },
  });

  // Handle copy to clipboard
  const handleCopyLink = (link: SavedReferralLink) => {
    navigator.clipboard.writeText(link.full_url);
    setCopiedLinkId(link.id);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
    
    // Reset copied status after 2 seconds
    setTimeout(() => {
      setCopiedLinkId(null);
    }, 2000);
  };

  // Handle opening external link
  const handleOpenLink = (link: SavedReferralLink) => {
    // Track the click
    trackClickMutation.mutate(link.id);
    
    // Open the link in a new tab
    window.open(link.full_url, '_blank');
  };

  // Handle edit link
  const handleEditLink = (link: SavedReferralLink) => {
    setSelectedLink(link);
    editForm.reset({
      name: link.name,
      base_url: link.base_url,
      full_url: link.full_url,
      campaign: link.campaign || '',
      utm_source: link.utm_source || '',
      utm_medium: link.utm_medium || '',
      utm_campaign: link.utm_campaign || '',
      utm_content: link.utm_content || '',
      utm_term: link.utm_term || '',
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete link
  const handleDeleteLink = (id: number) => {
    if (confirm('Are you sure you want to delete this saved referral link?')) {
      deleteLinkMutation.mutate(id);
    }
  };

  // Handle create form submission
  const onCreateSubmit = (data: CreateLinkFormValues) => {
    createLinkMutation.mutate(data);
  };

  // Handle edit form submission
  const onEditSubmit = (data: CreateLinkFormValues) => {
    if (selectedLink) {
      updateLinkMutation.mutate({ id: selectedLink.id, data });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32">Loading saved referral links...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-md">
        Error loading saved referral links: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Saved Referral Links</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Referral Link</DialogTitle>
              <DialogDescription>
                Save a referral link for quick access and tracking.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Homepage Link" {...field} />
                      </FormControl>
                      <FormDescription>A friendly name to identify this link</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="base_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormDescription>The base domain for your link</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="full_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/?ref=yourcode" {...field} />
                      </FormControl>
                      <FormDescription>The complete URL with all parameters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="campaign"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign</FormLabel>
                        <FormControl>
                          <Input placeholder="summer_promo" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>Identify your marketing campaign (e.g., summer_sale, email_promo)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="utm_source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Source</FormLabel>
                        <FormControl>
                          <Input placeholder="partner" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="utm_medium"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Medium</FormLabel>
                        <FormControl>
                          <Input placeholder="social" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="utm_campaign"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Campaign</FormLabel>
                        <FormControl>
                          <Input placeholder="spring2024" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="utm_content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Content</FormLabel>
                        <FormControl>
                          <Input placeholder="banner" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="utm_term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Term</FormLabel>
                        <FormControl>
                          <Input placeholder="ai_assistant" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createLinkMutation.isPending}
                  >
                    {createLinkMutation.isPending ? "Saving..." : "Save Link"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {savedLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border rounded-lg bg-muted/20">
          <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No saved referral links yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first link to get started</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Link
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedLinks.map((link) => (
            <Card key={link.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between gap-2">
                  <span className="truncate">{link.name}</span>
                  <span className="text-xs font-normal bg-muted px-2 py-1 rounded-full">
                    {link.click_count} {link.click_count === 1 ? 'click' : 'clicks'}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs truncate">
                  {link.base_url}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="relative">
                  <div className="bg-muted/50 border rounded-md py-2 px-3 text-sm truncate mb-2">
                    {link.full_url}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {link.campaign && (
                      <span className="text-xs border rounded-md px-2 py-1 bg-primary/20 border-primary/30 font-medium">
                        campaign: {link.campaign}
                      </span>
                    )}
                    {link.utm_source && (
                      <span className="text-xs border rounded-md px-2 py-1 bg-primary/10">
                        source: {link.utm_source}
                      </span>
                    )}
                    {link.utm_medium && (
                      <span className="text-xs border rounded-md px-2 py-1 bg-primary/10">
                        medium: {link.utm_medium}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleCopyLink(link)}
                        >
                          {copiedLinkId === link.id ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy link</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleOpenLink(link)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open link</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleEditLink(link)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit link</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleDeleteLink(link.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete link</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Referral Link</DialogTitle>
            <DialogDescription>
              Update your saved referral link.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Homepage Link" {...field} />
                    </FormControl>
                    <FormDescription>A friendly name to identify this link</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="base_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormDescription>The base domain for your link</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="full_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/?ref=yourcode" {...field} />
                    </FormControl>
                    <FormDescription>The complete URL with all parameters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="campaign"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign</FormLabel>
                      <FormControl>
                        <Input placeholder="summer_promo" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>Identify your marketing campaign (e.g., summer_sale, email_promo)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="utm_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTM Source</FormLabel>
                      <FormControl>
                        <Input placeholder="partner" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="utm_medium"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTM Medium</FormLabel>
                      <FormControl>
                        <Input placeholder="social" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="utm_campaign"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTM Campaign</FormLabel>
                      <FormControl>
                        <Input placeholder="spring2024" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="utm_content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTM Content</FormLabel>
                      <FormControl>
                        <Input placeholder="banner" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="utm_term"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTM Term</FormLabel>
                      <FormControl>
                        <Input placeholder="ai_assistant" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateLinkMutation.isPending}
                >
                  {updateLinkMutation.isPending ? "Updating..." : "Update Link"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedReferralLinks;