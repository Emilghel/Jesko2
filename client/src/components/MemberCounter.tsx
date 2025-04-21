import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UsersIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface CounterProps {
  className?: string;
}

const MemberCounter = ({ className = '' }: CounterProps) => {
  const [displayedCount, setDisplayedCount] = useState<number>(0);
  const [animateCount, setAnimateCount] = useState<boolean>(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch the member count from the API
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/stats/member-count'],
    queryFn: async () => {
      const response = await fetch('/api/stats/member-count');
      if (!response.ok) {
        throw new Error('Failed to fetch member count');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Animate the counter when the data changes
  useEffect(() => {
    if (data?.count && !isLoading) {
      const targetCount = data.count;
      
      // If this is the first load, set the initial count immediately
      if (displayedCount === 0) {
        setDisplayedCount(targetCount);
        return;
      }
      
      // Only animate if the count has changed
      if (targetCount !== displayedCount) {
        // Determine the increment amount based on the difference
        const diff = targetCount - displayedCount;
        const incrementAmount = Math.max(1, Math.floor(diff / 10));
        
        // Clear any existing animation
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
        
        // Animation function to increment the counter (5x slower)
        const animateToTarget = () => {
          setDisplayedCount(prevCount => {
            // Make the increment 5x smaller for slower counting
            const slowerIncrementAmount = Math.max(1, Math.ceil(incrementAmount / 5));
            const nextCount = prevCount + slowerIncrementAmount;
            
            // If we've reached or exceeded the target, stop animating
            if (nextCount >= targetCount) {
              return targetCount;
            }
            
            // Also increase the timeout delay for a smoother, slower animation
            animationRef.current = setTimeout(animateToTarget, 500);
            return nextCount;
          });
        };
        
        // Start the animation
        setAnimateCount(true);
        animateToTarget();
      }
    }
    
    // Cleanup function to clear the timeout when the component unmounts
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [data, isLoading, displayedCount]);

  // Format the number with commas
  const formattedCount = displayedCount.toLocaleString();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <UsersIcon size={18} className="text-cyan-500" />
      {isLoading ? (
        <span className="text-sm">Loading...</span>
      ) : error ? (
        <span className="text-sm text-red-500">Error loading member count</span>
      ) : (
        <motion.div 
          className="flex items-center space-x-1"
          animate={{ 
            scale: animateCount ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={() => setAnimateCount(false)}
        >
          <span className="text-sm font-medium">
            {formattedCount}
          </span>
          <span className="text-sm text-muted-foreground">members</span>
        </motion.div>
      )}
    </div>
  );
};

export default MemberCounter;