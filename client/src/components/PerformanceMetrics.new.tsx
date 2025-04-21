import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, TrendingUp, Users, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, LineChart as LineChartIcon, Database } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface PerformanceMetricsProps {
  // Referral stats
  referralStats: {
    totalReferrals: number;
    activeReferrals: number;
    conversionRate: number;
  };
  // Commission stats
  commissionStats: {
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
  };
  // Trend data (will be used for charts)
  trendData?: {
    referrals: TimeSeriesDataPoint[];
    clicks: TimeSeriesDataPoint[];
    commissions: TimeSeriesDataPoint[];
    conversions: TimeSeriesDataPoint[];
  };
  // Referral source data
  referralSources?: {
    name: string;
    value: number;
    color: string;
  }[];
}

interface TimeSeriesDataPoint {
  date: string; // ISO date string
  value: number;
}

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-white">
          {valuePrefix}{payload[0].value.toLocaleString()}{valueSuffix}
        </p>
      </div>
    );
  }
  return null;
};

export default function PerformanceMetrics(props: PerformanceMetricsProps) {
  // Basic state 
  const [showDemoData, setShowDemoData] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [comparisonRange, setComparisonRange] = useState<'previous' | 'last_year'>('previous');

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate demo data (memoized to avoid regeneration on each render)
  const demoTrendData = React.useMemo(() => ({
    referrals: generateDemoTimeSeriesData(30, 0, 5),
    clicks: generateDemoTimeSeriesData(30, 10, 50),
    commissions: generateDemoTimeSeriesData(30, 0, 200, true),
    conversions: generateDemoTimeSeriesData(30, 0, 8)
  }), []);
  
  const demoReferralSources = React.useMemo(() => 
    generateDemoReferralSources(), 
  []);
  
  // Empty data structures for when actual data is missing
  const emptyTrendData = {
    referrals: [],
    clicks: [],
    commissions: [],
    conversions: []
  };
  
  const emptyReferralSources: { name: string; value: number; color: string }[] = [];
  
  // Use either demo data or actual data based on mode
  const trendData = showDemoData 
    ? demoTrendData 
    : (props.trendData && Object.keys(props.trendData).length > 0) 
      ? props.trendData 
      : emptyTrendData;
  
  const referralSources = showDemoData 
    ? demoReferralSources 
    : (props.referralSources && props.referralSources.length > 0) 
      ? props.referralSources 
      : emptyReferralSources;
  
  // Demo metrics change values
  const metricsChange = {
    referrals: 12.5,
    clicks: 8.3,
    commissions: 15.2,
    conversions: -3.7
  };

  return (
    <div className="space-y-6">
      <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
            style={{ 
              background: 'rgba(20, 20, 30, 0.7)', 
              boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
            }}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <CardHeader className="flex md:flex-row flex-col md:items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-white flex items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-opacity-20 mr-3" 
                  style={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    animation: 'iconFloat 3s ease-in-out infinite',
                    boxShadow: '0 0 15px 5px rgba(59, 130, 246, 0.3)'
                  }}>
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <span>Performance Metrics</span>
            </CardTitle>
            <CardDescription>
              Track your referral performance and earnings over time
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3 md:mt-0 mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Timeframe:</span>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="h-8 w-[110px] bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Compare with:</span>
              <Select value={comparisonRange} onValueChange={(value: any) => setComparisonRange(value)}>
                <SelectTrigger className="h-8 w-[180px] bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Select comparison" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="previous">Previous period</SelectItem>
                  <SelectItem value="last_year">Same period last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center px-2 py-1 space-x-2 bg-gray-900/70 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2">
                <Switch
                  id="demo-data-toggle"
                  checked={showDemoData}
                  onCheckedChange={() => setShowDemoData(!showDemoData)}
                  className="data-[state=checked]:bg-blue-600"
                />
                <Label htmlFor="demo-data-toggle" className="text-xs flex items-center space-x-1">
                  {showDemoData 
                    ? <LineChartIcon className="h-3 w-3 text-blue-400" />
                    : <Database className="h-3 w-3 text-green-400" />
                  }
                  <span>{showDemoData ? 'Demo Data' : 'Actual Data'}</span>
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Referrals Metric */}
            <Card className="bg-gray-900/50 border border-gray-800 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Referrals</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {props.referralStats.totalReferrals}
                    </h3>
                  </div>
                  <div className="bg-blue-900/30 rounded-full p-2">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
                <div className="mt-3 flex items-center">
                  {metricsChange.referrals >= 0 ? (
                    <div className="flex items-center text-green-400 text-xs">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      <span>+{metricsChange.referrals.toFixed(1)}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-400 text-xs">
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                      <span>{metricsChange.referrals.toFixed(1)}%</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500 ml-2">vs previous period</span>
                </div>
                <div className="h-[30px] w-full mt-3">
                  {trendData.referrals.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData.referrals.slice(-15)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="referralGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#referralGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-gray-500 text-xs">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Conversion Rate Metric */}
            <Card className="bg-gray-900/50 border border-gray-800 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Conversion Rate</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {props.referralStats.conversionRate}%
                    </h3>
                  </div>
                  <div className="bg-purple-900/30 rounded-full p-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
                <div className="mt-3 flex items-center">
                  {metricsChange.conversions >= 0 ? (
                    <div className="flex items-center text-green-400 text-xs">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      <span>+{metricsChange.conversions.toFixed(1)}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-400 text-xs">
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                      <span>{Math.abs(metricsChange.conversions).toFixed(1)}%</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500 ml-2">vs previous period</span>
                </div>
                <div className="h-[30px] w-full mt-3">
                  {trendData.conversions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData.conversions.slice(-15)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A855F7" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#A855F7" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#conversionGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-gray-500 text-xs">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Link Clicks Metric */}
            <Card className="bg-gray-900/50 border border-gray-800 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Link Clicks</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {trendData.clicks.reduce((sum, point) => sum + point.value, 0)}
                    </h3>
                  </div>
                  <div className="bg-indigo-900/30 rounded-full p-2">
                    <Activity className="h-5 w-5 text-indigo-400" />
                  </div>
                </div>
                <div className="mt-3 flex items-center">
                  {metricsChange.clicks >= 0 ? (
                    <div className="flex items-center text-green-400 text-xs">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      <span>+{metricsChange.clicks.toFixed(1)}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-400 text-xs">
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                      <span>{metricsChange.clicks.toFixed(1)}%</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500 ml-2">vs previous period</span>
                </div>
                <div className="h-[30px] w-full mt-3">
                  {trendData.clicks.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData.clicks.slice(-15)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#6366F1" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#clicksGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-gray-500 text-xs">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Commission Metric */}
            <Card className="bg-gray-900/50 border border-gray-800 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Commission</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {formatCurrency(props.commissionStats.totalCommission)}
                    </h3>
                  </div>
                  <div className="bg-green-900/30 rounded-full p-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <div className="mt-3 flex items-center">
                  {metricsChange.commissions >= 0 ? (
                    <div className="flex items-center text-green-400 text-xs">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      <span>+{metricsChange.commissions.toFixed(1)}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-400 text-xs">
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                      <span>{metricsChange.commissions.toFixed(1)}%</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500 ml-2">vs previous period</span>
                </div>
                <div className="h-[30px] w-full mt-3">
                  {trendData.commissions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData.commissions.slice(-15)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#commissionGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-gray-500 text-xs">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Detailed Charts */}
          <Tabs defaultValue="commissions" className="w-full">
            <TabsList className="bg-gray-900/80 border border-gray-700 px-2 h-12 mb-6">
              <TabsTrigger value="commissions" className="data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-400">
                Commission Trends
              </TabsTrigger>
              <TabsTrigger value="referrals" className="data-[state=active]:bg-purple-900/20 data-[state=active]:text-purple-400">
                Referral Activity
              </TabsTrigger>
              <TabsTrigger value="sources" className="data-[state=active]:bg-green-900/20 data-[state=active]:text-green-400">
                Traffic Sources
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="commissions">
              <Card className="bg-gray-900/30 border border-gray-800">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg text-white">Commission Earnings Over Time</CardTitle>
                  <CardDescription>
                    Visualization of your commission earnings trend
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[350px] w-full">
                    {trendData.commissions.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData.commissions} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="date" 
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            stroke="#4B5563"
                          />
                          <YAxis 
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            tickFormatter={(value) => `$${value}`}
                            stroke="#4B5563"
                          />
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                          <Tooltip content={<CustomTooltip valuePrefix="$" />} />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#10B981" 
                            fillOpacity={1}
                            fill="url(#colorCommission)" 
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full w-full">
                        <LineChartIcon className="h-16 w-16 text-gray-700 mb-4" />
                        <p className="text-gray-500 text-sm">No commission data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="referrals">
              <Card className="bg-gray-900/30 border border-gray-800">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg text-white">Referral Activity Over Time</CardTitle>
                  <CardDescription>
                    Track your referral count and conversion rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[350px] w-full">
                    {trendData.referrals.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={trendData.referrals}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            stroke="#4B5563"
                          />
                          <YAxis 
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            stroke="#4B5563"
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#A855F7" 
                            strokeWidth={2} 
                            dot={{ r: 4, strokeWidth: 2, fill: '#111827' }} 
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#A855F7' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full w-full">
                        <LineChartIcon className="h-16 w-16 text-gray-700 mb-4" />
                        <p className="text-gray-500 text-sm">No referral data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sources">
              <Card className="bg-gray-900/30 border border-gray-800">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg text-white">Traffic Sources Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of your referral traffic by source
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[350px] w-full">
                    {referralSources.length > 0 ? (
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-2/3 h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={referralSources}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={120}
                                innerRadius={60}
                                dataKey="value"
                              >
                                {referralSources.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/3 mt-4 md:mt-0 flex flex-col justify-center">
                          <h4 className="text-sm font-semibold text-gray-300 mb-4">Sources</h4>
                          <div className="space-y-2">
                            {referralSources.map((source, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: source.color }}></div>
                                  <span className="text-xs text-gray-300">{source.name}</span>
                                </div>
                                <span className="text-xs font-medium text-gray-400">{source.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full w-full">
                        <LineChartIcon className="h-16 w-16 text-gray-700 mb-4" />
                        <p className="text-gray-500 text-sm">No source data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions to generate demo data
function generateDemoTimeSeriesData(days: number, min: number, max: number, isCurrency: boolean = false): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    
    // Generate a pseudo-random but consistent value for each date
    const seed = date.getDate() + date.getMonth() * 100 + min * 10 + max;
    const random = (Math.sin(seed) + 1) / 2; // Value between 0-1
    const value = min + Math.floor(random * (max - min));
    
    data.push({
      date: date.toISOString(),
      value: isCurrency ? value * 10 : value,
    });
  }
  
  return data;
}

function generateDemoReferralSources() {
  return [
    { name: 'Direct', value: 45, color: '#3B82F6' },  // Blue
    { name: 'Social Media', value: 30, color: '#A855F7' },  // Purple
    { name: 'Email', value: 15, color: '#10B981' },  // Green
    { name: 'Organic Search', value: 10, color: '#F59E0B' },  // Amber
    { name: 'Other', value: 5, color: '#6366F1' }  // Indigo
  ];
}