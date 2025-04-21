import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, Search, MapPin, Check, X, CreditCard, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

interface PhoneNumber {
  phoneNumber: string;
  formattedNumber: string;
  locality: string;
  region: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  price: number;
  purchasedData?: PurchasedPhoneNumber; // Optional field for converted purchased numbers
}

interface PurchasedPhoneNumber {
  id: number;
  user_id: number;
  phone_number: string;
  friendly_name: string | null;
  phone_sid: string | null;
  is_active: boolean;
  purchase_date: string;
  monthly_cost: number;
  capabilities: string;
  assigned_to_agent_id: number | null;
  region: string | null;
  country_code: string;
}

interface PhoneNumberPurchaseProps {
  onSelectPhoneNumber?: (phoneNumber: PhoneNumber | PurchasedPhoneNumber) => void;
}

export default function PhoneNumberPurchase({ onSelectPhoneNumber }: PhoneNumberPurchaseProps = {}) {
  const [areaCode, setAreaCode] = useState<string>('');
  const [country, setCountry] = useState<string>('US');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Query user's purchased phone numbers
  const { 
    data: purchasedNumbers = [], 
    isLoading: isPurchasedLoading 
  } = useQuery<PurchasedPhoneNumber[]>({
    queryKey: ['/api/user/phone-numbers'],
    queryFn: async () => {
      // Get auth token from multiple sources
      let authToken = localStorage.getItem('auth_token');
      
      // If no token in localStorage, try to get it from cookie
      if (!authToken) {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        
        authToken = cookies['auth_token'];
        if (authToken) {
          console.log('Found auth token in cookie for purchased numbers query');
        }
      }
      
      const res = await fetch('/api/user/phone-numbers', {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        credentials: 'include', // Include cookies in the request
      });
      
      console.log(`Purchased phone numbers API response status: ${res.status}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error fetching purchased phone numbers:', errorData);
        
        // For development mode, return empty array to avoid breaking the UI
        if (process.env.NODE_ENV === 'development' && (res.status === 401 || res.status === 403)) {
          console.log('Using empty purchased phone numbers array for development');
          return [];
        }
        
        throw new Error(errorData.message || errorData.error || 'Failed to fetch purchased phone numbers');
      }
      
      const data = await res.json();
      console.log(`Received ${data.length} purchased phone numbers from API`);
      return data;
    },
    retry: 1,
  });

  // Query available phone numbers
  const { 
    data: availableNumbers = [], 
    isLoading, 
    refetch,
    isRefetching,
    error 
  } = useQuery<PhoneNumber[]>({
    queryKey: ['/api/phone-numbers/available', areaCode, country],
    queryFn: async () => {
      setIsSearching(true);
      try {
        const queryParams = new URLSearchParams();
        if (areaCode) queryParams.append('areaCode', areaCode);
        if (country) queryParams.append('country', country);
        
        console.log(`Fetching phone numbers with params: ${queryParams.toString()}`);
        
        // Get auth token from multiple sources
        let authToken = localStorage.getItem('auth_token');
        
        // If no token in localStorage, try to get it from cookie
        if (!authToken) {
          const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
          }, {} as Record<string, string>);
          
          authToken = cookies['auth_token'];
          
          if (authToken) {
            console.log('Found auth token in cookie');
          }
        }
        
        if (!authToken) {
          console.warn('No auth token found in localStorage or cookie');
        } else {
          console.log(`Using auth token: ${authToken.substring(0, 10)}...`);
        }
        
        const res = await fetch(`/api/phone-numbers/available?${queryParams.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
          },
          credentials: 'include' // Include cookies in the request
        });
        
        console.log(`API response status: ${res.status}`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Error fetching phone numbers:', errorData);
          
          // For development mode, authentication failed - return an empty array
          if (process.env.NODE_ENV === 'development' && (res.status === 401 || res.status === 403)) {
            console.log('Authentication required - not displaying phone numbers');
            
            // Return empty array instead of mock data
            return [];
          }
          
          throw new Error(errorData.message || errorData.error || `Error: ${res.status}`);
        }
        
        const data = await res.json();
        console.log(`Received ${data.length} phone numbers from API`);
        return data;
      } catch (err) {
        console.error('Error in phone number fetch:', err);
        toast({
          title: "Error fetching phone numbers",
          description: err instanceof Error ? err.message : "Unknown error occurred",
          variant: "destructive"
        });
        
        // Return an empty array to prevent further errors
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    enabled: true, // Fetch on component mount
    retry: 1,     // Only retry once
  });
  
  // Effect to fetch on component mount and update our local state
  useEffect(() => {
    // This will ensure we have phone numbers loaded right away
    refetch();
  }, [refetch]);
  
  // Effect to update our local state when availableNumbers changes
  useEffect(() => {
    if (availableNumbers) {
      setPhoneNumbers(availableNumbers);
    }
  }, [availableNumbers]);

  // Mutation to purchase a phone number
  const purchaseMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      // Get auth token from multiple sources
      let authToken = localStorage.getItem('auth_token');
      
      // If no token in localStorage, try to get it from cookie
      if (!authToken) {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        
        authToken = cookies['auth_token'];
        if (authToken) {
          console.log('Found auth token in cookie for purchase');
        }
      }
      
      const res = await fetch('/api/phone-numbers/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ phoneNumber }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || errorData.message || 'Failed to purchase phone number');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Phone number purchased successfully!",
        description: "Your new phone number is now ready to use.",
        variant: "default",
      });
      setIsCheckoutOpen(false);
      setSelectedNumber(null);
      
      // Immediately remove the purchased number from the available numbers list
      // by filtering it out from the search results
      if (phoneNumbers && data.phoneNumber) {
        const updatedPhoneNumbers = phoneNumbers.filter(
          (num: PhoneNumber) => num.phoneNumber !== data.phoneNumber.phoneNumber
        );
        setPhoneNumbers(updatedPhoneNumbers);
      }
      
      // Invalidate the purchased phone numbers query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/user/phone-numbers'] });
      
      // If the component has a callback for phone number selection, call it with the purchased number
      if (onSelectPhoneNumber && data.phoneNumber) {
        // Convert the purchased number to the format expected by the parent component
        const purchasedNumber: PurchasedPhoneNumber = {
          id: data.phoneNumber.id,
          user_id: 0, // This will be set by the server
          phone_number: data.phoneNumber.phoneNumber,
          friendly_name: data.phoneNumber.formattedNumber,
          phone_sid: data.phoneNumber.sid,
          is_active: data.phoneNumber.isActive,
          purchase_date: data.phoneNumber.purchaseDate,
          monthly_cost: 4.87,
          capabilities: '{"voice":true,"sms":true}',
          assigned_to_agent_id: null,
          region: 'US',
          country_code: 'US'
        };
        
        // Use the helper function to convert to the expected format
        const convertedNumber = convertToPhoneNumberFormat(purchasedNumber);
        
        // Call the callback with a slight delay to ensure UI state is updated first
        setTimeout(() => {
          console.log('Auto-selecting newly purchased number:', convertedNumber);
          onSelectPhoneNumber(convertedNumber);
        }, 200);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    refetch();
  };

  const handleSelectNumber = (number: PhoneNumber) => {
    // Save the selected number for reference
    setSelectedNumber(number);
    
    // Option 2: Skip the dialog and directly open payment link in a new tab (per user request)
    window.open("https://www.warmleadnetwork.com/_paylink/AZXo-En8", "_blank");
    
    // Call the callback if provided, but use setTimeout to avoid state interference
    if (onSelectPhoneNumber) {
      // Use setTimeout to ensure this selection doesn't interfere with other state updates
      setTimeout(() => {
        onSelectPhoneNumber(number);
      }, 0);
    }
  };

  const handlePurchase = () => {
    if (selectedNumber) {
      purchaseMutation.mutate(selectedNumber.phoneNumber);
    }
  };
  
  // Helper function to convert PurchasedPhoneNumber to the format expected by the context
  const convertToPhoneNumberFormat = (purchasedNumber: PurchasedPhoneNumber) => {
    // Parse capabilities from the JSON string
    let capabilities = { voice: true, sms: true, mms: false };
    try {
      capabilities = JSON.parse(purchasedNumber.capabilities);
    } catch (e) {
      console.error("Failed to parse capabilities", e);
    }
    
    return {
      phoneNumber: purchasedNumber.phone_number,
      formattedNumber: formatPhoneNumber(purchasedNumber.phone_number),
      locality: purchasedNumber.region || 'Unknown',
      region: purchasedNumber.region || 'Unknown',
      isoCountry: purchasedNumber.country_code,
      capabilities,
      price: purchasedNumber.monthly_cost,
      // Add purchased data for reference
      purchasedData: purchasedNumber
    };
  };

  const handleSelectPurchasedNumber = (phoneNumber: PurchasedPhoneNumber) => {
    // Call the callback if provided, passing only the specific phone number data
    // without triggering any context-wide resets
    if (onSelectPhoneNumber) {
      // Use setTimeout to ensure this selection doesn't interfere with other state updates
      setTimeout(() => {
        // Pass the converted format for the context to handle consistently
        const convertedNumber = convertToPhoneNumberFormat(phoneNumber);
        console.log('Selecting purchased number (converted format):', convertedNumber);
        onSelectPhoneNumber(convertedNumber);
      }, 0);
    }
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    // Format phone number for display: +1 (555) 123-4567
    const cleaned = phoneNumber.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    return phoneNumber;
  };
  
  const parseCapabilities = (capabilitiesStr: string) => {
    try {
      return JSON.parse(capabilitiesStr);
    } catch (error) {
      return { voice: true, sms: true, mms: false };
    }
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-cyan-400 text-base">
          <Phone className="h-4 w-4 mr-2" />
          Phone Numbers
        </CardTitle>
        <CardDescription className="text-xs">
          Add dedicated numbers to your AI agents.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <div className="space-y-4">
          {/* Phone Numbers You've Purchased section */}
          <div>
            <h3 className="text-sm font-medium text-cyan-400 mb-2 flex items-center">
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              Phone Numbers You've Purchased
            </h3>
            
            {isPurchasedLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex justify-between items-center p-2 border rounded-lg">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-7 w-16" />
                  </div>
                ))}
              </div>
            ) : purchasedNumbers.length > 0 ? (
              <ScrollArea className="h-[180px] mb-2">
                <div className="space-y-2 pr-2">
                  {purchasedNumbers.map((number) => {
                    const capabilities = parseCapabilities(number.capabilities);
                    return (
                      <div 
                        key={number.id}
                        className="flex justify-between items-center p-2 border border-cyan-800 rounded-lg bg-gray-900/60 hover:border-cyan-600 transition-all"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-white text-sm">
                            {formatPhoneNumber(number.phone_number)}
                          </p>
                          <div className="flex items-center text-xs text-gray-400">
                            <Calendar className="h-2.5 w-2.5 mr-1" />
                            {format(new Date(number.purchase_date), 'MM/dd/yyyy')}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {capabilities.voice && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-cyan-900/50">Voice</Badge>
                            )}
                            {capabilities.sms && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-cyan-900/50">SMS</Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleSelectPurchasedNumber(number)}
                          size="sm"
                          variant="outline"
                          className="border-cyan-700 hover:bg-cyan-800/30 h-7 px-2 text-xs"
                        >
                          <span className="flex items-center">
                            Select
                          </span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 bg-gray-900/40 rounded-lg text-center mb-2">
                <p className="text-muted-foreground text-xs max-w-xs">
                  You haven't purchased any phone numbers yet. Search below to find and purchase new phone numbers.
                </p>
              </div>
            )}
            
            <Separator className="my-3" />
          </div>
        
          {/* Search Form */}
          <div>
            <h3 className="text-sm font-medium text-cyan-400 mb-2 flex items-center">
              <Search className="h-3.5 w-3.5 mr-1.5" />
              Find New Phone Numbers
            </h3>
            
            <div className="grid grid-cols-7 gap-2 items-end">
              <div className="col-span-3">
                <Label htmlFor="areaCode" className="text-xs">Area Code</Label>
                <Input
                  id="areaCode"
                  placeholder="e.g. 415"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  maxLength={3}
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="country" className="text-xs">Country</Label>
                <Select
                  value={country}
                  onValueChange={(value) => setCountry(value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="CA">CA</SelectItem>
                    <SelectItem value="GB">UK</SelectItem>
                    <SelectItem value="AU">AU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Button 
                  className="w-full h-8 text-xs"
                  onClick={handleSearch}
                  disabled={isSearching || isRefetching}
                  size="sm"
                >
                  {isSearching || isRefetching ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Search className="h-3 w-3 mr-1" />
                      Search
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          {isLoading || isRefetching ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center p-2 border rounded-lg">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-700 text-sm">
              <p className="font-medium">Failed to load phone numbers</p>
              <p className="text-xs">Please try again or contact support.</p>
            </div>
          ) : availableNumbers.length > 0 ? (
            <ScrollArea className="h-[360px]">
              <div className="space-y-2 pr-2">
                {availableNumbers.map((number) => (
                  <div 
                    key={number.phoneNumber}
                    className="flex justify-between items-center p-2 border border-gray-800 rounded-lg bg-gray-900 hover:border-cyan-700 transition-all"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-white text-sm">
                        {formatPhoneNumber(number.phoneNumber)}
                      </p>
                      <div className="flex items-center text-xs text-gray-400">
                        <MapPin className="h-2.5 w-2.5 mr-1" />
                        {number.locality || number.region || 'Unknown'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {number.capabilities.voice && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">Voice</Badge>
                        )}
                        {number.capabilities.sms && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">SMS</Badge>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleSelectNumber(number)}
                      size="sm"
                      className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 h-7 px-2 text-xs"
                    >
                      <span className="flex items-center">
                        <Plus className="h-3 w-3 mr-1" />
                        <span className="text-white font-medium drop-shadow-[0_0_3px_rgba(255,255,255,0.7)] animate-pulse">
                          ${number.price.toFixed(2)}
                        </span>
                      </span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full bg-gray-900 p-2 mb-2">
                <Phone className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="text-sm font-medium mb-1">No phone numbers found</h3>
              <p className="text-muted-foreground text-xs max-w-xs">
                {availableNumbers === undefined ? 
                  "Search for available phone numbers." : 
                  "Try a different area code or country."}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You're about to purchase a new phone number for your AI agent.
            </DialogDescription>
          </DialogHeader>
          
          {selectedNumber && (
            <div className="space-y-6">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-lg">{formatPhoneNumber(selectedNumber.phoneNumber)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedNumber.locality}, {selectedNumber.region}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${selectedNumber.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">One-time purchase</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Includes:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                    <span className="text-sm">Dedicated phone number</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                    <span className="text-sm">Voice capabilities for incoming and outgoing calls</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                    <span className="text-sm">Automatic AI agent connection</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                    <span className="text-sm">Call recording and transcription</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCheckoutOpen(false)}
              className="w-full sm:w-auto"
              disabled={purchaseMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-cyan-800"
              onClick={() => {
                // Open payment link in a new tab
                window.open("https://www.warmleadnetwork.com/_paylink/AZXo-En8", "_blank");
              }}
            >
              <span className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Purchase Now <span className="text-white font-semibold drop-shadow-[0_0_4px_rgba(255,255,255,0.8)] animate-pulse">($4.87)</span>
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}