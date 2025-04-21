import { useState, useEffect } from 'react';
import { CalendarIntegration } from '@/components/CalendarIntegration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { CalendarIcon, Settings as SettingsIcon, UserIcon } from 'lucide-react';

export function Settings() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [location] = useLocation();
  const { toast } = useToast();

  // Check if we have a specific section in the URL (e.g., /settings/calendar)
  const urlPath = location.split('/');
  const section = urlPath[urlPath.length - 1];

  // Set the initial active tab based on the URL if it's valid
  useState(() => {
    if (section === 'calendar' || section === 'profile' || section === 'general') {
      setActiveTab(section);
    }
  });

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue={activeTab} className="w-full" onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="space-y-6">
            <CalendarIntegration />
          </TabsContent>
          
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Manage your personal information and how it appears to others.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Profile settings will be implemented soon. Currently, you can update your profile information in the user menu.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Manage general application settings and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  General settings will be implemented soon. This will include notification preferences, theme settings, and more.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}