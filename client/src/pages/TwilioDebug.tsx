import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Check, CheckCircle, Copy, Phone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import DirectCallTest from '@/components/DirectCallTest';

export default function TwilioDebug() {
  const { toast } = useToast();
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWebhookInfo = async () => {
      try {
        const response = await fetch('/api/twilio/test-webhook');
        if (!response.ok) {
          throw new Error(`Error fetching webhook info: ${response.status}`);
        }
        const data = await response.json();
        setWebhookInfo(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error fetching webhook info');
        setLoading(false);
      }
    };

    fetchWebhookInfo();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copied!',
          description: `${label} copied to clipboard`,
          variant: 'default',
        });
      },
      () => {
        toast({
          title: 'Failed to copy',
          description: 'Please try again or copy manually',
          variant: 'destructive',
        });
      }
    );
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Twilio Debugging Tools</h1>
      </div>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Twilio Debug Mode</AlertTitle>
        <AlertDescription>
          This page contains sensitive configuration information. Do not share screenshots of this page with others.
        </AlertDescription>
      </Alert>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-center mt-4">Loading Twilio configuration...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading Twilio configuration</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Webhook URLs Configuration</CardTitle>
              <CardDescription>
                These are the webhook URLs configured for your Twilio integration. Use these URLs in your Twilio console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voiceUrl">Voice URL</Label>
                  <div className="flex items-center mt-1 gap-2">
                    <Input 
                      id="voiceUrl" 
                      value={webhookInfo.webhookUrls.voiceUrl} 
                      readOnly 
                    />
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => copyToClipboard(webhookInfo.webhookUrls.voiceUrl, 'Voice URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="outboundVoiceUrl">Outbound Voice URL</Label>
                  <div className="flex items-center mt-1 gap-2">
                    <Input 
                      id="outboundVoiceUrl" 
                      value={webhookInfo.webhookUrls.outboundVoiceUrl} 
                      readOnly 
                    />
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => copyToClipboard(webhookInfo.webhookUrls.outboundVoiceUrl, 'Outbound Voice URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="statusCallbackUrl">Status Callback URL</Label>
                  <div className="flex items-center mt-1 gap-2">
                    <Input 
                      id="statusCallbackUrl" 
                      value={webhookInfo.webhookUrls.statusCallbackUrl} 
                      readOnly 
                    />
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => copyToClipboard(webhookInfo.webhookUrls.statusCallbackUrl, 'Status Callback URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="twilioPhoneNumber">Twilio Phone Number</Label>
                  <div className="flex items-center mt-1 gap-2">
                    <Input 
                      id="twilioPhoneNumber" 
                      value={webhookInfo.webhookUrls.twilioPhoneNumber} 
                      readOnly 
                    />
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => copyToClipboard(webhookInfo.webhookUrls.twilioPhoneNumber, 'Twilio Phone Number')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>
                Current environment settings for your Twilio integration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Environment</Label>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-primary/10 text-primary">
                        {webhookInfo.environment.nodeEnv}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Replit Information</Label>
                    <div className="mt-1">
                      <p className="text-sm">Slug: {webhookInfo.environment.replSlug}</p>
                      <p className="text-sm">Owner: {webhookInfo.environment.replOwner}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  <h3 className="text-lg font-medium">Twilio Credentials Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-md p-3">
                      <div className={webhookInfo.environment.twilioAccountSid !== 'Not set' 
                        ? "text-green-500 bg-green-100 dark:bg-green-900/30 rounded-full p-1" 
                        : "text-red-500 bg-red-100 dark:bg-red-900/30 rounded-full p-1"
                      }>
                        {webhookInfo.environment.twilioAccountSid !== 'Not set' 
                          ? <CheckCircle className="h-5 w-5" /> 
                          : <AlertTriangle className="h-5 w-5" />
                        }
                      </div>
                      <div>
                        <p className="font-medium">Account SID</p>
                        <p className="text-xs">{webhookInfo.environment.twilioAccountSid}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-md p-3">
                      <div className={webhookInfo.environment.twilioAuthToken !== 'Not set' 
                        ? "text-green-500 bg-green-100 dark:bg-green-900/30 rounded-full p-1" 
                        : "text-red-500 bg-red-100 dark:bg-red-900/30 rounded-full p-1"
                      }>
                        {webhookInfo.environment.twilioAuthToken !== 'Not set' 
                          ? <CheckCircle className="h-5 w-5" /> 
                          : <AlertTriangle className="h-5 w-5" />
                        }
                      </div>
                      <div>
                        <p className="font-medium">Auth Token</p>
                        <p className="text-xs">{webhookInfo.environment.twilioAuthToken}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-md p-3">
                      <div className={webhookInfo.environment.twilioPhoneNumber !== 'Not set' 
                        ? "text-green-500 bg-green-100 dark:bg-green-900/30 rounded-full p-1" 
                        : "text-red-500 bg-red-100 dark:bg-red-900/30 rounded-full p-1"
                      }>
                        {webhookInfo.environment.twilioPhoneNumber !== 'Not set' 
                          ? <CheckCircle className="h-5 w-5" /> 
                          : <AlertTriangle className="h-5 w-5" />
                        }
                      </div>
                      <div>
                        <p className="font-medium">Phone Number</p>
                        <p className="text-xs">{webhookInfo.environment.twilioPhoneNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DirectCallTest />

          <Card>
            <CardHeader>
              <CardTitle>Twilio Testing Guide</CardTitle>
              <CardDescription>
                Follow these steps to test your Twilio integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Ensure all Twilio credentials are configured correctly (green checkmarks above)</li>
                <li>Use the Direct Call Test section to initiate a test call</li>
                <li>Receive the call on your device to verify voice response</li>
                <li>If the call connects but cannot be picked up, check your TwiML response</li>
                <li>If calls fail completely, verify your webhook URLs in the Twilio console</li>
              </ol>
              
              <div className="mt-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <h3 className="font-medium mb-2">Troubleshooting Tips:</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use test number +15005550006 for testing (will not make real calls)</li>
                  <li>Check server logs for detailed error messages</li>
                  <li>Ensure webhook URLs are publicly accessible</li>
                  <li>Try simplifying TwiML responses if calls connect but have issues</li>
                  <li>For real calls, ensure your Twilio account has sufficient funds</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}