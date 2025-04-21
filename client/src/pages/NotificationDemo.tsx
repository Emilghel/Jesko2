import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotification } from "@/contexts/notification-context";
import { Bell, BellRing, Megaphone, Target, Zap, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function NotificationDemo() {
  const { showSuccess, showError, showInfo } = useNotification();
  const [title, setTitle] = useState("Notification Title");
  const [message, setMessage] = useState("This is a detailed message explaining the notification.");
  
  const handleShowNotification = (type: 'success' | 'error' | 'info') => {
    if (type === 'success') {
      showSuccess(title, message);
    } else if (type === 'error') {
      showError(title, message);
    } else {
      showInfo(title, message);
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
        Interactive Notification System
      </h1>
      <p className="text-gray-400 mb-8">
        Test and explore our animated notification system with playful microinteractions
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-[#141B29] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="text-[#33C3BD]" />
              <span>Notification Creator</span>
            </CardTitle>
            <CardDescription>
              Customize and trigger different types of notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Notification Title
              </label>
              <Input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#0A0F16] border-[#1E293B] text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Notification Message
              </label>
              <Input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-[#0A0F16] border-[#1E293B] text-white"
              />
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex flex-wrap gap-3 w-full">
              <Button 
                onClick={() => handleShowNotification('success')}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Success
              </Button>
              <Button 
                onClick={() => handleShowNotification('error')}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Error
              </Button>
              <Button 
                onClick={() => handleShowNotification('info')}
                className="flex-1 bg-gradient-to-r from-[#33C3BD] to-[#0075FF]"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Info
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <Card className="bg-[#141B29] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="text-[#33C3BD]" />
              <span>Quick Examples</span>
            </CardTitle>
            <CardDescription>
              Try these pre-configured notification examples
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 bg-[#0A0F16]">
                <TabsTrigger value="user">User</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="action">Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="user" className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-[#1E293B] text-white"
                  onClick={() => showSuccess("Profile Updated", "Your profile information has been successfully updated.")}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  Profile Updated
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-[#1E293B] text-white"
                  onClick={() => showError("Payment Failed", "Your payment could not be processed. Please check your payment method.")}
                >
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  Payment Failed
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-[#1E293B] text-white"
                  onClick={() => showInfo("New Message", "You have received a new message from your agent.")}
                >
                  <Bell className="mr-2 h-4 w-4 text-[#33C3BD]" />
                  New Message
                </Button>
              </TabsContent>
              <TabsContent value="system" className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-[#1E293B] text-white"
                  onClick={() => showInfo("System Update", "A new system update is available. Please restart the application.")}
                >
                  <AlertCircle className="mr-2 h-4 w-4 text-[#33C3BD]" />
                  System Update
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-[#1E293B] text-white"
                  onClick={() => showSuccess("Connection Restored", "Your connection to the server has been restored.")}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  Connection Restored
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-[#1E293B] text-white"
                  onClick={() => showError("Server Error", "Could not connect to the server. Please try again later.")}
                >
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  Server Error
                </Button>
              </TabsContent>
              <TabsContent value="action" className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-[#1E293B] text-white"
                  onClick={() => showSuccess("Call Completed", "Your call has been successfully completed and recorded.")}
                >
                  <Target className="mr-2 h-4 w-4 text-emerald-500" />
                  Call Completed
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-[#1E293B] text-white"
                  onClick={() => showInfo("Agent Activated", "Your AI agent has been activated and is ready to take calls.")}
                >
                  <Megaphone className="mr-2 h-4 w-4 text-[#33C3BD]" />
                  Agent Activated
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-[#1E293B] text-white"
                  onClick={() => showError("Processing Error", "There was an error processing your voice query.")}
                >
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  Processing Error
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              variant="outline" 
              className="border-[#1E293B] text-white"
              onClick={() => {
                // Trigger a cascade of notifications for demo effect
                setTimeout(() => showInfo("Welcome!", "Welcome to our notification system demo."), 0);
                setTimeout(() => showSuccess("Features Available", "Explore all notification types and interactions."), 1000);
                setTimeout(() => showError("Careful", "Don't trigger too many at once!"), 2000);
              }}
            >
              <Zap className="mr-2 h-4 w-4 text-yellow-500" />
              Trigger Notification Cascade
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8 p-6 bg-[#141B29] border border-[#1E293B] rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">About the Notification System</h2>
        <div className="space-y-4 text-gray-300">
          <p>
            Our notification system provides users with real-time feedback through animated, interactive toast notifications.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Audio feedback with distinct sounds for each notification type</li>
            <li>Progress bars show when notifications will automatically dismiss</li>
            <li>Hover to pause the auto-dismiss timer</li>
            <li>Tactile feedback through device vibration (when available)</li>
            <li>Smooth animations for entrances and exits</li>
            <li>Consistent theming that matches the application style</li>
          </ul>
        </div>
      </div>
    </div>
  );
}