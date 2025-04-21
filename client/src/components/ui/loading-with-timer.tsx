import React from 'react';
import { Loader2 } from 'lucide-react';
import { Timer } from './timer';

interface LoadingWithTimerProps {
  message?: string;
  startTime?: Date;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  timerFormat?: 'compact' | 'verbose';
  showPercentage?: boolean;
  percentage?: number;
  centered?: boolean;
}

/**
 * A loading component with an integrated timer
 * 
 * @param message - Optional loading message to display
 * @param startTime - Optional start time for the timer. Defaults to component mount time
 * @param className - Optional CSS class name for styling
 * @param size - Size of the loading spinner (sm, md, lg)
 * @param timerFormat - Format of the timer display (compact or verbose)
 * @param showPercentage - Whether to show progress percentage
 * @param percentage - Percentage completion value (0-100)
 * @param centered - Whether to center the component on the page
 */
export function LoadingWithTimer({
  message = 'Loading...',
  startTime,
  className = '',
  size = 'md',
  timerFormat = 'compact',
  showPercentage = false,
  percentage,
  centered = false,
}: LoadingWithTimerProps) {
  // Determine sizes based on prop
  const spinnerSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };
  
  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const containerClasses = centered 
    ? `flex flex-col items-center justify-center ${className}` 
    : `flex flex-col ${className}`;

  return (
    <div className={containerClasses}>
      <div className="flex items-center gap-3">
        <Loader2 className={`animate-spin ${spinnerSizes[size]}`} />
        <div className="flex flex-col">
          <div className={`font-medium ${textSizes[size]}`}>
            {message}
            {showPercentage && percentage !== undefined && (
              <span className="ml-1">({Math.round(percentage)}%)</span>
            )}
          </div>
          <Timer 
            startTime={startTime} 
            className="text-muted-foreground" 
            format={timerFormat}
            prefix={size === 'sm' ? 'Time:' : 'Processing time:'}
          />
        </div>
      </div>
    </div>
  );
}

export default LoadingWithTimer;