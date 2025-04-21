import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Download, Link, Mail } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// Types for marketing materials
interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
}

interface MarketingData {
  referral_link: string;
  referral_code: string;
  banner_urls?: string[];
  email_templates?: EmailTemplate[];
}

interface MarketingResourcesProps {
  marketingData: MarketingData;
}

export default function MarketingResources({ marketingData }: MarketingResourcesProps) {
  const { toast } = useToast();
  const [copyStates, setCopyStates] = useState<{[key: string]: boolean}>({});
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(
    marketingData.email_templates && marketingData.email_templates.length > 0 
      ? marketingData.email_templates[0] 
      : null
  );
  
  // Handle copy action with visual feedback
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Update copy state to show check icon
      setCopyStates({...copyStates, [key]: true});
      
      toast({
        title: "Copied to clipboard",
        description: "The text has been copied to your clipboard."
      });
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopyStates({...copyStates, [key]: false});
      }, 2000);
    });
  };
  
  // Render banner images if available
  const renderBanners = () => {
    if (!marketingData.banner_urls || marketingData.banner_urls.length === 0) {
      return (
        <div className="p-6 text-center text-gray-400">
          No banner images available.
        </div>
      );
    }
    
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {marketingData.banner_urls.map((url, index) => (
          <Card key={index} className="overflow-hidden bg-gray-800/50 border-gray-700">
            <div className="aspect-[3/1] bg-gray-900 relative group">
              <img 
                src={url} 
                alt={`Partner banner ${index + 1}`} 
                className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="outline" size="sm" className="mr-2" onClick={() => handleCopy(url, `banner-${index}`)}>
                  {copyStates[`banner-${index}`] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-2">Copy URL</span>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
            <CardFooter className="p-3 flex justify-between items-center">
              <div className="text-sm text-gray-400">Banner {index + 1}</div>
              <Button variant="ghost" size="sm" onClick={() => handleCopy(url, `banner-${index}`)}>
                {copyStates[`banner-${index}`] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };
  
  // Render email templates if available
  const renderEmailTemplates = () => {
    if (!marketingData.email_templates || marketingData.email_templates.length === 0) {
      return (
        <div className="p-6 text-center text-gray-400">
          No email templates available.
        </div>
      );
    }
    
    return (
      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-1 space-y-4">
          <div className="font-medium text-white mb-2">Templates</div>
          <div className="space-y-2">
            {marketingData.email_templates.map((template, index) => (
              <div 
                key={index}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedTemplate?.name === template.name 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-800'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-xs opacity-80 truncate mt-1">
                  {template.subject}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-3">
          {selectedTemplate && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleCopy(
                      `Subject: ${selectedTemplate.subject}\n\n${selectedTemplate.body}`, 
                      `template-${selectedTemplate.name}`
                    )}
                  >
                    {copyStates[`template-${selectedTemplate.name}`] ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy Template
                  </Button>
                </div>
                <Separator className="my-2" />
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="email-subject">Subject</Label>
                    <div className="flex mt-1">
                      <Input 
                        id="email-subject" 
                        value={selectedTemplate.subject} 
                        readOnly
                        className="bg-gray-900 border-gray-700"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="ml-2" 
                        onClick={() => handleCopy(selectedTemplate.subject, `subject-${selectedTemplate.name}`)}
                      >
                        {copyStates[`subject-${selectedTemplate.name}`] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Label htmlFor="email-body">Email Body</Label>
                <div className="relative mt-1">
                  <Textarea 
                    id="email-body" 
                    value={selectedTemplate.body}
                    readOnly
                    className="min-h-[200px] bg-gray-900 border-gray-700"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2" 
                    onClick={() => handleCopy(selectedTemplate.body, `body-${selectedTemplate.name}`)}
                  >
                    {copyStates[`body-${selectedTemplate.name}`] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  <p className="mb-2">Personalization variables:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><code>{"{name}"}</code> - Recipient's name</li>
                    <li><code>{"{your_name}"}</code> - Your name</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center">
          <div className="bg-blue-600/20 p-2 rounded-full mr-3">
            <Link className="h-5 w-5 text-blue-400" />
          </div>
          Marketing Resources
        </CardTitle>
        <CardDescription>
          Promotional materials to help you refer new customers
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="mb-6">
          <Label htmlFor="referral-link" className="text-white">Your Referral Link</Label>
          <div className="flex mt-1">
            <Input 
              id="referral-link" 
              value={marketingData.referral_link} 
              readOnly 
              className="bg-gray-900 border-gray-700"
            />
            <Button 
              variant="outline" 
              className="ml-2" 
              onClick={() => handleCopy(marketingData.referral_link, 'referral-link')}
            >
              {copyStates['referral-link'] ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Share this link with potential customers. You'll earn a commission for every new paid user who signs up through this link.
          </p>
        </div>
        
        <Tabs defaultValue="banners" className="mt-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900 border-gray-700">
            <TabsTrigger value="banners" className="data-[state=active]:bg-gray-800">Banner Images</TabsTrigger>
            <TabsTrigger value="emails" className="data-[state=active]:bg-gray-800">Email Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="banners" className="mt-4">
            {renderBanners()}
          </TabsContent>
          <TabsContent value="emails" className="mt-4">
            {renderEmailTemplates()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}