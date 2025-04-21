import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Settings,
  AreaChart,
  FileText,
  Server,
  Coins,
  Search,
  RefreshCcw,
  Database,
  Shield,
  Activity,
  Zap
} from "lucide-react";
import AccessDenied from "./AccessDenied";

// Types
interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastLogin: string;
  is_admin: boolean;
  token?: string;
  expiresAt?: string;
  coins?: number;
}

interface SystemStatus {
  dbConnected: boolean;
  timeCheck: {
    time: string;
    database: string;
  };
  schemaExists: boolean;
  userCount: number;
  timestamp: string;
}

export default function AdminPanel1() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Check if user is authorized
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  // Fetch system status
  const { 
    data: systemStatus,
    isLoading: isLoadingStatus,
    error: statusError
  } = useQuery<SystemStatus>({
    queryKey: ['/api/admin/system-status'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/system-status');
        return response as SystemStatus;
      } catch (error) {
        console.error('Error fetching system status:', error);
        return {
          dbConnected: false,
          timeCheck: { time: '-', database: '-' },
          schemaExists: false,
          userCount: 0,
          timestamp: new Date().toISOString()
        } as SystemStatus;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch users
  const { 
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/users');
        if (Array.isArray(response)) {
          return response as User[];
        } else {
          console.error('Expected users array but got:', response);
          return [] as User[];
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        return [] as User[];
      }
    },
  });

  // Filter users by search term
  const filteredUsers = users ? users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  // Format date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-4 border-primary border-solid rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }
  
  // Show access denied if not admin
  if (user && !user.is_admin) {
    return <AccessDenied />;
  }
  
  // Only show content if user is admin
  if (user?.is_admin) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Admin Panel 1</h1>
              <p className="text-muted-foreground mt-1">Secure administrator control panel</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 px-4 py-2 rounded-full flex items-center">
                <Shield className="h-5 w-5 text-primary mr-2" />
                <span className="font-medium">Admin: {user.displayName || user.username}</span>
              </div>
              <Button variant="outline" onClick={() => navigate("/")}>
                Return to Home
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-8">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <AreaChart className="h-4 w-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>User Management</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span>System</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Activity Logs</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {systemStatus?.userCount || users?.length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isLoadingUsers ? 'Loading...' : 'Registered accounts'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Database Status</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {systemStatus?.dbConnected ? (
                        <span className="text-green-500">Connected</span>
                      ) : (
                        <span className="text-red-500">Disconnected</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {systemStatus?.timeCheck?.database || 'Database name unavailable'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">System Time</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatDate(systemStatus?.timestamp || new Date().toISOString())}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Current server time
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button 
                      variant="secondary" 
                      className="h-20 flex flex-col"
                      onClick={() => setActiveTab("users")}
                    >
                      <Users className="h-5 w-5 mb-1" />
                      <span>Manage Users</span>
                    </Button>
                    <Button 
                      variant="secondary"
                      className="h-20 flex flex-col"
                      onClick={() => navigate("/admin/coins")}
                    >
                      <Coins className="h-5 w-5 mb-1" />
                      <span>Manage Coins</span>
                    </Button>
                    <Button 
                      variant="secondary"
                      className="h-20 flex flex-col"
                      onClick={() => setActiveTab("system")}
                    >
                      <Settings className="h-5 w-5 mb-1" />
                      <span>System Settings</span>
                    </Button>
                    <Button 
                      variant="secondary"
                      className="h-20 flex flex-col"
                      onClick={() => setActiveTab("logs")}
                    >
                      <FileText className="h-5 w-5 mb-1" />
                      <span>View Logs</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <div className="text-sm text-muted-foreground">
                <p>Last refreshed: {formatDate(new Date().toISOString())}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>User Management</span>
                    <div className="flex gap-2">
                      <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          refetchUsers();
                          toast({
                            title: "Users refreshed",
                            description: "User list has been updated.",
                          });
                        }}
                        disabled={isLoadingUsers}
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingUsers ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="w-8 h-8 border-t-2 border-primary border-solid rounded-full animate-spin"></div>
                    </div>
                  ) : usersError ? (
                    <div className="text-center text-destructive h-64 flex items-center justify-center">
                      <div>
                        <p>Error loading users.</p>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => refetchUsers()}
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Admin</TableHead>
                            <TableHead>Coins</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Last Login</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center h-32">
                                {searchTerm ? (
                                  <div>
                                    <p>No users matching "{searchTerm}"</p>
                                    <Button 
                                      variant="link" 
                                      onClick={() => setSearchTerm("")}
                                    >
                                      Clear search
                                    </Button>
                                  </div>
                                ) : (
                                  <p>No users found</p>
                                )}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>{user.id}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  {user.is_admin ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                      Yes
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                      No
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>{user.coins || 0}</TableCell>
                                <TableCell>{formatDate(user.createdAt)}</TableCell>
                                <TableCell>{formatDate(user.lastLogin)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="database">Database</Label>
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border">
                        <span className={`w-3 h-3 rounded-full ${systemStatus?.dbConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span>{systemStatus?.dbConnected ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dbName">Database Name</Label>
                      <div className="h-10 px-3 rounded-md border flex items-center">
                        {systemStatus?.timeCheck?.database || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="schemaStatus">Schema Status</Label>
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border">
                        <span className={`w-3 h-3 rounded-full ${systemStatus?.schemaExists ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        <span>{systemStatus?.schemaExists ? 'Schema Exists' : 'Schema Missing'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="serverTime">Server Time</Label>
                      <div className="h-10 px-3 rounded-md border flex items-center">
                        {systemStatus?.timeCheck?.time || new Date().toISOString()}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full mt-4"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-status'] });
                      toast({
                        title: "System status refreshed",
                        description: "System information has been updated."
                      });
                    }}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh System Status
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quick Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="h-16 justify-start">
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Restart Services
                    </Button>
                    <Button variant="outline" className="h-16 justify-start">
                      <Database className="h-4 w-4 mr-2" />
                      Database Backup
                    </Button>
                    <Button variant="outline" className="h-16 justify-start">
                      <Zap className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="logs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 border rounded-md">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Log Viewer Coming Soon</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This feature is currently under development.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  
  // Fallback (should never reach this due to the redirects above)
  return null;
}