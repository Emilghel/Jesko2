import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PhoneCall, Phone, Clock, Play, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface CallRecord {
  id: number;
  callSid: string;
  phoneNumber: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  recordingUrl?: string;
  recordingSid?: string;
  agentId: number;
  transcript?: string;
}

export function CallHistory() {
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  
  const { data: callHistory = [], isLoading, error } = useQuery<CallRecord[]>({
    queryKey: ['/api/calls/history'],
    queryFn: async () => {
      const res = await fetch('/api/calls/history', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch call history');
      }
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Format duration in minutes and seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Format date as "Mar 20, 2025, 9:30 AM"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy, h:mm a');
  };
  
  const handlePlayRecording = (call: CallRecord) => {
    setSelectedCall(call);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PhoneCall className="mr-2 h-5 w-5 text-cyan-500" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">We couldn't load your call history. Please try again later.</p>
          <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (callHistory.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PhoneCall className="mr-2 h-5 w-5 text-cyan-500" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8">
            <div className="rounded-full bg-cyan-100 p-3 mb-4">
              <Phone className="h-6 w-6 text-cyan-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">No call history yet</h3>
            <p className="text-muted-foreground max-w-md">
              When you make calls with your AI agent, they'll appear here. Try making a test call to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <PhoneCall className="mr-2 h-5 w-5 text-cyan-500" />
          Call History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Calls</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-0">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {callHistory.map((call) => (
                  <div 
                    key={call.id} 
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-lg bg-gradient-to-r from-gray-800/60 to-gray-900/60 border border-gray-700/50 hover:border-cyan-700/50 transition-all"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="rounded-full bg-cyan-900/40 p-2">
                          <Phone className="h-5 w-5 text-cyan-400" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium text-gray-200">
                            {call.phoneNumber}
                          </p>
                          <Badge variant="outline" className="ml-2 bg-cyan-950/50 text-cyan-300 border-cyan-700/50">
                            {call.status}
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-gray-400 mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDate(call.startTime)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3 md:mt-0">
                      {call.transcript && (
                        <Button variant="outline" size="sm" className="text-cyan-400 border-cyan-800/50">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Transcript
                        </Button>
                      )}
                      
                      {call.recordingUrl && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-cyan-300 border-cyan-800/50"
                          onClick={() => handlePlayRecording(call)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Play
                        </Button>
                      )}
                      
                      {call.duration && (
                        <Button variant="ghost" size="sm" className="text-gray-400">
                          {formatDuration(call.duration)}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="recent">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {callHistory.slice(0, 5).map((call) => (
                  <div 
                    key={call.id} 
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-lg bg-gradient-to-r from-gray-800/60 to-gray-900/60 border border-gray-700/50 hover:border-cyan-700/50 transition-all"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="rounded-full bg-cyan-900/40 p-2">
                          <Phone className="h-5 w-5 text-cyan-400" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium text-gray-200">
                            {call.phoneNumber}
                          </p>
                          <Badge variant="outline" className="ml-2 bg-cyan-950/50 text-cyan-300 border-cyan-700/50">
                            {call.status}
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-gray-400 mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDate(call.startTime)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3 md:mt-0">
                      {call.transcript && (
                        <Button variant="outline" size="sm" className="text-cyan-400 border-cyan-800/50">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Transcript
                        </Button>
                      )}
                      
                      {call.recordingUrl && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-cyan-300 border-cyan-800/50"
                          onClick={() => handlePlayRecording(call)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Play
                        </Button>
                      )}
                      
                      {call.duration && (
                        <Button variant="ghost" size="sm" className="text-gray-400">
                          {formatDuration(call.duration)}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Recording Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Call Recording</DialogTitle>
            <DialogDescription>
              {selectedCall && (
                <span>From {selectedCall.phoneNumber} on {formatDate(selectedCall.startTime)}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center p-4">
            {selectedCall?.recordingUrl ? (
              <audio 
                src={selectedCall.recordingUrl} 
                controls 
                className="w-full" 
                autoPlay
              />
            ) : (
              <p className="text-center text-gray-500">Recording not available</p>
            )}
            
            {selectedCall?.transcript && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md w-full">
                <h4 className="text-sm font-medium mb-2">Transcript</h4>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {selectedCall.transcript}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default CallHistory;