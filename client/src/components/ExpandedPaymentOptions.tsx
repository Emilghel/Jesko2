import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CreditCard, DollarSign, AlertTriangle, Info, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExpandedPaymentOptionsProps {
  availableBalance: number;
  onSubmitWithdrawal?: (amount: number, method: string, details: string) => Promise<void>;
}

interface PaymentMethodOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  processingTime: string;
  minAmount: number;
  fee: string;
  placeholder: string;
  detailsLabel: string;
  infoMessage?: string;
  colors: {
    bg: string;
    accent: string;
    border: string;
    text: string;
  }
}

export default function ExpandedPaymentOptions({
  availableBalance,
  onSubmitWithdrawal
}: ExpandedPaymentOptionsProps) {
  const { toast } = useToast();
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('paypal');
  const [paymentDetails, setPaymentDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [withdrawalStage, setWithdrawalStage] = useState<number>(0);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  
  // Define payment methods
  const paymentMethods: PaymentMethodOption[] = [
    {
      id: 'paypal',
      name: 'PayPal',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.6 7.8c.4.6.5 1.3.5 2.2 0 2.4-2 5.6-5.5 5.6h-1.5c-.4 0-.8.2-1 .6l-1.1 3.4c-.2.4-.6.6-1 .6h-1.5" />
          <path d="M3.3 3.4c-.2.4-.3.8-.3 1.2 0 2.4 2 5.6 5.5 5.6h2.9"/>
          <path d="M18.2 12.1c.6 0 1.1.2 1.5.6.4.3.6.8.7 1.4 0 1.2-1 2.9-2.8 2.9h-.7c-.2 0-.4.1-.5.3l-.6 1.7c-.1.2-.3.3-.5.3h-.8"/>
          <path d="M11.1 9.5c-.1.2-.1.4-.1.6 0 1.2 1 2.9 2.8 2.9h1.5"/>
        </svg>
      ),
      processingTime: '48-72 hours',
      minAmount: 50,
      fee: '2.9% + $0.30',
      placeholder: 'your-email@example.com',
      detailsLabel: 'PayPal Email',
      infoMessage: 'PayPal is our fastest withdrawal method and generally processes within 48-72 hours.',
      colors: {
        bg: 'bg-blue-900/20',
        accent: 'bg-blue-500',
        border: 'border-blue-800/30',
        text: 'text-blue-400'
      }
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      ),
      processingTime: '3-5 business days',
      minAmount: 100,
      fee: '$15 flat fee',
      placeholder: 'Account number, routing number, bank name',
      detailsLabel: 'Bank Account Details',
      infoMessage: 'International transfers may require additional verification and take 5-7 business days.',
      colors: {
        bg: 'bg-green-900/20',
        accent: 'bg-green-500',
        border: 'border-green-800/30',
        text: 'text-green-400'
      }
    },
    {
      id: 'crypto',
      name: 'Cryptocurrency',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
        </svg>
      ),
      processingTime: '1-2 business days',
      minAmount: 75,
      fee: 'Network fee only',
      placeholder: 'Your wallet address (BTC, ETH, USDC, etc.)',
      detailsLabel: 'Wallet Address & Currency',
      infoMessage: 'Please specify which cryptocurrency you prefer (BTC, ETH, USDC) along with your wallet address.',
      colors: {
        bg: 'bg-purple-900/20',
        accent: 'bg-purple-500',
        border: 'border-purple-800/30',
        text: 'text-purple-400'
      }
    },
    {
      id: 'venmo',
      name: 'Venmo',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.5 3.5 15 10l-3.5-6.5" />
          <path d="M12.5 13.5c-1.5 2-3.5 3-5.5 3s-4-1-5-3" />
          <path d="M20 16c-1 2-4 4-8 4s-7-2-8-4" />
          <path d="M15.5 9.5c1 1.5 2 3.5 2 5.5s-1 4-3 4" />
        </svg>
      ),
      processingTime: '24-48 hours',
      minAmount: 25,
      fee: '1.9%',
      placeholder: '@username or phone number',
      detailsLabel: 'Venmo Username',
      colors: {
        bg: 'bg-pink-900/20',
        accent: 'bg-pink-500',
        border: 'border-pink-800/30',
        text: 'text-pink-400'
      }
    },
    {
      id: 'cashapp',
      name: 'Cash App',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 15h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7c0 1.1.9 2 2 2h2z" />
          <path d="M19 15v6c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2v-6" />
          <path d="M9 5v16" />
        </svg>
      ),
      processingTime: '24-48 hours',
      minAmount: 25,
      fee: '1.5%',
      placeholder: '$cashtag',
      detailsLabel: 'Cash App $Cashtag',
      colors: {
        bg: 'bg-emerald-900/20',
        accent: 'bg-emerald-500',
        border: 'border-emerald-800/30',
        text: 'text-emerald-400'
      }
    },
    {
      id: 'check',
      name: 'Check by Mail',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="16" height="13" x="4" y="7" rx="2" />
          <path d="m4 11 16 .001" />
          <path d="M8 4h10" />
          <path d="M17 4v4" />
          <path d="M9 4v4" />
          <path d="m15 18-3-3-3 3" />
        </svg>
      ),
      processingTime: '7-14 business days',
      minAmount: 200,
      fee: '$5 flat fee',
      placeholder: 'Full mailing address',
      detailsLabel: 'Mailing Address',
      infoMessage: 'Checks will be mailed via USPS First Class Mail. Delivery times may vary based on location.',
      colors: {
        bg: 'bg-amber-900/20',
        accent: 'bg-amber-500',
        border: 'border-amber-800/30',
        text: 'text-amber-400'
      }
    }
  ];
  
  // Get current payment method details
  const currentMethod = paymentMethods.find(method => method.id === selectedMethod) || paymentMethods[0];
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
      
      if (amount < currentMethod.minAmount) {
        toast({
          title: "Amount too low",
          description: `Minimum withdrawal for ${currentMethod.name} is ${formatCurrency(currentMethod.minAmount)}`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      if (!paymentDetails.trim()) {
        toast({
          title: "Missing payment details",
          description: `Please enter your ${currentMethod.detailsLabel}`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Progress through withdrawal stages with realistic timing
      setTimeout(() => {
        setWithdrawalStage(2);
        
        // Simulate API request or use the provided callback
        setTimeout(async () => {
          try {
            if (onSubmitWithdrawal) {
              await onSubmitWithdrawal(amount, selectedMethod, paymentDetails);
            } else {
              // Simulate successful API request
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            setWithdrawalStage(3);
            
            // Show success notification after a brief delay
            setTimeout(() => {
              setIsSubmitting(false);
              setWithdrawalDialogOpen(false);
              
              toast({
                title: "Withdrawal request submitted",
                description: `Your ${currentMethod.name} withdrawal request for ${formatCurrency(amount)} has been submitted and is being processed.`,
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
  
  // Calculate fee based on current method and amount
  const calculateFee = (method: PaymentMethodOption, amount: number): number => {
    if (method.fee.includes('%')) {
      const percentageMatch = method.fee.match(/(\d+\.?\d*)%/);
      if (percentageMatch) {
        const percentage = parseFloat(percentageMatch[1]);
        const flatFeeMatch = method.fee.match(/\$(\d+\.?\d*)/);
        const flatFee = flatFeeMatch ? parseFloat(flatFeeMatch[1]) : 0;
        return (amount * (percentage / 100)) + flatFee;
      }
    } else if (method.fee.includes('$')) {
      const flatFeeMatch = method.fee.match(/\$(\d+\.?\d*)/);
      if (flatFeeMatch) {
        return parseFloat(flatFeeMatch[1]);
      }
    }
    return 0;
  };
  
  // Calculate estimated amount after fees
  const amountAfterFees = (): number => {
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount)) return 0;
    
    const fee = calculateFee(currentMethod, amount);
    return Math.max(0, amount - fee);
  };

  return (
    <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
          style={{ 
            background: 'rgba(20, 20, 30, 0.7)', 
            boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
          }}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
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
          <span>Payment Withdrawal</span>
        </CardTitle>
        <CardDescription>
          Withdraw your commission using your preferred payment method
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-gray-900/50 border border-gray-800/50 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-400" />
                  Available Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white mb-2" style={{ textShadow: '0 0 10px rgba(52, 211, 153, 0.5)' }}>
                  {formatCurrency(availableBalance)}
                </p>
                <p className="text-xs text-gray-400">Available for withdrawal</p>
              </CardContent>
              <CardFooter className="bg-gray-800/30 pt-2 pb-2">
                <Button
                  className="w-full group transition-all duration-300"
                  disabled={availableBalance <= 0}
                  onClick={() => setWithdrawalDialogOpen(true)}
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
              </CardFooter>
            </Card>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col bg-gray-900/50 border border-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Payment Methods</div>
                <div className="text-xl font-bold text-white">{paymentMethods.length}</div>
                <div className="text-xs text-gray-500 mt-1">Available options</div>
              </div>
              
              <div className="flex flex-col bg-gray-900/50 border border-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Fastest Method</div>
                <div className="text-xl font-bold text-white">PayPal</div>
                <div className="text-xs text-gray-500 mt-1">48-72 hours</div>
              </div>
              
              <div className="flex flex-col bg-gray-900/50 border border-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Lowest Fee</div>
                <div className="text-xl font-bold text-white">Crypto</div>
                <div className="text-xs text-gray-500 mt-1">Network fee only</div>
              </div>
              
              <div className="flex flex-col bg-gray-900/50 border border-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Lowest Minimum</div>
                <div className="text-xl font-bold text-white">$25</div>
                <div className="text-xs text-gray-500 mt-1">Venmo, Cash App</div>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="quick-access" className="w-full">
            <TabsList className="bg-gray-900/80 border border-gray-700 mb-6">
              <TabsTrigger value="quick-access" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-400">
                Popular Methods
              </TabsTrigger>
              <TabsTrigger value="all-methods" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
                All Payment Methods
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="quick-access">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentMethods.slice(0, 3).map((method) => (
                  <Card 
                    key={method.id}
                    className={`border ${method.colors.border} ${method.colors.bg} overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                      selectedMethod === method.id ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedMethod(method.id);
                      setWithdrawalDialogOpen(true);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-lg flex items-center ${method.colors.text}`}>
                        <div className="mr-2">{method.icon}</div>
                        {method.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Processing:</span>
                          <span className="text-sm text-gray-300">{method.processingTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Minimum:</span>
                          <span className="text-sm text-gray-300">${method.minAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Fee:</span>
                          <span className="text-sm text-gray-300">{method.fee}</span>
                        </div>
                      </div>
                    </CardContent>
                    <div className={`h-1 mt-2 ${method.colors.accent}`}></div>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="all-methods">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentMethods.map((method) => (
                  <Card 
                    key={method.id}
                    className={`border ${method.colors.border} ${method.colors.bg} overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                      selectedMethod === method.id ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedMethod(method.id);
                      setWithdrawalDialogOpen(true);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-lg flex items-center ${method.colors.text}`}>
                        <div className="mr-2">{method.icon}</div>
                        {method.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Processing:</span>
                          <span className="text-sm text-gray-300">{method.processingTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Minimum:</span>
                          <span className="text-sm text-gray-300">${method.minAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Fee:</span>
                          <span className="text-sm text-gray-300">{method.fee}</span>
                        </div>
                      </div>
                    </CardContent>
                    <div className={`h-1 mt-2 ${method.colors.accent}`}></div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-800">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${currentMethod.colors.bg}`}>
                  {currentMethod.icon}
                </div>
                <span>{currentMethod.name} Withdrawal</span>
              </DialogTitle>
              <DialogDescription>
                Request a withdrawal to your {currentMethod.name} account. Processing usually takes {currentMethod.processingTime}.
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
                      min={currentMethod.minAmount}
                      step="0.01"
                      max={availableBalance}
                      placeholder="0.00"
                      className="pl-9 bg-gray-800 border-gray-700"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-gray-400 flex justify-between">
                    <span>Min: ${currentMethod.minAmount.toFixed(2)}</span>
                    <span>Available: {formatCurrency(availableBalance)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment-method">{currentMethod.detailsLabel}</Label>
                  <Input
                    id="payment-details"
                    placeholder={currentMethod.placeholder}
                    className="bg-gray-800 border-gray-700"
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                  />
                </div>
                
                {currentMethod.infoMessage && (
                  <div className={`rounded-md ${currentMethod.colors.bg} p-3 text-sm ${currentMethod.colors.text} border ${currentMethod.colors.border}`}>
                    <Info className="h-4 w-4 inline-block mr-2" />
                    {currentMethod.infoMessage}
                  </div>
                )}
                
                {parseFloat(withdrawalAmount) > 0 && (
                  <div className="rounded-md bg-gray-800/50 p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Withdrawal amount:</span>
                      <span className="text-white">{formatCurrency(parseFloat(withdrawalAmount) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Fee ({currentMethod.fee}):</span>
                      <span className="text-red-400">-{formatCurrency(calculateFee(currentMethod, parseFloat(withdrawalAmount) || 0))}</span>
                    </div>
                    <Separator className="my-2 bg-gray-700" />
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-300">You will receive:</span>
                      <span className="text-green-400">{formatCurrency(amountAfterFees())}</span>
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button
                    variant="link"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="text-xs text-gray-400 p-0 h-auto"
                  >
                    {showAdvancedOptions ? 'Hide' : 'Show'} advanced options
                  </Button>
                  
                  {showAdvancedOptions && (
                    <div className="mt-3 space-y-3 rounded-md bg-gray-800/50 p-3">
                      <div className="space-y-1">
                        <Label htmlFor="memo" className="text-sm">Memo (Optional)</Label>
                        <Input
                          id="memo"
                          placeholder="Add a note to this withdrawal"
                          className="bg-gray-800 border-gray-700 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-sm">Priority Processing</Label>
                        <RadioGroup defaultValue="standard">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="standard" id="standard" />
                            <Label htmlFor="standard" className="text-sm">Standard (Free)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="priority" id="priority" />
                            <Label htmlFor="priority" className="text-sm">Priority (+$5.00, 24h faster)</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      <div className="rounded-md bg-amber-900/20 p-2 text-xs text-amber-400 border border-amber-800/30 flex items-start">
                        <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                        <span>Priority processing is subject to availability and not guaranteed for all payment methods.</span>
                      </div>
                    </div>
                  )}
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
                    <p className="text-gray-400 text-sm mt-2">We're processing your {currentMethod.name} withdrawal request</p>
                  </div>
                )}
                
                {withdrawalStage === 3 && (
                  <div className="text-center">
                    <CheckCircle className="inline-block w-8 h-8 text-green-400 mb-4" />
                    <h3 className="text-lg font-medium">Withdrawal submitted</h3>
                    <p className="text-gray-400 text-sm mt-2">Your withdrawal request has been submitted successfully</p>
                    <p className="text-gray-400 text-xs mt-2">Processing time: {currentMethod.processingTime}</p>
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
                    disabled={
                      !withdrawalAmount || 
                      isNaN(parseFloat(withdrawalAmount)) || 
                      parseFloat(withdrawalAmount) <= 0 || 
                      parseFloat(withdrawalAmount) > availableBalance ||
                      parseFloat(withdrawalAmount) < currentMethod.minAmount ||
                      !paymentDetails.trim()
                    }
                    className={`${currentMethod.colors.bg} border ${currentMethod.colors.border} ${currentMethod.colors.text} hover:bg-opacity-70`}
                  >
                    Confirm {currentMethod.name} Withdrawal
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}