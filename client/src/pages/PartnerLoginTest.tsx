import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key, User, Shield, Lock, ChevronRight } from "lucide-react";

export default function PartnerLoginTest() {
  const { user, partnerLogin } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("zach@partner.com");
  const [password, setPassword] = useState("zachwarmleadnetwork345");
  const [isLoading, setIsLoading] = useState(false);
  const [authInfo, setAuthInfo] = useState<{
    auth_token?: string;
    partnerToken?: string;
    user?: any;
    partner?: any;
  }>({});
  
  // Read tokens and user info from localStorage on mount
  useEffect(() => {
    const auth_token = localStorage.getItem('auth_token');
    const partnerToken = localStorage.getItem('partnerToken');
    const userInfo = localStorage.getItem('auth_user');
    const partnerInfo = localStorage.getItem('partnerInfo');
    
    setAuthInfo({
      auth_token: auth_token || undefined,
      partnerToken: partnerToken || undefined,
      user: userInfo ? JSON.parse(userInfo) : undefined,
      partner: partnerInfo ? JSON.parse(partnerInfo) : undefined
    });
  }, []);
  
  const handlePartnerLogin = async () => {
    setIsLoading(true);
    try {
      await partnerLogin(email, password);
      
      toast({
        title: "Partner Login Successful",
        description: "Checking token data..."
      });
      
      // Update token info after login
      const auth_token = localStorage.getItem('auth_token');
      const partnerToken = localStorage.getItem('partnerToken');
      const userInfo = localStorage.getItem('auth_user');
      const partnerInfo = localStorage.getItem('partnerInfo');
      
      setAuthInfo({
        auth_token: auth_token || undefined,
        partnerToken: partnerToken || undefined,
        user: userInfo ? JSON.parse(userInfo) : undefined,
        partner: partnerInfo ? JSON.parse(partnerInfo) : undefined
      });
      
    } catch (error: any) {
      toast({
        title: "Partner Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const goToDashboard = () => {
    navigate("/partner/dashboard");
  };
  
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Partner Login Test</CardTitle>
          <CardDescription>
            Test the partner login functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <Key className="inline-block mr-2 h-5 w-5 text-blue-400" />
                Login Credentials
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
                
                <Button 
                  className="w-full mt-2" 
                  onClick={handlePartnerLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...
                    </>
                  ) : (
                    <>
                      Test Partner Login
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <User className="inline-block mr-2 h-5 w-5 text-green-400" />
                Current Auth State
              </h3>
              
              <div className="bg-gray-900 p-4 rounded-md border border-gray-700 space-y-2">
                <div>
                  <span className="text-gray-400 font-medium">User:</span>
                  <span className="ml-2 text-white">
                    {user ? user.email : "Not logged in"}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-400 font-medium">Auth Token:</span>
                  <span className="ml-2 text-white break-all">
                    {authInfo.auth_token ? 
                      `${authInfo.auth_token.substring(0, 15)}...` : 
                      "None"
                    }
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-400 font-medium">Partner Token:</span>
                  <span className="ml-2 text-white">
                    {authInfo.partnerToken || "None"}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-400 font-medium">Partner Info:</span>
                  <div className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-auto max-h-24">
                    <pre className="text-gray-300">
                      {authInfo.partner ? 
                        JSON.stringify(authInfo.partner, null, 2) : 
                        "No partner info"
                      }
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 border border-blue-900/50 p-4 rounded-md">
            <h3 className="text-lg font-medium text-white flex items-center mb-3">
              <Shield className="inline-block mr-2 h-5 w-5 text-blue-400" />
              Protected Route Access
            </h3>
            
            <p className="text-gray-400 mb-4">
              Now that you've logged in as a partner, you should be able to access the partner dashboard.
              Click the button below to test access to the protected route.
            </p>
            
            <Button 
              variant="default" 
              onClick={goToDashboard}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Go to Partner Dashboard <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
        <CardFooter className="border-t border-gray-700 flex justify-between">
          <div className="text-sm text-gray-400">
            {user ? (
              <>Logged in as: <span className="font-medium text-white">{user.email}</span></>
            ) : (
              "Not logged in"
            )}
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <Lock className="h-3 w-3 mr-1" />
            Secured with token authentication
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}