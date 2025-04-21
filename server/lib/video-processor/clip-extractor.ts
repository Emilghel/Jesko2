import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';

// Create the necessary directories if they don't exist
const processedClipsDir = path.join(process.cwd(), 'public', 'processed-clips');
if (!fs.existsSync(processedClipsDir)) {
  fs.mkdirSync(processedClipsDir, { recursive: true });
}

// Types for the clip extractor
interface ClipOptions {
  startTime: number;       // Start time in seconds
  endTime: number;         // End time in seconds
  format: 'vertical' | 'horizontal';  // Output format
  quality?: 'low' | 'medium' | 'high';  // Output quality
  cropPosition?: 'center' | 'smart';  // Auto-crop position or smart crop
  caption?: string;       // Optional caption to overlay
  captionStyle?: 'minimal' | 'bold' | 'gradient' | 'subtitle' | 'trending';  // Caption style preset
  fileName?: string;      // Custom output filename
}

interface ClipResult {
  success: boolean;
  outputPath?: string;    // Path to the processed clip
  error?: string;         // Error message if failed
  duration?: number;      // Duration of the output clip
}

/**
 * Extracts a clip from a video with specified options
 * 
 * @param videoPath Path to source video
 * @param options Options for clip extraction
 * @returns Promise with the result information
 */
