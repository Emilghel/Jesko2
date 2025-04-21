import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

// Animation style for the coin icon
const coinIconStyle = {
  animation: 'rotate 3s infinite linear',
};

// Keyframes for the rotation animation
const rotateKeyframes = `
@keyframes rotate {
  from {
    transform: rotateY(0deg);
  }
  to {
    transform: rotateY(360deg);
  }
}
`;

interface CoinBalanceProps {
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  iconSize?: number;
}

const CoinBalance: React.FC<CoinBalanceProps> = ({
  className = '',
  showIcon = true,
  showLabel = true,
  iconSize = 20,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [animateCount, setAnimateCount] = useState(false);
  const [prevCoins, setPrevCoins] = useState<number | null>(null);

  // Get coins directly from the user object in auth context
  const userCoins = user?.coins || 0;

  // Also fetch from API to keep updated
  const { data, isLoading } = useQuery({
    queryKey: ['/api/user/coins'],
    queryFn: async () => {
      // Skip API call if no user is logged in
      if (!user) {
        return { coins: 0 };
      }
      
      try {
        const response = await apiRequest('GET', '/api/user/coins');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching coin balance:', error);
        // Fall back to user object coins if API fails
        return { coins: user.coins || 0 };
      }
    },
    // Only enable this query if the user is logged in
    enabled: !!user,
    // Refetch every 60 seconds to keep balance updated
    refetchInterval: 60000,
  });

  // Use coins from API if available, otherwise use from user object
  const coins = data?.coins ?? userCoins;

  useEffect(() => {
    // Animate the coin count when it changes
    if (prevCoins !== null && coins !== prevCoins) {
      setAnimateCount(true);
      const timer = setTimeout(() => setAnimateCount(false), 2000);
      return () => clearTimeout(timer);
    }

    if (coins) {
      setPrevCoins(coins);
    }
  }, [coins, prevCoins]);

  // If user is not logged in, return a sign-in prompt or just coins icon
  if (!user) {
    return (
      <div className={`flex items-center gap-1 ${className}`} title="Sign in to see your coins">
        {showIcon && <Coins size={iconSize} className="text-gray-500" />}
        {showLabel && <span className="text-gray-500">-</span>}
      </div>
    );
  }

  if (isLoading && !coins) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {showIcon && <Coins size={iconSize} className="text-gray-400 animate-pulse" />}
        {showLabel && <span className="text-gray-400 animate-pulse">Loading...</span>}
      </div>
    );
  }

  return (
    <>
      <style>{rotateKeyframes}</style>
      <div className={`flex items-center gap-1 ${className}`} title={`${coins} coins available`}>
        {showIcon && (
          <Coins
            size={iconSize}
            className={`text-yellow-500 ${animateCount ? 'animate-bounce' : ''}`}
            style={coinIconStyle}
          />
        )}
        {showLabel && (
          <span className={`font-medium ${animateCount ? 'text-green-500' : ''}`}>
            {coins.toLocaleString()}
          </span>
        )}
      </div>
    </>
  );
};

export default CoinBalance;