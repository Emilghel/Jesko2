import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  startTime?: Date;
  className?: string;
  showIcon?: boolean;
  format?: 'compact' | 'verbose';
  prefix?: string;
}

/**
 * A component that displays an accurate timer
 * 
 * @param startTime - Optional start time. If not provided, timer starts when component mounts
 * @param className - Optional CSS class name for styling
 * @param showIcon - Whether to show a clock icon (default: true)
 * @param format - Display format: 'compact' (00:00) or 'verbose' (0 min 0 sec) (default: compact)
 * @param prefix - Optional text to display before the timer
 */
export function Timer({
  startTime,
  className = '',
  showIcon = true,
  format = 'compact',
  prefix = 'Processing time:'
}: TimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [initialTime] = useState(startTime || new Date());

  // Update the timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - initialTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [initialTime]);

  // Format the elapsed time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (format === 'compact') {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      if (minutes > 0) {
        return `${minutes} min ${remainingSeconds} sec`;
      } else {
        return `${remainingSeconds} sec`;
      }
    }
  };

  return (
    <div className={`flex items-center gap-1.5 text-sm ${className}`}>
      {showIcon && <Clock className="h-3.5 w-3.5" />}
      <span>
        {prefix} {formatTime(elapsedTime)}
      </span>
    </div>
  );
}

export default Timer;