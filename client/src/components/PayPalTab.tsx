import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayPalBalance } from '@/components/PayPalBalance';
import { PayPalTransactions } from '@/components/PayPalTransactions';
import { PayPalVerification } from '@/components/PayPalVerification';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { check_secrets } from '@/lib/ajax';

export default function PayPalTab() {
  const [hasPayPalCredentials, setHasPayPalCredentials] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkCredentials = async () => {
      try {
        const result = await check_secrets(['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET']);
        setHasPayPalCredentials(result.every(secret => secret.exists));
      } catch (error) {
        console.error('Error checking PayPal credentials:', error);
        setHasPayPalCredentials(false);
      }
    };
    
    checkCredentials();
  }, []);

  if (hasPayPalCredentials === false) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>PayPal Integration Not Available</AlertTitle>
        <AlertDescription>
          The PayPal integration is not available because the required credentials are missing.
          Please contact the system administrator to set up the PayPal integration.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">PayPal Integration</h2>
      <p className="text-muted-foreground">
        View and manage your PayPal payments, transactions, and balance information.
      </p>
      
      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="balance">Account Balance</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="verification">Payment Verification</TabsTrigger>
        </TabsList>
        
        <TabsContent value="balance" className="mt-6">
          <PayPalBalance />
        </TabsContent>
        
        <TabsContent value="transactions" className="mt-6">
          <PayPalTransactions />
        </TabsContent>
        
        <TabsContent value="verification" className="mt-6">
          <PayPalVerification />
        </TabsContent>
      </Tabs>
      
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800 space-y-2">
        <p className="font-medium">Important Information About PayPal Integration</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Payments may take up to 24 hours to appear in the transactions list.</li>
          <li>Commission payments are processed within 48-72 business hours after verification.</li>
          <li>For payment issues, please contact support with the transaction ID.</li>
          <li>All PayPal transactions are securely processed through PayPal's official API.</li>
        </ul>
      </div>
    </div>
  );
}