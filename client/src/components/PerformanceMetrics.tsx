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
  const [showDemoData, setShowDemoData] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [comparisonRange, setComparisonRange] = useState<'previous' | 'last_year'>('previous');

  // Generate demo data
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

// Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate percent change between current and previous periods
  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return 100; // If previous was 0, show 100% increase
    return ((current - previous) / previous) * 100;
  };

  // Demo metrics change values
  const metricsChange = {
    referrals: 12.5,
    clicks: 8.3,
    commissions: 15.2,
    conversions: -3.7
  };
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate percent change between current and previous periods
  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return 100; // If previous was 0, show 100% increase
    return ((current - previous) / previous) * 100;
  };

  // Demo metrics change values (in real app these would come from API)
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
                  checked={isDemoMode}
                  onCheckedChange={() => onToggleMode()}
                  className="data-[state=checked]:bg-blue-600"
                />
                <Label htmlFor="demo-data-toggle" className="text-xs flex items-center space-x-1">
                  {isDemoMode 
                    ? <LineChartIcon className="h-3 w-3 text-blue-400" />
                    : <Database className="h-3 w-3 text-green-400" />
                  }
                  <span>{isDemoMode ? 'Demo Data' : 'Actual Data'}</span>
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
                      {referralStats.totalReferrals}
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
            
            {/* Active Referrals Metric */}
            <Card className="bg-gray-900/50 border border-gray-800 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Conversion Rate</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {referralStats.conversionRate}%
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
                      {formatCurrency(commissionStats.totalCommission)}
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
                        <p className="text-gray-400 text-xs mt-2">Toggle to Demo Data to see sample visualizations</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="referrals">
              <Card className="bg-gray-900/30 border border-gray-800">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg text-white">Referral Activity</CardTitle>
                  <CardDescription>
                    Comparison of clicks vs. actual referrals
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[350px] w-full">
                    {(trendData.clicks.length > 0 || trendData.referrals.length > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={combinedReferralData(trendData.clicks, trendData.referrals)}
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
                            yAxisId="left"
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            stroke="#4B5563"
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            stroke="#4B5563"
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                            wrapperStyle={{ paddingTop: 20 }}
                            formatter={(value) => <span className="text-gray-300">{value}</span>}
                          />
                          <Bar yAxisId="left" dataKey="clicks" name="Link Clicks" fill="#6366F1" radius={[4, 4, 0, 0]} />
                          <Bar yAxisId="right" dataKey="referrals" name="Referrals" fill="#A855F7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full w-full">
                        <BarChart2 className="h-16 w-16 text-gray-700 mb-4" />
                        <p className="text-gray-500 text-sm">No referral activity data available</p>
                        <p className="text-gray-400 text-xs mt-2">Toggle to Demo Data to see sample visualizations</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sources">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-900/30 border border-gray-800">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-lg text-white">Referral Sources</CardTitle>
                    <CardDescription>
                      Distribution of referrals by traffic source
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center pt-4">
                    <div className="h-[300px] w-full max-w-[300px]">
                      {referralSources.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={referralSources}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={110}
                              innerRadius={60}
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"
                              label={renderCustomizedLabel}
                            >
                              {referralSources.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => [value, 'Referrals']} 
                              labelFormatter={(name) => `Source: ${name}`} 
                            />
                            <Legend 
                              layout="horizontal" 
                              verticalAlign="bottom" 
                              align="center"
                              formatter={(value) => <span className="text-gray-300">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full">
                          <PieChart className="h-16 w-16 text-gray-700 mb-4" />
                          <p className="text-gray-500 text-sm">No source data available</p>
                          <p className="text-gray-400 text-xs mt-2">Toggle to Demo Data to see visualizations</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-900/30 border border-gray-800">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-lg text-white">Conversion Performance</CardTitle>
                    <CardDescription>
                      Conversion rates by traffic source
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={generateConversionBySource(referralSources)}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                          <XAxis 
                            type="number"
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            stroke="#4B5563"
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <YAxis 
                            type="category"
                            dataKey="name" 
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            stroke="#4B5563"
                          />
                          <Tooltip content={<CustomTooltip valueSuffix="%" />} />
                          <Bar dataKey="conversionRate" fill="#38BDF8" radius={[0, 4, 4, 0]}>
                            {generateConversionBySource(referralSources).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Custom label for pie chart
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Helper function to generate demo data for referral sources
function generateDemoReferralSources() {
  return [
    { name: 'Email', value: 42, color: '#38BDF8' },
    { name: 'Social Media', value: 28, color: '#A855F7' },
    { name: 'Website', value: 15, color: '#10B981' },
    { name: 'Direct', value: 10, color: '#F59E0B' },
    { name: 'Other', value: 5, color: '#6366F1' }
  ];
}

// Helper function to generate conversion rates by source
function generateConversionBySource(sources: { name: string; value: number; color: string }[]) {
  return sources.map(source => ({
    name: source.name,
    conversionRate: 10 + Math.floor(Math.random() * 40), // Random conversion rate between 10% and 50%
    color: source.color
  }));
}

// Helper function to generate time series demo data
function generateDemoTimeSeriesData(days: number, min: number, max: number, isCurrency: boolean = false): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    // Generate a somewhat realistic random value with some day-to-day correlation
    const randomValue = isCurrency
      ? Math.floor(min + Math.random() * (max - min))
      : Math.max(0, Math.floor(
          min + Math.random() * (max - min) + 
          (data.length > 0 ? (data[data.length - 1].value - (min + max) / 2) * 0.5 : 0)
        ));
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: randomValue
    });
  }
  
  return data;
}

// Helper function to combine clicks and referrals data for the bar chart
function combinedReferralData(clicks: TimeSeriesDataPoint[], referrals: TimeSeriesDataPoint[]) {
  // Create a map of dates for quick lookup
  const dateMap: Record<string, { date: string; clicks: number; referrals: number }> = {};
  
  // First add all click data
  clicks.forEach(point => {
    dateMap[point.date] = {
      date: point.date,
      clicks: point.value,
      referrals: 0
    };
  });
  
  // Then add referral data
  referrals.forEach(point => {
    if (dateMap[point.date]) {
      dateMap[point.date].referrals = point.value;
    } else {
      dateMap[point.date] = {
        date: point.date,
        clicks: 0,
        referrals: point.value
      };
    }
  });
  
  // Convert map back to array and sort by date
  return Object.values(dateMap).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}