export async function extractClip(videoPath: string, options: ClipOptions): Promise<ClipResult> {
  console.log(`Extracting clip from ${videoPath} with options:`, options);
  
  try {
    // Validate the source video exists
    if (!fs.existsSync(videoPath)) {
      console.error(`Source video file not found: ${videoPath}`);
      return {
        success: false,
        error: `Source video file not found: ${videoPath}`
      };
    }
    
    // Generate output filename if not provided
    const outputFileName = options.fileName || 
      `clip_${Date.now()}_${options.startTime}_${options.endTime}.mp4`;
    
    // Ensure file extension is .mp4
    const outputFileNameWithExt = outputFileName.endsWith('.mp4') 
      ? outputFileName 
      : `${outputFileName}.mp4`;
    
    // Full path for the processed clip in the public directory
    const processedClipsDir = path.join(process.cwd(), 'public', 'processed-clips');
    const outputFilePath = path.join(processedClipsDir, outputFileNameWithExt);
    
    // Ensure the directory exists
    if (!fs.existsSync(processedClipsDir)) {
      fs.mkdirSync(processedClipsDir, { recursive: true });
    }
    
    // Calculate clip duration
    const clipDuration = options.endTime - options.startTime;
    
    if (clipDuration <= 0) {
      return {
        success: false,
        error: 'Invalid clip duration. End time must be greater than start time.'
      };
    }
    
    console.log(`Processing clip with duration: ${clipDuration}s`);
    
    // Determine video quality settings based on the quality option
    let videoBitrate = '1500k';
    let videoCodecOptions = 'profile=high:level=4.1';
    
    switch (options.quality) {
      case 'low':
        videoBitrate = '800k';
        break;
      case 'medium':
        videoBitrate = '1500k';
        break;
      case 'high':
        videoBitrate = '3000k';
        break;
      default:
        // Default to medium quality
        videoBitrate = '1500k';
    }
    
    // Initialize ffmpeg command
    const command = ffmpeg(videoPath)
      .setStartTime(options.startTime)
      .duration(clipDuration)
      .outputOptions([
        '-c:v libx264',
        `-b:v ${videoBitrate}`,
        `-preset medium`,
        `-crf 23`,
        `-maxrate ${videoBitrate}`,
        `-bufsize ${parseInt(videoBitrate) * 2}k`
      ]);
    
    // If vertical format is requested (9:16 aspect ratio for reels/TikTok style)
    if (options.format === 'vertical') {
      // Calculate filter for vertical format (9:16 aspect ratio for reels)
      let filterComplex = '';
      
      // Create a 9:16 vertical video with a blurred background
      // This will ensure we always have the proper vertical aspect ratio
      if (options.caption) {
        // Get caption style configuration based on style preset
        const captionStyle = getCaptionStyleConfig(options.captionStyle);
        
        // Add caption to the video with the selected style
        filterComplex = `
          color=black:1080x1920[base];
          [0:v]scale=1080:-2,boxblur=10[blurbg];
          [base][blurbg]overlay=(W-w)/2:(H-h)/2[bg];
          [0:v]scale=-2:1600[fg];
          [bg][fg]overlay=(W-w)/2:(H-h)/2[verticalvid];
          [verticalvid]drawtext=text='${options.caption}':${captionStyle}
        `;
      } else {
        // No caption, just create a vertical video
        filterComplex = `
          color=black:1080x1920[base];
          [0:v]scale=1080:-2,boxblur=10[blurbg];
          [base][blurbg]overlay=(W-w)/2:(H-h)/2[bg];
          [0:v]scale=-2:1600[fg];
          [bg][fg]overlay=(W-w)/2:(H-h)/2
        `;
      }
      
      // Apply the complex filter
      command.outputOptions([
        '-filter_complex', filterComplex.replace(/\n\s+/g, ' ').trim()
      ]);
    }
    
    // If caption is provided and we're NOT in vertical mode (which has its own caption handling)
    else if (options.caption && options.format === 'horizontal') {
      // Add the caption overlay filter as a new output option
      command.outputOptions([
        '-vf', 
        `drawtext=text='${options.caption}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.7:boxborderw=8:x=(w-text_w)/2:y=h-th-40`
      ]);
    }
    
    // Add audio options
    command.outputOptions([
      '-c:a aac',
      '-b:a 128k'
    ]);
    
    // Setup progress monitoring
    command.on('progress', (progress: any) => {
      const percent = progress?.percent || 0;
      console.log(`Processing: ${Math.round(percent)}% done`);
    });
    
    // Debugging: log full FFmpeg command
    command.on('start', (commandLine: string) => {
      console.log('Executing FFmpeg command:', commandLine);
    });
    
    // Process the video
    return new Promise((resolve) => {
      command
        .on('error', (err: any) => {
          console.error('Error during FFmpeg processing:', err);
          resolve({
            success: false,
            error: `FFmpeg processing error: ${err.message}`
          });
        })
        .on('end', () => {
          console.log('FFmpeg processing completed successfully');
          // Return the public URL path (relative to public directory)
          resolve({
            success: true,
            outputPath: `/processed-clips/${outputFileNameWithExt}`,
            duration: clipDuration
          });
        })
        .save(outputFilePath);
    });
  } catch (error: unknown) {
    console.error('Error in extractClip:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Gets the FFmpeg drawtext filter configuration based on the selected caption style
 * 
 * @param style Selected caption style preset (minimal, bold, gradient, subtitle, trending)
 * @returns FFmpeg drawtext filter parameters as string
 */
function getCaptionStyleConfig(style?: string): string {
  // Default style parameters
  const defaultStyle = 'fontcolor=white:fontsize=48:box=1:boxcolor=black@0.7:boxborderw=10:x=(w-text_w)/2:y=h-th-100';
  
  // Return the appropriate style based on the selection
  switch (style) {
    case 'minimal':
      // Clean, minimalistic style with semi-transparent background
      return 'fontcolor=white:fontsize=44:box=1:boxcolor=black@0.5:boxborderw=6:x=(w-text_w)/2:y=h-th-80';
      
    case 'bold':
      // Bold, attention-grabbing caption with larger text and stronger border
      return 'fontcolor=white:fontsize=54:fontweight=800:box=1:boxcolor=black@0.8:boxborderw=12:x=(w-text_w)/2:y=h-th-100';
      
    case 'gradient':
      // Gradient text effect with rainbow-like colors for TikTok-style videos
      return 'fontcolor=0x00FFFF@0.8:fontsize=50:shadowcolor=0xFF00FF@0.7:shadowx=2:shadowy=2:box=1:boxcolor=black@0.5:boxborderw=8:x=(w-text_w)/2:y=h-th-90';
      
    case 'subtitle':
      // Professional subtitle style at the bottom of the screen
      return 'fontcolor=white:fontsize=40:fontname=Arial:box=1:boxcolor=black@0.6:boxborderw=5:x=(w-text_w)/2:y=h-th-40';
      
    case 'trending':
      // High-impact style for viral content with emoji-ready fonts
      return 'fontcolor=yellow:fontsize=52:box=1:boxcolor=purple@0.5:boxborderw=10:x=(w-text_w)/2:y=h-th-120:shadowcolor=black@0.8:shadowx=3:shadowy=3';
      
    default:
      // Return the default style if none specified
      return defaultStyle;
  }
}

/**
 * Gets information about a video file (duration, resolution, etc.)
 * 
 * @param videoPath Path to the video file
 * @returns Promise with the video information
 */
export async function getVideoInfo(videoPath: string): Promise<any> {
  try {
    const ffprobeAsync = promisify((path: string, callback: (err: Error | null, data: any) => void) => {
      ffmpeg.ffprobe(path, callback);
    });
    
    return await ffprobeAsync(videoPath);
  } catch (error) {
    console.error('Error getting video info:', error);
    throw new Error(`Failed to get video information: ${error instanceof Error ? error.message : String(error)}`);
  }
}