import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { InfoIcon, ArrowRightIcon, CheckCircleIcon, XCircleIcon, TrendingUp, Link as LinkIcon, BarChart } from 'lucide-react';
import { ReferralService, ReferralClickRequest } from '@/lib/referral-service';
import ReferralLinkGenerator from '@/components/ReferralLinkGenerator';

// Sample data for demonstration
const SAMPLE_PARTNER_CODES = ['ZACHP', 'PARTNER50', 'FIRSTMONTHFREE'];

export default function ReferralTest() {
  const [referralCode, setReferralCode] = useState(SAMPLE_PARTNER_CODES[0]);
  const [baseUrl, setBaseUrl] = useState('https://warmleadnetwork.app');
  const [customUrl, setCustomUrl] = useState('');
  const [utmSource, setUtmSource] = useState('test');
  const [utmMedium, setUtmMedium] = useState('webapp');
  const [utmCampaign, setUtmCampaign] = useState('test-campaign');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  const trackClick = async () => {
    if (!referralCode) {
      toast({
        title: 'Error',
        description: 'Please enter a referral code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      // Create the tracking data object
      const trackingData: ReferralClickRequest = {
        referral_code: referralCode,
        base_url: baseUrl,
        custom_url: customUrl || null,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null
      };

      // Use the referral service to track the click
      const data = await ReferralService.trackClick(trackingData);
      setResult(data);
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Referral click tracked successfully',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to track referral click',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error tracking referral click:', error);
      setResult({ error: 'Failed to track referral click. See console for details.' });
      
      toast({
        title: 'Error',
        description: 'Failed to track referral click',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStats = async () => {
    setLoading(true);
    setStats(null);
    
    try {
      // This would require authentication with a partner account
      // Here we're just demonstrating the API call
      const response = await ReferralService.getClickStats()
        .catch(error => {
          // For demo purposes, generate sample stats if there's an auth error
          return {
            totalClicks: 53,
            uniqueClicks: 34,
            conversionRate: 0.12,
            clicksByDay: [
              { date: '2025-04-01', clicks: 12, uniqueClicks: 8 },
              { date: '2025-04-02', clicks: 41, uniqueClicks: 26 }
            ],
            clicksBySource: [
              { source: 'social', clicks: 22 },
              { source: 'email', clicks: 16 },
              { source: 'direct', clicks: 15 }
            ],
            clicksByMedium: [
              { medium: 'facebook', clicks: 18 },
              { medium: 'twitter', clicks: 12 },
              { medium: 'linkedin', clicks: 8 },
              { medium: 'newsletter', clicks: 15 }
            ],
            clicksByCampaign: [
              { campaign: 'spring_promo', clicks: 30 },
              { campaign: 'product_launch', clicks: 23 }
            ]
          };
        });
      
      setStats(response);
      
      toast({
        title: 'Success',
        description: 'Fetched referral click statistics',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error fetching referral statistics:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to fetch referral statistics. Authentication required.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white py-10">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent inline-block">
            Partner Referral System
          </h1>
          <p className="text-slate-300 max-w-3xl mx-auto">
            Track, manage, and optimize your partner referral campaigns with advanced analytics and UTM parameter support
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Tabs defaultValue="generator">
              <TabsList className="mb-4 bg-slate-800 border border-slate-700">
                <TabsTrigger value="generator" className="data-[state=active]:bg-blue-600">
                  <LinkIcon className="mr-2 h-4 w-4" /> Link Generator
                </TabsTrigger>
                <TabsTrigger value="manual" className="data-[state=active]:bg-blue-600">
                  <TrendingUp className="mr-2 h-4 w-4" /> Manual Testing
                </TabsTrigger>
                <TabsTrigger value="stats" className="data-[state=active]:bg-blue-600">
                  <BarChart className="mr-2 h-4 w-4" /> Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="generator">
                <ReferralLinkGenerator referralCode={referralCode} />
              </TabsContent>

              <TabsContent value="manual">
                <Card className="bg-slate-800 border-slate-700 text-slate-200 shadow-xl">
                  <CardHeader>
                    <CardTitle>Manual Referral Testing</CardTitle>
                    <CardDescription className="text-slate-400">
                      Manually test the referral tracking API endpoints
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="referralCode" className="text-slate-300">Referral Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="referralCode"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                          placeholder="Enter partner referral code"
                          className="bg-slate-900 border-slate-700 text-slate-300"
                        />
                        <div className="relative">
                          <select 
                            className="appearance-none bg-slate-700 border border-slate-600 text-slate-300 px-3 py-2 rounded-md w-32 cursor-pointer"
                            onChange={(e) => setReferralCode(e.target.value)}
                            value={referralCode}
                          >
                            <option value="" disabled>Select sample</option>
                            {SAMPLE_PARTNER_CODES.map(code => (
                              <option key={code} value={code}>{code}</option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="baseUrl" className="text-slate-300">Base URL</Label>
                        <Input
                          id="baseUrl"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder="Enter base URL"
                          className="bg-slate-900 border-slate-700 text-slate-300"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customUrl" className="text-slate-300">Custom URL Path</Label>
                        <Input
                          id="customUrl"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="e.g., pricing"
                          className="bg-slate-900 border-slate-700 text-slate-300"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="utmSource" className="text-slate-300">UTM Source</Label>
                        <Input
                          id="utmSource"
                          value={utmSource}
                          onChange={(e) => setUtmSource(e.target.value)}
                          placeholder="e.g., facebook"
                          className="bg-slate-900 border-slate-700 text-slate-300"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="utmMedium" className="text-slate-300">UTM Medium</Label>
                        <Input
                          id="utmMedium"
                          value={utmMedium}
                          onChange={(e) => setUtmMedium(e.target.value)}
                          placeholder="e.g., social"
                          className="bg-slate-900 border-slate-700 text-slate-300"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="utmCampaign" className="text-slate-300">UTM Campaign</Label>
                        <Input
                          id="utmCampaign"
                          value={utmCampaign}
                          onChange={(e) => setUtmCampaign(e.target.value)}
                          placeholder="e.g., summer_promo"
                          className="bg-slate-900 border-slate-700 text-slate-300"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      onClick={trackClick} 
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Processing...' : 'Track Click'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={getStats} 
                      disabled={loading}
                      className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                    >
                      Get Statistics
                    </Button>
                  </CardFooter>
                </Card>

                {result && (
                  <Card className={`mt-6 bg-slate-800 border-slate-700 text-slate-200 ${result.success ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {result.success ? 
                          <CheckCircleIcon className="text-green-500" /> : 
                          <XCircleIcon className="text-red-500" />}
                        Result
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-slate-900 p-4 rounded-md overflow-auto text-slate-300 text-sm">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="stats">
                <Card className="bg-slate-800 border-slate-700 text-slate-200 shadow-xl">
                  <CardHeader>
                    <CardTitle>Referral Analytics</CardTitle>
                    <CardDescription className="text-slate-400">
                      View performance metrics for your referral campaigns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats ? (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-lg p-4 border border-blue-800/50">
                            <div className="text-blue-400 mb-1 text-sm">Total Clicks</div>
                            <div className="text-3xl font-bold">{stats.totalClicks}</div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 rounded-lg p-4 border border-purple-800/50">
                            <div className="text-purple-400 mb-1 text-sm">Unique Visitors</div>
                            <div className="text-3xl font-bold">{stats.uniqueClicks}</div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-lg p-4 border border-emerald-800/50">
                            <div className="text-emerald-400 mb-1 text-sm">Conversion Rate</div>
                            <div className="text-3xl font-bold">{(stats.conversionRate * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-medium mb-3 text-slate-300">Traffic by Source</h3>
                            <div className="space-y-2">
                              {stats.clicksBySource.map((item: any) => (
                                <div key={item.source} className="flex items-center">
                                  <div className="w-28 text-slate-400">{item.source}</div>
                                  <div className="flex-1 mx-2">
                                    <div className="bg-slate-700 h-6 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full"
                                        style={{ width: `${(item.clicks / stats.totalClicks) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="text-slate-300 w-12 text-right">{item.clicks}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium mb-3 text-slate-300">Traffic by Medium</h3>
                            <div className="space-y-2">
                              {stats.clicksByMedium.map((item: any) => (
                                <div key={item.medium} className="flex items-center">
                                  <div className="w-28 text-slate-400">{item.medium}</div>
                                  <div className="flex-1 mx-2">
                                    <div className="bg-slate-700 h-6 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-purple-600 to-fuchsia-500 h-full rounded-full"
                                        style={{ width: `${(item.clicks / stats.totalClicks) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="text-slate-300 w-12 text-right">{item.clicks}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-3 text-slate-300">Daily Traffic</h3>
                          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                            <div className="flex min-w-[600px]">
                              {stats.clicksByDay.map((day: any, index: number) => (
                                <div key={day.date} className="flex-1 flex flex-col items-center">
                                  <div className="h-32 flex items-end justify-center w-full px-2">
                                    <div className="w-full relative flex justify-center items-end">
                                      <div 
                                        className="w-7 bg-indigo-600/60 rounded-t-sm"
                                        style={{ height: `${(day.uniqueClicks / stats.uniqueClicks) * 80}%` }}
                                      ></div>
                                      <div 
                                        className="w-7 bg-blue-500/80 rounded-t-sm absolute"
                                        style={{ height: `${(day.clicks / stats.totalClicks) * 80}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-400 mt-2">
                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-center mt-4 space-x-6">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-blue-500 mr-2 rounded-sm"></div>
                                <span className="text-xs text-slate-400">Total Clicks</span>
                              </div>
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-indigo-600 mr-2 rounded-sm"></div>
                                <span className="text-xs text-slate-400">Unique Visitors</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <BarChart className="h-12 w-12 mb-4 text-slate-600" />
                        <h3 className="text-lg font-medium text-slate-400 mb-2">No Analytics Data Available</h3>
                        <p className="text-slate-500 max-w-md mb-6">
                          Click the "Get Statistics" button to load sample analytics data or log in as a partner to view your actual referral performance.
                        </p>
                        <Button 
                          onClick={getStats} 
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {loading ? 'Loading Data...' : 'Load Sample Data'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700 text-slate-200 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle>How the Referral System Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 p-4 rounded-lg border border-blue-900/30">
                  <h3 className="font-semibold flex items-center gap-2 text-blue-400">
                    <ArrowRightIcon size={16} />
                    Advanced Tracking
                  </h3>
                  <p className="text-sm mt-2 text-slate-300">
                    Our system captures comprehensive data with each referral link click, including partner ID, 
                    referral code, IP address, user agent, UTM parameters, and more. This provides partners with 
                    detailed insights into their marketing performance.
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-900/20 to-fuchsia-900/20 p-4 rounded-lg border border-purple-900/30">
                  <h3 className="font-semibold flex items-center gap-2 text-purple-400">
                    <ArrowRightIcon size={16} />
                    UTM Parameter Support
                  </h3>
                  <p className="text-sm mt-2 text-slate-300">
                    Partners can customize their referral links with UTM parameters to track specific campaigns, 
                    sources, and mediums. This integration with standard web analytics tools allows for more 
                    effective campaign optimization.
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-emerald-900/20 to-green-900/20 p-4 rounded-lg border border-emerald-900/30">
                  <h3 className="font-semibold flex items-center gap-2 text-emerald-400">
                    <ArrowRightIcon size={16} />
                    Conversion Attribution
                  </h3>
                  <p className="text-sm mt-2 text-slate-300">
                    When a user signs up through a referral link, our system automatically attributes the conversion 
                    to the referring partner. This ensures accurate commission calculations and transparent earnings reporting.
                  </p>
                </div>
                
                <Alert className="bg-indigo-900/30 border-indigo-800 text-indigo-300">
                  <InfoIcon className="h-4 w-4 text-indigo-400" />
                  <AlertTitle>Partner Dashboard Integration</AlertTitle>
                  <AlertDescription className="text-indigo-300/80 mt-1">
                    This referral tracking system is seamlessly integrated with the Partner Dashboard, providing real-time 
                    analytics, earnings reports, and conversion data to help partners optimize their marketing efforts.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700 text-slate-200 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle>Implementation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 p-4 rounded-md overflow-auto text-slate-300 text-sm font-mono">
                  <div className="flex mb-2">
                    <span className="text-slate-500 mr-2">1</span>
                    <span className="text-blue-400">// Track a referral click from a user</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-500 mr-2">2</span>
                    <span className="text-purple-400">POST</span>
                    <span className="text-slate-300"> /api/track/referral-click</span>
                  </div>
                  <div className="flex mb-4">
                    <span className="text-slate-500 mr-2">3</span>
                    <span className="text-green-400">// Public endpoint - no authentication required</span>
                  </div>
                  
                  <div className="flex">
                    <span className="text-slate-500 mr-2">4</span>
                    <span className="text-slate-300">{'{'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-500 mr-2">5</span>
                    <span className="text-slate-300">  </span>
                    <span className="text-blue-400">"referral_code"</span>
                    <span className="text-slate-300">: </span>
                    <span className="text-orange-400">"ZACHP"</span>
                    <span className="text-slate-300">,</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-500 mr-2">6</span>
                    <span className="text-slate-300">  </span>
                    <span className="text-blue-400">"base_url"</span>
                    <span className="text-slate-300">: </span>
                    <span className="text-orange-400">"https://warmleadnetwork.app"</span>
                    <span className="text-slate-300">,</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-500 mr-2">7</span>
                    <span className="text-slate-300">  </span>
                    <span className="text-blue-400">"utm_source"</span>
                    <span className="text-slate-300">: </span>
                    <span className="text-orange-400">"facebook"</span>
                    <span className="text-slate-300">,</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-500 mr-2">8</span>
                    <span className="text-slate-300">  </span>
                    <span className="text-blue-400">"utm_medium"</span>
                    <span className="text-slate-300">: </span>
                    <span className="text-orange-400">"social"</span>
                    <span className="text-slate-300">,</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-500 mr-2">9</span>
                    <span className="text-slate-300">  </span>
                    <span className="text-blue-400">"utm_campaign"</span>
                    <span className="text-slate-300">: </span>
                    <span className="text-orange-400">"summer_promo"</span>
                  </div>
                  <div className="flex mb-4">
                    <span className="text-slate-500 mr-2">10</span>
                    <span className="text-slate-300">{'}'}</span>
                  </div>
                  
                  <div className="flex mb-2">
                    <span className="text-slate-500 mr-2">11</span>
                    <span className="text-blue-400">// Retrieve referral analytics</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-500 mr-2">12</span>
                    <span className="text-cyan-400">GET</span>
                    <span className="text-slate-300"> /api/partner/referral-clicks</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-500 mr-2">13</span>
                    <span className="text-red-400">// Protected endpoint - partner authentication required</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}