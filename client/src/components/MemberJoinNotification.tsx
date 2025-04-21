import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, UserPlus } from 'lucide-react';

// Define types for member join notifications
interface MemberJoinData {
  username: string;
  plan: string;
  action: string;
  message: string;
}

interface MemberJoinNotification {
  type: 'member_join';
  data: MemberJoinData;
  timestamp: string;
}

// Maximum number of notifications to show at once
const MAX_VISIBLE_NOTIFICATIONS = 3;

// How long to display each notification (in milliseconds)
const NOTIFICATION_DURATION = 4500;

/**
 * MemberJoinNotification component that displays popup notifications
 * when new members join the platform
 */
const MemberJoinNotification: React.FC = () => {
  // State to store active notifications
  const [notifications, setNotifications] = useState<MemberJoinNotification[]>([]);
  // WebSocket connection reference
  const wsRef = useRef<WebSocket | null>(null);
  
  // Set up WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Create WebSocket connection
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    
    // Handle incoming messages
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Check if this is a member join notification
        if (data.type === 'member_join') {
          // Add the new notification to our state
          setNotifications(prev => {
            // Limit to maximum number of notifications
            const notifications = [data, ...prev].slice(0, MAX_VISIBLE_NOTIFICATIONS * 2);
            return notifications;
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    // Handle connection open
    socket.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    // Handle errors
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);
  
  // Auto-remove notifications after they've been displayed for the specified duration
  useEffect(() => {
    if (notifications.length === 0) return;
    
    const timer = setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, NOTIFICATION_DURATION);
    
    return () => clearTimeout(timer);
  }, [notifications]);
  
  // Nothing to render if there are no notifications
  if (notifications.length === 0) return null;
  
  // Only show up to MAX_VISIBLE_NOTIFICATIONS
  const visibleNotifications = notifications.slice(0, MAX_VISIBLE_NOTIFICATIONS);
  
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col space-y-2">
      <AnimatePresence>
        {visibleNotifications.map((notification, index) => (
          <motion.div
            key={`${notification.data.username}-${notification.timestamp}`}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-background/80 backdrop-blur border border-cyan-500/30 rounded-lg p-2 shadow-lg relative overflow-hidden max-w-xs"
            style={{
              boxShadow: '0 0 10px rgba(51, 195, 189, 0.2)',
            }}
          >
            {/* Particle effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-cyan-400/40"
                  initial={{
                    x: Math.random() * 100 + '%',
                    y: Math.random() * 100 + '%',
                    scale: 0.5 + Math.random() * 0.5,
                    opacity: 0.3 + Math.random() * 0.5
                  }}
                  animate={{
                    x: Math.random() * 100 + '%',
                    y: Math.random() * 100 + '%',
                    opacity: [0.3, 0.8, 0.3],
                    scale: [0.5, 0.8, 0.5]
                  }}
                  transition={{
                    duration: 2 + Math.random() * 3,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
              ))}
            </div>
            
            {/* Main content */}
            <div className="flex items-start gap-2">
              <div className="mt-0.5 rounded-full bg-gradient-to-br from-cyan-400/90 to-blue-600/90 p-1.5 flex items-center justify-center shadow-glow">
                <UserPlus size={12} className="text-white" />
              </div>
              
              <div className="flex-1">
                <h4 className="font-semibold text-xs mb-0.5 text-foreground">
                  <span className="font-bold text-cyan-500">
                    {notification.data.username}
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground">
                  {notification.data.action} <span className="font-medium text-foreground">{notification.data.plan}</span>
                </p>
              </div>
            </div>
            
            {/* Progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: NOTIFICATION_DURATION / 1000, ease: 'linear' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default MemberJoinNotification;