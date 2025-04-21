import React, { useState, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import {
  Scissors,
  Upload,
  Download,
  Video,
  Loader2,
  Star,
  MessageSquare,
  Clock,
  Sparkles,
  TrendingUp,
  Play,
  Pause,
  CheckCircle,
  Headphones,
  BadgeCheck,
  Bug as BugIcon,
  RotateCcw,
  Edit,
  Save,
  Youtube
} from "lucide-react";
import { TranscriptionButton } from "@/components/TranscriptionButton";
import { useTranscription } from "@/hooks/use-transcription";
import VideoBackground from "@/components/VideoBackground";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Simple AI Clip Studio Page 
 * A completely rebuilt version of the clip studio using direct DOM manipulation and minimal dependencies
 * to ensure all functionality works properly
 */
const SimpleAIClipStudioPage: React.FC = () => {
  // Core state management
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isYoutubeMode, setIsYoutubeMode] = useState<boolean>(false);
  const [keywords, setKeywords] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [clips, setClips] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadingClips, setDownloadingClips] = useState<{[key: string]: boolean}>({});
  const [processingComplete, setProcessingComplete] = useState<boolean>(false);
  // Auto-transcribe is always enabled but hidden from the UI
  const [autoTranscribeEnabled] = useState<boolean>(true);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<{ total: number, completed: number, failed: number }>({ total: 0, completed: 0, failed: 0 });
  
  // Caption editing states
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [editingCaptionIndex, setEditingCaptionIndex] = useState<number | null>(null);
  const [editedCaption, setEditedCaption] = useState<string>("");
  
  // Video editing states
  const [showVideoEditDialog, setShowVideoEditDialog] = useState<boolean>(false);
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);
  const [videoEndTime, setVideoEndTime] = useState<number>(0);
  
  // Use the transcription hook for audio/video transcriptions
  const transcribe = useTranscription();
  
  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Caption style option (fixed to minimal)
  const defaultCaptionStyle = 'minimal';
  
  // Toast notifications
  const { toast } = useToast();
  
  // Transcription hook
  const { 
    transcribeAudio, 
    batchTranscribeAudios,
    isTranscribing: isWhisperTranscribing,
    batchProgress,
    isFileSupported,
    createBlobUrl
  } = useTranscription();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    console.log("File selected:", selectedFile.name, selectedFile.type, selectedFile.size);
    setFile(selectedFile);
    setError(null);
    
    toast({
      title: "File selected! ✓",
      description: `${selectedFile.name} ready for processing`,
    });
  };
  
  // Caption style is fixed to minimal

  // Handle clip generation
  const handleGenerateClips = async () => {
    // Check if we have either a file upload or YouTube URL based on the mode
    if (!isYoutubeMode && !file) {
      setError('Please upload a video file.');
      toast({
        title: "No video selected",
        description: "Please select a video to process.",
        variant: "destructive"
      });
      return;
    }
    
    if (isYoutubeMode && (!youtubeUrl || !youtubeUrl.trim())) {
      setError('Please enter a YouTube URL.');
      toast({
        title: "No YouTube URL provided",
        description: "Please enter a valid YouTube video URL.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate YouTube URL format when in YouTube mode
    if (isYoutubeMode) {
      // Basic YouTube URL validation
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
      if (!youtubeRegex.test(youtubeUrl)) {
        setError('Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=xxxxxxxxxxx).');
        toast({
          title: "Invalid YouTube URL",
          description: "The URL you entered doesn't appear to be a valid YouTube video link.",
          variant: "destructive"
        });
        return;
      }
    }
    
    try {
      // First attempt to check if user is logged in and has enough coins
      console.log("Checking if user has enough coins for clip generation");
      let userAuthenticated = true;
      let coinsDeducted = false;
      
      try {
        const coinCheckResponse = await fetch('/api/clips/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        // If 401, it means user is not authenticated, proceed without coin deduction
        if (coinCheckResponse.status === 401) {
          console.log("User not authenticated, proceeding without coin deduction");
          userAuthenticated = false;
        } 
        // If 403 with insufficient coins message, show error and return
        else if (coinCheckResponse.status === 403) {
          const errorData = await coinCheckResponse.json();
          
          if (errorData.error === 'Insufficient coins') {
            toast({
              title: "Not enough coins",
              description: errorData.message || `You need 15 coins to generate AI clips (available: ${errorData.available})`,
              variant: "destructive"
            });
            return;
          }
          
          // Other 403 errors
          throw new Error(errorData.error || errorData.details || `Server error (${coinCheckResponse.status})`);
        }
        // For other non-OK responses, throw error
        else if (!coinCheckResponse.ok) {
          const errorData = await coinCheckResponse.json();
          throw new Error(errorData.error || errorData.details || `Server error (${coinCheckResponse.status})`);
        }
        // If response is OK, coins were successfully deducted
        else {
          coinsDeducted = true;
          const coinData = await coinCheckResponse.json();
          console.log("Coin deduction successful:", coinData);
          
          // Show toast about coin deduction
          toast({
            title: "Coins deducted",
            description: `15 coins were used for AI clip generation. Remaining: ${coinData.coins}`,
          });
        }
      } catch (err) {
        // If an error occurs during coin check but isn't fatal, log it and continue
        if (err instanceof Error && err.message.includes('Authentication required')) {
          console.log("User not authenticated, proceeding without coin deduction");
          userAuthenticated = false;
        } else if (err instanceof Error && !err.message.includes('Insufficient coins')) {
          console.error("Error checking coins but will proceed with clip generation:", err);
        } else {
          // If it's an insufficient coins error or other critical error, rethrow
          throw err;
        }
      }
      
      // Now proceed with clip generation
      setIsProcessing(true);
      setProcessingComplete(false);
      setProgress(0);
      setError(null);
      setClips([]);
      
      toast({
        title: "Processing started",
        description: "Your video is being processed. This may take a minute.",
      });
      
      // Progress simulation - cap at 95% until we get real data
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95; // Cap at 95% until actual data arrives
          }
          return Math.min(95, prev + Math.random() * 5 + 2);
        });
      }, 1000);
      
      // Create form data
      const formData = new FormData();
      
      // Add either video file or YouTube URL based on mode
      if (!isYoutubeMode && file) {
        formData.append('video', file);
        console.log("Video file:", file.name);
      } else if (isYoutubeMode && youtubeUrl) {
        formData.append('youtubeUrl', youtubeUrl);
        console.log("YouTube URL:", youtubeUrl);
      }
      
      // Add common parameters
      if (keywords.trim()) {
        formData.append('keywords', keywords.trim());
      }
      formData.append('captionStyle', defaultCaptionStyle);
      
      console.log("Sending form data to /api/clip endpoint");
      console.log("Mode:", isYoutubeMode ? "YouTube URL" : "File Upload");
      console.log("Caption style:", defaultCaptionStyle);
      console.log("Keywords:", keywords || "(none)");
      
      // Send to backend API
      const response = await fetch('/api/clip', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        let errorText = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorData.details || errorText;
        } catch (e) {
          console.error("Could not parse error response:", e);
        }
        throw new Error(errorText);
      }
      
      const data = await response.json();
      
      if (!data.clips || !Array.isArray(data.clips)) {
        throw new Error('Server returned invalid clip data');
      }
      
      setClips(data.clips);
      setProcessingComplete(true);
      
      // Set progress to 100% after a short delay to show completion animation
      setTimeout(() => {
        setProgress(100);
      }, 300);
      
      toast({
        title: "Success!",
        description: `Generated ${data.clips.length} clips from your video.`,
      });
      
      // Scroll to clips section
      setTimeout(() => {
        const section = document.getElementById('clips-section');
        section?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
      
      // Start automatic transcription of clips if enabled
      if (autoTranscribeEnabled) {
        // Add a slight delay to allow UI to update first
        setTimeout(() => {
          processAutoTranscriptions(data.clips);
        }, 1000);
      }
    } catch (err) {
      // No need to clear interval here as it's done in the finally block
      const message = err instanceof Error ? err.message : 'Failed to process video';
      setError(message);
      setProgress(0);
      setProcessingComplete(false);
      
      toast({
        title: "Processing failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateClips();
  };

  // Create video file from URL for transcription
  const createVideoFileFromUrl = async (url: string, filename: string = 'clip.mp4'): Promise<File | null> => {
    try {
      if (!url) {
        console.error('No URL provided to createVideoFileFromUrl');
        return null;
      }
      
      // Handle relative URLs
      const fullUrl = url.startsWith('http') 
        ? url 
        : `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
      
      console.log(`[createVideoFileFromUrl] Attempting to fetch video from: ${fullUrl}`);
      
      try {
        // First attempt with broader headers and credentials
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'same-origin',
          mode: 'cors',
          cache: 'no-cache',
        });
        
        if (!response.ok) {
          console.warn(`First fetch attempt failed for ${fullUrl}. Status: ${response.status}`);
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        
        // Get the blob and verify we have valid content
        const blob = await response.blob();
        console.log(`[createVideoFileFromUrl] Successfully fetched video blob. Size: ${(blob.size / 1024).toFixed(2)} KB, Type: ${blob.type || 'unknown'}`);
        
        if (blob.size === 0) {
          console.error(`[createVideoFileFromUrl] Retrieved empty blob from ${fullUrl}`);
          throw new Error('Retrieved empty blob (size 0)');
        }
        
        // Try to determine correct MIME type
        let fileType = blob.type;
        
        // If no type detected or incorrect type, attempt to infer from URL or filename
        if (!fileType || fileType === 'application/octet-stream' || !fileType.startsWith('video/')) {
          // Try to infer type from URL extension
          const urlExtMatch = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
          const ext = urlExtMatch ? urlExtMatch[1].toLowerCase() : '';
          
          console.log(`[createVideoFileFromUrl] No valid MIME type from blob, attempting to infer from extension: ${ext}`);
          
          // Map extensions to MIME types
          const extToMime: Record<string, string> = {
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'webm': 'video/webm',
            'mkv': 'video/x-matroska',
            'mpeg': 'video/mpeg',
            'mpg': 'video/mpeg',
            'm4v': 'video/mp4'
          };
          
          if (ext && extToMime[ext]) {
            fileType = extToMime[ext];
            console.log(`[createVideoFileFromUrl] Inferred MIME type ${fileType} from extension ${ext}`);
          } else {
            // Fallback to mp4 as default
            fileType = 'video/mp4';
            console.log(`[createVideoFileFromUrl] Using default MIME type ${fileType}`);
          }
        }
        
        // Create a file from the blob with explicit video MIME type
        const videoFile = new File([blob], filename, { type: fileType });
        console.log(`[createVideoFileFromUrl] Created video file: ${filename}, Size: ${(videoFile.size / 1024).toFixed(2)} KB, Type: ${fileType}`);
        
        // Sanity check the created file
        if (videoFile.size === 0) {
          console.error(`[createVideoFileFromUrl] Created file has zero size`);
          throw new Error('Created file has zero size');
        }
        
        return videoFile;
      } catch (fetchError) {
        console.error(`[createVideoFileFromUrl] Error fetching video: ${fetchError}`);
        return null;
      }
    } catch (error) {
      console.error('[createVideoFileFromUrl] Error creating video file from URL:', error);
      return null;
    }
  };
  
  // Process transcriptions for all clips in batch
  // Update function signature to match call site
  const processAutoTranscriptions = async (clips: any[], forceEndpoint?: string) => {
    console.log(`processAutoTranscriptions called with clips: ${clips.length}, endpoint: ${forceEndpoint || 'default'}`);
    
    if (!autoTranscribeEnabled && !forceEndpoint) {
      console.log("Auto-transcription is disabled, skipping (unless forceEndpoint is used)");
      return;
    }
    
    if (!clips.length) {
      console.log("No clips to transcribe");
      return;
    }
    
    // We don't need to check for API key in the client-side code 
    // as it's only accessible on the server side
    // The transcription service will verify the key's availability
    
    console.log(`Starting to transcribe ${clips.length} clips`);
    setIsTranscribing(true);
    toast({
      title: "Auto-transcription starting",
      description: `Transcribing ${clips.length} clips with Whisper AI`,
    });
    
    // Create an array of video files from the clips
    const videoFiles: File[] = [];
    const failedClips: number[] = [];
    
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const url = clip.originalVideoUrl || clip.clipUrl || clip.url;
      
      if (!url) {
        console.error(`No URL found for clip ${i+1}`);
        failedClips.push(i);
        continue;
      }
      
      console.log(`Processing clip ${i+1}, URL: ${url}`);
      const videoFile = await createVideoFileFromUrl(url, `clip_${i+1}.mp4`);
      
      if (videoFile) {
        console.log(`Successfully created video file for clip ${i+1}: ${videoFile.name}, size: ${videoFile.size} bytes, type: ${videoFile.type}`);
        videoFiles.push(videoFile);
      } else {
        console.error(`Failed to create video file for clip ${i+1}`);
        failedClips.push(i);
      }
    }
    
    console.log(`Prepared ${videoFiles.length} video files for transcription`);
    console.log(`Failed to prepare ${failedClips.length} clips`);
    
    if (!videoFiles.length) {
      console.error("No video files were successfully prepared for transcription");
      // Removed transcription failed toast
      setIsTranscribing(false);
      return;
    }
    
    // Start batch transcription
    try {
      // Track progress
      const onProgress = (progress: { total: number, completed: number, failed: number }) => {
        console.log(`Transcription progress: ${progress.completed}/${progress.total} complete, ${progress.failed} failed`);
        setTranscriptionProgress(progress);
      };
      
      // Process results when complete
      const onComplete = (results: { file: File, text: string, error?: string }[]) => {
        console.log("🔍 Transcription process complete. Raw results:", JSON.stringify(results));
        
        if (!results || results.length === 0) {
          console.error("❌ No transcription results received");
          toast({
            title: "Transcription issue",
            description: "No transcription results were received from the service",
            variant: "destructive"
          });
          return;
        }
        
        // Count successful transcriptions
        const successful = results.filter(r => r.text && !r.error).length;
        console.log(`✅ Successfully transcribed ${successful} out of ${results.length} clips`);
        
        // Check for errors
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
          console.error(`❌ ${errors.length} transcription errors:`, errors);
          errors.forEach((err, idx) => {
            console.error(`Error for file ${err.file?.name}: ${err.error}`);
          });
        }
        
        // Update clips with transcriptions as captions
        const updatedClips = [...clips];
        let updateCount = 0;
        
        console.log("🔄 Starting to update clips with transcriptions. Clips array length:", updatedClips.length);
        
        // DEBUG: Print the clips array structure
        console.log("Current clips array structure:", JSON.stringify(updatedClips.map(clip => {
          return {
            id: clip.id,
            hasUrl: !!clip.url,
            hasClipUrl: !!clip.clipUrl,
            hasOriginalUrl: !!clip.originalVideoUrl,
            hasCaption: !!clip.caption
          };
        })));
        
        results.forEach((result, index) => {
          if (index < updatedClips.length) {
            // Always use the text result even if there's an error - we want captions regardless
            if (result.text) {
              console.log(`📝 Adding caption to clip ${index + 1}:`, result.text.substring(0, 50) + '...');
              
              // IMPORTANT: Make sure the caption gets explicitly set on the clip object
              // Create proper caption from transcription - if it's too long, truncate it
              const transcribedText = result.text.trim();
              const maxCaptionLength = 150; // Maximum length for a caption
              const caption = transcribedText.length > maxCaptionLength 
                ? transcribedText.substring(0, maxCaptionLength) + '...' 
                : transcribedText;
              
              console.log(`🔍 Final transcribed caption for clip ${index + 1}:`, caption);
              
              // Create a complete copy of the clip object
              const currentClip = updatedClips[index];
              // Apply the transcription as caption using direct object property assignment
              updatedClips[index] = {
                ...currentClip, // spread the original first
                caption: caption, // explicitly override the caption
                captionText: caption, // some components might look for this property
                originalTranscription: transcribedText, // Store full transcription if needed
                whisperTranscribed: true,
                hasCaption: true // explicitly set this flag to true
              };
              
              // Double check that the caption was applied
              console.log(`Verification - Clip ${index + 1} caption set:`, updatedClips[index].caption ? 'YES' : 'NO');
              console.log(`Clip ${index + 1} caption content:`, updatedClips[index].caption);
              
              updateCount++;
              
              // Also store in localStorage for future reference
              try {
                const clipId = updatedClips[index].id || `clip_${index + 1}`;
                localStorage.setItem(`transcription-${clipId}`, result.text);
                console.log(`📦 Saved transcription to localStorage for clip ID ${clipId}`);
              } catch (err) {
                console.error("Error saving transcription to localStorage:", err);
              }
            } else {
              // Even if there's no text, add a generic caption
              const fallbackCaption = "Check out this amazing clip!";
              console.log(`⚠️ No transcription text for clip ${index + 1}, using fallback caption`);
              
              updatedClips[index] = {
                ...updatedClips[index],
                caption: fallbackCaption,
                captionText: fallbackCaption,
                hasCaption: true,
                whisperTranscribed: false
              };
              
              if (result.error) {
                console.error(`❌ Error transcribing clip ${index + 1}:`, result.error);
              }
            }
          } else {
            console.error(`❌ Result index ${index} is out of bounds for clips array (length: ${updatedClips.length})`);
          }
        });
        
        console.log(`✅ Updated ${updateCount} clips with transcriptions`);
        console.log("Final clips state:", JSON.stringify(updatedClips.map(c => ({ 
          id: c.id, 
          hasCaption: !!c.caption, 
          captionLength: c.caption ? c.caption.length : 0 
        }))));
        
        // Force a deep copy to ensure state update triggers
        const finalClips = JSON.parse(JSON.stringify(updatedClips));
        
        // Update clips with transcriptions - this should trigger a re-render
        setClips(finalClips);
        
        toast({
          title: "Transcription complete!",
          description: `${successful} of ${results.length} clips have been transcribed`,
          variant: successful > 0 ? "default" : "destructive"
        });
      };
      
      // Log before starting batch transcription
      console.log(`🚀 Starting batch transcription of ${videoFiles.length} files`);
      videoFiles.forEach((file, idx) => {
        console.log(`📄 File ${idx+1}: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      });
      
      // Run batch transcription with optional forced endpoint
      if (forceEndpoint) {
        console.log(`⏳ Using forced endpoint: ${forceEndpoint} for transcription`);
        
        let successCount = 0;
        let failCount = 0;
        const manualResults: { file: File, text: string, error?: string }[] = [];
        
        // Process each file one at a time with forced endpoint
        for (let i = 0; i < videoFiles.length; i++) {
          try {
            console.log(`🎯 Processing file ${i+1}/${videoFiles.length} with direct endpoint: ${forceEndpoint}`);
            onProgress({
              total: videoFiles.length,
              completed: i,
              failed: failCount
            });
            
            // Use the transcription hook directly
            const text = await transcribeAudio(
              videoFiles[i],
              undefined,
              false,
              forceEndpoint
            );
              
            manualResults.push({
              file: videoFiles[i],
              text: text
            });
            
            successCount++;
            console.log(`✅ Transcription successful for file ${i+1}`);
          } catch (error) {
            console.error(`❌ Error transcribing file ${i+1}:`, error);
            failCount++;
            manualResults.push({
              file: videoFiles[i],
              text: "An error occurred during transcription of this clip.",
              error: error instanceof Error ? error.message : "Unknown error"
            });
          }
          
          // Update progress
          onProgress({
            total: videoFiles.length,
            completed: i + 1,
            failed: failCount
          });
        }
        
        // Call complete handler with manual results
        console.log(`✅ Manual transcription with forced endpoint complete. Success: ${successCount}, Failed: ${failCount}`);
        onComplete(manualResults);
        return manualResults;
      } else {
        // Standard batch transcription process
        console.log("⏳ Calling batchTranscribeAudios with default endpoints...");
        const batchResults = await batchTranscribeAudios(videoFiles, onProgress, onComplete);
        console.log("✅ Batch transcription complete. Returned results:", batchResults?.length || 0);
        return batchResults;
      }
      
    } catch (error) {
      console.error("Batch transcription error:", error);
      // Removed transcription failed toast
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Handle clip download
  // Handle saving the edited caption
  const handleSaveCaption = () => {
    if (editingCaptionIndex !== null) {
      const updatedClips = [...clips];
      updatedClips[editingCaptionIndex] = {
        ...updatedClips[editingCaptionIndex],
        caption: editedCaption
      };
      setClips(updatedClips);
      setShowEditDialog(false);
      setEditingCaptionIndex(null);
      
      toast({
        title: "Caption Updated",
        description: "Your changes have been saved successfully."
      });
    }
  };
  
  // Open video editing dialog
  const handleOpenVideoEditor = (index: number) => {
    const clip = clips[index];
    // If the clip already has start/end times, use those, otherwise use defaults
    const startTime = clip.startTime !== undefined ? clip.startTime : 0;
    const endTime = clip.endTime !== undefined ? clip.endTime : 30; // Default to 30 seconds
    
    setEditingVideoIndex(index);
    setVideoStartTime(startTime);
    setVideoEndTime(endTime);
    
    // Set caption text and other properties if they exist
    setEditCaptionText(clip.captionText || clip.caption || "");
    setEditCaptionFont(clip.captionFont || "Arial");
    setEditCaptionSize(clip.captionSize || 24);
    setEditCaptionColor(clip.captionColor || "#FFFFFF");
    setEditCaptionPosition(clip.captionPosition || "bottom");
    setEditCaptionStyle(clip.captionStyle || "default");
    setEditCaptionBackground(clip.captionBackground !== undefined ? clip.captionBackground : true);
    
    // Set filter options if they exist
    setEditBrightness(clip.brightness || 100);
    setEditContrast(clip.contrast || 100);
    setEditSaturation(clip.saturation || 100);
    
    // Set export options if they exist
    setEditExportQuality(clip.exportQuality || "high");
    setEditExportFormat(clip.exportFormat || "mp4");
    
    setShowVideoEditDialog(true);
    
    toast({
      title: "Advanced Video Editor",
      description: "Edit your clip with professional tools"
    });
  };
  
  // State variables for video editing settings
  const [editCaptionText, setEditCaptionText] = useState("");
  const [editCaptionFont, setEditCaptionFont] = useState("Arial");
  const [editCaptionSize, setEditCaptionSize] = useState(24);
  const [editCaptionColor, setEditCaptionColor] = useState("#FFFFFF");
  const [editCaptionPosition, setEditCaptionPosition] = useState("bottom");
  const [editCaptionStyle, setEditCaptionStyle] = useState("default");
  const [editCaptionBackground, setEditCaptionBackground] = useState(true);
  
  const [editBrightness, setEditBrightness] = useState(100);
  const [editContrast, setEditContrast] = useState(100);
  const [editSaturation, setEditSaturation] = useState(100);
  
  const [editExportQuality, setEditExportQuality] = useState("high");
  const [editExportFormat, setEditExportFormat] = useState("mp4");
  
  // Handle saving the edited video with all settings
  const handleSaveVideoEdit = () => {
    if (editingVideoIndex !== null) {
      // Create a structure to hold all edit settings for this clip
      const videoEditSettings = {
        // Trim settings
        startTime: videoStartTime,
        endTime: videoEndTime,
        
        // Caption customization
        captionText: editCaptionText,
        captionFont: editCaptionFont,
        captionSize: editCaptionSize,
        captionColor: editCaptionColor,
        captionPosition: editCaptionPosition,
        captionStyle: editCaptionStyle,
        captionBackground: editCaptionBackground,
        
        // Video filters
        brightness: editBrightness,
        contrast: editContrast,
        saturation: editSaturation,
        
        // Export settings
        exportQuality: editExportQuality, 
        exportFormat: editExportFormat,
        
        // Track if advanced edits have been applied
        hasAdvancedEdits: true
      };
      
      // Update the clip with the edit settings
      const updatedClips = [...clips];
      updatedClips[editingVideoIndex] = {
        ...updatedClips[editingVideoIndex],
        ...videoEditSettings,
        
        // Add custom properties for the edited clip
        edited: true,
        editedAt: new Date().toISOString()
      };
      
      // If the edited clip has a caption already, keep it as captionText unless it was modified
      if (updatedClips[editingVideoIndex].caption && !editCaptionText) {
        updatedClips[editingVideoIndex].captionText = updatedClips[editingVideoIndex].caption;
      }
      
      setClips(updatedClips);
      setShowVideoEditDialog(false);
      setEditingVideoIndex(null);
      
      toast({
        title: "Video Edits Saved",
        description: `Your clip has been updated with advanced settings`,
        variant: "default"
      });
    }
  };

  const handleDownloadClip = async (clip: any, index: number) => {
    const clipId = clip.id || `clip_${index + 1}`;
    
    if (downloadingClips[clipId]) {
      toast({
        title: "Download in progress",
        description: "Please wait while we process your clip."
      });
      return;
    }
    
    try {
      setDownloadingClips(prev => ({ ...prev, [clipId]: true }));
      
      toast({
        title: "Processing clip",
        description: "Converting to vertical reel format..."
      });
      
      const downloadUrl = `/api/clip/download/${clipId}?format=vertical`;
      
      if (clip.startTime !== undefined && clip.endTime !== undefined) {
        const sourceUrl = clip.originalVideoUrl || clip.clipUrl || clip.url;
        const cleanSourceUrl = sourceUrl.startsWith('http') ? sourceUrl : 
          `${window.location.origin}${sourceUrl.startsWith('/') ? sourceUrl : `/${sourceUrl}`}`;
          
        // Build parameters including all our new editing options if they exist
        const queryParams = new URLSearchParams({
          source: cleanSourceUrl,
          start: String(clip.startTime || 0),
          end: String(clip.endTime || 30),
          format: clip.exportFormat || 'vertical',
          caption: clip.caption || ''
        });
        
        // Add caption customization parameters if the clip has them
        if (clip.captionText) {
          queryParams.append('captionText', clip.captionText);
        }
        
        if (clip.captionFont) {
          queryParams.append('captionFont', clip.captionFont);
        }
        
        if (clip.captionSize) {
          queryParams.append('captionSize', String(clip.captionSize));
        }
        
        if (clip.captionColor) {
          queryParams.append('captionColor', clip.captionColor);
        }
        
        if (clip.captionPosition) {
          queryParams.append('captionPosition', clip.captionPosition);
        }
        
        if (clip.captionStyle) {
          queryParams.append('captionStyle', clip.captionStyle);
        }
        
        if (clip.captionBackground !== undefined) {
          queryParams.append('captionBackground', String(clip.captionBackground));
        }
        
        // Add filter parameters if the clip has them
        if (clip.brightness && clip.brightness !== 100) {
          queryParams.append('brightness', String(clip.brightness));
        }
        
        if (clip.contrast && clip.contrast !== 100) {
          queryParams.append('contrast', String(clip.contrast));
        }
        
        if (clip.saturation && clip.saturation !== 100) {
          queryParams.append('saturation', String(clip.saturation));
        }
        
        // Add export quality parameter if the clip has it
        if (clip.exportQuality) {
          queryParams.append('quality', clip.exportQuality);
        }
        
        // Indication that this clip has advanced edits
        if (clip.hasAdvancedEdits) {
          queryParams.append('advanced', 'true');
        }
        
        // Track advanced edits for analytics
        if (clip.edited) {
          queryParams.append('edited', 'true');
          queryParams.append('editedAt', clip.editedAt || new Date().toISOString());
        }
        
        window.open(`${downloadUrl}&${queryParams.toString()}`, '_blank');
      } else {
        window.open(downloadUrl, '_blank');
      }
      
      toast({
        title: "Reel ready for download",
        description: clip.edited ? "Your customized clip is being processed with your editing settings." : "Your social-media ready clip is being downloaded.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error downloading clip:", error);
      toast({
        title: "Download failed",
        description: "Could not process clip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloadingClips(prev => {
        const newState = { ...prev };
        delete newState[clipId];
        return newState;
      });
    }
  };

  return (
    <div className="min-h-screen text-white relative">
      {/* Video Background */}
      <VideoBackground 
        videoUrl="https://video.wixstatic.com/video/ee3656_02cdf38384a0402cbc98a31bf21b5533/720p/mp4/file.mp4" 
      />
      <style>{`
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        
        @keyframes pulse {
          0% { opacity: 0.1; transform: scale(0.95); }
          100% { opacity: 0.3; transform: scale(1.05); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.8; }
        }
        
        .viral-badge {
          background: linear-gradient(90deg, #ff4d4d, #ff9f4d, #ffcd4d, #4dff77, #4dffff, #4d77ff, #9f4dff, #ff4dff);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
          color: white;
          font-weight: bold;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .glow-effect {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.2;
          animation: pulse 6s infinite alternate;
        }
        
        .star {
          position: absolute;
          background-color: white;
          border-radius: 50%;
          animation: twinkle 3s infinite;
        }
        
        .caption-style-box {
          cursor: pointer;
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 12px;
          transition: all 0.2s ease;
        }
        
        .caption-style-box.selected {
          background-color: #4C1D95;
          border-color: #8B5CF6;
        }
        
        .caption-style-box:not(.selected) {
          background-color: #2D2D2D;
        }
      `}</style>
      
      <div className="container mx-auto py-16 px-4 relative">
        {/* Background effects */}
        <div className="glow-effect" style={{ 
          background: 'radial-gradient(circle, rgba(236,72,153,1) 0%, rgba(168,85,247,1) 100%)',
          width: '40%',
          height: '40%',
          top: '30%',
          left: '30%'
        }}></div>
        
        {/* Create stars */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div 
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              opacity: Math.random() * 0.7 + 0.3,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            AI Clip Studio
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Upload your long-form video and automatically generate engaging short-form clips
            perfect for social media sharing.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-1 gap-8 max-w-3xl mx-auto">
          {/* Main upload form */}
          <div className="futuristic-container holographic-card p-6">
            <div className="hex-background"></div>
            <h2 className="text-2xl font-bold mb-6 flex items-center futuristic-purple-glow">
              <Scissors className="w-6 h-6 mr-2 text-purple-400" />
              Create Social Media Clips
            </h2>
            
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              {/* Video Source Selector - File Upload or YouTube URL */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsYoutubeMode(false);
                      setYoutubeUrl('');
                    }}
                    className={`text-sm font-medium px-3 py-1 rounded-full transition-all ${!isYoutubeMode 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    <Upload className="w-4 h-4 inline mr-1" />
                    File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsYoutubeMode(true);
                      setFile(null);
                    }}
                    className={`text-sm font-medium px-3 py-1 rounded-full transition-all ${isYoutubeMode 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    <Youtube className="w-4 h-4 inline mr-1" />
                    YouTube URL
                  </button>
                </div>
                
                {/* File upload input (shown when not in YouTube mode) */}
                {!isYoutubeMode && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-200">
                      Upload Video (MP4/MOV, max 2GB)
                    </label>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="neon-button flex items-center transition-all"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {file ? 'Change Video' : 'Select Video'}
                      </button>
                      {file && (
                        <span className="text-sm text-gray-300 truncate max-w-[250px]">
                          {file.name}
                        </span>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/quicktime,video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
                
                {/* YouTube URL input (shown in YouTube mode) */}
                {isYoutubeMode && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-200">
                      Enter YouTube Video URL
                    </label>
                    <div className="flex items-start space-x-3">
                      <input
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="cyberpunk-input w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Paste a full YouTube video URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
                    </p>
                  </div>
                )}
              </div>
              
              {/* Keywords */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-200">
                  Keywords (Optional)
                </label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Enter keywords to guide clip selection, e.g., 'business tips, marketing, social media'"
                  className="cyberpunk-input w-full"
                  rows={2}
                />
              </div>
              
              {/* Caption style information (minimal style used by default) */}
              <div className="hidden">{/* Caption style UI removed */}</div>
              
              {/* Transcription is handled automatically behind the scenes */}
              <div className="hidden">
                {/* Auto-transcription UI removed - transcription still happens automatically */}
                {isTranscribing && (
                  <div className="mt-2 space-y-1">
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-600" 
                        style={{ 
                          width: transcriptionProgress.total > 0 
                            ? `${Math.round((transcriptionProgress.completed + transcriptionProgress.failed) / transcriptionProgress.total * 100)}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={(isYoutubeMode ? !youtubeUrl : !file) || isProcessing}
                  className={`w-full py-3 px-6 font-medium flex items-center justify-center space-x-2 ${
                    (isYoutubeMode ? !youtubeUrl : !file) || isProcessing
                      ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                      : 'neon-button'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing Video...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate Clips</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            
            {/* Debug section - only visible when clips are available */}
            {/* Debug tools removed */}
            
            {/* Progress bar */}
            {isProcessing && (
              <div className="mt-6 space-y-2">
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500" 
                    style={{ width: `${processingComplete ? 100 : progress}%` }}
                  ></div>
                </div>
                <p className="text-right text-sm text-gray-300">
                  {processingComplete ? '100' : Math.round(progress)}% Complete
                </p>
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-800 rounded-md text-red-200">
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Generated clips section */}
        {clips.length > 0 && (
          <div id="clips-section" className="mt-16 space-y-6">
            <div className="text-center relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
              </div>
              <h2 className="relative inline-block px-6 py-2 bg-gray-900 text-2xl font-bold text-center">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                  <span className="bg-gradient-to-r from-yellow-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Your AI-Generated Clips
                  </span>
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                </div>
              </h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {clips.map((clip, index) => (
                <div
                  key={index}
                  className="holographic-card transition-all duration-300 hover:shadow-purple-900/30 hover:shadow-2xl relative group overflow-hidden"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10">
                    <div className="relative">
                      <div className={`mx-auto ${clip.type === 'reel' ? 'bg-black rounded-t-xl overflow-hidden border border-purple-900/30' : ''}`} 
                        style={{ 
                          maxWidth: clip.type === 'reel' ? '320px' : 'none',
                          boxShadow: clip.type === 'reel' ? '0 8px 32px rgba(0,0,0,0.5)' : 'none'
                        }}>
                        {clip.type === 'reel' ? (
                          <div className="relative pt-[177.78%]">
                            <iframe 
                              src={clip.url}
                              className="absolute inset-0 w-full h-full"
                              frameBorder="0"
                              allowFullScreen
                              loading="lazy"
                              title={`Vertical Reel Clip ${index + 1}`}
                            ></iframe>
                          </div>
                        ) : (
                          <video 
                            src={clip.originalVideoUrl || clip.url}
                            className="w-full aspect-video object-cover"
                            controls
                            playsInline
                            preload="metadata"
                          ></video>
                        )}
                      </div>
                      
                      {/* Viral score badge */}
                      <div className="absolute top-2 right-2 viral-badge group-hover:scale-110 transition-transform duration-300">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-white" />
                          <span>Viral Score: {clip.viralScore || (85 + index * 3)}%</span>
                        </div>
                      </div>
                      
                      {/* Clip number badge */}
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold p-1 px-2 rounded-md backdrop-blur-sm">
                        Clip {index + 1}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-medium text-gray-300 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-400" />
                            <span>Timestamp: {clip.timestamp || `${index * 1.5}:${(index * 27) % 60}`}</span>
                          </div>
                          <div className="text-xs font-medium text-gray-300 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-400" />
                            <span>Engagement: {clip.engagement || 'High'}</span>
                          </div>
                        </div>
                        <div className="px-2 py-1 bg-purple-900/30 rounded-md border border-purple-800/50 text-xs font-medium text-purple-300">
                          {clip.duration || '~30sec'}
                        </div>
                      </div>
                      
                      <div className="mb-4 bg-gray-900/70 p-4 rounded-md border border-purple-900/30 text-sm">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-purple-300 mb-1 flex items-center justify-between">
                              <div className="flex items-center">
                                AI Generated Caption:
                                {clip.caption && (
                                  <span className="ml-2 text-xs flex items-center text-green-400 bg-green-900/30 py-0.5 px-2 rounded-full">
                                    <BadgeCheck className="inline h-3 w-3 mr-1" />
                                    Whisper Transcribed
                                  </span>
                                )}
                              </div>
                              <button 
                                onClick={() => {
                                  setEditingCaptionIndex(index);
                                  setEditedCaption(clip.caption || "This engaging clip highlights the key points from your video, perfect for social sharing and growing your audience quickly.");
                                  setShowEditDialog(true);
                                }}
                                className="ml-2 text-xs flex items-center text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-800/40 py-1 px-2 rounded-full transition-colors"
                              >
                                <Edit className="inline h-3 w-3 mr-1" />
                                Edit
                              </button>
                            </h4>
                            <p className="text-gray-300">{clip.caption || "This engaging clip highlights the key points from your video, perfect for social sharing and growing your audience quickly."}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 mb-2">
                        <button 
                          className={`flex-1 cyberpunk-button-subtle flex items-center justify-center gap-1 ${
                            downloadingClips[clip.id || `clip_${index + 1}`] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={() => handleDownloadClip(clip, index)}
                          disabled={downloadingClips[clip.id || `clip_${index + 1}`]}
                        >
                          {downloadingClips[clip.id || `clip_${index + 1}`] ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </>
                          )}
                        </button>
                        
                        <button 
                          className="flex-1 cyberpunk-button-indigo flex items-center justify-center gap-1"
                          onClick={() => handleOpenVideoEditor(index)}
                        >
                          <Scissors className="w-4 h-4" />
                          <span>Edit Clip</span>
                        </button>
                        
                        <button 
                          className="flex-1 neon-button py-2 px-3 flex items-center justify-center gap-1"
                          onClick={() => {
                            const clipUrl = (clip.originalVideoUrl || clip.url).startsWith('http') 
                              ? (clip.originalVideoUrl || clip.url)
                              : `${window.location.origin}${(clip.originalVideoUrl || clip.url).startsWith('/') ? (clip.originalVideoUrl || clip.url) : `/${clip.originalVideoUrl || clip.url}`}`;
                              
                            // Copy to clipboard
                            navigator.clipboard.writeText(clipUrl).then(() => {
                              toast({
                                title: "URL Copied!",
                                description: "Video link copied to clipboard",
                              });
                            }).catch(err => {
                              console.error("Failed to copy URL:", err);
                              window.open(clipUrl, '_blank');
                            });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          <span>Share</span>
                        </button>
                      </div>
                      
                      {/* Transcription Button Row */}
                      <div className="mt-2 px-4 pb-4">
                        <TranscriptionButton 
                          file={clip.videoFile || (clip.url ? new File([clip.url], 'clip.mp4', { type: 'video/mp4' }) : null)}
                          onTranscriptionComplete={(text) => {
                            toast({
                              title: "Transcription Complete",
                              description: "The video clip has been transcribed successfully."
                            });
                            
                            // You can use the transcription text here for further processing
                            console.log(`Clip ${index} transcription:`, text);
                            
                            // Store the transcription in localStorage for future use
                            try {
                              const clipId = clip.id || `clip_${index + 1}`;
                              localStorage.setItem(`transcription-${clipId}`, text);
                              
                              // You could use this for captions or SEO text
                              toast({
                                title: "Transcription Saved",
                                description: "This transcript can now be used for captions or SEO"
                              });
                            } catch (err) {
                              console.error("Error saving transcription:", err);
                            }
                          }}
                          coinCost={15}
                          buttonSize="default"
                          variant="outline"
                          className="w-full flex justify-center items-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-purple-500/30 rounded-md transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Caption Edit Dialog */}
      <CaptionEditDialog 
        show={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        caption={editedCaption}
        onChange={setEditedCaption}
        onSave={handleSaveCaption}
      />
      
      {/* Video Edit Dialog */}
      <VideoEditDialog 
        show={showVideoEditDialog}
        onClose={() => setShowVideoEditDialog(false)}
        startTime={videoStartTime}
        endTime={videoEndTime}
        onStartChange={setVideoStartTime}
        onEndChange={setVideoEndTime}
        captionText={editCaptionText}
        setCaptionText={setEditCaptionText}
        captionFont={editCaptionFont}
        setCaptionFont={setEditCaptionFont}
        captionSize={editCaptionSize}
        setCaptionSize={setEditCaptionSize}
        captionColor={editCaptionColor}
        setCaptionColor={setEditCaptionColor}
        captionPosition={editCaptionPosition}
        setCaptionPosition={setEditCaptionPosition}
        captionStyle={editCaptionStyle}
        setCaptionStyle={setEditCaptionStyle}
        captionBackground={editCaptionBackground}
        setCaptionBackground={setEditCaptionBackground}
        brightness={editBrightness}
        setBrightness={setEditBrightness}
        contrast={editContrast}
        setContrast={setEditContrast}
        saturation={editSaturation}
        setSaturation={setEditSaturation}
        exportQuality={editExportQuality}
        setExportQuality={setEditExportQuality}
        exportFormat={editExportFormat}
        setExportFormat={setEditExportFormat}
        onSave={handleSaveVideoEdit}
        id="video-editor"
      />
    </div>
  );
};

// Add the dialog for caption editing
const CaptionEditDialog = ({ 
  show, 
  onClose, 
  caption, 
  onSave, 
  onChange 
}: { 
  show: boolean; 
  onClose: () => void; 
  caption: string; 
  onSave: () => void; 
  onChange: (value: string) => void;
}) => {
  return (
    <Dialog open={show} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-gray-900 border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Edit Caption</DialogTitle>
          <DialogDescription className="text-gray-400">
            Modify the AI-generated caption to better match your content
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={caption}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your edited caption here..."
            className="min-h-[150px] w-full rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
        
        <DialogFooter className="flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Caption
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Add the dialog for video editing
const VideoEditDialog = ({ 
  show, 
  onClose, 
  startTime,
  endTime, 
  onSave, 
  onStartChange,
  onEndChange,
  captionText,
  setCaptionText,
  captionFont,
  setCaptionFont,
  captionSize,
  setCaptionSize,
  captionColor,
  setCaptionColor,
  captionPosition,
  setCaptionPosition,
  captionStyle,
  setCaptionStyle,
  captionBackground,
  setCaptionBackground,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  saturation,
  setSaturation,
  exportQuality,
  setExportQuality,
  exportFormat,
  setExportFormat,
  id
}: { 
  show: boolean; 
  onClose: () => void; 
  startTime: number;
  endTime: number;
  onSave: () => void; 
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  captionText: string;
  setCaptionText: (value: string) => void;
  captionFont: string;
  setCaptionFont: (value: string) => void;
  captionSize: number;
  setCaptionSize: (value: number) => void;
  captionColor: string;
  setCaptionColor: (value: string) => void;
  captionPosition: string;
  setCaptionPosition: (value: string) => void;
  captionStyle: string;
  setCaptionStyle: (value: string) => void;
  captionBackground: boolean;
  setCaptionBackground: (value: boolean) => void;
  brightness: number;
  setBrightness: (value: number) => void;
  contrast: number;
  setContrast: (value: number) => void;
  saturation: number;
  setSaturation: (value: number) => void;
  exportQuality: string;
  setExportQuality: (value: string) => void;
  exportFormat: string;
  setExportFormat: (value: string) => void;
  id?: string;
}) => {
  // State for tabs
  const [activeTab, setActiveTab] = useState("trim");
  
  // Fonts available
  const fonts = ["Arial", "Verdana", "Georgia", "Montserrat", "Roboto", "Open Sans"];
  
  // Caption styles
  const captionStyles = [
    { id: "default", name: "Default" },
    { id: "minimal", name: "Minimal" },
    { id: "bold", name: "Bold" },
    { id: "gradient", name: "Gradient" },
    { id: "subtitle", name: "Subtitle" },
    { id: "tiktok", name: "TikTok Style" }
  ];
  
  // Caption positions
  const positions = [
    { id: "top", name: "Top" },
    { id: "bottom", name: "Bottom" },
    { id: "middle", name: "Middle" },
    { id: "custom", name: "Custom" }
  ];
  
  // Export quality options
  const qualities = [
    { id: "low", name: "Low (faster)" },
    { id: "medium", name: "Medium" },
    { id: "high", name: "High (slower)" }
  ];
  
  return (
    <Dialog open={show} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent id={id} className="bg-gray-900 border border-gray-800 text-white max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
            Advanced Video Editor
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Customize your video clip with our professional editing tools
          </DialogDescription>
        </DialogHeader>
        
        {/* Tab navigation */}
        <div className="flex border-b border-gray-800 mb-4">
          <button 
            className={`px-4 py-2 ${activeTab === "trim" 
              ? "text-purple-400 border-b-2 border-purple-400" 
              : "text-gray-400 hover:text-white"}`}
            onClick={() => setActiveTab("trim")}
          >
            <Scissors className="w-4 h-4 mr-2 inline-block" />
            Trim
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === "captions" 
              ? "text-purple-400 border-b-2 border-purple-400" 
              : "text-gray-400 hover:text-white"}`}
            onClick={() => setActiveTab("captions")}
          >
            <MessageSquare className="w-4 h-4 mr-2 inline-block" />
            Captions
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === "filters" 
              ? "text-purple-400 border-b-2 border-purple-400" 
              : "text-gray-400 hover:text-white"}`}
            onClick={() => setActiveTab("filters")}
          >
            <Star className="w-4 h-4 mr-2 inline-block" />
            Filters
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === "export" 
              ? "text-purple-400 border-b-2 border-purple-400" 
              : "text-gray-400 hover:text-white"}`}
            onClick={() => setActiveTab("export")}
          >
            <Download className="w-4 h-4 mr-2 inline-block" />
            Export
          </button>
        </div>
        
        {/* Tab content */}
        <div className="py-2 space-y-6">
          {/* Trim tab */}
          {activeTab === "trim" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Start Time (seconds)</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="range" 
                    min="0" 
                    max={endTime} 
                    step="0.1" 
                    value={startTime}
                    onChange={(e) => onStartChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16 px-2 py-1 text-center bg-gray-800 rounded border border-gray-700">
                    {startTime.toFixed(1)}s
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">End Time (seconds)</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="range" 
                    min={startTime} 
                    max="300" 
                    step="0.1" 
                    value={endTime}
                    onChange={(e) => onEndChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16 px-2 py-1 text-center bg-gray-800 rounded border border-gray-700">
                    {endTime.toFixed(1)}s
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-gray-800/50 rounded-md">
                <p className="text-sm text-gray-400">Clip Duration: <span className="text-white font-medium">{(endTime - startTime).toFixed(1)} seconds</span></p>
              </div>
            </div>
          )}
          
          {/* Captions tab */}
          {activeTab === "captions" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Caption Text</label>
                <Textarea 
                  value={captionText} 
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Enter caption text here..." 
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Font</label>
                  <select 
                    value={captionFont}
                    onChange={(e) => setCaptionFont(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
                  >
                    {fonts.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Font Size</label>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="range" 
                      min="12" 
                      max="72" 
                      step="1" 
                      value={captionSize}
                      onChange={(e) => setCaptionSize(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="w-12 px-2 py-1 text-center bg-gray-800 rounded border border-gray-700">
                      {captionSize}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Text Color</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="color" 
                      value={captionColor}
                      onChange={(e) => setCaptionColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-700"
                    />
                    <span className="text-gray-300">{captionColor}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Position</label>
                  <select 
                    value={captionPosition}
                    onChange={(e) => setCaptionPosition(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
                  >
                    {positions.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Caption Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {captionStyles.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setCaptionStyle(style.id)}
                      className={`p-2 rounded text-center text-sm ${
                        captionStyle === style.id
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="caption-background"
                  checked={captionBackground}
                  onChange={(e) => setCaptionBackground(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-800"
                />
                <label htmlFor="caption-background" className="text-sm font-medium text-gray-300">
                  Add semi-transparent background
                </label>
              </div>
              
              <div className="p-3 bg-gray-800/50 rounded-md">
                <p className="text-sm text-gray-400">Preview not available in editor. Your captions will be applied during export.</p>
              </div>
            </div>
          )}
          
          {/* Filters tab */}
          {activeTab === "filters" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Brightness</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="range" 
                    min="50" 
                    max="150" 
                    step="1" 
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-12 px-2 py-1 text-center bg-gray-800 rounded border border-gray-700">
                    {brightness}%
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Contrast</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="range" 
                    min="50" 
                    max="150" 
                    step="1" 
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-12 px-2 py-1 text-center bg-gray-800 rounded border border-gray-700">
                    {contrast}%
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Saturation</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    step="1" 
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-12 px-2 py-1 text-center bg-gray-800 rounded border border-gray-700">
                    {saturation}%
                  </div>
                </div>
              </div>
              
              <div className="p-3 mt-4 bg-gray-800/50 rounded-md">
                <p className="text-sm text-gray-400">Filter Preview: These filters will be applied during export. Reset to 100% for normal appearance.</p>
              </div>
            </div>
          )}
          
          {/* Export tab */}
          {activeTab === "export" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Export Quality</label>
                <div className="grid grid-cols-3 gap-2">
                  {qualities.map(quality => (
                    <button
                      key={quality.id}
                      onClick={() => setExportQuality(quality.id)}
                      className={`p-2 rounded text-center text-sm ${
                        exportQuality === quality.id
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {quality.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setExportFormat("mp4")}
                    className={`p-2 rounded text-center text-sm ${
                      exportFormat === "mp4"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    MP4
                  </button>
                  <button
                    onClick={() => setExportFormat("webm")}
                    className={`p-2 rounded text-center text-sm ${
                      exportFormat === "webm"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    WebM
                  </button>
                  <button
                    onClick={() => setExportFormat("gif")}
                    className={`p-2 rounded text-center text-sm ${
                      exportFormat === "gif"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    GIF
                  </button>
                </div>
              </div>
              
              <div className="p-3 bg-purple-900/20 border border-purple-800/30 rounded-md mt-4">
                <h3 className="font-semibold text-purple-400 flex items-center">
                  <BadgeCheck className="w-5 h-5 mr-2" />
                  Premium Export Features
                </h3>
                <p className="text-sm text-gray-300 mt-1">
                  Your edits will include adjustments from all tabs: trim times, caption customizations, and filter effects.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-end space-x-3 mt-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleAIClipStudioPage;