import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useUserAgentDetails } from "@/hooks/use-user-agent-details";
import { Bot, Phone, Mic, Calendar, MessageSquare, Sparkles, Check, X } from "lucide-react";
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

interface AgentDetailsModalProps {
  agentId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentDetailsModal({ agentId, isOpen, onClose }: AgentDetailsModalProps) {
  const { agent, isLoading, isError } = useUserAgentDetails(agentId);
  const [customSettings, setCustomSettings] = useState<any>(null);
  const [_, setLocation] = useLocation();
  
  // Parse custom settings JSON when agent data is loaded
  useEffect(() => {
    if (agent?.custom_settings) {
      try {
        const parsed = JSON.parse(agent.custom_settings);
        setCustomSettings(parsed);
      } catch (err) {
        console.error('Failed to parse custom settings', err);
        setCustomSettings(null);
      }
    } else {
      setCustomSettings(null);
    }
  }, [agent]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <>
            <DialogHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </DialogHeader>
            <div className="space-y-4 my-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </>
        ) : isError ? (
          <DialogHeader>
            <DialogTitle className="text-red-500">Error Loading Agent Details</DialogTitle>
            <DialogDescription>
              There was a problem loading the agent information. Please try again.
            </DialogDescription>
          </DialogHeader>
        ) : agent ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-6 w-6 text-primary" />
                <DialogTitle className="text-xl">{agent.name}</DialogTitle>
                <Badge variant={agent.is_active ? "default" : "outline"}>
                  {agent.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <DialogDescription className="text-base">
                {agent.description || "No description provided."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-4">
              {/* Creation Date */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-muted-foreground">Created</Label>
                </div>
                <p className="text-sm ml-6">
                  {format(new Date(agent.created_at), 'PPPp')}
                </p>
              </div>
              
              <Separator />
              
              {/* System Prompt / AI Personality */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label>AI Personality & Prompt</Label>
                </div>
                <div className="bg-secondary/20 p-3 rounded-md border border-border">
                  {agent.personality_id && (
                    <Badge className="mb-2 bg-blue-500/20 text-blue-400 hover:text-blue-300 border-blue-500/40">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {agent.personality_id}
                    </Badge>
                  )}
                  <p className="text-sm whitespace-pre-wrap">
                    {agent.system_prompt}
                  </p>
                </div>
              </div>
              
              {/* Voice */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <Label>Voice</Label>
                </div>
                <div className="bg-secondary/20 p-3 rounded-md border border-border">
                  <p className="text-sm">{agent.voice_id}</p>
                </div>
              </div>
              
              {/* Phone Number */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Label>Assigned Phone Number</Label>
                </div>
                <div className="bg-secondary/20 p-3 rounded-md border border-border">
                  <p className="text-sm">
                    {agent.phone_number_id 
                      ? `Connected to phone number ID: ${agent.phone_number_id}` 
                      : "No phone number assigned"}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              {/* Message Configuration */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <Label>Message Configuration</Label>
                </div>
                
                {/* Greeting Message */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Greeting Message</Label>
                    <Badge 
                      variant={agent.greeting_message_required ? "default" : "outline"}
                      className="text-xs"
                    >
                      {agent.greeting_message_required ? (
                        <><Check className="h-3 w-3 mr-1" /> Required</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" /> Optional</>
                      )}
                    </Badge>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-md border border-border">
                    <p className="text-sm">{agent.greeting_message || "No greeting message set"}</p>
                  </div>
                </div>
                
                {/* Second Message */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Second Message</Label>
                    <Badge 
                      variant={agent.second_message_required ? "default" : "outline"}
                      className="text-xs"
                    >
                      {agent.second_message_required ? (
                        <><Check className="h-3 w-3 mr-1" /> Required</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" /> Optional</>
                      )}
                    </Badge>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-md border border-border">
                    <p className="text-sm">{agent.second_message || "No second message set"}</p>
                  </div>
                </div>
                
                {/* Third Message */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Third Message</Label>
                    <Badge 
                      variant={agent.third_message_required ? "default" : "outline"}
                      className="text-xs"
                    >
                      {agent.third_message_required ? (
                        <><Check className="h-3 w-3 mr-1" /> Required</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" /> Optional</>
                      )}
                    </Badge>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-md border border-border">
                    <p className="text-sm">{agent.third_message || "No third message set"}</p>
                  </div>
                </div>
              </div>
              
              {/* Custom Settings */}
              {customSettings && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="h-4 w-4 text-primary" />
                      <Label>Voice Recognition Settings</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-secondary/20 p-3 rounded-md border border-border">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Enabled</span>
                          <Badge variant={customSettings.voice_recognition_enabled ? "default" : "outline"}>
                            {customSettings.voice_recognition_enabled ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-secondary/20 p-3 rounded-md border border-border">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Language</span>
                          <Badge variant="outline">
                            {customSettings.voice_recognition_language || "en-US"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-secondary/20 p-3 rounded-md border border-border">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Continuous</span>
                          <Badge variant={customSettings.voice_recognition_continuous ? "default" : "outline"}>
                            {customSettings.voice_recognition_continuous ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-secondary/20 p-3 rounded-md border border-border">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Interim Results</span>
                          <Badge variant={customSettings.voice_recognition_interim_results ? "default" : "outline"}>
                            {customSettings.voice_recognition_interim_results ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button 
                variant="default"
                onClick={() => {
                  // Close the current modal and redirect to the edit page
                  onClose();
                  // Use a short delay to avoid UI conflicts with modal closing
                  setTimeout(() => {
                    setLocation(`/edit-agent/${agent.id}`);
                  }, 100);
                }}
              >
                Edit Agent
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}