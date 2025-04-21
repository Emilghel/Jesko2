import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function DebugAuth() {
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("admin@warmleadnetwork.com");
  const [password, setPassword] = useState("password123");
  const [result, setResult] = useState<any>(null);
  const [manualEndpoint, setManualEndpoint] = useState("");

  // Try to get server info on load
  useEffect(() => {
    fetchServerInfo();
  }, []);

  const fetchServerInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get("/api/debug/headers");
      setServerInfo(response.data);
    } catch (err: any) {
      console.error("Error fetching server info:", err);
      setError(err.message || "Failed to fetch server info");
    } finally {
      setLoading(false);
    }
  };

  const testDirectLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log("Testing direct login with:", { email, password: "***" });
      
      const endpoint = "/api/auth/login";
      console.log("Endpoint:", endpoint);
      
      const response = await axios.post(endpoint, { email, password });
      console.log("Login response:", response.data);
      
      setResult({
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers
      });
    } catch (err: any) {
      console.error("Error in direct login test:", err);
      
      setResult({
        success: false,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const testManualEndpoint = async () => {
    if (!manualEndpoint) {
      setError("Please enter an endpoint to test");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log("Testing manual endpoint:", manualEndpoint);
      
      const response = await axios.get(manualEndpoint);
      console.log("Manual endpoint response:", response.data);
      
      setResult({
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers
      });
    } catch (err: any) {
      console.error("Error in manual endpoint test:", err);
      
      setResult({
        success: false,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      setError(err.message || "Failed to call endpoint");
    } finally {
      setLoading(false);
    }
  };
  
  const testFetchLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log("Testing fetch API login with:", { email, password: "***" });
      
      const endpoint = "/api/auth/login";
      console.log("Endpoint:", endpoint);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      console.log("Fetch login response:", data);
      
      setResult({
        success: response.ok,
        data: data,
        status: response.status,
        statusText: response.statusText
      });
    } catch (err: any) {
      console.error("Error in fetch login test:", err);
      
      setResult({
        success: false,
        message: err.message
      });
      
      setError(err.message || "Failed to login with fetch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Auth Debugging Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Server Information</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading server info...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {serverInfo && (
              <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md overflow-auto max-h-64 text-xs">
                {JSON.stringify(serverInfo, null, 2)}
              </pre>
            )}
            <Button 
              className="mt-4" 
              onClick={fetchServerInfo}
              disabled={loading}
            >
              Refresh Server Info
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Direct Login Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@warmleadnetwork.com"
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
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={testDirectLogin} 
                  disabled={loading}
                  className="flex-1"
                >
                  Test Axios Login
                </Button>
                <Button 
                  onClick={testFetchLogin} 
                  disabled={loading}
                  className="flex-1"
                  variant="outline"
                >
                  Test Fetch Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Manual Endpoint Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint">API Endpoint</Label>
                <Input
                  id="endpoint"
                  value={manualEndpoint}
                  onChange={(e) => setManualEndpoint(e.target.value)}
                  placeholder="/api/debug/headers"
                />
              </div>
              
              <Button 
                onClick={testManualEndpoint} 
                disabled={loading || !manualEndpoint}
              >
                Test Endpoint
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p>Running test...</p>}
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {result && (
              <div>
                <div className="mb-4 p-3 rounded font-medium text-sm border-l-4 border-sky-500 bg-sky-500 bg-opacity-10">
                  Result: {result.success ? (
                    <span className="text-green-500 font-bold">Success!</span>
                  ) : (
                    <span className="text-red-500 font-bold">Failed!</span>
                  )}
                  {result.status && <span className="ml-2">Status: {result.status}</span>}
                  {result.message && <span className="ml-2">Message: {result.message}</span>}
                </div>
                <Separator className="my-4" />
                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md overflow-auto max-h-96 text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <p className="text-sm text-muted-foreground">
          Note: This tool is for debugging authentication issues. All API calls and responses are logged to the browser console.
        </p>
      </div>
    </div>
  );
}