import React from 'react';
import { useLocation } from 'wouter';
import MainLayout from '@/components/MainLayout';
import DirectCallTest from '@/components/DirectCallTest';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone } from 'lucide-react';

export default function TwilioTest() {
  const [_, setLocation] = useLocation();
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 flex items-center">
          <Button
            variant="outline"
            onClick={() => setLocation('/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Twilio Call Testing</h1>
        </div>
        
        <p className="text-gray-500 mb-6">
          This page allows you to test Twilio call functionality directly, bypassing the complex UI flow.
        </p>
        
        <DirectCallTest />
        
        <Card>
          <CardHeader>
            <CardTitle>Call Testing Logs</CardTitle>
            <CardDescription>
              Check the browser console (F12) for detailed call logs and response information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <h3 className="text-md font-medium mb-2">Steps to verify call functionality:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Enter a valid phone number in E.164 format (e.g., +14155552671)</li>
                  <li>The Twilio number should be pre-filled with your account's phone number</li>
                  <li>Choose agent ID 1 for testing</li>
                  <li>Click "Test Direct Call" to initiate a call</li>
                  <li>Check the console logs for detailed API responses</li>
                  <li>The test call will be made to the phone number specified</li>
                </ol>
              </div>
              
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <h3 className="text-md font-medium mb-2 flex items-center">
                  <Phone className="text-blue-500 mr-2 h-4 w-4" />
                  Twilio Test Phone Numbers
                </h3>
                <p className="text-sm text-gray-600">
                  For testing without making real calls, you can use Twilio test phone numbers:
                </p>
                <ul className="list-disc pl-5 mt-2 text-sm">
                  <li><code>+15005550006</code> - Always succeeds</li>
                  <li><code>+15005550007</code> - Always fails with "busy" status</li>
                  <li><code>+15005550008</code> - Always fails with "no-answer" status</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}