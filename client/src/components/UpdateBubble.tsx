import React, { useState, useEffect } from 'react';
import { MessageCircle, FileText, Download, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useLeadCalls } from '@/hooks/use-lead-calls';
import { isAuthenticated } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface UpdateBubbleProps {
  leadId: number;
}

export const UpdateBubble: React.FC<UpdateBubbleProps> = ({ leadId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, isError, error } = useLeadCalls(isOpen ? leadId : null);
  const [activeTab, setActiveTab] = useState('transcript');
  const { toast } = useToast();
  
  // Only fetch call data when the bubble is clicked and the dialog opens
  const callsData = data?.calls || [];
  const hasCalls = callsData.length > 0;
  
  // Check authentication before opening the dialog
  const handleBubbleClick = () => {
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view conversation history",
        variant: "destructive",
      });
      return;
    }
    setIsOpen(true);
  };
  
  // Handle dialog open/close
  const handleOpenChange = (open: boolean) => {
    // When opening dialog, check authentication first
    if (open && !isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view conversation history",
        variant: "destructive",
      });
      return;
    }
    
    // When closing dialog, reset any error states
    setIsOpen(open);
    if (!open) {
      // Reset tab to default when dialog closes
      setActiveTab('transcript');
    }
  };
  
  // For debugging
  React.useEffect(() => {
    if (isError) {
      console.error("Error fetching lead calls:", error);
    }
    if (data && data.error) {
      console.warn("API returned error:", data.error);
    }
  }, [isError, error, data]);

  // Function to format the timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Function to format duration in seconds to minutes and seconds
  const formatDuration = (durationSeconds: number) => {
    if (!durationSeconds) return '0:00';
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Function to handle downloading a recording
  const handleDownload = (recordingUrl: string, callId: number) => {
    const link = document.createElement('a');
    link.href = recordingUrl;
    link.download = `call-recording-${callId}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Button
        onClick={handleBubbleClick}
        variant="ghost"
        size="sm"
        className="relative rounded-full h-10 w-10 p-0 bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white"
        title="View conversation history"
      >
        <div className="relative">
          <MessageCircle className="h-5 w-5" />
          {hasCalls && (
            <div className="absolute -top-1 -right-1 rounded-full bg-purple-500 h-2.5 w-2.5 animate-pulse"></div>
          )}
        </div>
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-blue-400" />
              Conversation History
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              View transcripts and recordings of AI agent calls with this lead.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : isError || (data && data.error) ? (
            <div className="text-center p-6 text-amber-400">
              <div className="flex flex-col items-center">
                <AlertCircle className="h-10 w-10 mb-2" />
                <p>{data?.message || 'No conversation history available'}</p>
                <p className="text-sm mt-2">This is expected as you haven't made any calls yet.</p>
                <p className="text-sm">Once you make calls to this lead, conversation data will appear here.</p>
              </div>
            </div>
          ) : callsData.length === 0 ? (
            <div className="text-center p-6 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No conversations recorded with this lead yet.</p>
              <p className="text-sm mt-2">
                When an AI agent calls this lead, the transcript and recording will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {callsData.map((call) => (
                <Card key={call.id} className="bg-gray-800/80 border-gray-700 overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-white flex items-center gap-2">
                          Call on {formatTimestamp(call.created_at)}
                          <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-700">
                            {formatDuration(call.duration || 0)}
                          </Badge>
                        </h3>
                        <p className="text-sm text-gray-400">
                          Agent: {call.agent_name || 'Unknown'}
                        </p>
                      </div>
                      {call.recording_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                          onClick={() => handleDownload(call.recording_url!, call.id)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>

                    <Tabs defaultValue="transcript" value={activeTab} onValueChange={setActiveTab} className="mt-2">
                      <TabsList className="bg-gray-900/50 border border-gray-700">
                        <TabsTrigger value="transcript" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-300">
                          Transcript
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-300">
                          Notes
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="transcript" className="mt-2">
                        <ScrollArea className="h-[180px] border border-gray-700 rounded-md bg-gray-900/30 p-3">
                          {call.transcript ? (
                            <div className="space-y-4 text-gray-200">
                              {call.transcript.split('\n').map((paragraph, idx) => (
                                <p key={idx}>{paragraph}</p>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              No transcript available for this call.
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>
                      <TabsContent value="notes" className="mt-2">
                        <ScrollArea className="h-[180px] border border-gray-700 rounded-md bg-gray-900/30 p-3">
                          {call.notes ? (
                            <div className="space-y-4 text-gray-200">
                              {call.notes.split('\n').map((paragraph, idx) => (
                                <p key={idx}>{paragraph}</p>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              No notes available for this call.
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateBubble;