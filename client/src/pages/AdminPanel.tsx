import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import HomepageAIConfig from "@/components/HomepageAIConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, Settings, AreaChart, FileText, Server, Phone, 
  Brain, User, Trash2, Edit, Lock, RefreshCcw, ChevronDown, 
  ChevronUp, PlusCircle, Download, Upload, Check, X,
  ChevronLeft, ChevronRight, CreditCard, Bot, Coins
} from "lucide-react";

// Types
interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastLogin: string;
  is_admin: boolean;
  token?: string; // Optional token property for authentication
  expiresAt?: string; // Optional token expiration date
}

interface Partner {
  id: number;
  user_id: number;
  company_name: string;
  contact_name: string;
  referral_code: string;
  commission_rate: number;
  earnings_balance: number;
  total_earnings: number;
  status: string;
  created_at: string;
  website?: string;
  bio?: string;
}

interface AdminStats {
  users: {
    total: number;
    activeAgents: number;
  };
  apiStats: Array<{
    service: string;
    total_requests: number;
    avg_response_time: number;
  }>;
  recentLogs: Array<{
    id: number;
    level: string;
    source: string;
    message: string;
    timestamp: string;
  }>;
  system: {
    uptime: {
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    };
    cpu: number;
    memory: {
      used: number;
      total: number;
      percent: number;
    };
  };
}

interface SystemConfig {
  serverPort: string;
  twilioAccountSid: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  twilioWelcomeMessage?: string;
  openaiApiKey: string;
  openaiModel: string;
  temperature: number;
  contextWindow: number;
  systemPrompt?: string;
  maxTokens?: number;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  stability?: number;
  similarity?: number;
  style?: number;
  speakerBoost?: boolean;
  modelId?: string;
  optimize_streaming_latency?: number;
  output_format?: string;
  voice_clarity?: number;
  voice_expressiveness?: number;
  voice_naturalness?: number;
  voice_emotion?: string;
  voice_speed?: number;
  voice_pitch?: number;
}

interface AgentTemplate {
  id: number;
  name: string;
  description: string;
  systemPrompt: string;
  welcomeMessage: string;
  voiceId: string;
  modelId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Debug function to test authentication - using useRef to allow safe modification
  const debugAuthRef = useRef(async () => {
    // Check if token exists in localStorage
    const token = localStorage.getItem('auth_token');
    console.log('Auth token in localStorage:', token ? `${token.substring(0, 10)}...` : 'null');
    
    // Check cookies
    console.log('Cookies:', document.cookie);
  });
  
