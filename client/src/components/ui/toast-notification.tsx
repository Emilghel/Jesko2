import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationProps {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function ToastNotification({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}: NotificationProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const progressStartTime = useRef<number>(Date.now());
  const progressTimeRemaining = useRef<number>(duration);
  
  // Set up icon and colors based on notification type
  const Icon = type === 'success' 
    ? CheckCircle 
    : type === 'error' 
      ? XCircle 
      : AlertCircle;
  
  const gradientColors = type === 'success'
    ? 'from-emerald-500 to-teal-500'
    : type === 'error'
      ? 'from-red-500 to-rose-500'
      : 'from-[#33C3BD] to-[#0075FF]';
  
  const borderColor = type === 'success' 
    ? 'border-emerald-500/30' 
    : type === 'error' 
      ? 'border-red-500/30' 
      : 'border-[#33C3BD]/30';

  // Progress bar animation
  useEffect(() => {
    progressStartTime.current = Date.now();
    progressTimeRemaining.current = duration;
    
    const updateProgress = () => {
      if (isPaused) return;
      
      const elapsed = Date.now() - progressStartTime.current;
      const remaining = progressTimeRemaining.current - elapsed;
      const currentProgress = (remaining / duration) * 100;
      
      setProgress(Math.max(0, currentProgress));
      
      if (currentProgress <= 0) {
        onClose(id);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      }
    };
    
    progressInterval.current = setInterval(updateProgress, 16);
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [duration, id, isPaused, onClose]);
  
  // Pause the progress bar on hover
  const pauseProgress = () => {
    if (!isPaused) {
      setIsPaused(true);
      progressTimeRemaining.current = (progress / 100) * duration;
    }
  };
  
  // Resume the progress bar on mouse leave
  const resumeProgress = () => {
    if (isPaused) {
      setIsPaused(false);
      progressStartTime.current = Date.now();
    }
  };
  
  return (
    <div 
      className={`rounded-lg shadow-lg border ${borderColor} bg-[#0A0F16] p-4 w-full max-w-md overflow-hidden relative`}
      onMouseEnter={pauseProgress}
      onMouseLeave={resumeProgress}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-1 bg-gradient-to-r ${gradientColors} shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex-grow">
          <h3 className="font-medium text-white text-sm">{title}</h3>
          {message && (
            <p className="text-gray-300 text-xs mt-1">{message}</p>
          )}
        </div>
        
        <button
          onClick={() => onClose(id)}
          className="shrink-0 rounded-full p-1 hover:bg-gray-800 transition-colors"
        >
          <X className="h-4 w-4 text-gray-300" />
        </button>
      </div>
      
      {/* Progress bar */}
      <motion.div 
        className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${gradientColors}`}
        initial={{ width: '100%' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1, ease: "linear" }}
      />
      
      {/* Wave animation for active notification */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0.1 }}
        animate={{ 
          opacity: [0.05, 0.1, 0.05],
          scale: [1, 1.02, 1],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 2,
          ease: "easeInOut"
        }}
      >
        <div className={`w-full h-full rounded-lg bg-gradient-to-r ${gradientColors} opacity-10`} />
      </motion.div>
    </div>
  );
}