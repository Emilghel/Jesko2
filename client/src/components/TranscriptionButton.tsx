import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Headphones, 
  Loader2, 
  MessageSquare, 
  Copy, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";
import { useTranscription } from '@/hooks/use-transcription';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TranscriptionButtonProps {
  file: File | null;
  onTranscriptionComplete?: (text: string) => void;
  buttonSize?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  showDialog?: boolean;
  className?: string;
  coinCost?: number;
}

/**
 * A reusable transcription button component that can be included in any part of the application
 * that needs to transcribe audio or video files
 */
export function TranscriptionButton({
  file,
  onTranscriptionComplete,
  buttonSize = 'default',
  variant = 'secondary',
  showDialog = true,
  className = '',
  coinCost = 15,
}: TranscriptionButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  
  const { 
    transcribeAudio, 
    isTranscribing, 
    transcription, 
    error,
    resetTranscription,
    isFileSupported
  } = useTranscription();

  // Check if the current file is supported for transcription
  const fileSupported = file && isFileSupported(file);
  
  const handleTranscriptionClick = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an audio or video file first.",
        variant: "destructive"
      });
      return;
    }
    
    if (!fileSupported) {
      toast({
        title: "Unsupported file format",
        description: "Please use MP3, WAV, OGG, M4A, or MP4 files.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await transcribeAudio(file, (text) => {
        if (onTranscriptionComplete) {
          onTranscriptionComplete(text);
        }
        
        if (showDialog) {
          setIsDialogOpen(true);
        }
      });
    } catch (err) {
      console.error("Transcription error:", err);
    }
  };
  
  const copyToClipboard = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
          toast({
            title: "Copied!",
            description: "Transcription copied to clipboard.",
          });
        })
        .catch(err => {
          console.error("Failed to copy:", err);
          toast({
            title: "Copy failed",
            description: "Unable to copy to clipboard.",
            variant: "destructive"
          });
        });
    }
  };
  
  const closeDialog = () => {
    setIsDialogOpen(false);
  };
  
  return (
    <>
      <Button
        variant={variant}
        size={buttonSize}
        onClick={handleTranscriptionClick}
        disabled={isTranscribing || !fileSupported}
        className={`flex items-center gap-2 ${className}`}
      >
        {isTranscribing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Transcribing...
          </>
        ) : (
          <>
            <Headphones className="h-4 w-4" />
            Transcribe Audio
            {coinCost > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {coinCost} coins
              </Badge>
            )}
          </>
        )}
      </Button>
      
      {/* Transcription results dialog */}
      {showDialog && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-400" />
                Transcription Results
              </DialogTitle>
              <DialogDescription>
                {error ? (
                  <div className="flex items-center text-red-400 gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Failed to transcribe: {error}
                  </div>
                ) : (
                  "The audio has been transcribed using Whisper AI"
                )}
              </DialogDescription>
            </DialogHeader>
            
            {transcription && !error && (
              <ScrollArea className="max-h-[400px] mt-4 p-4 rounded-md border border-gray-800 bg-gray-800/50">
                <p className="text-gray-200 whitespace-pre-wrap">{transcription}</p>
              </ScrollArea>
            )}
            
            <DialogFooter className="gap-2 sm:gap-0">
              {transcription && !error && (
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  {isCopied ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              )}
              <Button variant="default" onClick={closeDialog} className="bg-purple-600 hover:bg-purple-700">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}