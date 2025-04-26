import { useState } from 'react';
import { CreditCard, Calendar, Lock, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

interface CreditCardFormProps {
  onSubmit: (formData: {
    cardNumber: string;
    cardHolder: string;
    expiryDate: string;
    cvc: string;
  }) => void;
  isProcessing: boolean;
  buttonText: string;
}

const CustomCreditCardForm = ({
  onSubmit,
  isProcessing,
  buttonText
}: CreditCardFormProps) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length > 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    
    return v;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    onSubmit({
      cardNumber: cardNumber.replace(/\s+/g, ''),
      cardHolder,
      expiryDate,
      cvc
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-gray-800/50 rounded-md border border-gray-700">
        <h3 className="text-gray-300 font-medium mb-4 flex items-center">
          <CreditCard className="mr-2 h-4 w-4" />
          Card Details
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="card-number" className="text-gray-300">Card Number</Label>
            <div className="relative mt-1">
              <Input
                id="card-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4242 4242 4242 4242"
                maxLength={19}
                className="pl-10 bg-gray-900 border-gray-700 text-white"
                required
              />
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              For testing, use 4242 4242 4242 4242
            </p>
          </div>
          
          <div>
            <Label htmlFor="card-holder" className="text-gray-300">Cardholder Name</Label>
            <Input
              id="card-holder"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="John Smith"
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiry-date" className="text-gray-300">Expiry Date</Label>
              <div className="relative mt-1">
                <Input
                  id="expiry-date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="pl-10 bg-gray-900 border-gray-700 text-white"
                  required
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="cvc" className="text-gray-300">CVC</Label>
              <div className="relative mt-1">
                <Input
                  id="cvc"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123"
                  maxLength={3}
                  className="pl-10 bg-gray-900 border-gray-700 text-white"
                  required
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        size="lg" 
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          buttonText
        )}
      </Button>
    </form>
  );
};

export default CustomCreditCardForm;