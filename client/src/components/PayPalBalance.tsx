import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { paypalService } from '@/lib/paypal-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';

export function PayPalBalance() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<{
    available: { currency: string; value: string }[];
    pending: { currency: string; value: string }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBalance = async () => {
    setIsLoading(true);
    try {
      const data = await paypalService.getBalance();
      setBalance(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching PayPal balance:', error);
      toast({
        title: 'Error',
        description: 'Could not retrieve PayPal balance information.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>PayPal Balance</span>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={fetchBalance} 
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
        </CardTitle>
        <CardDescription>
          View your current PayPal account balance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && !balance ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : balance ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Available Balance</h3>
              {balance.available.length > 0 ? (
                <div className="grid gap-2">
                  {balance.available.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                      <span className="font-medium">{item.currency}</span>
                      <span className="text-lg font-bold text-green-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  No available funds.
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Pending Balance</h3>
              {balance.pending.length > 0 ? (
                <div className="grid gap-2">
                  {balance.pending.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-amber-50 rounded-md">
                      <span className="font-medium">{item.currency}</span>
                      <span className="text-lg font-bold text-amber-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  No pending funds.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Could not retrieve balance information.
            <Button variant="link" onClick={fetchBalance} disabled={isLoading}>
              Try again
            </Button>
          </div>
        )}
      </CardContent>
      {lastUpdated && (
        <CardFooter className="text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleString()}
        </CardFooter>
      )}
    </Card>
  );
}