import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { paypalService, type PayPalTransaction } from '@/lib/paypal-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Calendar, Search } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

export function PayPalTransactions() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<PayPalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // Format dates as ISO strings if they exist
      const formattedStartDate = startDate ? startDate.toISOString() : undefined;
      const formattedEndDate = endDate ? endDate.toISOString() : undefined;
      
      const data = await paypalService.getTransactions(formattedStartDate, formattedEndDate);
      setTransactions(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching PayPal transactions:', error);
      toast({
        title: 'Error',
        description: 'Could not retrieve PayPal transaction history.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Get status badge based on transaction status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Completed</span>;
      case 'PENDING':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Pending</span>;
      case 'REFUNDED':
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Refunded</span>;
      case 'FAILED':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Failed</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  // Format date in a readable way
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>PayPal Transactions</span>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={fetchTransactions} 
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
          View your recent PayPal transaction history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center">
            <span className="text-sm mr-2">From:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9">
                  <Calendar className="h-4 w-4 mr-2" />
                  {startDate ? format(startDate, 'MMM d, yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm mr-2">To:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9">
                  <Calendar className="h-4 w-4 mr-2" />
                  {endDate ? format(endDate, 'MMM d, yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            variant="secondary" 
            onClick={fetchTransactions} 
            disabled={isLoading}
            className="ml-auto"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {isLoading && transactions.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.id}</TableCell>
                    <TableCell>{formatDate(transaction.create_time)}</TableCell>
                    <TableCell>
                      {transaction.amount ? 
                        `${transaction.amount.value} ${transaction.amount.currency_code}` : 
                        'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No transactions found for the selected date range.
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