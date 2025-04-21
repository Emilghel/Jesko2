/**
 * Runway API Integration using the official SDK
 * 
 * This module provides a streamlined interface to Runway's image-to-video capabilities
 * using the official Runway SDK to handle versioning and API complexities.
 */
import fs from 'fs';
import path from 'path';
import RunwayML from '@runwayml/sdk';
import { logger } from '../logger';

// Environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

// Set the environment variable expected by the SDK
process.env.RUNWAYML_API_SECRET = RUNWAY_API_KEY;

// Available aspect ratios for video generation
export type AspectRatio = '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672';

// Supported model versions
export type RunwayModelVersion = 'gen4_turbo' | 'gen3a_turbo';

/**
 * Verify that the Runway API is properly configured with an API key
 */
export function isConfigured(): boolean {
  return !!RUNWAY_API_KEY;
}

/**
 * Generate a video from an image using Runway's latest models (Gen4/Gen3)
 * 
 * @param imagePath Path to the source image file
 * @param prompt Text prompt describing desired motion/animation
 * @param outputPath Path where the resulting video will be saved
 * @param options Additional generation options
 * @returns Information about the generated video
 */
export async function generateVideoFromImage(
  imagePath: string,
  prompt: string,
  outputPath: string,
  options: {
    modelVersion?: RunwayModelVersion,
    negativePrompt?: string,
    ratio?: AspectRatio,
    duration?: 5 | 10,
    seed?: number
  } = {}
): Promise<{
  success: boolean,
  videoPath: string,
  duration: number,
  message?: string,
  error?: string,
  taskId?: string
}> {
  try {
    // Validate API key
    if (!RUNWAY_API_KEY) {
      throw new Error('RUNWAY_API_KEY is not set in environment variables');
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Set default options
    const {
      modelVersion = 'gen4_turbo',
      negativePrompt = '',
      ratio = '1280:720',
      duration = 5,
      seed
    } = options;

    logger.info(`Starting video generation with Runway SDK`);
    logger.info(`Model: ${modelVersion}`);
    logger.info(`Prompt: ${prompt}`);
    logger.info(`Image: ${imagePath}`);
    
    // Read and encode the image to base64
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at path: ${imagePath}`);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Determine the image type based on the file extension
    const fileExt = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (fileExt === '.png') mimeType = 'image/png';
    if (fileExt === '.webp') mimeType = 'image/webp';
    if (fileExt === '.gif') mimeType = 'image/gif';
    
    const imageDataUri = `data:${mimeType};base64,${base64Image}`;
    
    // Initialize the Runway SDK client
    const client = new RunwayML();
    
    // Create the video generation task
    const videoTask = await client.imageToVideo.create({
      model: modelVersion,
      promptImage: imageDataUri,
      promptText: prompt,
      ratio: ratio,
      duration: duration,
      ...(negativePrompt ? { negativePrompt } : {}),
      ...(seed !== undefined ? { seed } : {})
    });
    
    logger.info(`Task created successfully! Task ID: ${videoTask.id}`);
    
    // Poll for task completion
    logger.info('Polling for task completion (this may take some time)...');
    
    let task;
    let startTime = Date.now();
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes max wait time
    
    do {
      // Wait for 10 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check if we've exceeded the max wait time
      if (Date.now() - startTime > maxWaitTime) {
        logger.warn(`Task still processing after ${maxWaitTime/1000} seconds. Returning task ID for later retrieval.`);
        return {
          success: false,
          videoPath: '',
          duration: duration,
          message: 'Task still processing. Check status later using task ID.',
          taskId: videoTask.id
        };
      }
      
      task = await client.tasks.retrieve(videoTask.id);
      logger.info(`Task status: ${task.status}`);
      
    } while (!['SUCCEEDED', 'FAILED'].includes(task.status));
    
    // Handle task completion
    if (task.status === 'SUCCEEDED') {
      logger.info('Task completed successfully!');
      
      // Check if there's an output URL
      if (task.output) {
        const outputUrl = task.output;
        logger.info(`Video URL: ${outputUrl}`);
        
        // Download the generated video
        logger.info(`Downloading video to ${outputPath}...`);
        
        const response = await fetch(String(outputUrl));
        const fileStream = fs.createWriteStream(outputPath);
        
        if (!response.body) {
          throw new Error('Response body is null');
        }
        
        // Convert ReadableStream to Node.js ReadableStream
        const reader = response.body.getReader();
        
        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fileStream.write(Buffer.from(value));
          }
          fileStream.end();
        };
        
        await processStream();
        
        return {
          success: true,
          videoPath: outputPath,
          duration: duration,
          message: `Successfully generated video from image using ${modelVersion}`,
          taskId: videoTask.id
        };
      } else {
        throw new Error('Task succeeded but no output URL found');
      }
    } else if (task.status === 'FAILED') {
      const errorMsg = 'Task processing failed';
      throw new Error(`Task failed: ${errorMsg}`);
    } else {
      throw new Error(`Unexpected task status: ${task.status}`);
    }
  } catch (error) {
    logger.error(`Runway SDK error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      videoPath: '',
      duration: 0,
      error: `Error generating video: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Check the status of a previously created video generation task
 * 
 * @param taskId The ID of the task to check
 * @param outputPath Path where the resulting video will be saved if the task is complete
 * @returns Information about the task and video (if complete)
 */
export async function checkVideoGenerationStatus(
  taskId: string,
  outputPath: string
): Promise<{
  success: boolean,
  status: string,
  videoPath: string,
  message?: string,
  error?: string
}> {
  try {
    // Validate API key
    if (!RUNWAY_API_KEY) {
      throw new Error('RUNWAY_API_KEY is not set in environment variables');
    }
    
    // Initialize the Runway SDK client
    const client = new RunwayML();
    
    // Retrieve the task
    const task = await client.tasks.retrieve(taskId);
    logger.info(`Task status: ${task.status}`);
    
    // Handle different task statuses
    if (task.status === 'SUCCEEDED') {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Check if there's an output URL
      if (task.output) {
        const outputUrl = task.output;
        logger.info(`Video URL: ${outputUrl}`);
        
        // Download the generated video
        logger.info(`Downloading video to ${outputPath}...`);
        
        const response = await fetch(String(outputUrl));
        const fileStream = fs.createWriteStream(outputPath);
        
        if (!response.body) {
          throw new Error('Response body is null');
        }
        
        // Convert ReadableStream to Node.js ReadableStream
        const reader = response.body.getReader();
        
        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fileStream.write(Buffer.from(value));
          }
          fileStream.end();
        };
        
        await processStream();
        
        return {
          success: true,
          status: task.status,
          videoPath: outputPath,
          message: 'Video generation completed successfully'
        };
      } else {
        return {
          success: false,
          status: task.status,
          videoPath: '',
          error: 'Task succeeded but no output URL found'
        };
      }
    } else if (task.status === 'FAILED') {
      const errorMsg = 'Task processing failed';
      return {
        success: false,
        status: task.status,
        videoPath: '',
        error: `Task failed: ${errorMsg}`
      };
    } else {
      // Task is still in progress
      return {
        success: false,
        status: task.status,
        videoPath: '',
        message: `Task is still processing. Status: ${task.status}`
      };
    }
  } catch (error) {
    logger.error(`Runway SDK error checking task: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      status: 'ERROR',
      videoPath: '',
      error: `Error checking task: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Interpolate between multiple images to create a smooth video transition
 * Note: This is currently using the legacy API as the SDK doesn't directly support this yet
 * 
 * @param imagePaths Paths to the source images
 * @param outputPath Path where the resulting video will be saved
 * @param options Additional options for interpolation
 * @returns Information about the generated video
 */
export async function interpolateImages(
  imagePaths: string[],
  outputPath: string,
  options: {
    mode?: 'standard' | 'linear' | 'cubic',
    fps?: number,
    margin?: number
  } = {}
): Promise<{
  success: boolean,
  videoPath: string,
  duration: number,
  message?: string,
  error?: string
}> {
  try {
    // Validate API key
    if (!RUNWAY_API_KEY) {
      throw new Error('RUNWAY_API_KEY is not set in environment variables');
    }

    // Validate image paths
    if (!imagePaths || imagePaths.length < 2) {
      throw new Error('At least two images are required for interpolation');
    }

    // Ensure all images exist
    for (const imagePath of imagePaths) {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found at path: ${imagePath}`);
      }
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Set default options
    const { 
      mode = 'standard',
      fps = 30,
      margin = 0
    } = options;

    logger.info(`Starting image interpolation with ${imagePaths.length} images`);
    logger.info(`Mode: ${mode}, FPS: ${fps}, Margin: ${margin}`);

    // For now, until SDK supports interpolation, we'll return a message
    // that this feature is in progress and will be available soon
    return {
      success: false,
      videoPath: '',
      duration: 0,
      error: 'Image interpolation is currently being implemented with the Runway SDK. Please use the legacy API for now.'
    };
    
    /*
    // This is placeholder for future SDK implementation
    // Initialize the Runway SDK client
    const client = new RunwayML();
    
    // Create the interpolation task
    // SDK doesn't yet support this directly
    
    // Return success response with video path
    return {
      success: true,
      videoPath: outputPath,
      duration: (imagePaths.length - 1) * (1 / fps) * (1 + margin),
      message: `Successfully generated interpolated video from ${imagePaths.length} images`
    };
    */
  } catch (error) {
    logger.error(`Runway SDK error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      videoPath: '',
      duration: 0,
      error: `Error generating interpolated video: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get information about available Runway models
 * 
 * @returns Information about available models
 */
export async function getAvailableModels(): Promise<{
  success: boolean,
  models?: any[],
  error?: string
}> {
  try {
    if (!RUNWAY_API_KEY) {
      throw new Error('RUNWAY_API_KEY is not set in environment variables');
    }
    
    // Currently, the SDK may not directly support listing models
    // So we'll return the known models
    return {
      success: true,
      models: [
        {
          id: 'gen4_turbo',
          name: 'Gen-4 Turbo',
          description: 'Latest model for image-to-video generation with improved quality',
          type: 'image-to-video'
        },
        {
          id: 'gen3a_turbo',
          name: 'Gen-3a Turbo',
          description: 'High-quality model for image-to-video generation',
          type: 'image-to-video'
        }
      ]
    };
  } catch (error) {
    logger.error(`Error getting available models: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      error: `Error getting available models: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}