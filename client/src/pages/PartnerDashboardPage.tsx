import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Copy, CreditCard, Award, Users, LineChart, ArrowRight, CheckCircle2, AlertCircle, Activity, 
         TrendingUp, DollarSign, BarChart3, UserPlus, Sparkles, Coins, Link2, Clock, Zap, ChevronUp, ChevronDown, 
         Bell, QrCode, BarChart2, Megaphone, LayoutDashboard } from 'lucide-react';
import CoinBalance from '@/components/CoinBalance';
import ReferralLinkGenerator from '@/components/ReferralLinkGenerator';
import SavedReferralLinks from '@/components/SavedReferralLinks';
import ReferralClickTracker from '@/components/ReferralClickTracker';
import MarketingResources from '@/components/MarketingResources';
import PerformanceMetrics from '@/components/PerformanceMetrics.new';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import NotificationCenter from '@/components/NotificationCenter';
import ExpandedPaymentOptions from '@/components/ExpandedPaymentOptions';
import SEOKeywordTracker from '@/components/SEOKeywordTracker';
import SeoKeywordsTab from '@/components/SeoKeywordsTab';
import { sampleNotifications } from '@/data/sampleNotifications';
import { useLocation } from 'wouter';
import { seoKeywordService } from '@/lib/seo-service';
import { SeoKeyword, ContentLink } from '@/types/seoTypes';

// Star field animation styles
const starAnimationStyles = `
  @keyframes float {
    0% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-100px) translateX(20px) rotate(180deg); opacity: 0; }
  }
  
  .star-particle {
    position: absolute;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    filter: blur(1px);
    pointer-events: none;
    animation: float 4s ease-in-out infinite;
    z-index: 1;
  }

  @keyframes cardGlow {
    0%, 100% {
      box-shadow: 0 0 15px 2px rgba(51, 195, 189, 0.2),
                 0 0 20px 5px rgba(0, 117, 255, 0.1);
    }
    50% {
      box-shadow: 0 0 20px 5px rgba(51, 195, 189, 0.3),
                 0 0 30px 10px rgba(0, 117, 255, 0.2);
    }
  }

  @keyframes buttonPulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 8px 2px rgba(0, 200, 83, 0.3);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 12px 4px rgba(0, 200, 83, 0.5);
    }
  }
  
  @keyframes coinSpin {
    0% {
      transform: rotateY(0deg);
    }
    100% {
      transform: rotateY(360deg);
    }
  }
  
  @keyframes iconFloat {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-5px);
    }
  }
  
  @keyframes barRise {
    0% {
      height: 0%;
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
`;

// Star Background Component
function StarBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Create star particles
    const createStars = () => {
      for (let i = 0; i < 30; i++) {
        const star = document.createElement('div');
        star.classList.add('star-particle');
        
        // Randomize size (1-5px)
        const size = Math.random() * 4 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // Randomize position within the container
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        star.style.left = `${left}%`;
        star.style.top = `${top}%`;
        
        // Randomize animation delay
        star.style.animationDelay = `${Math.random() * 4}s`;
        
        // Randomize animation duration (3-7s)
        star.style.animationDuration = `${3 + Math.random() * 4}s`;
        
        container.appendChild(star);
      }
    };
    
    createStars();
    
    return () => {
      const stars = container.querySelectorAll('.star-particle');
      stars.forEach(star => star.remove());
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <style>{starAnimationStyles}</style>
    </div>
  );
}

// Animated icon component
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

interface PartnerStats {
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  totalReferrals: number;
  activeReferrals: number;
  conversionRate: number;
  // These fields should match the types expected by PerformanceMetrics
  trendData?: {
    referrals: {
      date: string;
      value: number;
    }[];
    clicks: {
      date: string;
      value: number;
    }[];
    commissions: {
      date: string;
      value: number;
    }[];
    conversions: {
      date: string;
      value: number;
    }[];
  };
  // Referral sources data
  referralSources?: {
    name: string;
    value: number;
    color: string;
  }[];
}

