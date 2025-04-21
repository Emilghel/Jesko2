import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone } from 'lucide-react';
import { AgentSelectCallButton } from '@/components/AgentSelectCallButton';
import MainLayout from '@/components/MainLayout';
import { useLocation } from 'wouter';

export function TwilioAgentTest() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
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
          <h1 className="text-3xl font-bold">Twilio Agent Test</h1>
        </div>
        
        <p className="text-gray-500 mb-6">
          Test calling with different AI agent personalities. Select which agent you want to use for the call.
        </p>
        
        <div className="flex flex-col space-y-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Test AI Agent Calls</CardTitle>
              <CardDescription>
                Call a number with different AI agent personalities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number (e.g. +1 555 123 4567)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Recipient Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter recipient name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="pt-4">
                  <div className="mb-2 text-sm text-gray-500">Select an agent and make a call:</div>
                  <AgentSelectCallButton 
                    phoneNumber={phoneNumber} 
                    recipient={name || 'Recipient'} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}