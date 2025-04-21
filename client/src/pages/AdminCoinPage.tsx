import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';

export default function AdminCoinPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { success: boolean; message: string; newBalance?: number }>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/admin/add-million-coins', { email });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: data.message,
          variant: "default"
        });
        setResult({
          success: true,
          message: data.message,
          newBalance: data.newBalance
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add coins",
          variant: "destructive"
        });
        setResult({
          success: false,
          message: data.error || "Failed to add coins"
        });
      }
    } catch (error) {
      console.error("Error adding coins:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      setResult({
        success: false,
        message: "An unexpected error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Add 1 Million Coins</CardTitle>
            <CardDescription>
              This is an admin tool to add 1,000,000 coins to a user account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">User Email</Label>
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="Enter user email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Add 1 Million Coins'}
                </Button>
              </div>
            </form>
          </CardContent>
          
          {result && (
            <CardFooter className={`border-t ${result.success ? 'bg-green-50' : 'bg-red-50'} p-4 rounded-b-lg`}>
              <div>
                <h3 className={`font-semibold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? 'Success!' : 'Failed'}
                </h3>
                <p className="text-sm mt-1">{result.message}</p>
                {result.success && result.newBalance !== undefined && (
                  <p className="text-sm font-medium mt-2">
                    New balance: <span className="font-bold">{result.newBalance.toLocaleString()}</span> coins
                  </p>
                )}
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}