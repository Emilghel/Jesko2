/**
 * Video utility functions for working with video files
 */
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extracts a thumbnail image from a video file at a specific timestamp
 * 
 * @param videoPath Path to the video file
 * @param outputDir Directory where the thumbnail will be saved
 * @param timestamp Time in seconds where the frame should be captured
 * @returns Path to the generated thumbnail
 */
export async function generateThumbnailFromVideo(
  videoPath: string,
  outputDir: string = path.join(process.cwd(), 'uploads'),
  timestamp: number = 1 // Default to 1 second into the video
): Promise<string> {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate a unique filename for the thumbnail
    const thumbnailFilename = `thumbnail-${Date.now()}-${uuidv4()}.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailFilename);
    
    // Use ffmpeg to extract a frame from the video
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-ss', timestamp.toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2', // High quality
        thumbnailPath
      ]);
      
      let errorOutput = '';
      
      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.error('FFmpeg error output:', errorOutput);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (err) => {
        reject(err);
      });
    });
    
    // Return the relative path to the thumbnail
    return `/uploads/${thumbnailFilename}`;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
}

/**
 * Gets the duration of a video file in seconds
 * 
 * @param videoPath Path to the video file
 * @returns Duration in seconds
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    return new Promise<number>((resolve, reject) => {
      const ffmpeg = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath
      ]);
      
      let output = '';
      let errorOutput = '';
      
      ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          // Parse the duration
          const duration = parseFloat(output.trim());
          resolve(isNaN(duration) ? 5 : duration); // Default to 5 seconds if parsing fails
        } else {
          console.error('FFprobe error output:', errorOutput);
          reject(new Error(`FFprobe exited with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error getting video duration:', error);
    return 5; // Default to 5 seconds on error
  }
}