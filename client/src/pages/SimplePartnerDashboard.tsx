import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Coins, 
  Copy, 
  Download, 
  LinkIcon, 
  Mail, 
  Phone, 
  PieChart, 
  Share, 
  TrendingUp, 
  User, 
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SimplePartnerDashboard() {
  const { toast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>({
    referralsCount: 0,
    activeReferrals: 0,
    totalRevenue: 0,
    availablePayout: 0
  });

  // Mock data for demonstration
  const mockPartner = {
    company_name: "Partner Company",
    contact_name: "Partner User",
    referral_code: "PARTNER123",
    commission_rate: 20,
    earnings_balance: 425.50,
    total_earnings: 1250.75,
    status: "ACTIVE",
    email: "zack@partner.com"
  };

  const mockReferrals = [
    { id: 1, created_at: "2025-03-15T10:30:00Z", status: "ACTIVE", total_purchases: 2 },
    { id: 2, created_at: "2025-03-20T14:45:00Z", status: "ACTIVE", total_purchases: 1 },
    { id: 3, created_at: "2025-03-25T09:15:00Z", status: "PENDING", total_purchases: 0 },
    { id: 4, created_at: "2025-04-01T16:20:00Z", status: "ACTIVE", total_purchases: 3 },
    { id: 5, created_at: "2025-04-10T11:05:00Z", status: "PENDING", total_purchases: 0 }
  ];

  const mockCommissions = [
    { id: 1, amount: 125.50, created_at: "2025-03-17T10:30:00Z", status: "PAID", referral_id: 1 },
    { id: 2, amount: 75.00, created_at: "2025-03-22T14:45:00Z", status: "PAID", referral_id: 2 },
    { id: 3, amount: 225.00, created_at: "2025-04-03T09:15:00Z", status: "PENDING", referral_id: 4 }
  ];

  const mockPayments = [
    { id: 1, amount: 125.50, payment_date: "2025-03-18T10:30:00Z", status: "COMPLETED", payment_method: "PayPal" },
    { id: 2, amount: 75.00, payment_date: "2025-03-23T14:45:00Z", status: "COMPLETED", payment_method: "Bank Transfer" }
  ];

  // Marketing materials mockup
  const mockMarketingMaterials = [
    {
      id: 1,
      title: "Product Overview",
      description: "A comprehensive guide to our AI video tools",
      type: "PDF",
      url: "#"
    },
    {
      id: 2,
      title: "Success Stories",
      description: "Case studies of businesses using our platform",
      type: "PDF",
      url: "#"
    },
    {
      id: 3,
      title: "Features Comparison",
      description: "Compare our platform with competitors",
      type: "PDF",
      url: "#"
    },
    {
      id: 4,
      title: "Product Demo Video",
      description: "Watch a demo of our platform in action",
      type: "VIDEO",
      url: "#"
    }
  ];

  // Simulate loading partner data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Use stored partner info if available
        const storedPartnerInfo = localStorage.getItem('partnerInfo');
        
        // Set partner info from storage or fallback to mock data
        if (storedPartnerInfo) {
          setPartnerInfo(JSON.parse(storedPartnerInfo));
        } else {
          console.log("Using mock partner data");
          setPartnerInfo(mockPartner);
        }
        
        // Calculate summary metrics
        const activeReferralCount = mockReferrals.filter(r => r.status === "ACTIVE").length;
        const totalRevenue = mockCommissions.reduce((sum, commission) => sum + commission.amount, 0);
        
        setDashboardData({
          referralsCount: mockReferrals.length,
          activeReferrals: activeReferralCount,
          totalRevenue: totalRevenue,
          availablePayout: mockPartner.earnings_balance
        });
        
        setIsLoaded(true);
      } catch (error) {
        console.error("Error loading partner data:", error);
        // Fallback to mock data on error
        setPartnerInfo(mockPartner);
        setIsLoaded(true);
      }
    };
    
    loadData();
  }, []);

  // Handle referral link copy
  const copyReferralLink = () => {
    const referralCode = partnerInfo?.referral_code || "PARTNER123";
    const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;
    
    navigator.clipboard.writeText(referralLink).then(() => {
      toast({
        title: "Referral Link Copied",
        description: "The referral link has been copied to your clipboard.",
      });
    }).catch(err => {
      console.error("Failed to copy referral link:", err);
      toast({
        title: "Copy Failed",
        description: "Failed to copy referral link. Please try again.",
        variant: "destructive",
      });
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        {/* Partner Dashboard Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
              Partner Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Welcome back, {partnerInfo?.contact_name || "Partner"}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={copyReferralLink}
            >
              <Share className="h-4 w-4" />
              Share Referral Link
            </Button>
            
            <Button 
              variant="default" 
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Referrals</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{dashboardData.referralsCount}</h3>
                </div>
                <div className="bg-blue-500/20 p-2 rounded-full">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-green-400 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>5% increase</span>
                <span className="text-gray-400 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Referrals</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{dashboardData.activeReferrals}</h3>
                </div>
                <div className="bg-green-500/20 p-2 rounded-full">
                  <User className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-green-400 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>12% increase</span>
                <span className="text-gray-400 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Revenue</p>
                  <h3 className="text-2xl font-bold text-white mt-1">${dashboardData.totalRevenue.toFixed(2)}</h3>
                </div>
                <div className="bg-indigo-500/20 p-2 rounded-full">
                  <BarChart className="h-5 w-5 text-indigo-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-green-400 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>8% increase</span>
                <span className="text-gray-400 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Available for Payout</p>
                  <h3 className="text-2xl font-bold text-white mt-1">${dashboardData.availablePayout.toFixed(2)}</h3>
                </div>
                <div className="bg-yellow-500/20 p-2 rounded-full">
                  <Coins className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
              <div className="flex items-center mt-3">
                <Button variant="outline" size="sm" className="text-xs">Request Payout</Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Referral Link Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Your Referral Link</CardTitle>
            <CardDescription>
              Share this link with potential customers to earn commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 p-3 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <LinkIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm truncate">
                  {window.location.origin}/auth?ref={partnerInfo?.referral_code || "PARTNER123"}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyReferralLink}
                className="flex-shrink-0"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="mt-4">
              <p className="text-yellow-300 text-sm flex items-center">
                <span className="bg-yellow-400/20 p-1 rounded-full mr-2">
                  <Coins className="h-4 w-4 text-yellow-400" />
                </span>
                You earn {partnerInfo?.commission_rate || 20}% commission on all subscriptions from your referrals
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Tabs for different data views */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl bg-gray-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="materials">Marketing Materials</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Performance Overview</CardTitle>
                  <CardDescription>
                    Your referral performance at a glance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <PieChart className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                      <p className="text-gray-400">Performance chart visualization would appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                  <CardDescription>
                    Latest updates from your referrals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockReferrals.slice(0, 3).map(referral => (
                      <div key={referral.id} className="flex items-start gap-3 p-3 rounded-md bg-gray-700/40">
                        <div className="bg-blue-500/20 p-2 rounded-full">
                          <User className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-white text-sm">New referral signup</p>
                          <p className="text-xs text-gray-400">
                            Referral ID: {referral.id} • {formatDate(referral.created_at)}
                          </p>
                          <div className="mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              referral.status === "ACTIVE" 
                                ? "bg-green-900/30 text-green-400" 
                                : "bg-yellow-900/30 text-yellow-400"
                            }`}>
                              {referral.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">View All Activity</Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Your Referrals</CardTitle>
                <CardDescription>
                  All customers referred through your link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">ID</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Date</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Status</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Purchases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockReferrals.map(referral => (
                        <tr key={referral.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                          <td className="py-3 px-4 text-white">{referral.id}</td>
                          <td className="py-3 px-4 text-gray-300">{formatDate(referral.created_at)}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              referral.status === "ACTIVE" 
                                ? "bg-green-900/30 text-green-400" 
                                : "bg-yellow-900/30 text-yellow-400"
                            }`}>
                              {referral.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white">{referral.total_purchases}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Your Commissions</CardTitle>
                <CardDescription>
                  Earnings from your referrals' purchases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">ID</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Date</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Amount</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Status</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Referral ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockCommissions.map(commission => (
                        <tr key={commission.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                          <td className="py-3 px-4 text-white">{commission.id}</td>
                          <td className="py-3 px-4 text-gray-300">{formatDate(commission.created_at)}</td>
                          <td className="py-3 px-4 text-white">${commission.amount.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              commission.status === "PAID" 
                                ? "bg-green-900/30 text-green-400" 
                                : "bg-yellow-900/30 text-yellow-400"
                            }`}>
                              {commission.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white">{commission.referral_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Your Payments</CardTitle>
                <CardDescription>
                  History of payouts sent to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">ID</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Date</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Amount</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Status</th>
                        <th className="py-3 px-4 text-left text-gray-400 text-sm font-medium">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPayments.map(payment => (
                        <tr key={payment.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                          <td className="py-3 px-4 text-white">{payment.id}</td>
                          <td className="py-3 px-4 text-gray-300">{formatDate(payment.payment_date)}</td>
                          <td className="py-3 px-4 text-white">${payment.amount.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400">
                              {payment.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white">{payment.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 items-start">
                <div className="bg-blue-900/20 p-4 rounded-md w-full">
                  <h4 className="text-white font-medium mb-2">Payment Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-400" />
                      <span className="text-sm text-gray-300">
                        {partnerInfo?.email || "zack@partner.com"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-blue-400" />
                      <span className="text-sm text-gray-300">+1 (555) 123-4567</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline">Update Payment Information</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Marketing Materials Tab */}
          <TabsContent value="materials">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Marketing Materials</CardTitle>
                <CardDescription>
                  Resources to help you promote our platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockMarketingMaterials.map(material => (
                    <Card key={material.id} className="bg-gray-700 border-gray-600">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-lg">{material.title}</CardTitle>
                        <CardDescription>
                          {material.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            material.type === "PDF" 
                              ? "bg-red-900/30 text-red-400" 
                              : "bg-blue-900/30 text-blue-400"
                          }`}>
                            {material.type}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}