import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, AlertCircle, CheckCircle, Clock, CreditCard, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';

interface CommissionWithdrawalProps {
  availableBalance: number;
  pendingBalance: number;
  paymentHistory: PaymentHistoryItem[];
}

interface PaymentHistoryItem {
  id: number;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  payment_method: string;
  transaction_id?: string;
}

export default function CommissionWithdrawal({ 
  availableBalance,
  pendingBalance,
  paymentHistory = []
}: CommissionWithdrawalProps) {
  const { toast } = useToast();
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('paypal');
  const [paymentDetails, setPaymentDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [withdrawalStage, setWithdrawalStage] = useState<number>(0);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState<boolean>(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Handle withdrawal submission
  const handleWithdrawalSubmit = async () => {
    try {
      setIsSubmitting(true);
      setWithdrawalStage(1);

      // Validation checks
      const amount = parseFloat(withdrawalAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid withdrawal amount",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      if (amount > availableBalance) {
        toast({
          title: "Insufficient funds",
          description: "Withdrawal amount exceeds your available balance",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      if (!paymentDetails.trim()) {
        toast({
          title: "Missing payment details",
          description: `Please enter your ${paymentMethod === 'paypal' ? 'PayPal email' : 'bank account details'}`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Progress through withdrawal stages with realistic timing
      setTimeout(() => {
        setWithdrawalStage(2);
        
        // Simulate API request
        setTimeout(async () => {
          try {
            // Make the actual API request to request withdrawal
            const response = await apiRequest('POST', '/api/partner/withdrawal', {
              amount,
              payment_method: paymentMethod,
              payment_details: paymentDetails
            });
            
            setWithdrawalStage(3);
            
            // Show success notification after a brief delay
            setTimeout(() => {
              setIsSubmitting(false);
              setWithdrawalDialogOpen(false);
              
              toast({
                title: "Withdrawal request submitted",
                description: `Your withdrawal request for ${formatCurrency(amount)} has been submitted and is being processed.`,
                variant: "default",
              });
              
              // Reset form
              setWithdrawalAmount('');
              setPaymentDetails('');
              setWithdrawalStage(0);
            }, 1000);
            
          } catch (error) {
            console.error('Withdrawal request failed:', error);
            setWithdrawalStage(4); // Error stage
            
            setTimeout(() => {
              setIsSubmitting(false);
              toast({
                title: "Withdrawal request failed",
                description: "There was an error processing your withdrawal. Please try again or contact support.",
                variant: "destructive"
              });
              setWithdrawalStage(0);
            }, 1000);
          }
        }, 1500);
      }, 1000);
      
    } catch (error) {
      console.error('Withdrawal form submission error:', error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance and Withdrawal Card */}
      <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
            style={{ 
              background: 'rgba(20, 20, 30, 0.7)', 
              boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
            }}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-300"></div>
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-opacity-20 mr-3" 
                style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  animation: 'iconFloat 3s ease-in-out infinite',
                  boxShadow: '0 0 15px 5px rgba(16, 185, 129, 0.3)'
                }}>
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <span>Commission Withdrawal</span>
          </CardTitle>
          <CardDescription>
            Withdraw your earned commissions to your preferred payment method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-xl p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 flex flex-col">
              <div className="text-sm text-gray-400 mb-2">Available Balance</div>
              <div className="text-3xl font-bold text-white mb-2" style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}>
                {formatCurrency(availableBalance)}
              </div>
              <div className="mt-auto">
                <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full mt-4 group transition-all duration-300"
                      disabled={availableBalance <= 0}
                      style={{ 
                        background: availableBalance > 0 
                          ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.8) 0%, rgba(5, 150, 105, 0.8) 100%)' 
                          : undefined,
                        boxShadow: availableBalance > 0 ? '0 0 10px rgba(16, 185, 129, 0.5)' : undefined
                      }}
                    >
                      <span className="mr-2">Withdraw Funds</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-800">
                    <DialogHeader>
                      <DialogTitle>Withdraw Commission</DialogTitle>
                      <DialogDescription>
                        Request a withdrawal of your available commission balance. Processing usually takes 3-5 business days.
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!isSubmitting ? (
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Withdrawal Amount</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="amount"
                              type="number"
                              min="1"
                              step="0.01"
                              max={availableBalance}
                              placeholder="0.00"
                              className="pl-9 bg-gray-800 border-gray-700"
                              value={withdrawalAmount}
                              onChange={(e) => setWithdrawalAmount(e.target.value)}
                            />
                          </div>
                          <div className="text-xs text-gray-400 flex justify-between">
                            <span>Min: $50.00</span>
                            <span>Available: {formatCurrency(availableBalance)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="payment-method">Payment Method</Label>
                          <Select 
                            value={paymentMethod} 
                            onValueChange={setPaymentMethod}
                            defaultValue="paypal"
                          >
                            <SelectTrigger className="bg-gray-800 border-gray-700">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="paypal" className="flex items-center">
                                <div className="bg-blue-900/30 text-blue-300 p-1 rounded mr-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.6 7.8c.4.6.5 1.3.5 2.2 0 2.4-2 5.6-5.5 5.6h-1.5c-.4 0-.8.2-1 .6l-1.1 3.4c-.2.4-.6.6-1 .6h-1.5" />
                                    <path d="M3.3 3.4c-.2.4-.3.8-.3 1.2 0 2.4 2 5.6 5.5 5.6h2.9"/>
                                    <path d="M18.2 12.1c.6 0 1.1.2 1.5.6.4.3.6.8.7 1.4 0 1.2-1 2.9-2.8 2.9h-.7c-.2 0-.4.1-.5.3l-.6 1.7c-.1.2-.3.3-.5.3h-.8"/>
                                    <path d="M11.1 9.5c-.1.2-.1.4-.1.6 0 1.2 1 2.9 2.8 2.9h1.5"/>
                                  </svg>
                                </div>
                                PayPal <span className="ml-2 text-xs text-blue-300">(Fastest: 48-72h)</span>
                              </SelectItem>
                              <SelectItem value="bank">Bank Transfer</SelectItem>
                              <SelectItem value="crypto">Cryptocurrency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="payment-details">
                            {paymentMethod === 'paypal' ? 'PayPal Email' : 
                             paymentMethod === 'bank' ? 'Bank Account Details' :
                             'Wallet Address'}
                          </Label>
                          <Input
                            id="payment-details"
                            placeholder={
                              paymentMethod === 'paypal' ? 'your-email@example.com' : 
                              paymentMethod === 'bank' ? 'Account number, routing number, etc.' :
                              'Your wallet address'
                            }
                            className="bg-gray-800 border-gray-700"
                            value={paymentDetails}
                            onChange={(e) => setPaymentDetails(e.target.value)}
                          />
                        </div>
                        
                        <div className="rounded-md bg-blue-900/20 p-3 text-sm text-blue-300 border border-blue-800 mt-4">
                          <AlertCircle className="h-4 w-4 inline-block mr-2" />
                          {paymentMethod === 'paypal' 
                            ? 'PayPal withdrawals are processed within 48-72 hours. A minimum withdrawal amount of $50 is required.'
                            : 'Withdrawals are processed within 3-5 business days. A minimum withdrawal amount of $50 is required.'}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 px-2">
                        <div className="mb-6">
                          <Progress value={(withdrawalStage / 3) * 100} className="h-2 bg-gray-800" />
                        </div>
                        
                        {withdrawalStage === 1 && (
                          <div className="text-center">
                            <div className="animate-spin inline-block w-8 h-8 border-2 border-current border-t-transparent text-blue-400 rounded-full mb-4"></div>
                            <h3 className="text-lg font-medium">Validating your request</h3>
                            <p className="text-gray-400 text-sm mt-2">Please wait while we validate your withdrawal details</p>
                          </div>
                        )}
                        
                        {withdrawalStage === 2 && (
                          <div className="text-center">
                            <div className="animate-spin inline-block w-8 h-8 border-2 border-current border-t-transparent text-amber-400 rounded-full mb-4"></div>
                            <h3 className="text-lg font-medium">Processing withdrawal</h3>
                            <p className="text-gray-400 text-sm mt-2">We're processing your withdrawal request</p>
                          </div>
                        )}
                        
                        {withdrawalStage === 3 && (
                          <div className="text-center">
                            <CheckCircle className="inline-block w-8 h-8 text-green-400 mb-4" />
                            <h3 className="text-lg font-medium">Withdrawal submitted</h3>
                            <p className="text-gray-400 text-sm mt-2">Your withdrawal request has been submitted successfully</p>
                          </div>
                        )}
                        
                        {withdrawalStage === 4 && (
                          <div className="text-center">
                            <AlertCircle className="inline-block w-8 h-8 text-red-400 mb-4" />
                            <h3 className="text-lg font-medium">Error processing withdrawal</h3>
                            <p className="text-gray-400 text-sm mt-2">We encountered an error. Please try again.</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <DialogFooter>
                      {!isSubmitting && (
                        <>
                          <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)} className="bg-transparent text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-white">
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleWithdrawalSubmit} 
                            disabled={!withdrawalAmount || isNaN(parseFloat(withdrawalAmount)) || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > availableBalance}
                            style={{ 
                              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.8) 0%, rgba(5, 150, 105, 0.8) 100%)',
                              boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                            }}
                          >
                            Confirm Withdrawal
                          </Button>
                        </>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <div className="rounded-xl p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 flex flex-col">
              <div className="text-sm text-gray-400 mb-2">Pending Withdrawals</div>
              <div className="text-3xl font-bold text-amber-400 mb-2" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}>
                {formatCurrency(pendingBalance)}
              </div>
              <div className="text-sm text-gray-400 mt-2 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-amber-400" />
                <span>PayPal processing: 48-72 hours</span>
              </div>
              <div className="text-sm text-gray-400 mt-1 flex items-center pl-6">
                <span>Other methods: 3-5 business days</span>
              </div>
              <div className="mt-auto">
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-amber-800/30 bg-amber-900/20 text-amber-400 hover:bg-amber-900/30"
                  disabled={pendingBalance <= 0}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  View Pending Withdrawals
                </Button>
              </div>
            </div>
          </div>
          
          <Separator className="my-6 bg-gray-700/50" />
          
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Payment History</h3>
            {paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-700/50 bg-gray-800/30"
                  >
                    <div className="flex items-center">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center mr-4
                        ${payment.status === 'completed' ? 'bg-green-900/30 text-green-400' : 
                          payment.status === 'pending' ? 'bg-amber-900/30 text-amber-400' : 
                          'bg-red-900/30 text-red-400'}
                      `}>
                        {payment.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : payment.status === 'pending' ? (
                          <Clock className="h-5 w-5" />
                        ) : (
                          <AlertCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {payment.status === 'completed' ? 'Payment Completed' : 
                           payment.status === 'pending' ? 'Payment Processing' : 
                           'Payment Failed'}
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatDate(payment.created_at)} • {payment.payment_method === 'paypal' ? 'PayPal' : 
                                                              payment.payment_method === 'bank' ? 'Bank Transfer' : 
                                                              'Cryptocurrency'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        payment.status === 'completed' ? 'text-green-400' : 
                        payment.status === 'pending' ? 'text-amber-400' : 
                        'text-red-400'
                      }`}>
                        {formatCurrency(payment.amount)}
                      </div>
                      {payment.transaction_id && (
                        <div className="text-xs text-gray-400 font-mono mt-1">
                          ID: {payment.transaction_id.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-6 rounded-lg" 
                   style={{ 
                     background: 'rgba(10, 10, 20, 0.5)',
                     boxShadow: 'inset 0 0 20px rgba(51, 195, 189, 0.1)'
                   }}>
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-60" />
                <p className="text-gray-300 text-lg">No payment history yet</p>
                <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto">
                  When you make withdrawals, they will appear here
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}