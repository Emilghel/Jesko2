import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Separator } from "@/components/ui/separator";

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" })
    .refine(val => val.includes('@') && val.includes('.'), {
      message: "Please enter a real email address with @ and domain"
    }),
  // Phone number field has been removed since it's not used in the database
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters" })
    .refine(val => /[A-Z]/.test(val), {
      message: "Password must contain at least one uppercase letter"
    })
    .refine(val => /[0-9]/.test(val), {
      message: "Password must contain at least one number"
    }),
  confirmPassword: z.string(),
  displayName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Partner login form uses same schema as regular login
const partnerLoginSchema = loginSchema;

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type PartnerLoginFormData = z.infer<typeof partnerLoginSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, login, register, partnerLogin } = useAuth();
  const [partnerLoginPending, setPartnerLoginPending] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Define video sources
  const videoSources = [
    "https://video.wixstatic.com/video/ee3656_9a108f297872471c8d343cff551d2029/1080p/mp4/file.mp4",
    "https://video.wixstatic.com/video/ee3656_fc011c0eeae44cf5a7c4ed2d23db1ffb/1080p/mp4/file.mp4",
    "https://video.wixstatic.com/video/ee3656_4f3f491de6d442aaba32130ae7ca4807/1080p/mp4/file.mp4"
  ];
  
  // Check URL parameters for tab selection
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const tabParam = queryParams.get('tab');
    if (tabParam === 'register' || tabParam === 'login' || tabParam === 'partner') {
      setActiveTab(tabParam);
    }
  }, []);
  
  // Handle redirection after login
  useEffect(() => {
    if (user) {
      console.log("User is logged in, checking for redirection");
      
      // Check if there's a requested redirect after login stored in localStorage
      const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
      const selectedPricingPlan = localStorage.getItem('selectedPricingPlan');
      
      if (redirectAfterLogin) {
        console.log(`Redirecting to stored path: ${redirectAfterLogin}`);
        localStorage.removeItem('redirectAfterLogin');
        
        if (redirectAfterLogin === '/checkout' && selectedPricingPlan) {
          navigate(`/checkout?package=${selectedPricingPlan}`);
          localStorage.removeItem('selectedPricingPlan');
        } else {
          navigate(redirectAfterLogin);
        }
      } else {
        console.log("No redirect found, going to character creation");
        navigate("/character-creation");
      }
    }
  }, [user, navigate]);
  
  // Video carousel effect
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    // Set the initial video source
    videoElement.src = videoSources[currentVideoIndex];
    videoElement.load();
    
    // Function to play the last 5 seconds of a video
    const playLastFiveSeconds = () => {
      // First, we need to find out the duration of the video
      if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        const duration = videoElement.duration;
        
        // Calculate the start time (5 seconds from the end, or from the beginning if video is shorter than 5 seconds)
        const startTime = Math.max(0, duration - 5);
        
        // Set the current time to 5 seconds before the end
        videoElement.currentTime = startTime;
        videoElement.play().catch(err => console.error("Video play error:", err));
      } else {
        // If video is not ready yet, wait a bit and try again
        setTimeout(playLastFiveSeconds, 200);
      }
    };
    
    // Call the function when video metadata is loaded
    const handleMetadataLoaded = () => {
      playLastFiveSeconds();
    };
    
    // Function to handle video transitions
    const handleVideoEnd = () => {
      // Move to the next video in the sequence
      const nextIndex = (currentVideoIndex + 1) % videoSources.length;
      setCurrentVideoIndex(nextIndex);
      
      // Update the video source
      videoElement.src = videoSources[nextIndex];
      videoElement.load();
      // playLastFiveSeconds will be called by the metadata loaded event
    };
    
    // Register event listeners
    videoElement.addEventListener('loadedmetadata', handleMetadataLoaded);
    videoElement.addEventListener('ended', handleVideoEnd);
    
    // Cleanup function
    return () => {
      videoElement.removeEventListener('loadedmetadata', handleMetadataLoaded);
      videoElement.removeEventListener('ended', handleVideoEnd);
    };
  }, [currentVideoIndex, videoSources]);

  // Login form
  const {
    register: registerLoginForm,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const {
    register: registerRegisterForm,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
    },
  });
  
  // Partner login form
  const {
    register: registerPartnerForm,
    handleSubmit: handlePartnerSubmit,
    formState: { errors: partnerErrors },
  } = useForm<PartnerLoginFormData>({
    resolver: zodResolver(partnerLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    console.log("Login form submitted with:", data);
    
    try {
      console.log("Attempting to login via useAuth hook");
      await login(data.email, data.password);
      console.log("Login call completed successfully");
      
      toast({
        title: "Success",
        description: "You have been logged in successfully",
      });
      // The user state will be updated and the useEffect will redirect automatically
    } catch (err: any) {
      // Enhanced error reporting
      console.error("Login error details:", err);
      
      if (err.response) {
        console.error("Server response error:", {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
      } else if (err.request) {
        console.error("No response received:", err.request);
      } else {
        console.error("Error message:", err.message);
      }
      
      // Add toast error in case the hook doesn't display one
      toast({
        title: "Login failed",
        description: err.response?.data?.error || err.message || "Failed to log in - check console for details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      // Remove confirmPassword before sending to server
      // phoneNumber field has been completely removed from the form
      const { confirmPassword, ...registrationData } = data;
      
      await register(registrationData);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      // The user state will be updated and the useEffect will redirect automatically
    } catch (err: any) {
      // Add toast error in case the hook doesn't display one
      toast({
        title: "Registration failed",
        description: err.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onPartnerLogin = async (data: PartnerLoginFormData) => {
    setPartnerLoginPending(true);
    try {
      console.log("Partner login attempt with:", data.email);
      
      // Use the partnerLogin function from our auth hook
      await partnerLogin(data.email, data.password);
      
      // Show success message
      toast({
        title: "Partner Login Successful",
        description: "Redirecting to your dashboard...",
        duration: 3000,
      });
      
      // Navigate to the partner dashboard after successful login
      navigate('/partner/dashboard');
      
    } catch (err: any) {
      console.error("Partner login error:", err);
      toast({
        title: "Partner Login Failed",
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setPartnerLoginPending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Left side - Auth forms */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8 flex flex-col items-center">
            <h1 className="text-3xl font-extrabold tracking-tight lg:text-5xl text-white text-center">
              Jesko AI
            </h1>
            <p className="mt-2 text-sm text-gray-400 text-center">
              Sign in to your account to access your voice platform dashboard
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="partner">Partner Login</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>Enter your credentials to sign in</CardDescription>
                </CardHeader>
                <form onSubmit={handleLoginSubmit(onLogin)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        {...registerLoginForm("email")}
                      />
                      {loginErrors.email && (
                        <p className="text-sm text-red-500">{loginErrors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...registerLoginForm("password")}
                      />
                      {loginErrors.password && (
                        <p className="text-sm text-red-500">{loginErrors.password.message}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" type="submit" disabled={isLoading}>
                      {isLoading ? "Logging in..." : "Login"}
                    </Button>
                    
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                      </div>
                    </div>
                    
                    <GoogleSignInButton 
                      onClick={() => {
                        console.log("Redirecting to Google authentication...");
                        window.location.href = "/api/auth/google";
                      }}
                      disabled={isLoading}
                    >
                      Sign in with Google
                    </GoogleSignInButton>
                    
                    <p className="text-xs text-center text-gray-500">
                      Having trouble logging in? <a href="/auth-reset" className="text-cyan-500 hover:underline">Reset your authentication</a>
                    </p>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create account</CardTitle>
                  <CardDescription>Enter your details to create your account</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegisterSubmit(onRegister)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="johndoe"
                        {...registerRegisterForm("username")}
                      />
                      {registerErrors.username && (
                        <p className="text-sm text-red-500">{registerErrors.username.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        {...registerRegisterForm("email")}
                      />
                      {registerErrors.email && (
                        <p className="text-sm text-red-500">{registerErrors.email.message}</p>
                      )}
                    </div>
                    {/* Phone number field has been removed as it's no longer needed */}
                    <div className="space-y-2">
                      <Label htmlFor="display-name">Display Name (optional)</Label>
                      <Input
                        id="display-name"
                        type="text"
                        placeholder="John Doe"
                        {...registerRegisterForm("displayName")}
                      />
                      {registerErrors.displayName && (
                        <p className="text-sm text-red-500">{registerErrors.displayName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        {...registerRegisterForm("password")}
                      />
                      {registerErrors.password && (
                        <p className="text-sm text-red-500">{registerErrors.password.message}</p>
                      )}
                      <p className="text-xs text-slate-400">Password must include at least one uppercase letter and one number</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        {...registerRegisterForm("confirmPassword")}
                      />
                      {registerErrors.confirmPassword && (
                        <p className="text-sm text-red-500">{registerErrors.confirmPassword.message}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" type="submit" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create account"}
                    </Button>
                    
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                      </div>
                    </div>
                    
                    <GoogleSignInButton 
                      onClick={() => {
                        console.log("Redirecting to Google authentication for signup...");
                        window.location.href = "/api/auth/google";
                      }}
                      disabled={isLoading}
                    >
                      Sign up with Google
                    </GoogleSignInButton>
                    
                    <p className="text-xs text-center text-gray-500">
                      By signing up, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            <TabsContent value="partner">
              <Card>
                <CardHeader>
                  <CardTitle>Partner Login</CardTitle>
                  <CardDescription>Access your partner dashboard</CardDescription>
                </CardHeader>
                <form onSubmit={handlePartnerSubmit(onPartnerLogin)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="partner-email">Email</Label>
                      <Input
                        id="partner-email"
                        type="email"
                        placeholder="partner@example.com"
                        {...registerPartnerForm("email")}
                      />
                      {partnerErrors.email && (
                        <p className="text-sm text-red-500">{partnerErrors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partner-password">Password</Label>
                      <Input
                        id="partner-password"
                        type="password"
                        placeholder="••••••••"
                        {...registerPartnerForm("password")}
                      />
                      {partnerErrors.password && (
                        <p className="text-sm text-red-500">{partnerErrors.password.message}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" type="submit" disabled={partnerLoginPending}>
                      {partnerLoginPending ? "Logging in..." : "Partner Login"}
                    </Button>
                    <p className="text-xs text-center text-gray-500">
                      Having trouble logging in? <a href="/auth-reset" className="text-cyan-500 hover:underline">Reset your authentication</a>
                    </p>
                  </CardFooter>
                </form>
              </Card>
              <div className="mt-4 text-center text-sm text-gray-400">
                <p>Want to become a partner? <a href="/partner/apply" className="text-cyan-400 hover:underline">Apply now</a></p>
                <p className="mt-2 text-xs text-gray-500">Contact support if you need assistance with your partner account</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero Section with Starry Background */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 h-full w-full bg-black">
          <div className="absolute inset-0 stars-container overflow-hidden">
            {/* Generate stars with CSS */}
            <div className="stars"></div>
            <div className="stars2"></div>
            <div className="stars3"></div>
          </div>

          {/* Full-screen video background */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ 
                backgroundColor: "#000",
                filter: "contrast(1.1) saturate(1.2) brightness(1.05)"
              }}
            >
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none"></div>
          </div>
          
          {/* Content overlay */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="w-full max-w-xl px-8 text-center">
              <div className="relative w-40 h-40 mx-auto mb-8">
                <div className="absolute inset-0 bg-cyan-400 rounded-full opacity-60 blur-2xl animate-pulse"></div>
                <div className="relative flex items-center justify-center h-full">
                  <div className="w-32 h-32 flex items-center justify-center">
                  </div>
                </div>
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                The Assistant That Builds Empires
              </h2>
              <p className="mt-4 text-xl text-gray-100 drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]">
                Create immersive, interactive communication experiences through sophisticated
                voice interactions and adaptive technology.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center p-4 bg-black bg-opacity-30 backdrop-blur-sm border border-cyan-800/30 rounded-lg shadow-lg shadow-cyan-500/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-8 h-8 text-cyan-400 mb-3"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                  <h3 className="text-lg font-medium text-white">Advanced Technology</h3>
                  <p className="mt-2 text-sm text-cyan-100/70">
                    Powered by cutting-edge natural language processing
                  </p>
                </div>
                <div className="flex flex-col items-center p-4 bg-black bg-opacity-30 backdrop-blur-sm border border-cyan-800/30 rounded-lg shadow-lg shadow-cyan-500/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-8 h-8 text-cyan-400 mb-3"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="22"></line>
                  </svg>
                  <h3 className="text-lg font-medium text-white">Natural Voice</h3>
                  <p className="mt-2 text-sm text-cyan-100/70">
                    Human-like text-to-speech technology
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}