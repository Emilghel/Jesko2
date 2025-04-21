import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { paypalService } from '@/lib/paypal-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export function PayPalVerification() {
  const { toast } = useToast();
  const [transactionId, setTransactionId] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{
    verified: boolean;
    message: string;
    transaction?: any;
  } | null>(null);

  const handleVerify = async () => {
    if (!transactionId.trim()) {
      toast({
        title: 'Transaction ID Required',
        description: 'Please enter a PayPal transaction ID to verify',
        variant: 'destructive'
      });
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const verification = await paypalService.verifyPayment(transactionId);
      setResult(verification);
      
      if (verification.verified) {
        toast({
          title: 'Payment Verified',
          description: 'The PayPal payment has been successfully verified.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Payment Verification Failed',
          description: verification.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Verification Error',
        description: 'An error occurred while verifying the payment. Please try again.',
        variant: 'destructive'
      });
      console.error('Payment verification error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>PayPal Payment Verification</CardTitle>
        <CardDescription>
          Verify if a PayPal payment has been received and update its status in our system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="transaction-id">PayPal Transaction ID</Label>
            <div className="flex gap-2">
              <Input
                id="transaction-id"
                placeholder="Enter PayPal transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
              <Button onClick={handleVerify} disabled={isChecking}>
                {isChecking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify
              </Button>
            </div>
          </div>

          {result && (
            <div className={`p-4 border rounded-md ${result.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center mb-2">
                {result.verified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                )}
                <span className="font-medium">
                  {result.verified ? 'Payment Verified' : 'Verification Failed'}
                </span>
              </div>
              <p className="text-sm">{result.message}</p>
              
              {result.transaction && (
                <div className="mt-4 grid gap-1 text-sm">
                  <div className="grid grid-cols-2">
                    <span className="font-medium">Status:</span>
                    <span>{result.transaction.status}</span>
                  </div>
                  {result.transaction.amount && (
                    <div className="grid grid-cols-2">
                      <span className="font-medium">Amount:</span>
                      <span>
                        {result.transaction.amount.value} {result.transaction.amount.currency_code}
                      </span>
                    </div>
                  )}
                  {result.transaction.create_time && (
                    <div className="grid grid-cols-2">
                      <span className="font-medium">Date:</span>
                      <span>{new Date(result.transaction.create_time).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-gray-500">
          Payments usually appear in PayPal's system within minutes of being completed.
        </div>
      </CardFooter>
    </Card>
  );
}