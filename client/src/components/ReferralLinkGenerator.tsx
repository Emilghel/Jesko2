import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clipboard, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ReferralService, ReferralLinkOptions, ReferralClickRequest } from '@/lib/referral-service';
import { useToast } from '@/hooks/use-toast';

interface ReferralLinkGeneratorProps {
  referralCode: string;
}

export default function ReferralLinkGenerator({ referralCode }: ReferralLinkGeneratorProps) {
  const [baseUrl, setBaseUrl] = useState('https://warmleadnetwork.app');
  const [customPath, setCustomPath] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showUtmParams, setShowUtmParams] = useState(false);
  const [utmSource, setUtmSource] = useState('partner');
  const [utmMedium, setUtmMedium] = useState('referral');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Generate link when component loads or when referral code changes
    if (referralCode) {
      generateLink();
    }
  }, [referralCode]);

  const generateLink = () => {
    // If no referral code is available, use a default one for demo purposes
    const codeToUse = referralCode || 'DEMO';
    
    // Only show error toast if the button was clicked explicitly
    // (not during initial component rendering)
    if (!referralCode && !generatedLink) {
      console.log('Using demo referral code since no actual code is available');
    }

    try {
      // Create the options object with the imported ReferralLinkOptions type
      const options: ReferralLinkOptions = {
        customPath: customPath || undefined,
      };

      // Only include UTM parameters if the advanced options are shown
      if (showUtmParams) {
        if (utmSource) options.utmSource = utmSource;
        if (utmMedium) options.utmMedium = utmMedium;
        if (utmCampaign) options.utmCampaign = utmCampaign;
        if (utmTerm) options.utmTerm = utmTerm;
        if (utmContent) options.utmContent = utmContent;
      }

      const link = ReferralService.generateReferralLink(codeToUse, baseUrl, options);
      setGeneratedLink(link);
    } catch (error) {
      console.error('Error generating referral link:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate referral link',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({
        title: 'Success',
        description: 'Referral link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const trackClick = async () => {
    // Use demo code if no referral code is available
    const codeToUse = referralCode || 'DEMO';
    
    try {
      // Build the request payload with the imported ReferralClickRequest type
      const requestData: ReferralClickRequest = {
        referral_code: codeToUse,
        base_url: baseUrl,
        custom_url: customPath || null,
      };

      // Add UTM parameters if they are shown and have values
      if (showUtmParams) {
        Object.assign(requestData, {
          utm_source: utmSource || null,
          utm_medium: utmMedium || null,
          utm_campaign: utmCampaign || null,
          utm_term: utmTerm || null,
          utm_content: utmContent || null
        });
      }

      // Track the click through the API
      const result = await ReferralService.trackClick(requestData);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Referral click tracked successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to track referral click',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error tracking referral click:', error);
      toast({
        title: 'Error',
        description: 'Failed to track referral click',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate Your Referral Link</CardTitle>
        <CardDescription>
          Create a custom referral link to share and track with your audience
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="basic">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Website URL</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Enter the website URL"
              />
              <p className="text-xs text-muted-foreground">The base website URL where your referral link will point to</p>
            </div>

            {generatedLink && (
              <div className="mt-6 p-3 bg-secondary/50 rounded-md relative">
                <div className="text-sm font-mono break-all pr-10">{generatedLink}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="advBaseUrl">Website URL</Label>
              <Input
                id="advBaseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Enter the website URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customPath">Custom Path (optional)</Label>
              <Input
                id="customPath"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="e.g., pricing, features, etc."
              />
              <p className="text-xs text-muted-foreground">A specific page or path to direct traffic to</p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="utm-toggle" className="cursor-pointer">UTM Parameters</Label>
                <Switch
                  id="utm-toggle"
                  checked={showUtmParams}
                  onCheckedChange={setShowUtmParams}
                />
              </div>
            </div>

            {showUtmParams && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="utmSource">Source</Label>
                    <Input
                      id="utmSource"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      placeholder="e.g., partner"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utmMedium">Medium</Label>
                    <Input
                      id="utmMedium"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                      placeholder="e.g., referral"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="utmCampaign">Campaign Name</Label>
                  <Input
                    id="utmCampaign"
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="e.g., summer_promo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="utmTerm">Term (Keywords)</Label>
                    <Input
                      id="utmTerm"
                      value={utmTerm}
                      onChange={(e) => setUtmTerm(e.target.value)}
                      placeholder="e.g., ai assistant"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utmContent">Content</Label>
                    <Input
                      id="utmContent"
                      value={utmContent}
                      onChange={(e) => setUtmContent(e.target.value)}
                      placeholder="e.g., hero_button"
                    />
                  </div>
                </div>
              </div>
            )}

            {generatedLink && (
              <div className="mt-6 p-3 bg-secondary/50 rounded-md relative">
                <div className="text-sm font-mono break-all pr-10">{generatedLink}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button onClick={generateLink} variant="default">
          Generate Link
        </Button>
        <Button 
          onClick={trackClick} 
          variant="outline"
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border-indigo-200"
        >
          Test Tracking
        </Button>
      </CardFooter>
    </Card>
  );
}