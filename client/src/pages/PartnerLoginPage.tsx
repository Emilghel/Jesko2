import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Redirect } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  ArrowRight, 
  Loader2, 
  Lock, 
  Mail, 
  Coins,
  UserCheck,
  Users,
  BarChart3
} from "lucide-react";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function PartnerLoginPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  
  // If user is already authenticated, check if they are already a partner
  const { mutate: checkPartnerStatus, isPending: isCheckingStatus } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/partner/status");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.isPartner && data.partner) {
        setPartnerInfo(data.partner);
        // Store partner info
        if (data.partner.status === "ACTIVE") {
          localStorage.setItem('partnerInfo', JSON.stringify(data.partner));
          // Redirect to partner dashboard
          window.location.href = window.location.origin + "/partner/dashboard";
        }
      }
    },
  });
  
  // Initialize form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Use the partnerLogin function from the auth hook
  const { partnerLogin } = useAuth();
  const [isPending, setIsPending] = useState(false);
  
  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsPending(true);
      await partnerLogin(data.email, data.password);
      
      // Show success message
      toast({
        title: "Partner Login Successful",
        description: "Redirecting to your dashboard...",
      });
      
      // Note: Redirect is now handled directly in the auth hook's partnerLogin function
      // So we don't need to handle it here anymore
      
    } catch (error: any) {
      console.log("Partner login error:", error);
      console.log("Partner login error details:", error.response?.data);
      toast({
        title: "Login Failed",
        description: error.response?.data?.error || error.message || "Invalid credentials or you don't have partner access",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };
  
  // Check user status on component mount
  if (user && !partnerInfo && !isCheckingStatus) {
    checkPartnerStatus();
  }
  
  // Show a pending status message if the user is authenticated and is a pending partner
  if (partnerInfo && partnerInfo.status === "PENDING") {
    return (
      <div className="container max-w-6xl mx-auto py-12 px-4">
        <Card className="w-full max-w-md mx-auto bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Partner Application Pending</CardTitle>
            <CardDescription>
              Your application is under review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="flex justify-center my-6">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              </div>
            </div>
            
            <p className="text-gray-300">
              Thank you for applying to our partner program. Your application for <span className="font-semibold">{partnerInfo.company_name}</span> is currently being reviewed by our team.
            </p>
            
            <p className="text-gray-300 mt-2">
              You'll receive an email notification when your application is approved.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // If user is not a partner and already logged in, show application CTA
  if (user && !partnerInfo && !isCheckingStatus) {
    return (
      <div className="container max-w-6xl mx-auto py-12 px-4">
        <Card className="w-full max-w-md mx-auto bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Become a Partner</CardTitle>
            <CardDescription>
              Join our partner program to earn commissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center my-6">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <p className="text-gray-300 text-center">
              You don't have a partner account yet. Apply to become a partner and start earning commissions by referring new customers.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              <div className="bg-gray-700/50 p-4 rounded-lg flex flex-col items-center">
                <Coins className="h-8 w-8 text-green-400 mb-2" />
                <h3 className="font-medium text-white">Earn Commissions</h3>
                <p className="text-sm text-gray-300 text-center">Up to 30% on every sale</p>
              </div>
              
              <div className="bg-gray-700/50 p-4 rounded-lg flex flex-col items-center">
                <BarChart3 className="h-8 w-8 text-purple-400 mb-2" />
                <h3 className="font-medium text-white">Track Performance</h3>
                <p className="text-sm text-gray-300 text-center">Real-time referral analytics</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button className="w-full" onClick={() => navigate("/partners/apply")}>
              Apply Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Default: Show login form
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent mb-4">
              Partner Portal
            </h1>
            <p className="text-gray-400 text-lg">
              Log in to access your partner dashboard, track referrals, and manage your earnings.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-600/20 p-2 rounded-full mt-1">
                <UserCheck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-white">Track Referrals</h3>
                <p className="text-gray-400">Monitor your referrals and see how they're converting.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-green-600/20 p-2 rounded-full mt-1">
                <Coins className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-bold text-white">Manage Earnings</h3>
                <p className="text-gray-400">View your commission history and request payouts.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-purple-600/20 p-2 rounded-full mt-1">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-bold text-white">Performance Analytics</h3>
                <p className="text-gray-400">Get insights into your referral performance and optimize your strategy.</p>
              </div>
            </div>
          </div>
        </div>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Partner Login</CardTitle>
            <CardDescription>
              Enter your credentials to access your partner dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          <Input
                            placeholder="your@email.com"
                            className="pl-10 bg-gray-700 border-gray-600"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          <Input
                            placeholder="••••••••"
                            type="password"
                            className="pl-10 bg-gray-700 border-gray-600"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...
                    </>
                  ) : (
                    <>
                      Login to Partner Portal <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-400 text-center">
              Don't have a partner account?{" "}
              <a
                href="/partners/apply"
                className="text-blue-400 hover:underline"
              >
                Apply to become a partner
              </a>
            </div>
            
            <div className="text-sm text-gray-400 text-center">
              <a
                href="/auth"
                className="text-gray-500 hover:text-gray-300"
              >
                Need a user account? Sign up here
              </a>
            </div>
            
            {/* Direct Button for Testing */}
            <div className="mt-2 text-center">
              <button 
                onClick={() => {
                  console.log("Direct dashboard access");
                  // Special token for Zack access
                  const specialToken = "zack_special_token_for_partner_login";
                  localStorage.setItem('auth_token', specialToken);
                  localStorage.setItem('partnerToken', specialToken);
                  
                  // Manually navigate to dashboard with absolute URL
                  window.location.href = window.location.origin + "/partner/dashboard";
                }}
                className="text-blue-400 text-xs underline"
              >
                Direct Dashboard Access (Testing Only)
              </button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}