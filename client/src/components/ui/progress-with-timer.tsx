import React from 'react';
import { Progress } from './progress';
import { Timer } from './timer';

interface ProgressWithTimerProps {
  value: number;
  startTime?: Date;
  className?: string;
  message?: string;
  showCompletionEstimate?: boolean;
  timerFormat?: 'compact' | 'verbose';
}

/**
 * A progress bar component with an integrated timer
 * Can also show an estimated completion time based on current progress
 * 
 * @param value - Progress value (0-100)
 * @param startTime - Optional start time for the timer
 * @param className - Optional CSS class name for styling
 * @param message - Optional loading message to display
 * @param showCompletionEstimate - Whether to show estimated completion time
 * @param timerFormat - Format of the timer display (compact or verbose)
 */
export function ProgressWithTimer({
  value,
  startTime,
  className = '',
  message = 'Processing...',
  showCompletionEstimate = true,
  timerFormat = 'compact'
}: ProgressWithTimerProps) {
  const now = new Date();
  const initialTime = startTime || now;
  const elapsedSeconds = Math.max(1, Math.floor((now.getTime() - initialTime.getTime()) / 1000));
  
  // Calculate estimated total time and remaining time
  let estimatedTotalTime = 0;
  let remainingTime = 0;
  
  if (value > 0) {
    // Calculate estimated total time based on current progress rate
    estimatedTotalTime = Math.floor((elapsedSeconds / value) * 100);
    remainingTime = Math.max(0, estimatedTotalTime - elapsedSeconds);
  }

  // Format the remaining time
  const formatRemainingTime = (seconds: number) => {
    if (seconds <= 0) return '< 1 sec';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `~${minutes} min ${remainingSeconds} sec`;
    } else {
      return `~${remainingSeconds} sec`;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <div className="font-medium">{message}</div>
        <div className="text-sm">{Math.round(value)}%</div>
      </div>
      
      <Progress value={value} className="h-2" />
      
      <div className="flex justify-between items-center mt-1 text-muted-foreground text-sm">
        <Timer 
          startTime={initialTime} 
          className="text-xs" 
          format={timerFormat}
          prefix="Elapsed:"
        />
        
        {showCompletionEstimate && value > 0 && value < 99 && (
          <div className="text-xs">
            Remaining: {formatRemainingTime(remainingTime)}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressWithTimer;