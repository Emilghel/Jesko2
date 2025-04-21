import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastNotification, NotificationType } from '@/components/ui/toast-notification';
import { playSuccessSound, playErrorSound, playInfoSound } from '@/utils/sound-effects';

// Types
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

// Context
const NotificationContext = createContext<NotificationContextType | null>(null);

// Hook for using the notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = uuidv4();
    const newNotification = {
      ...notification,
      id,
      duration: notification.duration || 5000, // Default to 5 seconds
    };
    
    // Play sound based on notification type
    if (notification.type === 'success') {
      playSuccessSound();
    } else if (notification.type === 'error') {
      playErrorSound();
    } else {
      playInfoSound();
    }
    
    // Add vibration feedback if supported
    if (navigator.vibrate) {
      try {
        navigator.vibrate(100);
      } catch (e) {
        console.error('Vibration API error:', e);
      }
    }
    
    setNotifications(prev => [...prev, newNotification]);
  }, []);
  
  // Remove a notification by ID
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // Convenience methods for different notification types
  const showSuccess = useCallback((title: string, message?: string) => {
    addNotification({ type: 'success', title, message });
  }, [addNotification]);
  
  const showError = useCallback((title: string, message?: string) => {
    addNotification({ type: 'error', title, message });
  }, [addNotification]);
  
  const showInfo = useCallback((title: string, message?: string) => {
    addNotification({ type: 'info', title, message });
  }, [addNotification]);
  
  // Ensure notifications don't get too numerous
  useEffect(() => {
    if (notifications.length > 5) {
      // Remove the oldest notification
      const oldestId = notifications[0].id;
      removeNotification(oldestId);
    }
  }, [notifications, removeNotification]);
  
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        showSuccess,
        showError,
        showInfo,
      }}
    >
      {children}
      
      {/* Notification container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <ToastNotification
                id={notification.id}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                duration={notification.duration}
                onClose={removeNotification}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};