  // Helper function to call the debugAuth implementation in the ref
  const debugAuth = async () => {
    return debugAuthRef.current();
  };
  const [logsPage, setLogsPage] = useState(1);
  const [logsLimit, setLogsLimit] = useState(50);
  const [logLevel, setLogLevel] = useState<string | null>(null);
  const [logSource, setLogSource] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    welcomeMessage: "",
    voiceId: "",
    modelId: "",
    isDefault: false,
  });
  const [editConfig, setEditConfig] = useState<SystemConfig | null>(null);

  // Fetch admin stats
  const { 
    data: adminStats,
    isLoading: isLoadingStats,
    error: statsError
  } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/stats');
      
      // Create a default empty stats object to prevent errors
      const defaultStats: AdminStats = {
        users: { total: 0, activeAgents: 0 },
        apiStats: [],
        recentLogs: [],
        system: {
          uptime: { days: 0, hours: 0, minutes: 0, seconds: 0 },
          cpu: 0,
          memory: { used: 0, total: 0, percent: 0 }
        }
      };
      
      // Return the response if valid, otherwise use default
      if (response && typeof response === 'object' && 
          response.users && response.apiStats && response.system) {
        return response as unknown as AdminStats;
      } else {
        console.error('Invalid admin stats format:', response);
        return defaultStats;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch users
  const { 
    data: users,
    isLoading: isLoadingUsers,
    error: usersError
  } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users');
      // Make sure we always return an array, even if the response is not an array
      if (Array.isArray(response)) {
        return response as unknown as User[];
      } else {
        console.error('Expected users array but got:', response);
        return [] as User[]; // Return empty array as fallback
      }
    },
  });

  // Fetch logs with pagination
  interface LogsResponse {
    logs: Array<{
      id: number;
      level: string;
      source: string;
      message: string;
      timestamp: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  }

  const { 
    data: logs,
    isLoading: isLoadingLogs,
    error: logsError
  } = useQuery<LogsResponse>({
    queryKey: ['/api/admin/logs', logsPage, logsLimit, logLevel, logSource],
    queryFn: async () => {
      let url = `/api/admin/logs?page=${logsPage}&limit=${logsLimit}`;
      if (logLevel) url += `&level=${logLevel}`;
      if (logSource) url += `&source=${logSource}`;
      const response = await apiRequest('GET', url);
      
      // Create a default empty logs object to prevent errors
      const defaultLogs: LogsResponse = {
        logs: [],
        pagination: {
          page: logsPage,
          limit: logsLimit,
          totalCount: 0,
          totalPages: 0
        }
      };
      
      // Return the response if valid, otherwise use default
      if (response && typeof response === 'object' && 
          response.logs && Array.isArray(response.logs) && 
          response.pagination) {
        return response as unknown as LogsResponse;
      } else {
        console.error('Invalid logs format:', response);
        return defaultLogs;
      }
    },
  });

  // Fetch system config
  const { 
    data: systemConfig,
    isLoading: isLoadingConfig,
    error: configError
  } = useQuery<SystemConfig>({
    queryKey: ['/api/admin/config'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/config');
      
      if (response && typeof response === 'object') {
        return response as unknown as SystemConfig;
      } else {
        console.error('Invalid system config format:', response);
        // Return a default config to prevent errors
        return {
          serverPort: '3000',
          twilioAccountSid: '',
          openaiApiKey: '',
          openaiModel: 'gpt-4o',
          temperature: 0.7,
          contextWindow: 10,
          elevenLabsApiKey: '',
          elevenLabsVoiceId: ''
        } as SystemConfig;
      }
    },
  });

  // Fetch agent templates
  const { 
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError
  } = useQuery<AgentTemplate[]>({
    queryKey: ['/api/admin/templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/templates');
      
      // Make sure we always return an array
      if (Array.isArray(response)) {
        return response as unknown as AgentTemplate[];
      } else {
        console.error('Expected templates array but got:', response);
        return [] as AgentTemplate[]; // Return empty array as fallback
      }
    },
  });

  // Fetch partners
  const { 
    data: partners,
    isLoading: isLoadingPartners,
    error: partnersError
  } = useQuery<Partner[]>({
    queryKey: ['/api/admin/partners'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/partners');
      
      if (Array.isArray(response)) {
        return response as unknown as Partner[];
      } else if (response && typeof response === 'object' && Array.isArray(response.partners)) {
        return response.partners as unknown as Partner[];
      } else {
        console.error('Expected partners array but got:', response);
        return [] as Partner[]; // Return empty array as fallback
      }
    },
  });

  // Fetch single user with agent info
  interface UserWithAgentInfo extends User {
    agent?: {
      id: number;
      name: string;
      active: boolean;
      userId: number;
    };
    apiUsage?: Array<{
      service: string;
      total_requests: number;
      avg_response_time: number;
      total_characters: number;
      total_tokens: number;
    }>;
  }

  const { 
    data: userData,
    isLoading: isLoadingUser,
    error: userError
  } = useQuery<UserWithAgentInfo>({
    queryKey: ['/api/admin/users', selectedUser],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/admin/users/${selectedUser}`);
        
        // Ensure apiUsage is always an array
        if (response && typeof response === 'object') {
          // If apiUsage doesn't exist or isn't an array, initialize it as an empty array
          if (!response.apiUsage || !Array.isArray(response.apiUsage)) {
            response.apiUsage = [];
          }
          return response as unknown as UserWithAgentInfo;
        } else {
          console.error('Expected user data but got:', response);
          // Return minimal user data object
          return { 
            id: selectedUser as number, 
            username: 'Unknown', 
            email: 'unknown@example.com',
            displayName: 'Unknown User',
            is_admin: false,
            createdAt: new Date().toISOString(),
            lastLogin: '',
            apiUsage: []
          } as UserWithAgentInfo;
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
      }
    },
    enabled: !!selectedUser,
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (userData: {id: number, data: Partial<User>}) => 
      apiRequest('PATCH', `/api/admin/users/${userData.id}`, userData.data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUser] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest('DELETE', `/api/admin/users/${userId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (data: {userId: number, newPassword: string}) => 
      apiRequest('POST', `/api/admin/users/${data.userId}/reset-password`, { newPassword: data.newPassword }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setIsPasswordResetDialogOpen(false);
      setNewPassword("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reset password: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update system config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (config: Partial<SystemConfig>) => apiRequest('PATCH', '/api/admin/config', config),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "System configuration updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
      setEditConfig(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update configuration: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: (template: typeof templateForm) => apiRequest('POST', '/api/admin/templates', template),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
      resetTemplateForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: {id: number, template: Partial<AgentTemplate>}) => 
      apiRequest('PATCH', `/api/admin/templates/${data.id}`, data.template),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
      resetTemplateForm();
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: number) => apiRequest('DELETE', `/api/admin/templates/${templateId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
      setSelectedTemplate(null);
      resetTemplateForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete template: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Partner mutations
  const createPartnerMutation = useMutation({
    mutationFn: (partnerData: typeof createPartnerForm) => 
      apiRequest('POST', '/api/admin/partners', partnerData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Partner account created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
      setCreatePartnerForm({
        email: "",
        password: "",
        company_name: "",
        contact_name: "",
        commission_rate: 0.2
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create partner: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: (partnerId: number) => apiRequest('DELETE', `/api/admin/partners/${partnerId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Partner account deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
      setSelectedPartner(null);
      setIsPartnerDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete partner: ${error.message}`,
        variant: "destructive",
      });
      setIsPartnerDeleteDialogOpen(false);
    },
  });

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Reset template form
  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      description: "",
      systemPrompt: "",
      welcomeMessage: "",
      voiceId: "",
      modelId: "",
      isDefault: false,
    });
  };

  // Handle when a template is selected for editing
  useEffect(() => {
    if (selectedTemplate && templates) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setTemplateForm({
          name: template.name,
          description: template.description,
          systemPrompt: template.systemPrompt,
          welcomeMessage: template.welcomeMessage,
          voiceId: template.voiceId,
          modelId: template.modelId,
          isDefault: template.isDefault,
        });
      }
    }
  }, [selectedTemplate, templates]);

  // Handle when system config is loaded
  useEffect(() => {
    if (systemConfig && !editConfig) {
      setEditConfig({ ...systemConfig });
    }
  }, [systemConfig, editConfig]);
  
  // Enhance the existing debugAuth function
  useEffect(() => {
    // Update the debugAuth function implementation
    debugAuthRef.current = async () => {
      // Call the original implementation
      const token = localStorage.getItem('auth_token');
      console.log('Auth token in localStorage:', token ? `${token.substring(0, 10)}...` : 'null');
      console.log('Cookies:', document.cookie);
      
      // Add our enhanced functionality
      const partnerToken = localStorage.getItem('partnerToken');
      
      toast({
        title: "Authentication Debug Info",
        description: (
          <div className="mt-2 text-xs">
            <p>User: {user ? `${user.username} (ID: ${user.id})` : 'Not authenticated'}</p>
            <p>Is Admin: {user?.is_admin ? 'Yes' : 'No'}</p>
            <p>Auth Token: {token ? `${token.substring(0, 10)}...` : 'None'}</p>
            <p>Partner Token: {partnerToken ? `${partnerToken.substring(0, 10)}...` : 'None'}</p>
          </div>
        ),
        duration: 10000,
      });
      
      console.log("User object:", user);
      console.log("Auth token:", token);
      console.log("Partner token:", partnerToken);
    };
    
    // No cleanup needed when using a ref
  }, [user, toast]);
  
  // This effect ensures the auth token is set up correctly when the component mounts
  useEffect(() => {
    console.log("AdminPanel mounted, checking authentication");
    
    // Get token from local storage
    const token = localStorage.getItem('auth_token');
    
    // If we have a user and token isn't already stored, store it
    if (user?.token && !token) {
      console.log("Setting auth token from user object");
      localStorage.setItem('auth_token', user.token);
      // Force a refetch of all admin data
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    }
    
    // If we have user but no token in the auth context, try to check authentication
    if (user && !user.token && token) {
      console.log("User without token found, but token exists in localStorage");
    }
    
    // If no user or token, redirect to auth page
    if (!user && !token) {
      console.log("No authentication found, redirecting to login");
      navigate("/auth");
    }
  }, [user, navigate, queryClient]);

  // Test PayPal credentials
  interface PayPalStatus {
    isValid: boolean;
    message: string;
    details?: any;
  }
  
  const [paypalStatus, setPaypalStatus] = useState<PayPalStatus | null>(null);
  const [isTestingPaypal, setIsTestingPaypal] = useState(false);
  const [showPayPalDetails, setShowPayPalDetails] = useState(false);
  
  // Partner Management State
  const [selectedPartner, setSelectedPartner] = useState<number | null>(null);
  const [isPartnerDeleteDialogOpen, setIsPartnerDeleteDialogOpen] = useState(false);
  const [createPartnerForm, setCreatePartnerForm] = useState({
    email: "",
    password: "",
    company_name: "",
    contact_name: "",
    commission_rate: 0.2
  });
  
  const testPayPalCredentials = async () => {
    setIsTestingPaypal(true);
    setPaypalStatus(null);
    setShowPayPalDetails(false);
    
    try {
      const response = await apiRequest('GET', '/api/system/check-paypal');
      // Safely cast response to avoid TypeScript errors
      const responseData = response as unknown as {
        isValid: boolean;
        message: string;
        details?: any;
      };
      
      // Create a typed PayPalStatus object
      const paypalResponse: PayPalStatus = {
        isValid: !!responseData.isValid,
        message: responseData.message || 'No message returned',
        details: responseData.details
      };
      
      setPaypalStatus(paypalResponse);
      
      toast({
        title: paypalResponse.isValid ? "PayPal Test Successful" : "PayPal Test Failed",
        description: paypalResponse.message,
        variant: paypalResponse.isValid ? "default" : "destructive"
      });
    } catch (error: any) {
      console.error('Error testing PayPal credentials:', error);
      
      setPaypalStatus({
        isValid: false,
        message: `Error: ${error.message || 'Unknown error'}`,
        details: { error: error.message }
      });
      
      toast({
        title: "PayPal Test Error",
        description: error.message || 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsTestingPaypal(false);
    }
  };

  // Calculate stats for dashboard
  const calculateServiceStatus = (stats: AdminStats) => {
    if (!stats) return [];

    const services = [
      {
        name: "Phone Service",
        status: stats.apiStats.some(s => s.service === "twilio") ? "Online" : "Offline",
        requests: stats.apiStats.find(s => s.service === "twilio")?.total_requests || 0,
        icon: <Phone className="h-6 w-6 text-cyan-400" />,
      },
      {
        name: "AI Brain",
        status: stats.apiStats.some(s => s.service === "openai") ? "Online" : "Offline",
        requests: stats.apiStats.find(s => s.service === "openai")?.total_requests || 0,
        icon: <Brain className="h-6 w-6 text-cyan-400" />,
      },
      {
        name: "Voice Synthesis",
        status: stats.apiStats.some(s => s.service === "elevenlabs") ? "Online" : "Offline",
        requests: stats.apiStats.find(s => s.service === "elevenlabs")?.total_requests || 0,
        icon: <Server className="h-6 w-6 text-cyan-400" />,
      },
    ];

    return services;
  };

  // Check if user is an admin
  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-700 max-w-2xl mx-auto">
            <div className="flex items-center justify-center text-red-400 mb-4">
              <Lock className="w-16 h-16" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">Access Restricted</h2>
            <p className="text-gray-300 text-center mb-6">
              You don't have administrator privileges to access this area.
            </p>
            <p className="text-gray-400 text-center mb-8">
              Please log in with an admin account or contact your system administrator.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => navigate("/")} className="px-4 py-2">
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check for API errors in any of the queries
  if (statsError || usersError || logsError || configError || templatesError || partnersError) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-700 max-w-2xl mx-auto">
            <div className="flex items-center justify-center text-amber-400 mb-4">
              <AlertCircle className="w-16 h-16" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">Error Loading Admin Panel</h2>
            <p className="text-gray-300 text-center mb-6">
              There was a problem loading the admin panel data.
            </p>
            <div className="bg-gray-900 p-4 rounded mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-400">
                {statsError?.message || usersError?.message || logsError?.message || 
                 configError?.message || templatesError?.message || partnersError?.message || 
                 "Unknown error occurred when fetching admin data"}
              </code>
            </div>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => navigate("/")} variant="outline" className="px-4 py-2">
                Return to Home
              </Button>
              <Button onClick={debugAuth} className="px-4 py-2">
                Debug Authentication
              </Button>
              <Button onClick={() => queryClient.invalidateQueries()} className="px-4 py-2">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Admin Panel
              </span>
            </h1>
            <p className="text-gray-400">
              Manage your AI voice platform
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={debugAuth}>
              Debug Auth
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to AI Agent
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-8 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <AreaChart className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Partners</span>
            </TabsTrigger>
            <TabsTrigger value="homepageAI" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span>Homepage AI</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Agent Templates</span>
            </TabsTrigger>
            <TabsTrigger value="personalities" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span>Personality Prompts</span>
            </TabsTrigger>
            <TabsTrigger value="coins" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span>Coins</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>System Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            {isLoadingStats ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
              </div>
            ) : statsError ? (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
                Error loading stats: {(statsError as Error).message}
              </div>
            ) : adminStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Summary Cards */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-cyan-400">{adminStats.users.total}</div>
                    <p className="text-gray-400 text-sm">
                      {adminStats.users.activeAgents} active agents
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total API Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-cyan-400">
                      {adminStats.apiStats.reduce((sum, stat) => sum + stat.total_requests, 0)}
                    </div>
                    <p className="text-gray-400 text-sm">
                      Across all services
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">System Uptime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-cyan-400">
                      {adminStats.system.uptime.days}d {adminStats.system.uptime.hours}h
                    </div>
                    <p className="text-gray-400 text-sm">
                      {adminStats.system.cpu}% CPU, {adminStats.system.memory.percent}% Memory
                    </p>
                  </CardContent>
                </Card>

                {/* Service Status Section */}
                <Card className="md:col-span-3">
                  <CardHeader>
                    <CardTitle>Service Status</CardTitle>
                    <CardDescription>
                      Current status of all integrated services
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {calculateServiceStatus(adminStats).map((service, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
                          {service.icon}
                          <div>
                            <h3 className="font-medium">{service.name}</h3>
                            <div className="flex items-center mt-1">
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                service.status === "Online" ? "bg-green-500" : "bg-red-500"
                              }`}></div>
                              <span className="text-sm text-gray-400">{service.status} • {service.requests} requests</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Logs */}
                <Card className="md:col-span-3">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Recent Logs</CardTitle>
                      <CardDescription>
                        Last 20 system activity logs
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("logs")}>
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Level</TableHead>
                            <TableHead className="w-32">Source</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead className="w-48">Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adminStats.recentLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  log.level === 'ERROR' ? 'bg-red-900/30 text-red-400' :
                                  log.level === 'WARNING' ? 'bg-yellow-900/30 text-yellow-400' :
                                  'bg-blue-900/30 text-blue-400'
                                }`}>
                                  {log.level}
                                </span>
                              </TableCell>
                              <TableCell>{log.source}</TableCell>
                              <TableCell className="truncate max-w-xs">{log.message}</TableCell>
                              <TableCell>{formatDate(log.timestamp)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>
          
          {/* Partners Tab */}
          <TabsContent value="partners">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Withdrawal Requests */}
              <Card className="lg:col-span-3 mb-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Pending Withdrawal Requests</CardTitle>
                    <CardDescription>Partner withdrawal requests requiring manual approval</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/partner-withdrawals'] })}
                  >
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Partner</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment Method</TableHead>
                          <TableHead>Request Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partnerWithdrawals?.length > 0 ? (
                          partnerWithdrawals.map((withdrawal) => (
                            <TableRow key={withdrawal.id}>
                              <TableCell>{withdrawal.partnerName}</TableCell>
                              <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                              <TableCell>{withdrawal.paymentMethod}</TableCell>
                              <TableCell>{formatDate(withdrawal.requestDate)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  withdrawal.status === 'PENDING' ? 'bg-yellow-900/30 text-yellow-400' :
                                  withdrawal.status === 'APPROVED' ? 'bg-green-900/30 text-green-400' :
                                  withdrawal.status === 'PAID' ? 'bg-blue-900/30 text-blue-400' :
                                  'bg-red-900/30 text-red-400'
                                }`}>
                                  {withdrawal.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">View Details</Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Withdrawal Request Details</DialogTitle>
                                      <DialogDescription>
                                        Review and process this withdrawal request
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Partner</Label>
                                          <div className="text-sm font-medium">{withdrawal.partnerName}</div>
                                        </div>
                                        <div>
                                          <Label>Email</Label>
                                          <div className="text-sm font-medium">{withdrawal.partnerEmail}</div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Amount</Label>
                                          <div className="text-xl font-bold">${withdrawal.amount.toFixed(2)}</div>
                                        </div>
                                        <div>
                                          <Label>Request Date</Label>
                                          <div className="text-sm font-medium">{formatDate(withdrawal.requestDate)}</div>
                                        </div>
                                      </div>
                                      <div>
                                        <Label>Payment Method</Label>
                                        <div className="text-sm font-medium">{withdrawal.paymentMethod}</div>
                                      </div>
                                      <div>
                                        <Label>Payment Details</Label>
                                        <div className="text-sm font-medium bg-gray-100 p-3 rounded-md">{withdrawal.paymentDetails}</div>
                                      </div>
                                      <div>
                                        <Label>Status</Label>
                                        <Select defaultValue={withdrawal.status}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="PENDING">Pending</SelectItem>
                                            <SelectItem value="APPROVED">Approved</SelectItem>
                                            <SelectItem value="PAID">Paid</SelectItem>
                                            <SelectItem value="REJECTED">Rejected</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label>Admin Notes</Label>
                                        <Input placeholder="Add notes about this payment" />
                                      </div>
                                    </div>
                                    <DialogFooter className="flex justify-between">
                                      <Button variant="destructive">Reject</Button>
                                      <div className="space-x-2">
                                        <Button variant="outline">Approve</Button>
                                        <Button>Mark as Paid</Button>
                                      </div>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              No pending withdrawal requests
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Partner List */}
              <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Partners</CardTitle>
                    <CardDescription>
                      Manage partner accounts
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedPartner(null);
                    setCreatePartnerForm({
                      email: "",
                      password: "",
                      company_name: "",
                      contact_name: "",
                      commission_rate: 0.2
                    });
                  }}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Partner
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingPartners ? (
                    <div className="flex justify-center p-8">
                      <div className="w-8 h-8 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
                    </div>
                  ) : partnersError ? (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
                      Error loading partners: {(partnersError as Error).message}
                    </div>
                  ) : partners && partners.length > 0 ? (
                    <div className="space-y-2">
                      {partners.map((partner: Partner) => (
                        <Button
                          key={partner.id}
                          variant={selectedPartner === partner.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setSelectedPartner(partner.id)}
                        >
                          <div className="flex items-center w-full">
                            <User className="h-4 w-4 mr-2 flex-shrink-0" />
                            <div className="truncate">
                              <span className="font-medium">{partner.company_name}</span>
                              <span className="ml-2 text-xs opacity-70">{partner.contact_name}</span>
                            </div>
                            <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                              partner.status === 'ACTIVE' ? 'bg-green-900/30 text-green-400' :
                              partner.status === 'SUSPENDED' ? 'bg-red-900/30 text-red-400' :
                              'bg-yellow-900/30 text-yellow-400'
                            }`}>
                              {partner.status}
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <p>No partners found</p>
                      <p className="text-sm mt-2">Create your first partner account</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Partner Form/Details */}
              <Card className="lg:col-span-2">
                {selectedPartner ? (
                  // Partner Details
                  <>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Partner Details</CardTitle>
                        <CardDescription>
                          View and manage partner account
                        </CardDescription>
                      </div>
                      <AlertDialog open={isPartnerDeleteDialogOpen} onOpenChange={setIsPartnerDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Partner
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Partner Account</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the partner 
                              account and remove all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => {
                                if (selectedPartner) {
                                  deletePartnerMutation.mutate(selectedPartner);
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardHeader>
                    <CardContent>
                      {partners && selectedPartner && (
                        (() => {
                          const partner = partners.find(p => p.id === selectedPartner);
                          if (!partner) return <div>Partner not found</div>;
                          
                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label>Company Name</Label>
                                  <div className="mt-1 text-lg font-medium">{partner.company_name}</div>
                                </div>
                                <div>
                                  <Label>Contact Name</Label>
                                  <div className="mt-1 text-lg">{partner.contact_name}</div>
                                </div>
                                <div>
                                  <Label>User ID</Label>
                                  <div className="mt-1">{partner.user_id}</div>
                                </div>
                                <div>
                                  <Label>Referral Code</Label>
                                  <div className="mt-1 p-2 bg-gray-800 rounded-md font-mono">
                                    {partner.referral_code}
                                  </div>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <div className="mt-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      partner.status === 'ACTIVE' ? 'bg-green-900/30 text-green-400' :
                                      partner.status === 'SUSPENDED' ? 'bg-red-900/30 text-red-400' :
                                      'bg-yellow-900/30 text-yellow-400'
                                    }`}>
                                      {partner.status}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <Label>Commission Rate</Label>
                                  <div className="mt-1">{(partner.commission_rate * 100).toFixed(0)}%</div>
                                </div>
                              </div>

                              <Separator />

                              <div>
                                <h3 className="text-lg font-medium mb-2">Earnings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 bg-gray-800 rounded-lg">
                                    <div className="text-sm text-gray-400 mb-1">Current Balance</div>
                                    <div className="text-xl font-bold text-cyan-400">
                                      ${partner.earnings_balance.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="p-4 bg-gray-800 rounded-lg">
                                    <div className="text-sm text-gray-400 mb-1">Total Earnings</div>
                                    <div className="text-xl font-bold text-cyan-400">
                                      ${partner.total_earnings.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {partner.website && (
                                <div>
                                  <Label>Website</Label>
                                  <div className="mt-1 text-cyan-400 underline">
                                    <a href={partner.website} target="_blank" rel="noopener noreferrer">
                                      {partner.website}
                                    </a>
                                  </div>
                                </div>
                              )}

                              {partner.bio && (
                                <div>
                                  <Label>Bio</Label>
                                  <div className="mt-1 p-3 bg-gray-800 rounded-lg">
                                    {partner.bio}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </CardContent>
                  </>
                ) : (
                  // Create Partner Form
                  <>
                    <CardHeader>
                      <CardTitle>Create Partner</CardTitle>
                      <CardDescription>
                        Add a new partner to your affiliate program
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          createPartnerMutation.mutate(createPartnerForm);
                        }}
                      >
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="partner@example.com"
                            value={createPartnerForm.email}
                            onChange={(e) => setCreatePartnerForm({
                              ...createPartnerForm,
                              email: e.target.value
                            })}
                            required
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={createPartnerForm.password}
                            onChange={(e) => setCreatePartnerForm({
                              ...createPartnerForm,
                              password: e.target.value
                            })}
                            required
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="company">Company Name</Label>
                          <Input
                            id="company"
                            placeholder="Company LLC"
                            value={createPartnerForm.company_name}
                            onChange={(e) => setCreatePartnerForm({
                              ...createPartnerForm,
                              company_name: e.target.value
                            })}
                            required
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="contact">Contact Name</Label>
                          <Input
                            id="contact"
                            placeholder="John Doe"
                            value={createPartnerForm.contact_name}
                            onChange={(e) => setCreatePartnerForm({
                              ...createPartnerForm,
                              contact_name: e.target.value
                            })}
                            required
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="commission">Commission Rate (%)</Label>
                          <Input
                            id="commission"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder="20%"
                            value={(createPartnerForm.commission_rate * 100).toString()}
                            onChange={(e) => setCreatePartnerForm({
                              ...createPartnerForm,
                              commission_rate: parseInt(e.target.value) / 100
                            })}
                            required
                            className="mt-1"
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createPartnerMutation.isPending}
                        >
                          {createPartnerMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-t-2 border-solid rounded-full animate-spin mr-2"></div>
                              Creating...
                            </>
                          ) : "Create Partner Account"}
                        </Button>
                      </form>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Homepage AI Tab */}
          <TabsContent value="homepageAI">
            <HomepageAIConfig />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    Manage user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUsers ? (
                    <div className="flex justify-center p-8">
                      <div className="w-8 h-8 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
                    </div>
                  ) : usersError ? (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
                      Error loading users: {(usersError as Error).message}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {users?.map((user: User) => (
                        <Button
                          key={user.id}
                          variant={selectedUser === user.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setSelectedUser(user.id)}
                        >
                          <div className="flex items-center w-full">
                            <User className="h-4 w-4 mr-2 flex-shrink-0" />
                            <div className="truncate">
                              <span className="font-medium">{user.displayName || user.username}</span>
                              <span className="ml-2 text-xs opacity-70">{user.email}</span>
                            </div>
                            {user.is_admin && (
                              <span className="ml-auto bg-cyan-900/30 text-cyan-400 text-xs px-2 py-1 rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Details */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>User Details</CardTitle>
                  <CardDescription>
                    View and edit user information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUser ? (
                    <div className="flex justify-center p-8">
                      <div className="w-8 h-8 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
                    </div>
                  ) : selectedUser && userData ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            defaultValue={userData.username}
                            className="mt-1"
                            onChange={(e) => {
                              const value = e.target.value;
                              updateUserMutation.mutate({
                                id: userData.id,
                                data: { username: value }
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            defaultValue={userData.email}
                            className="mt-1"
                            onChange={(e) => {
                              const value = e.target.value;
                              updateUserMutation.mutate({
                                id: userData.id,
                                data: { email: value }
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="displayName">Display Name</Label>
                          <Input
                            id="displayName"
                            defaultValue={userData.displayName}
                            className="mt-1"
                            onChange={(e) => {
                              const value = e.target.value;
                              updateUserMutation.mutate({
                                id: userData.id,
                                data: { displayName: value }
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block">Admin Status</Label>
                          <div className="flex items-center">
                            <Switch
                              checked={userData.is_admin}
                              onCheckedChange={(checked) => {
                                updateUserMutation.mutate({
                                  id: userData.id,
                                  data: { is_admin: checked }
                                });
                              }}
                            />
                            <span className="ml-2">
                              {userData.is_admin ? "Admin" : "Regular User"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h3 className="text-sm font-medium mb-2">Account Information</h3>
                          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-400">ID</span>
                              <span>{userData.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Created</span>
                              <span>{formatDate(userData.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Last Login</span>
                              <span>{formatDate(userData.lastLogin)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-2">API Usage</h3>
                          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                            {userData.apiUsage?.length > 0 ? (
                              userData.apiUsage.map((usage, index) => (
                                <div key={index} className="flex justify-between">
                                  <span className="text-gray-400">{usage.service}</span>
                                  <span>{usage.total_requests} requests</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-400">No API usage data available</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsPasswordResetDialogOpen(true)}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Reset Password
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setIsDeleteDialogOpen(true)}
                          disabled={userData.is_admin} // Prevent deleting admin users
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </Button>
                      </div>

                      {/* User Agent Information */}
                      {userData.agent && (
                        <div className="mt-8">
                          <h3 className="text-lg font-medium mb-4">User Agent</h3>
                          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                            <div>
                              <Label>Agent Name</Label>
                              <Input 
                                defaultValue={userData.agent.name}
                                className="mt-1"
                                disabled
                              />
                            </div>
                            <div>
                              <Label>Status</Label>
                              <div className="flex items-center mt-1">
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  userData.agent.active ? "bg-green-500" : "bg-red-500"
                                }`}></div>
                                <span>{userData.agent.active ? "Active" : "Inactive"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Password Reset Dialog */}
                      <Dialog 
                        open={isPasswordResetDialogOpen} 
                        onOpenChange={setIsPasswordResetDialogOpen}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reset User Password</DialogTitle>
                            <DialogDescription>
                              Set a new password for {userData.displayName || userData.username}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="newPassword">New Password</Label>
                              <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                              />
                              <p className="text-sm text-gray-400">
                                Password must be at least 8 characters long.
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsPasswordResetDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => resetPasswordMutation.mutate({
                                userId: userData.id,
                                newPassword
                              })}
                              disabled={!newPassword || newPassword.length < 8}
                            >
                              Reset Password
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Delete User Confirmation */}
                      <AlertDialog 
                        open={isDeleteDialogOpen} 
                        onOpenChange={setIsDeleteDialogOpen}
                      >
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the user account for 
                              <span className="font-bold"> {userData.email}</span> and all associated data.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => deleteUserMutation.mutate(userData.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg mb-2">No User Selected</h3>
                      <p>Select a user from the list to view and edit details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>
                  View and filter system activity logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="w-48">
                    <Label htmlFor="level-filter">Level</Label>
                    <Select
                      value={logLevel || ""}
                      onValueChange={(value) => setLogLevel(value === "" ? null : value)}
                    >
                      <SelectTrigger id="level-filter" className="w-full mt-1">
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Levels</SelectItem>
                        <SelectItem value="INFO">Info</SelectItem>
                        <SelectItem value="WARNING">Warning</SelectItem>
                        <SelectItem value="ERROR">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Label htmlFor="source-filter">Source</Label>
                    <Select
                      value={logSource || ""}
                      onValueChange={(value) => setLogSource(value === "" ? null : value)}
                    >
                      <SelectTrigger id="source-filter" className="w-full mt-1">
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Sources</SelectItem>
                        <SelectItem value="Auth">Auth</SelectItem>
                        <SelectItem value="API">API</SelectItem>
                        <SelectItem value="Twilio">Twilio</SelectItem>
                        <SelectItem value="OpenAI">OpenAI</SelectItem>
                        <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
                        <SelectItem value="Agent">Agent</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label htmlFor="limit-filter">Limit</Label>
                    <Select
                      value={logsLimit.toString()}
                      onValueChange={(value) => setLogsLimit(parseInt(value))}
                    >
                      <SelectTrigger id="limit-filter" className="w-full mt-1">
                        <SelectValue placeholder="50" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end ml-auto">
                    <Button
                      variant="outline"
                      className="mb-0.5"
                      onClick={() => {
                        setLogLevel(null);
                        setLogSource(null);
                        setLogsPage(1);
                      }}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Reset Filters
                    </Button>
                  </div>
                </div>

                {/* Logs Table */}
                {isLoadingLogs ? (
                  <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
                  </div>
                ) : logsError ? (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
                    Error loading logs: {(logsError as Error).message}
                  </div>
                ) : logs && logs.logs && logs.logs.length > 0 ? (
                  <>
                    <div className="overflow-hidden rounded-lg border mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Level</TableHead>
                            <TableHead className="w-32">Source</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead className="w-48">Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  log.level === 'ERROR' ? 'bg-red-900/30 text-red-400' :
                                  log.level === 'WARNING' ? 'bg-yellow-900/30 text-yellow-400' :
                                  'bg-blue-900/30 text-blue-400'
                                }`}>
                                  {log.level}
                                </span>
                              </TableCell>
                              <TableCell>{log.source}</TableCell>
                              <TableCell className="max-w-lg break-words">{log.message}</TableCell>
                              <TableCell>{formatDate(log.timestamp)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {logs.pagination && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={() => setLogsPage(prev => Math.max(prev - 1, 1))}
                              disabled={logsPage === 1}
                              className="h-9 px-4 gap-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>Previous</span>
                            </Button>
                          </PaginationItem>
                          
                          {logs.pagination.totalPages > 0 && Array.from({ 
                            length: Math.min(5, logs.pagination.totalPages) 
                          }, (_, i) => {
                            // Show first page, current page, and adjacent pages, and last page
                            let pageToShow;
                            const totalPages = logs.pagination.totalPages || 1;
                            
                            if (totalPages <= 5) {
                              pageToShow = i + 1;
                            } else if (logsPage <= 3) {
                              pageToShow = i + 1;
                            } else if (logsPage >= totalPages - 2) {
                              pageToShow = totalPages - 4 + i;
                            } else {
                              pageToShow = logsPage - 2 + i;
                            }
                            
                            if (pageToShow > totalPages) {
                              return null;
                            }
                            
                            return (
                              <PaginationItem key={i}>
                                <Button
                                  variant={pageToShow === logsPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setLogsPage(pageToShow)}
                                  className="h-9 w-9"
                                >
                                  {pageToShow}
                                </Button>
                              </PaginationItem>
                            );
                          })}
                          
                          {logs.pagination.totalPages > 5 && logsPage < logs.pagination.totalPages - 2 && (
                            <PaginationItem>
                              <div className="h-9 flex items-center px-2">...</div>
                            </PaginationItem>
                          )}
                          
                          {logs.pagination.totalPages > 5 && logsPage < logs.pagination.totalPages - 1 && (
                            <PaginationItem>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLogsPage(logs.pagination.totalPages)}
                                className="h-9 w-9"
                              >
                                {logs.pagination.totalPages}
                              </Button>
                            </PaginationItem>
                          )}
                          
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLogsPage(prev => {
                                const totalPages = logs.pagination.totalPages || 1;
                                return Math.min(prev + 1, totalPages);
                              })}
                              disabled={logs.pagination.totalPages ? logsPage === logs.pagination.totalPages : true}
                              className="h-9 px-4 gap-1"
                            >
                              <span>Next</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg mb-2">No Logs Found</h3>
                    <p>Try adjusting your filters to see more results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Templates Tab */}
          <TabsContent value="templates">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template List */}
              <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Agent Templates</CardTitle>
                    <CardDescription>
                      Configure reusable agent templates
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(null);
                      resetTemplateForm();
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingTemplates ? (
                    <div className="flex justify-center p-8">
                      <div className="w-8 h-8 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
                    </div>
                  ) : templatesError ? (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
                      Error loading templates: {(templatesError as Error).message}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {templates?.map((template: AgentTemplate) => (
                        <Button
                          key={template.id}
                          variant={selectedTemplate === template.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <div className="flex items-center w-full">
                            <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate font-medium">{template.name}</span>
                            {template.isDefault && (
                              <span className="ml-auto bg-cyan-900/30 text-cyan-400 text-xs px-2 py-1 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                        </Button>
                      ))}

                      {templates?.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg mb-2">No Templates</h3>
                          <p>Create your first agent template</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Template Editor */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {selectedTemplate ? "Edit Template" : "Create New Template"}
                  </CardTitle>
                  <CardDescription>
                    Configure agent behavior templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6" onSubmit={(e) => {
                    e.preventDefault();
                    if (selectedTemplate) {
                      updateTemplateMutation.mutate({
                        id: selectedTemplate,
                        template: templateForm
                      });
                    } else {
                      createTemplateMutation.mutate(templateForm);
                    }
                  }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                          id="name"
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                          className="mt-1"
                          placeholder="Customer Support Agent"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={templateForm.description}
                          onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                          className="mt-1"
                          placeholder="An agent that helps with customer support questions"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="systemPrompt">System Prompt</Label>
                        <Textarea
                          id="systemPrompt"
                          value={templateForm.systemPrompt}
                          onChange={(e) => setTemplateForm({...templateForm, systemPrompt: e.target.value})}
                          className="mt-1 min-h-24"
                          placeholder="You are a helpful customer support agent..."
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="welcomeMessage">Welcome Message</Label>
                        <Textarea
                          id="welcomeMessage"
                          value={templateForm.welcomeMessage}
                          onChange={(e) => setTemplateForm({...templateForm, welcomeMessage: e.target.value})}
                          className="mt-1"
                          placeholder="Hello! This is WarmLeadNetwork AI. How can I help you today?"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="voiceId">Voice ID</Label>
                        <Input
                          id="voiceId"
                          value={templateForm.voiceId}
                          onChange={(e) => setTemplateForm({...templateForm, voiceId: e.target.value})}
                          className="mt-1"
                          placeholder="ElevenLabs Voice ID"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="modelId">Model ID</Label>
                        <Input
                          id="modelId"
                          value={templateForm.modelId}
                          onChange={(e) => setTemplateForm({...templateForm, modelId: e.target.value})}
                          className="mt-1"
                          placeholder="ElevenLabs Model ID"
                          required
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block">Default Template</Label>
                        <div className="flex items-center">
                          <Switch
                            checked={templateForm.isDefault}
                            onCheckedChange={(checked) => setTemplateForm({...templateForm, isDefault: checked})}
                          />
                          <span className="ml-2">
                            {templateForm.isDefault ? "Default template for new agents" : "Not default"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <div>
                        {selectedTemplate && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                              if (selectedTemplate) {
                                deleteTemplateMutation.mutate(selectedTemplate);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Template
                          </Button>
                        )}
                      </div>
                      <div className="space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(null);
                            resetTemplateForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {selectedTemplate ? "Update Template" : "Create Template"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Personality Prompts Tab */}
          <TabsContent value="personalities">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personality Prompts</CardTitle>
                  <CardDescription>
                    Manage AI personality prompts for your agents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <iframe 
                    src="/admin/personality-prompts" 
                    className="w-full h-[calc(100vh-240px)] border-0"
                    title="Personality Prompts Management"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Coins Tab */}
          <TabsContent value="coins">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Coin Management</CardTitle>
                  <CardDescription>
                    Add coins to user accounts or manage coin-related settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Add Coins to Users</h3>
                    <p className="text-gray-400 mb-4">
                      Manually add coins to user accounts. For bulk operations, use the dedicated tool.
                    </p>
                    <Button 
                      className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700"
                      onClick={() => {
                        navigate("/admin/coins");
                      }}
                    >
                      Open Coin Management Tool
                    </Button>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Coin Pricing</h3>
                    <p className="text-gray-400 mb-4">
                      Current coin package pricing:
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div>
                          <span className="font-medium">Small Package</span>
                          <span className="text-sm block text-gray-400">100 coins</span>
                        </div>
                        <span className="font-bold text-green-400">$4.87</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div>
                          <span className="font-medium">Medium Package</span>
                          <span className="text-sm block text-gray-400">500 coins</span>
                        </div>
                        <span className="font-bold text-green-400">$9.87</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div>
                          <span className="font-medium">Large Package</span>
                          <span className="text-sm block text-gray-400">5000 coins</span>
                        </div>
                        <span className="font-bold text-green-400">$28.87</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Coin Consumption Stats</h3>
                    <p className="text-gray-400 mb-4">
                      How coins are being used across different features:
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div>
                          <span className="font-medium">AI Image Generation</span>
                          <span className="text-sm block text-gray-400">5 coins/image</span>
                        </div>
                        <span>~45% of total usage</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div>
                          <span className="font-medium">AI Voiceover</span>
                          <span className="text-sm block text-gray-400">1 coin/word</span>
                        </div>
                        <span>~55% of total usage</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  Manage global system settings and API keys
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingConfig ? (
                  <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
                  </div>
                ) : configError ? (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
                    Error loading configuration: {(configError as Error).message}
                  </div>
                ) : editConfig ? (
                  <form 
                    className="space-y-8"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateConfigMutation.mutate(editConfig);
                    }}
                  >
                    {/* Server Settings */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Server Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="serverPort">Server Port</Label>
                          <Input
                            id="serverPort"
                            value={editConfig.serverPort}
                            onChange={(e) => setEditConfig({...editConfig, serverPort: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Twilio Settings */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Twilio Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="twilioAccountSid">Account SID</Label>
                          <Input
                            id="twilioAccountSid"
                            value={editConfig.twilioAccountSid}
                            onChange={(e) => setEditConfig({...editConfig, twilioAccountSid: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="twilioAuthToken">Auth Token</Label>
                          <Input
                            id="twilioAuthToken"
                            value={editConfig.twilioAuthToken}
                            onChange={(e) => setEditConfig({...editConfig, twilioAuthToken: e.target.value})}
                            className="mt-1"
                            type="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="twilioPhoneNumber">Phone Number</Label>
                          <Input
                            id="twilioPhoneNumber"
                            value={editConfig.twilioPhoneNumber}
                            onChange={(e) => setEditConfig({...editConfig, twilioPhoneNumber: e.target.value})}
                            className="mt-1"
                            placeholder="+12345678901"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="twilioWelcomeMessage">Welcome Message</Label>
                          <Textarea
                            id="twilioWelcomeMessage"
                            value={editConfig.twilioWelcomeMessage}
                            onChange={(e) => setEditConfig({...editConfig, twilioWelcomeMessage: e.target.value})}
                            className="mt-1"
                            placeholder="Hello, thank you for calling WarmLeadNetwork. How can I help you today?"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PayPal Settings */}
                    <div className="mb-8">
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-cyan-400" />
                        PayPal Settings
                      </h3>
                      <div className="bg-gray-800 p-6 rounded-lg mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium">PayPal Integration Status</h4>
                            <p className="text-sm text-gray-400">Test and verify your PayPal API credentials</p>
                          </div>
                          <Button 
                            onClick={testPayPalCredentials}
                            disabled={isTestingPaypal}
                            variant="outline"
                          >
                            {isTestingPaypal ? (
                              <>Testing...</>
                            ) : (
                              <>Test Credentials</>
                            )}
                          </Button>
                        </div>
                        
                        {paypalStatus && (
                          <div className={`p-4 rounded-lg ${paypalStatus.isValid ? 'bg-green-900/20 border border-green-800 text-green-400' : 'bg-red-900/20 border border-red-800 text-red-300'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {paypalStatus.isValid ? (
                                  <Check className="h-5 w-5 text-green-400" />
                                ) : (
                                  <X className="h-5 w-5 text-red-400" />
                                )}
                                <span className="font-medium">
                                  {paypalStatus.isValid ? 'PayPal Connection Successful' : 'PayPal Connection Failed'}
                                </span>
                              </div>
                              
                              {paypalStatus.details && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowPayPalDetails(!showPayPalDetails)}
                                >
                                  {showPayPalDetails ? 'Hide Details' : 'Show Details'}
                                </Button>
                              )}
                            </div>
                            
                            <p className="mt-2">{paypalStatus.message}</p>
                            
                            {showPayPalDetails && paypalStatus.details && (
                              <div className="mt-4 p-3 bg-gray-800 rounded text-xs font-mono overflow-x-auto">
                                <pre>{JSON.stringify(paypalStatus.details, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OpenAI Settings */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">OpenAI Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="openaiApiKey">API Key</Label>
                          <Input
                            id="openaiApiKey"
                            value={editConfig.openaiApiKey}
                            onChange={(e) => setEditConfig({...editConfig, openaiApiKey: e.target.value})}
                            className="mt-1"
                            type="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="openaiModel">Model</Label>
                          <Input
                            id="openaiModel"
                            value={editConfig.openaiModel}
                            onChange={(e) => setEditConfig({...editConfig, openaiModel: e.target.value})}
                            className="mt-1"
                            placeholder="gpt-4o"
                          />
                        </div>
                        <div>
                          <Label htmlFor="temperature">Temperature</Label>
                          <Input
                            id="temperature"
                            value={editConfig.temperature}
                            onChange={(e) => setEditConfig({...editConfig, temperature: parseFloat(e.target.value)})}
                            className="mt-1"
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contextWindow">Context Window</Label>
                          <Input
                            id="contextWindow"
                            value={editConfig.contextWindow}
                            onChange={(e) => setEditConfig({...editConfig, contextWindow: parseInt(e.target.value)})}
                            className="mt-1"
                            type="number"
                            min="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxTokens">Max Tokens</Label>
                          <Input
                            id="maxTokens"
                            value={editConfig.maxTokens}
                            onChange={(e) => setEditConfig({...editConfig, maxTokens: parseInt(e.target.value)})}
                            className="mt-1"
                            type="number"
                            min="1"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="systemPrompt">Default System Prompt</Label>
                          <Textarea
                            id="systemPrompt"
                            value={editConfig.systemPrompt}
                            onChange={(e) => setEditConfig({...editConfig, systemPrompt: e.target.value})}
                            className="mt-1"
                            placeholder="You are a helpful AI assistant..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* ElevenLabs Settings */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">ElevenLabs Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="elevenLabsApiKey">API Key</Label>
                          <Input
                            id="elevenLabsApiKey"
                            value={editConfig.elevenLabsApiKey}
                            onChange={(e) => setEditConfig({...editConfig, elevenLabsApiKey: e.target.value})}
                            className="mt-1"
                            type="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="elevenLabsVoiceId">Default Voice ID</Label>
                          <Input
                            id="elevenLabsVoiceId"
                            value={editConfig.elevenLabsVoiceId}
                            onChange={(e) => setEditConfig({...editConfig, elevenLabsVoiceId: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="modelId">Model ID</Label>
                          <Input
                            id="modelId"
                            value={editConfig.modelId}
                            onChange={(e) => setEditConfig({...editConfig, modelId: e.target.value})}
                            className="mt-1"
                            placeholder="eleven_monolingual_v1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="stability">Stability</Label>
                          <Input
                            id="stability"
                            value={editConfig.stability}
                            onChange={(e) => setEditConfig({...editConfig, stability: parseFloat(e.target.value)})}
                            className="mt-1"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="similarity">Similarity</Label>
                          <Input
                            id="similarity"
                            value={editConfig.similarity}
                            onChange={(e) => setEditConfig({...editConfig, similarity: parseFloat(e.target.value)})}
                            className="mt-1"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="voice_clarity">Voice Clarity</Label>
                          <Input
                            id="voice_clarity"
                            value={editConfig.voice_clarity}
                            onChange={(e) => setEditConfig({...editConfig, voice_clarity: parseFloat(e.target.value)})}
                            className="mt-1"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="voice_expressiveness">Voice Expressiveness</Label>
                          <Input
                            id="voice_expressiveness"
                            value={editConfig.voice_expressiveness}
                            onChange={(e) => setEditConfig({...editConfig, voice_expressiveness: parseFloat(e.target.value)})}
                            className="mt-1"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="voice_naturalness">Voice Naturalness</Label>
                          <Input
                            id="voice_naturalness"
                            value={editConfig.voice_naturalness}
                            onChange={(e) => setEditConfig({...editConfig, voice_naturalness: parseFloat(e.target.value)})}
                            className="mt-1"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="voice_speed">Voice Speed</Label>
                          <Input
                            id="voice_speed"
                            value={editConfig.voice_speed}
                            onChange={(e) => setEditConfig({...editConfig, voice_speed: parseFloat(e.target.value)})}
                            className="mt-1"
                            type="number"
                            step="0.1"
                            min="0.5"
                            max="2.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="voice_pitch">Voice Pitch</Label>
                          <Input
                            id="voice_pitch"
                            value={editConfig.voice_pitch}
                            onChange={(e) => setEditConfig({...editConfig, voice_pitch: parseFloat(e.target.value)})}
                            className="mt-1"
                            type="number"
                            step="0.1"
                            min="0.5"
                            max="2.0"
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block">Speaker Boost</Label>
                          <div className="flex items-center">
                            <Switch
                              checked={editConfig.speakerBoost}
                              onCheckedChange={(checked) => setEditConfig({...editConfig, speakerBoost: checked})}
                            />
                            <span className="ml-2">
                              {editConfig.speakerBoost ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        className="mr-2"
                        onClick={() => setEditConfig(systemConfig)}
                      >
                        Reset
                      </Button>
                      <Button type="submit">
                        Save Changes
                      </Button>
                    </div>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}