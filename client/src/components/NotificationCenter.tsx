import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  UserPlus, 
  Award, 
  Trash2, 
  CheckCheck,
  BellOff
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'alert';
  read: boolean;
  date: string;
  actionLink?: string;
  actionText?: string;
}

interface NotificationCenterProps {
  notifications?: Notification[];
}

export default function NotificationCenter({ 
  notifications = [] 
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>(notifications);
  
  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };
  
  // Filter notifications based on active tab
  const filteredNotifications = visibleNotifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    return notification.type === activeTab;
  });
  
  // Mark all as read
  const markAllAsRead = () => {
    const updatedNotifications = visibleNotifications.map(notification => ({
      ...notification,
      read: true
    }));
    setVisibleNotifications(updatedNotifications);
  };
  
  // Mark a single notification as read
  const markAsRead = (id: string) => {
    const updatedNotifications = visibleNotifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    );
    setVisibleNotifications(updatedNotifications);
  };
  
  // Delete a notification
  const deleteNotification = (id: string) => {
    setVisibleNotifications(visibleNotifications.filter(notification => notification.id !== id));
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setVisibleNotifications([]);
  };
  
  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-amber-400" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'info':
      default:
        return <Bell className="h-5 w-5 text-blue-400" />;
    }
  };
  
  // Get color based on notification type
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/20 border-green-800/30';
      case 'warning':
        return 'bg-amber-900/20 border-amber-800/30';
      case 'alert':
        return 'bg-red-900/20 border-red-800/30';
      case 'info':
      default:
        return 'bg-blue-900/20 border-blue-800/30';
    }
  };
  
  // Count unread notifications
  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  return (
    <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
          style={{ 
            background: 'rgba(20, 20, 30, 0.7)', 
            boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
          }}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-white flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-opacity-20 mr-3" 
                style={{ 
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  animation: 'iconFloat 3s ease-in-out infinite',
                  boxShadow: '0 0 15px 5px rgba(56, 189, 248, 0.3)'
                }}>
              <Bell className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <span>Notification Center</span>
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2 bg-blue-500 hover:bg-blue-600">
                  {unreadCount} new
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Stay updated with important activity on your account
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              <span className="sr-only">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800 text-gray-100">
            <DropdownMenuItem 
              className="flex items-center text-gray-300 hover:text-white cursor-pointer"
              onClick={markAllAsRead}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              <span>Mark all as read</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuItem 
              className="flex items-center text-red-400 hover:text-red-300 cursor-pointer"
              onClick={clearAllNotifications}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Clear all notifications</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-900/80 border border-gray-700 mb-6">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-400">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
              Unread
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2 bg-purple-700 text-white text-[10px] px-1 py-0 h-4 min-w-4">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="success" className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-400">
              Success
            </TabsTrigger>
            <TabsTrigger value="warning" className="data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-400">
              Pending
            </TabsTrigger>
            <TabsTrigger value="alert" className="data-[state=active]:bg-red-900/30 data-[state=active]:text-red-400">
              Alerts
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            {filteredNotifications.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`relative rounded-lg p-4 border transition-all ${getNotificationColor(notification.type)} ${!notification.read ? 'border-l-4' : ''}`}
                  >
                    <div className="flex">
                      <div className="flex-shrink-0 mr-3">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 mr-6">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(notification.date)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {notification.message}
                        </p>
                        {notification.actionLink && notification.actionText && (
                          <Button 
                            variant="link" 
                            className="text-blue-400 p-0 h-auto mt-1 text-xs"
                            onClick={() => markAsRead(notification.id)}
                          >
                            {notification.actionText}
                          </Button>
                        )}
                      </div>
                      <div className="absolute right-2 top-2 flex space-x-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-500 hover:text-gray-300"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Mark as read</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-500 hover:text-red-400"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-6 rounded-lg" 
                   style={{ 
                     background: 'rgba(10, 10, 20, 0.5)',
                     boxShadow: 'inset 0 0 20px rgba(51, 195, 189, 0.1)'
                   }}>
                <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-60" />
                <p className="text-gray-300 text-lg">No notifications available</p>
                <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto">
                  {activeTab === 'all' 
                    ? "You don't have any notifications yet" 
                    : activeTab === 'unread' 
                      ? "You've read all your notifications" 
                      : `You don't have any ${activeTab} notifications`}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}