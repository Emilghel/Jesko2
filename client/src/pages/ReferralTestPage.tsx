import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, Info, Check, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface ReferralInfo {
  partnerCode?: string;
  partnerId?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  timestamp?: string;
  referralUrl?: string;
}

const ReferralTestPage = () => {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [referralLink, setReferralLink] = useState('');
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/referral-info'],
    queryFn: async () => {
      const response = await apiRequest('/api/referral-info');
      return response;
    }
  });

  const referralInfo: ReferralInfo | null = data?.referralInfo || null;
  
  // Function to generate a test referral link
  const generateTestReferralLink = () => {
    try {
      // Create a test referral link with UTM parameters
      const baseUrl = window.location.origin;
      const code = 'TEST-CODE';
      const utmParams = new URLSearchParams({
        utm_source: 'referral-test',
        utm_medium: 'test-page',
        utm_campaign: 'conversion-test',
        utm_term: 'testing',
        utm_content: 'test-button'
      });
      
      const fullUrl = `${baseUrl}/referral-test?ref=${code}&${utmParams.toString()}`;
      setReferralLink(fullUrl);
      setGenerateResult('success');
      
      return fullUrl;
    } catch (error) {
      console.error('Error generating test link:', error);
      setGenerateResult('error');
      return null;
    }
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: 'Copied!',
          description: 'Link copied to clipboard',
        });
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: 'Copy failed',
          description: 'Could not copy to clipboard',
          variant: 'destructive',
        });
      });
  };

  // Function to simulate registration
  const simulateRegistration = async () => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: `test_user_${Date.now()}`,
          email: `test_${Date.now()}@example.com`,
          password: 'password123',
          displayName: 'Test User',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Registration Simulated',
          description: 'A test registration was processed with current referral data',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration simulation error:', error);
      toast({
        title: 'Simulation Failed',
        description: error instanceof Error ? error.message : 'Registration simulation failed',
        variant: 'destructive',
      });
    }
  };

  // Function to simulate coin purchase
  const simulatePurchase = async () => {
    try {
      const response = await fetch('/api/coins/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 100,
          paymentMethod: 'test',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Purchase Simulated',
          description: 'A test coin purchase was processed with current referral data',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Purchase simulation failed');
      }
    } catch (error) {
      console.error('Purchase simulation error:', error);
      toast({
        title: 'Simulation Failed',
        description: error instanceof Error ? error.message : 'Purchase simulation failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Referral Tracking System Test Page</h1>
        <p className="text-gray-500">
          This page allows you to test and debug the referral attribution system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Referral Information</CardTitle>
            <CardDescription>
              Data stored in the current session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load referral information
                </AlertDescription>
              </Alert>
            ) : referralInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Partner Code:</div>
                  <div className="text-sm">{referralInfo.partnerCode || 'None'}</div>
                  
                  <div className="text-sm font-medium">Partner ID:</div>
                  <div className="text-sm">{referralInfo.partnerId || 'None'}</div>
                  
                  <div className="text-sm font-medium">Source:</div>
                  <div className="text-sm">{referralInfo.utmSource || 'None'}</div>
                  
                  <div className="text-sm font-medium">Medium:</div>
                  <div className="text-sm">{referralInfo.utmMedium || 'None'}</div>
                  
                  <div className="text-sm font-medium">Campaign:</div>
                  <div className="text-sm">{referralInfo.utmCampaign || 'None'}</div>
                  
                  <div className="text-sm font-medium">Term:</div>
                  <div className="text-sm">{referralInfo.utmTerm || 'None'}</div>
                  
                  <div className="text-sm font-medium">Content:</div>
                  <div className="text-sm">{referralInfo.utmContent || 'None'}</div>
                  
                  <div className="text-sm font-medium">Timestamp:</div>
                  <div className="text-sm">{referralInfo.timestamp ? new Date(referralInfo.timestamp).toLocaleString() : 'None'}</div>
                  
                  <div className="text-sm font-medium">Original URL:</div>
                  <div className="text-sm break-all">{referralInfo.referralUrl || 'None'}</div>
                </div>
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No Referral Data</AlertTitle>
                <AlertDescription>
                  No referral information found in the current session. Try visiting with a referral link.
                </AlertDescription>
              </Alert>
            )}
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Referral Link</CardTitle>
            <CardDescription>
              Generate and test referral links
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Button onClick={generateTestReferralLink}>
                  Generate Test Link
                </Button>
                
                {generateResult === 'success' && (
                  <div className="flex items-center mt-2 text-green-500 text-sm">
                    <Check className="h-4 w-4 mr-1" />
                    <span>Link generated successfully</span>
                  </div>
                )}
                
                {generateResult === 'error' && (
                  <div className="flex items-center mt-2 text-red-500 text-sm">
                    <X className="h-4 w-4 mr-1" />
                    <span>Failed to generate link</span>
                  </div>
                )}
              </div>
              
              {referralLink && (
                <div className="space-y-2">
                  <Label htmlFor="referral-link">Test Referral Link:</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="referral-link" 
                      value={referralLink} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(referralLink)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="pt-2">
                    <Button 
                      variant="secondary" 
                      onClick={() => window.open(referralLink, '_blank')}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Tests</CardTitle>
          <CardDescription>
            Simulate conversion events to test attribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Test Environment</AlertTitle>
              <AlertDescription>
                These actions simulate conversion events to test the referral attribution system. 
                They don't create real accounts or process real payments.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Registration Attribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Simulates a user registration with current referral data
                  </p>
                  <Button onClick={simulateRegistration}>
                    Simulate Registration
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Purchase Attribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Simulates a coin purchase with current referral data
                  </p>
                  <Button onClick={simulatePurchase}>
                    Simulate Purchase
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralTestPage;