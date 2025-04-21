import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Activity, Link2 } from 'lucide-react';
import { ReferralService, ReferralClicksStats, ReferralClick } from '@/lib/referral-service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// AnimatedIcon component
function AnimatedIcon({ icon, color }: { icon: React.ReactNode, color: string }) {
  return (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-opacity-20" 
         style={{ 
           backgroundColor: `rgba(${color === 'blue' ? '56, 189, 248' : 
                             color === 'green' ? '52, 211, 153' : 
                             color === 'purple' ? '139, 92, 246' : 
                             color === 'yellow' ? '251, 191, 36' : 
                             color === 'pink' ? '236, 72, 153' : '255, 255, 255'}, 0.2)`,
           animation: 'iconFloat 3s ease-in-out infinite',
           boxShadow: `0 0 15px 5px rgba(${color === 'blue' ? '56, 189, 248' : 
                                         color === 'green' ? '52, 211, 153' : 
                                         color === 'purple' ? '139, 92, 246' : 
                                         color === 'yellow' ? '251, 191, 36' : 
                                         color === 'pink' ? '236, 72, 153' : '255, 255, 255'}, 0.3)`
         }}>
      {icon}
    </div>
  );
}

// Mock data for use when live data isn't available or in demo mode
const mockClicksData = {
  totalClicks: 256,
  uniqueClicks: 187,
  conversionRate: 14.2,
  clicksByDay: [
    { date: '2025-04-01', clicks: 23, uniqueClicks: 20 },
    { date: '2025-04-02', clicks: 35, uniqueClicks: 32 },
    { date: '2025-04-03', clicks: 29, uniqueClicks: 24 },
    { date: '2025-04-04', clicks: 42, uniqueClicks: 38 },
    { date: '2025-04-05', clicks: 38, uniqueClicks: 33 },
    { date: '2025-04-06', clicks: 47, uniqueClicks: 35 },
    { date: '2025-04-07', clicks: 42, uniqueClicks: 37 }
  ],
  clicksBySource: [
    { source: 'social', clicks: 92 },
    { source: 'email', clicks: 64 },
    { source: 'blog', clicks: 48 },
    { source: 'direct', clicks: 32 },
    { source: 'other', clicks: 20 }
  ],
  clicksByMedium: [
    { medium: 'facebook', clicks: 47 },
    { medium: 'twitter', clicks: 36 },
    { medium: 'instagram', clicks: 29 },
    { medium: 'linkedin', clicks: 24 },
    { medium: 'newsletter', clicks: 64 },
    { medium: 'other', clicks: 56 }
  ],
  clicksByCampaign: [
    { campaign: 'spring_promo', clicks: 84 },
    { campaign: 'product_launch', clicks: 56 },
    { campaign: 'webinar', clicks: 47 },
    { campaign: 'holiday', clicks: 38 },
    { campaign: 'other', clicks: 31 }
  ]
};

const mockRecentClicks = [
  {
    id: 1,
    referral_code: 'DEMO',
    utm_source: 'twitter',
    utm_medium: 'social',
    utm_campaign: 'spring_promo',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    base_url: 'https://warmleadnetwork.app',
    ip_address: '192.168.1.1',
    is_unique: true
  },
  {
    id: 2,
    referral_code: 'DEMO',
    utm_source: 'facebook',
    utm_medium: 'social',
    utm_campaign: 'spring_promo',
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 minutes ago
    base_url: 'https://warmleadnetwork.app',
    ip_address: '192.168.1.2',
    is_unique: true
  },
  {
    id: 3,
    referral_code: 'DEMO',
    utm_source: 'newsletter',
    utm_medium: 'email',
    utm_campaign: 'product_launch',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    base_url: 'https://warmleadnetwork.app',
    ip_address: '192.168.1.3',
    is_unique: true
  }
] as ReferralClick[];

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#83a6ed'];

export default function ReferralClickTracker() {
  const [stats, setStats] = useState<ReferralClicksStats | null>(null);
  const [recentClicks, setRecentClicks] = useState<ReferralClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataMode, setDataMode] = useState<'live' | 'demo'>('demo');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    // Set up periodic refresh every 5 minutes
    const intervalId = setInterval(loadData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Attempt to load live data
      const clickStats = await ReferralService.getClickStats();
      const clicks = await ReferralService.getRecentClicks(10);
      
      setStats(clickStats);
      setRecentClicks(clicks);
      setDataMode('live');
    } catch (error) {
      console.log('Using demo data for referral click stats');
      // Fall back to mock data
      setStats(mockClicksData);
      setRecentClicks(mockRecentClicks);
      setDataMode('demo');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d');
    } catch (e) {
      return dateString;
    }
  };
  
  // Format time ago for recent clicks
  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'just now';
      if (diffMins === 1) return '1 minute ago';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'yesterday';
      return `${diffDays} days ago`;
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md mb-10 overflow-hidden relative" 
          style={{ 
            background: 'rgba(20, 20, 30, 0.7)', 
            boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
          }}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#33C3BD] to-[#0075FF]"></div>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white flex items-center">
              <AnimatedIcon icon={<Activity className="h-6 w-6 text-cyan-400" />} color="blue" />
              <span className="ml-3">Referral Link Analytics</span>
            </CardTitle>
            <CardDescription>
              Track and analyze your referral link performance
            </CardDescription>
          </div>
          {dataMode === 'demo' && (
            <Badge variant="outline" className="border-amber-500 text-amber-400">
              Demo Data
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard 
            title="Total Clicks" 
            value={stats?.totalClicks || 0} 
            icon={<Activity className="h-5 w-5" />}
            loading={loading}
          />
          <StatCard 
            title="Unique Clicks" 
            value={stats?.uniqueClicks || 0} 
            icon={<Link2 className="h-5 w-5" />}
            loading={loading}
          />
          <StatCard 
            title="Conversion Rate" 
            value={`${stats?.conversionRate || 0}%`} 
            icon={<BarChart3 className="h-5 w-5" />}
            loading={loading}
          />
        </div>
        
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="mb-4 bg-gray-900">
            <TabsTrigger value="daily">Daily Clicks</TabsTrigger>
            <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="recent">Recent Clicks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="space-y-4 min-h-[350px]">
            <h3 className="text-lg font-medium">Daily Click Activity</h3>
            {loading ? (
              <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats?.clicksByDay || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#9ca3af' }}
                      tickFormatter={formatDate} 
                    />
                    <YAxis tick={{ fill: '#9ca3af' }} />
                    <Tooltip 
                      formatter={(value) => [`${value} clicks`, '']}
                      labelFormatter={(label) => formatDate(label as string)}
                      contentStyle={{ backgroundColor: 'rgba(15, 15, 20, 0.9)', borderColor: '#333', color: '#fff' }}
                    />
                    <Bar dataKey="uniqueClicks" name="Unique" fill="#00C49F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clicks" name="Total" fill="#0088FE" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sources" className="space-y-4 min-h-[350px]">
            <h3 className="text-lg font-medium">Traffic Sources</h3>
            {loading ? (
              <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : (
              <div className="w-full h-[300px] grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-center mb-2">By Source</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.clicksBySource || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="clicks"
                        nameKey="source"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(stats?.clicksBySource || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} clicks`, '']}
                        contentStyle={{ backgroundColor: 'rgba(15, 15, 20, 0.9)', borderColor: '#333', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-center mb-2">By Medium</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.clicksByMedium || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="clicks"
                        nameKey="medium"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(stats?.clicksByMedium || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} clicks`, '']}
                        contentStyle={{ backgroundColor: 'rgba(15, 15, 20, 0.9)', borderColor: '#333', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="campaigns" className="space-y-4 min-h-[350px]">
            <h3 className="text-lg font-medium">Campaign Performance</h3>
            {loading ? (
              <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats?.clicksByCampaign || []}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" tick={{ fill: '#9ca3af' }} />
                    <YAxis 
                      dataKey="campaign" 
                      type="category" 
                      tick={{ fill: '#9ca3af' }} 
                      width={90}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} clicks`, '']}
                      contentStyle={{ backgroundColor: 'rgba(15, 15, 20, 0.9)', borderColor: '#333', color: '#fff' }}
                    />
                    <Bar dataKey="clicks" fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {(stats?.clicksByCampaign || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recent" className="space-y-4 min-h-[350px]">
            <h3 className="text-lg font-medium">Recent Click Activity</h3>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-3 border border-gray-800 rounded-md mb-2">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : recentClicks.length > 0 ? (
              <div className="space-y-3">
                {recentClicks.map((click) => (
                  <div key={click.id} className="p-3 border border-gray-800 rounded-md bg-gray-900 bg-opacity-50">
                    <div className="flex justify-between">
                      <div className="font-medium flex items-center">
                        <span className={`h-2 w-2 rounded-full mr-2 ${click.is_unique ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                        {click.utm_source || 'Direct'} 
                        {click.utm_medium && <span className="text-gray-400 ml-1">via {click.utm_medium}</span>}
                      </div>
                      <div className="text-sm text-gray-400">{formatTimeAgo(click.created_at)}</div>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="text-gray-400">Campaign: </span>
                      {click.utm_campaign ? (
                        <Badge variant="outline" className="ml-1 text-xs">{click.utm_campaign}</Badge>
                      ) : (
                        <span className="text-gray-500">No campaign</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No recent clicks recorded</p>
                <p className="text-sm mt-2">Start sharing your referral links to see activity here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Small stat card component
function StatCard({ title, value, icon, loading }: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="bg-gray-900 bg-opacity-50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <div className="text-indigo-400">{icon}</div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-2/3" />
      ) : (
        <p className="text-2xl font-bold text-white">{value}</p>
      )}
    </div>
  );
}