interface Referral {
  id: number;
  referred_user_id: number;
  user_email: string;
  status: string;
  created_at: string;
  first_purchase_date: string | null;
  total_purchases: number;
}

interface Commission {
  id: number;
  amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
  transaction_id: string;
  payment_id: number | null;
}

interface Payment {
  id: number;
  amount: number;
  status: string;
  payment_date: string;
  payment_method: string;
  transaction_id: string;
}

export default function PartnerDashboardPage() {
  const { user, checkAuth } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [showCommissionDetails, setShowCommissionDetails] = useState(false);
  
  // Validate partner authentication on mount
  useEffect(() => {
    const validatePartnerAuth = async () => {
      try {
        // Check token consistency
        const authToken = localStorage.getItem('auth_token');
        const partnerToken = localStorage.getItem('partnerToken');
        
        if (!authToken && !partnerToken) {
          console.log('No authentication tokens found, redirecting to login');
          toast({
            title: "Authentication Required",
            description: "Please log in to access the partner dashboard",
            variant: "destructive"
          });
          navigate('/partners/login');
          return;
        }
        
        // If we have a partnerToken but no authToken, set it
        if (!authToken && partnerToken) {
          console.log('Using partnerToken as auth_token');
          localStorage.setItem('auth_token', partnerToken);
        }
        
        // Validate authentication
        if (!user) {
          await checkAuth();
        }
        
        // Check partner status with the server
        const res = await apiRequest('GET', '/api/partner/status');
        const data = await res.json();
        console.log('Partner status check from API:', data);
        
        // Use case-insensitive comparison for status check
        // API returns "partnerStatus" but we might look for "status"
        const partnerStatus = data.partnerStatus || data.status || '';
        const isActivePartner = partnerStatus.toUpperCase() === 'ACTIVE';
        
        console.log('Partner status normalized:', {
          originalStatus: partnerStatus,
          normalizedStatus: partnerStatus.toUpperCase(),
          isActive: isActivePartner
        });
        
        if (!data.isPartner || !isActivePartner) {
          console.log('Not an active partner, redirecting to login');
          toast({
            title: "Partner Access Required", 
            description: "You don't have an active partner account",
            variant: "destructive"
          });
          navigate('/partners/login');
        }
      } catch (error) {
        console.error('Partner authentication error:', error);
        toast({
          title: "Authentication Failed",
          description: "Please log in again to continue",
          variant: "destructive" 
        });
        navigate('/partners/login');
      }
    };
    
    validatePartnerAuth();
  }, [user, navigate, toast, checkAuth]);

  // Helper function to make authenticated partner API requests
  const makePartnerApiRequest = async (url: string) => {
    try {
      // Explicitly get the auth token
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        console.error('No auth token found for partner API request');
        throw new Error('Authentication token required');
      }
      
      console.log(`Making partner API request to ${url} with token: ${token.substring(0, 10)}...`);
      
      // Make sure the URL has the correct API prefix
      const apiUrl = url.startsWith('/api') ? url : `/api${url}`;
      
      console.log(`Final API URL for request: ${apiUrl}`);
      
      // Make the fetch request directly with explicit headers
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      // Check for successful response
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Partner API request to ${url} failed: ${response.status}`, errorText);
        throw new Error(`Partner API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Partner API request to ${url} successful:`, data);
      return data;
    } catch (error) {
      console.error(`Partner API request to ${url} error:`, error);
      // Return minimal mock data to prevent UI errors while fetching fails
      return url.includes('dashboard') ? { referral_code: 'LOADING' } : 
             url.includes('stats') ? { totalCommission: 0, pendingCommission: 0, totalReferrals: 0, activeReferrals: 0, conversionRate: 0 } :
             url.includes('referrals') ? { referrals: [] } :
             url.includes('commissions') ? { commissions: [] } : 
             { payments: [] };
    }
  };

  // Fetch partner dashboard data
  const { data: partnerData, isLoading: isLoadingPartner } = useQuery({
    queryKey: ['/api/partner/dashboard'],
    queryFn: () => makePartnerApiRequest('/api/partner/dashboard'),
  });

  // Fetch partner stats with time range
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/partner/stats', timeRange],
    queryFn: () => makePartnerApiRequest(`/api/partner/stats?timeRange=${timeRange}`),
  });

  // Fetch partner referrals with time range
  const { data: referralsData, isLoading: isLoadingReferrals } = useQuery({
    queryKey: ['/api/partner/referrals', timeRange],
    queryFn: () => makePartnerApiRequest(`/api/partner/referrals?timeRange=${timeRange}`),
  });

  // Fetch partner commissions with time range
  const { data: commissionsData, isLoading: isLoadingCommissions } = useQuery({
    queryKey: ['/api/partner/commissions', timeRange],
    queryFn: () => makePartnerApiRequest(`/api/partner/commissions?timeRange=${timeRange}`),
  });

  // Fetch partner payments
  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/partner/payments'],
    queryFn: () => makePartnerApiRequest('/api/partner/payments'),
  });

  // Set referral code and link when partner data is loaded
  useEffect(() => {
    if (partnerData?.referral_code) {
      setReferralCode(partnerData.referral_code);
      setReferralLink(`${window.location.origin}/auth?ref=${partnerData.referral_code}`);
    }
  }, [partnerData]);

  // Copy referral code to clipboard
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copied!',
          description: message,
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        toast({
          title: 'Failed to copy',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    );
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Loading state
  if (isLoadingPartner || isLoadingStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Generate some demo trend data until API provides it
  const generateDemoData = (days: number, min: number, max: number, isCurrency: boolean = false) => {
    const data = [];
    const today = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Generate a somewhat realistic random value
      const value = isCurrency
        ? Math.floor(min + Math.random() * (max - min))
        : Math.max(0, Math.floor(min + Math.random() * (max - min)));
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: value
      });
    }
    
    return data;
  };
  
  // Generate demo referral sources data
  const generateReferralSources = () => {
    return [
      { name: 'Email', value: 42, color: '#38BDF8' },
      { name: 'Social Media', value: 28, color: '#A855F7' },
      { name: 'Website', value: 15, color: '#10B981' },
      { name: 'Direct', value: 10, color: '#F59E0B' },
      { name: 'Other', value: 5, color: '#6366F1' }
    ];
  };

  const stats: PartnerStats = statsData || {
    totalCommission: 0,
    pendingCommission: 0,
    paidCommission: 0,
    totalReferrals: 0,
    activeReferrals: 0,
    conversionRate: 0,
    // Generate demo trend data (in a real app, this would come from the API)
    trendData: {
      referrals: generateDemoData(30, 0, 5),
      clicks: generateDemoData(30, 5, 30),
      commissions: generateDemoData(30, 0, 200, true),
      conversions: generateDemoData(30, 0, 8)
    },
    // Generate demo referral sources data
    referralSources: generateReferralSources()
  };

  const referrals: Referral[] = referralsData?.referrals || [];
  const commissions: Commission[] = commissionsData?.commissions || [];
  const payments: Payment[] = paymentsData?.payments || [];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 overflow-hidden">
      {/* Star background animation */}
      <StarBackground />
      
      {/* The main content */}
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent"
                style={{ textShadow: '0 0 15px rgba(51, 195, 189, 0.5)' }}>
              Partner Dashboard
            </h1>
            <p className="text-gray-400">
              Track your referrals, commissions, and payments
            </p>
          </div>
          
          {/* Coin balance display with spinning animation */}
          <div className="flex items-center px-4 py-2 rounded-lg" 
               style={{ 
                 background: 'rgba(20, 20, 25, 0.7)',
                 backdropFilter: 'blur(10px)',
                 border: '1px solid rgba(51, 195, 189, 0.2)',
                 boxShadow: '0 0 20px rgba(51, 195, 189, 0.3)'
               }}>
            <div className="mr-3" style={{ animation: 'coinSpin 4s linear infinite', transformStyle: 'preserve-3d' }}>
              <Coins className="h-6 w-6 text-yellow-400" 
                    style={{ filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.7))' }}/>
            </div>
            <div>
              <div className="text-xs text-gray-400">Your Coin Balance</div>
              <CoinBalance showLabel={false} iconSize={0} className="font-bold text-white" />
            </div>
          </div>
        </div>
        
        {/* Time Range Selector */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Time Range:</span>
            <div className="flex items-center space-x-1 bg-gray-900/50 backdrop-blur-sm rounded-lg p-1 border border-gray-800">
              {(['week', 'month', 'year', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    timeRange === range 
                      ? 'bg-gradient-to-r from-cyan-800/50 to-blue-800/50 text-white shadow-lg border border-cyan-700/30' 
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {timeRange === 'week' ? 'Last 7 days' : 
             timeRange === 'month' ? 'Last 30 days' : 
             timeRange === 'year' ? 'Last 365 days' : 
             'All time'}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
                style={{ 
                  background: 'rgba(20, 20, 30, 0.7)', 
                  animation: 'cardGlow 4s ease-in-out infinite',
                  boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-300"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center">
                <AnimatedIcon icon={<Award className="h-6 w-6 text-blue-400" />} color="blue" />
                <span className="ml-3">Total Earnings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white" 
                 style={{ textShadow: '0 0 10px rgba(56, 189, 248, 0.5)' }}>
                {formatCurrency(stats.totalCommission)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Lifetime commission</p>
            </CardContent>
          </Card>

          <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
                style={{ 
                  background: 'rgba(20, 20, 30, 0.7)', 
                  animation: 'cardGlow 4s ease-in-out infinite',
                  animationDelay: '0.5s',
                  boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-300"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center">
                <AnimatedIcon icon={<CreditCard className="h-6 w-6 text-green-400" />} color="green" />
                <span className="ml-3">Available Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white"
                 style={{ textShadow: '0 0 10px rgba(52, 211, 153, 0.5)' }}>
                {formatCurrency(stats.pendingCommission)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Pending payout</p>
            </CardContent>
          </Card>

          <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
                style={{ 
                  background: 'rgba(20, 20, 30, 0.7)', 
                  animation: 'cardGlow 4s ease-in-out infinite',
                  animationDelay: '1s',
                  boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-300"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center">
                <AnimatedIcon icon={<Users className="h-6 w-6 text-purple-400" />} color="purple" />
                <span className="ml-3">Total Referrals</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white"
                 style={{ textShadow: '0 0 10px rgba(139, 92, 246, 0.5)' }}>
                {stats.totalReferrals}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stats.activeReferrals} active users</p>
            </CardContent>
          </Card>

          <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
                style={{ 
                  background: 'rgba(20, 20, 30, 0.7)', 
                  animation: 'cardGlow 4s ease-in-out infinite',
                  animationDelay: '1.5s',
                  boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-300"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center">
                <AnimatedIcon icon={<LineChart className="h-6 w-6 text-yellow-400" />} color="yellow" />
                <span className="ml-3">Conversion Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white"
                 style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}>
                {stats.conversionRate}%
              </p>
              <p className="text-xs text-gray-400 mt-1">Referrals to customers</p>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Referral Link Generator */}
        <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md mb-10 overflow-hidden relative"
              style={{ 
                background: 'rgba(20, 20, 30, 0.7)', 
                boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
              }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#33C3BD] to-[#0075FF]"></div>
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <AnimatedIcon icon={<Sparkles className="h-6 w-6 text-cyan-400" />} color="blue" />
              <span className="ml-3">Advanced Referral Link Generator</span>
            </CardTitle>
            <CardDescription>
              Create customizable referral links with UTM parameters to track your marketing campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Integrate the ReferralLinkGenerator component */}
            <ReferralLinkGenerator referralCode={referralCode} />
          </CardContent>
        </Card>

        {/* Tabs for Referrals, Commissions, and Payments */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="bg-gray-900/80 backdrop-blur-md mb-6 border border-gray-700 overflow-hidden rounded-lg">
            <TabsTrigger 
              value="performance" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-all duration-300"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger 
              value="referrals" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600/20 data-[state=active]:to-cyan-600/20 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 transition-all duration-300"
            >
              Referrals
            </TabsTrigger>
            <TabsTrigger 
              value="saved_links" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600/20 data-[state=active]:to-cyan-600/20 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 transition-all duration-300"
            >
              Saved Links
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600/20 data-[state=active]:to-cyan-600/20 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 transition-all duration-300"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="marketing_resources" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-all duration-300"
            >
              Marketing Resources
            </TabsTrigger>
            <TabsTrigger 
              value="commissions" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600/20 data-[state=active]:to-cyan-600/20 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 transition-all duration-300"
            >
              Commissions
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600/20 data-[state=active]:to-cyan-600/20 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 transition-all duration-300"
            >
              Payments
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-all duration-300"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="qrcode" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 transition-all duration-300"
            >
              QR Code
            </TabsTrigger>
            <TabsTrigger 
              value="expanded_payments" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600/20 data-[state=active]:to-emerald-600/20 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 transition-all duration-300"
            >
              Payment Options
            </TabsTrigger>
            <TabsTrigger 
              value="seo_keywords" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600/20 data-[state=active]:to-purple-600/20 data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 transition-all duration-300"
            >
              SEO Keywords
            </TabsTrigger>
          </TabsList>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
                  style={{ 
                    background: 'rgba(20, 20, 30, 0.7)', 
                    boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                  }}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-300"></div>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <AnimatedIcon icon={<Users className="h-6 w-6 text-purple-400" />} color="purple" />
                  <span className="ml-3">Your Referrals</span>
                </CardTitle>
                <CardDescription>
                  Users who signed up using your referral code
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingReferrals ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"
                             style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))' }} />
                  </div>
                ) : referrals.length === 0 ? (
                  <div className="text-center py-12 px-6 rounded-lg" 
                       style={{ 
                         background: 'rgba(10, 10, 20, 0.5)',
                         boxShadow: 'inset 0 0 20px rgba(51, 195, 189, 0.1)'
                       }}>
                    <UserPlus className="h-12 w-12 text-purple-400 mx-auto mb-4 opacity-60"
                           style={{ filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))' }} />
                    <p className="text-gray-300 text-lg">You haven't referred any users yet</p>
                    <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto">
                      Share your referral link with potential customers to start earning commissions on their purchases
                    </p>
                    <Button 
                      className="mt-6 group transition-all duration-300"
                      style={{ 
                        background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
                        boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
                      }}
                    >
                      <span className="mr-2">Start Sharing</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(15, 15, 25, 0.6)' }}>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-gray-700/50 bg-gray-900/50">
                          <TableHead className="text-gray-300">User</TableHead>
                          <TableHead className="text-gray-300">Status</TableHead>
                          <TableHead className="text-gray-300">Joined</TableHead>
                          <TableHead className="text-gray-300">First Purchase</TableHead>
                          <TableHead className="text-gray-300 text-right">Total Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referrals.map((referral) => (
                          <TableRow key={referral.id} 
                                    className="border-b border-gray-800/30 hover:bg-gray-800/40 transition-colors">
                            <TableCell className="font-medium text-white">{referral.user_email}</TableCell>
                            <TableCell>
                              {referral.status === 'active' ? (
                                <span className="flex items-center text-green-400 bg-green-900/30 px-2 py-1 rounded-full text-xs inline-flex">
                                  <CheckCircle2 className="h-3 w-3 mr-1" 
                                            style={{ filter: 'drop-shadow(0 0 5px rgba(52, 211, 153, 0.5))' }} /> 
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center text-gray-400 bg-gray-800/50 px-2 py-1 rounded-full text-xs inline-flex">
                                  <AlertCircle className="h-3 w-3 mr-1" /> 
                                  Inactive
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-300">{formatDate(referral.created_at)}</TableCell>
                            <TableCell className="text-gray-300">
                              {referral.first_purchase_date
                                ? formatDate(referral.first_purchase_date)
                                : <span className="text-gray-500">No purchase yet</span>}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <span className={`${referral.total_purchases > 0 ? 'text-green-400' : 'text-gray-500'}`}
                                    style={referral.total_purchases > 0 ? { textShadow: '0 0 8px rgba(52, 211, 153, 0.4)' } : {}}>
                                {formatCurrency(referral.total_purchases)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <div className="space-y-6">
              {/* Commission Summary Card */}
              <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
                    style={{ 
                      background: 'rgba(20, 20, 30, 0.7)', 
                      boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                    }}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-300"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-white flex items-center">
                    <AnimatedIcon icon={<BarChart3 className="h-6 w-6 text-green-400" />} color="green" />
                    <span className="ml-3">Commission Analytics</span>
                  </CardTitle>
                  <CardDescription>
                    Detailed breakdown of your earnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingCommissions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary"
                               style={{ filter: 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.6))' }} />
                    </div>
                  ) : commissions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No commission data available for selected time period</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-xl p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
                          <p className="text-xs text-gray-400 mb-1">Total Commissions</p>
                          <p className="text-xl font-bold text-white">{formatCurrency(stats.totalCommission)}</p>
                          <div className="mt-2 flex items-center text-xs">
                            <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                            <span className="text-green-400">+12% from previous {timeRange}</span>
                          </div>
                        </div>
                        <div className="rounded-xl p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
                          <p className="text-xs text-gray-400 mb-1">Pending Payout</p>
                          <p className="text-xl font-bold text-white">{formatCurrency(stats.pendingCommission)}</p>
                          <div className="mt-2 flex items-center text-xs">
                            <Clock className="h-3 w-3 text-yellow-400 mr-1" />
                            <span className="text-yellow-400">Next payout in 7 days</span>
                          </div>
                        </div>
                        <div className="rounded-xl p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
                          <p className="text-xs text-gray-400 mb-1">Commission Rate</p>
                          <p className="text-xl font-bold text-white">20%</p>
                          <div className="mt-2 flex items-center text-xs">
                            <Zap className="h-3 w-3 text-blue-400 mr-1" />
                            <span className="text-blue-400">Standard partner rate</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Commission Visualization */}
                      <div className="h-[200px] w-full mb-4 px-2" 
                           style={{ 
                             background: 'rgba(10, 10, 20, 0.3)', 
                             borderRadius: '12px',
                             boxShadow: 'inset 0 0 10px rgba(51, 195, 189, 0.1)'
                           }}>
                        <div className="h-full w-full relative pt-4">
                          <div className="absolute top-2 left-2 text-xs text-gray-400">Commission by Month</div>
                          <div className="h-full w-full flex items-end justify-around pb-6">
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => {
                              // Generate random heights for the visualization - in production this would use real data
                              const height = 30 + Math.floor(Math.random() * 70);
                              return (
                                <div key={month} className="flex flex-col items-center">
                                  <div 
                                    className="w-12 rounded-t-md transition-all duration-700 ease-out"
                                    style={{ 
                                      height: `${height}%`, 
                                      background: 'linear-gradient(180deg, rgba(52, 211, 153, 0.8) 0%, rgba(16, 185, 129, 0.4) 100%)',
                                      boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
                                      animation: 'barRise 1.2s ease-out',
                                      animationDelay: `${i * 0.15}s`
                                    }}
                                  ></div>
                                  <div className="text-xs text-gray-400 mt-2">{month}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                          onClick={() => setShowCommissionDetails(!showCommissionDetails)}
                        >
                          {showCommissionDetails ? 'Hide Details' : 'Show Details'}
                          {showCommissionDetails ? 
                            <ChevronUp className="ml-1 h-4 w-4" /> : 
                            <ChevronDown className="ml-1 h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Commission Details - Conditional Rendering */}
              {showCommissionDetails && !isLoadingCommissions && commissions.length > 0 && (
                <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
                      style={{ 
                        background: 'rgba(20, 20, 30, 0.7)', 
                        boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                      }}>
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-300"></div>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <AnimatedIcon icon={<DollarSign className="h-6 w-6 text-green-400" />} color="green" />
                      <span className="ml-3">Commission Details</span>
                    </CardTitle>
                    <CardDescription>
                      Detailed breakdown of earnings from your referrals' purchases
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(15, 15, 25, 0.6)' }}>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-gray-700/50 bg-gray-900/50">
                            <TableHead className="text-gray-300">Date</TableHead>
                            <TableHead className="text-gray-300">Transaction ID</TableHead>
                            <TableHead className="text-gray-300">Purchase Amount</TableHead>
                            <TableHead className="text-gray-300">Commission</TableHead>
                            <TableHead className="text-gray-300">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissions.map((commission) => (
                            <TableRow key={commission.id}
                                    className="border-b border-gray-800/30 hover:bg-gray-800/40 transition-colors">
                            <TableCell className="text-gray-300">{formatDate(commission.created_at)}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-400">
                              {commission.transaction_id.substring(0, 12)}...
                            </TableCell>
                            <TableCell className="text-gray-300">{formatCurrency(commission.amount)}</TableCell>
                            <TableCell className="font-medium text-green-400"
                                       style={{ textShadow: '0 0 8px rgba(52, 211, 153, 0.4)' }}>
                              {formatCurrency(commission.commission_amount)}
                            </TableCell>
                            <TableCell>
                              {commission.status === 'pending' && (
                                <span className="inline-flex items-center rounded-full bg-yellow-900/20 px-2.5 py-0.5 text-xs font-medium text-yellow-300">
                                  <Activity className="mr-1 h-3 w-3" /> Pending
                                </span>
                              )}
                              {commission.status === 'paid' && (
                                <span className="inline-flex items-center rounded-full bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-300">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Paid
                                </span>
                              )}
                              {commission.status === 'void' && (
                                <span className="inline-flex items-center rounded-full bg-red-900/20 px-2.5 py-0.5 text-xs font-medium text-red-300">
                                  <AlertCircle className="mr-1 h-3 w-3" /> Void
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          </TabsContent>

          {/* Saved Links Tab */}
          <TabsContent value="saved_links">
            <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
                  style={{ 
                    background: 'rgba(20, 20, 30, 0.7)', 
                    boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                  }}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-300"></div>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <AnimatedIcon icon={<Link2 className="h-6 w-6 text-cyan-400" />} color="blue" />
                  <span className="ml-3">Saved Referral Links</span>
                </CardTitle>
                <CardDescription>
                  Manage your saved referral links for quick sharing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SavedReferralLinks />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          {/* Performance Metrics Tab */}
          <TabsContent value="performance">
            <PerformanceMetrics
              referralStats={{
                totalReferrals: stats.totalReferrals,
                activeReferrals: stats.activeReferrals,
                conversionRate: stats.conversionRate
              }}
              commissionStats={{
                totalCommission: stats.totalCommission,
                pendingCommission: stats.pendingCommission,
                paidCommission: stats.paidCommission
              }}
              trendData={stats.trendData}
              referralSources={stats.referralSources}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <ReferralClickTracker />
          </TabsContent>
          
          {/* Marketing Resources Tab */}
          <TabsContent value="marketing_resources">
            {partnerData?.marketing && (
              <MarketingResources marketingData={partnerData.marketing} />
            )}
          </TabsContent>
          
          <TabsContent value="payments">
            <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
                  style={{ 
                    background: 'rgba(20, 20, 30, 0.7)', 
                    boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
                  }}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-300"></div>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <AnimatedIcon icon={<CreditCard className="h-6 w-6 text-blue-400" />} color="blue" />
                  <span className="ml-3">Your Payments</span>
                </CardTitle>
                <CardDescription>
                  History of commission payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPayments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"
                             style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))' }} />
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-12 px-6 rounded-lg" 
                       style={{ 
                         background: 'rgba(10, 10, 20, 0.5)',
                         boxShadow: 'inset 0 0 20px rgba(51, 195, 189, 0.1)'
                       }}>
                    <CreditCard className="h-12 w-12 text-blue-400 mx-auto mb-4 opacity-60"
                           style={{ filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.5))' }} />
                    <p className="text-gray-300 text-lg">You haven't received any payments yet</p>
                    <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto">
                      Payments are processed monthly for accumulated commissions
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(15, 15, 25, 0.6)' }}>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-gray-700/50 bg-gray-900/50">
                          <TableHead className="text-gray-300">Date</TableHead>
                          <TableHead className="text-gray-300">Amount</TableHead>
                          <TableHead className="text-gray-300">Payment Method</TableHead>
                          <TableHead className="text-gray-300">Transaction ID</TableHead>
                          <TableHead className="text-gray-300">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}
                                    className="border-b border-gray-800/30 hover:bg-gray-800/40 transition-colors">
                            <TableCell className="text-gray-300">{formatDate(payment.payment_date)}</TableCell>
                            <TableCell className="font-medium text-blue-400"
                                       style={{ textShadow: '0 0 8px rgba(56, 189, 248, 0.4)' }}>
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="text-gray-300">{payment.payment_method}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-400">
                              {payment.transaction_id ? payment.transaction_id.substring(0, 12) + '...' : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {payment.status === 'pending' && (
                                <span className="inline-flex items-center rounded-full bg-yellow-900/20 px-2.5 py-0.5 text-xs font-medium text-yellow-300">
                                  <Activity className="mr-1 h-3 w-3" /> Pending
                                </span>
                              )}
                              {payment.status === 'completed' && (
                                <span className="inline-flex items-center rounded-full bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-300">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                                </span>
                              )}
                              {payment.status === 'failed' && (
                                <span className="inline-flex items-center rounded-full bg-red-900/20 px-2.5 py-0.5 text-xs font-medium text-red-300">
                                  <AlertCircle className="mr-1 h-3 w-3" /> Failed
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <NotificationCenter notifications={sampleNotifications} />
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <QRCodeGenerator referralCode={referralCode} referralLink={referralLink} />
          </TabsContent>

          {/* Expanded Payment Options Tab */}
          <TabsContent value="expanded_payments">
            <ExpandedPaymentOptions 
              availableBalance={stats.pendingCommission} 
              onSubmitWithdrawal={async (amount, method, details) => {
                try {
                  // Call the API endpoint to request withdrawal
                  const response = await fetch('/api/partner/withdraw', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      amount: amount,
                      payment_method: method,
                      payment_details: details
                    }),
                  });
                  
                  const result = await response.json();
                  
                  if (!response.ok) {
                    throw new Error(result.error || 'Failed to process withdrawal request');
                  }
                  
                  toast({
                    title: "Withdrawal Request Submitted",
                    description: `Your withdrawal request for ${formatCurrency(amount)} via ${method} has been submitted to our team for processing.`,
                    variant: "success",
                  });
                  
                  // Refresh stats to update the balance
                  refetchStats();
                  
                  return Promise.resolve();
                } catch (error) {
                  console.error('Error submitting withdrawal request:', error);
                  toast({
                    title: "Withdrawal Request Failed",
                    description: error instanceof Error ? error.message : "An unknown error occurred",
                    variant: "destructive",
                  });
                  return Promise.reject(error);
                }
              }}
            />
          </TabsContent>

          {/* SEO Keywords Tab */}
          <TabsContent value="seo_keywords">
            <SeoKeywordsTab 
              partnerId={undefined} // Using undefined will trigger the /my-keywords endpoint
              toast={toast} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}