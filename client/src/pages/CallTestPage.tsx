/**
 * Call Test Page
 * 
 * This page provides access to different call test components
 * to validate and compare various Twilio integration approaches.
 */
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { 
  ArrowLeft,
  Beaker,
  Phone,
  History
} from 'lucide-react';
import DirectTwilioCall from '../components/DirectTwilioCall';
import DirectCallTest from '../components/DirectCallTest';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function CallTestPage() {
  const [activeTab, setActiveTab] = useState<string>('enhanced');
  const { toast } = useToast();
  
  // Check Twilio credentials on page load
  useEffect(() => {
    async function checkTwilioCredentials() {
      try {
        // Make a simple request to check if Twilio is configured
        const response = await fetch('/api/twilio/check-credentials', {
          headers: {
            'Authorization': localStorage.getItem('auth_token') ? 
              `Bearer ${localStorage.getItem('auth_token')}` : ''
          }
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          toast({
            title: 'Twilio Configuration Warning',
            description: data.error || 'Twilio credentials may not be properly configured. Some call features may not work.',
            variant: 'destructive',
            duration: 10000,
          });
        }
      } catch (error) {
        console.error('Error checking Twilio credentials:', error);
      }
    }
    
    checkTwilioCredentials();
  }, [toast]);
  
  return (
    <div className="container mx-auto py-6 max-w-5xl px-4">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Call Testing Center</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link href="/leads">
            <Button variant="outline" size="sm" className="h-8">
              <History className="h-4 w-4 mr-2" />
              Call History
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-md">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          This page allows you to test and compare different Twilio integration approaches. 
          The Enhanced approach uses a more direct TwiML-based implementation inspired by 
          ElevenLabs' successful integration method.
        </p>
      </div>
      
      <Tabs 
        defaultValue="enhanced" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="enhanced" className="flex items-center">
            <Beaker className="h-4 w-4 mr-2" />
            Enhanced Approach
          </TabsTrigger>
          <TabsTrigger value="standard" className="flex items-center">
            <Phone className="h-4 w-4 mr-2" />
            Standard Approach
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="enhanced" className="mt-0">
          <DirectTwilioCall />
        </TabsContent>
        
        <TabsContent value="standard" className="mt-0">
          <DirectCallTest />
        </TabsContent>
      </Tabs>
    </div>
  );
}