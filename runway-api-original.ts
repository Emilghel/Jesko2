/**
 * Runway API Integration for Image-to-Video Generation
 * 
 * This module handles communication with the Runway API for turning static images
 * into dynamic videos with customized motion.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { logger } from '../logger';

// Runway API base URL and endpoints
const RUNWAY_API_BASE_URL = 'https://api.runwayml.com';
const RUNWAY_GEN_VIDEO_ENDPOINT = '/v1/images/generate-video';
const RUNWAY_INTERPOLATE_ENDPOINT = '/v1/interpolate';

// Runway model types
export type RunwayGenVideoModel = 'gen-2' | 'gen-1';
export type RunwayInterpolateModel = 'interpolate';

// Interpolation modes
export type InterpolateMode = 'standard' | 'linear' | 'cubic';

/**
 * Generate a video from an image using Runway's Gen-1 or Gen-2 models
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
    modelVersion?: RunwayGenVideoModel,
    negativePrompt?: string,
    numFrames?: number,
    numSteps?: number,
    seed?: number,
    structureSeed?: number,
    motionScale?: number,
    guidance?: number,
    timeScale?: number
  } = {}
): Promise<{
  success: boolean,
  videoPath: string,
  duration: number,
  message?: string,
  error?: string
}> {
  try {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      throw new Error('RUNWAY_API_KEY is not set in environment variables');
    }

    logger.info(`Starting image-to-video generation with Runway API`);
    logger.info(`Image path: ${imagePath}`);
    logger.info(`Prompt: ${prompt}`);
    logger.info(`Output path: ${outputPath}`);
    
    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at path: ${imagePath}`);
    }

    // Set default options
    const {
      modelVersion = 'gen-2',
      negativePrompt = '',
      numFrames = 120,  // Gen-2 default is 24, but this ensures longer videos
      numSteps = 30,    // Default value for quality
      seed = Math.floor(Math.random() * 2147483647),  // Random seed
      structureSeed = Math.floor(Math.random() * 2147483647),  // Random structure seed
      motionScale = 0.6,  // Medium motion scale
      guidance = 25,     // Default guidance scale
      timeScale = 1.0    // Normal time scale
    } = options;

    // Read the image file as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Make sure the output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Determine the image type based on the file extension or default to jpeg
    const fileExt = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (fileExt === '.png') mimeType = 'image/png';
    if (fileExt === '.webp') mimeType = 'image/webp';
    if (fileExt === '.gif') mimeType = 'image/gif';
    
    logger.info(`Detected mime type for image: ${mimeType}`);
    
    // Create request payload
    const payload = {
      prompt,
      negative_prompt: negativePrompt, 
      input_image: `data:${mimeType};base64,${base64Image}`,
      num_frames: numFrames,
      num_steps: numSteps,
      model: modelVersion,
      seed: seed,
      structure_seed: structureSeed,
      motion_scale: motionScale,
      guidance_scale: guidance,
      time_scale: timeScale
    };
    
    // Log the payload (without the base64 image) for debugging
    logger.info(`Payload: ${JSON.stringify({
      ...payload,
      input_image: '[Base64 image data omitted]'
    }, null, 2)}`);
    
    
    logger.info(`Sending request to Runway API: ${RUNWAY_API_BASE_URL}${RUNWAY_GEN_VIDEO_ENDPOINT}`);
    logger.info(`Model: ${modelVersion}, Frames: ${numFrames}, Steps: ${numSteps}`);
    
    try {
      // Send request to Runway API
      const response = await axios.post(
        `${RUNWAY_API_BASE_URL}${RUNWAY_GEN_VIDEO_ENDPOINT}`,
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          responseType: 'json',
          timeout: 120000 // 2 minute timeout as video generation can take time
        }
      );
      
      if (!response.data || !response.data.url) {
        throw new Error('No video URL in Runway API response');
      }
      
      // Download the generated video
      const videoUrl = response.data.url;
      logger.info(`Downloading generated video from: ${videoUrl}`);
      
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'stream'
      });
      
      // Save the video to the output path
      const writer = fs.createWriteStream(outputPath);
      videoResponse.data.pipe(writer);
      
      // Return a promise that resolves when the file is written
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (err) => {
          logger.error(`Error writing output file: ${err.message}`);
          reject(err);
        });
      });
      
      // Verify the file was successfully written and has content
      const fileStats = fs.statSync(outputPath);
      if (fileStats.size === 0) {
        throw new Error('Generated video file is empty');
      }
      
      // Calculate approximate duration based on frames and fps
      // Assuming 30fps for Runway videos
      const durationInSeconds = numFrames / 30;
      
      logger.info(`Successfully generated video from image: ${outputPath} (${fileStats.size} bytes)`);
      
      return {
        success: true,
        videoPath: outputPath,
        duration: durationInSeconds,
        message: 'Video successfully generated from image'
      };
    } catch (apiError: any) {
      // Handle API call errors with more detail
      const statusCode = apiError.response?.status;
      const errorMessage = apiError.response?.data?.message || apiError.message;
      
      logger.error(`Runway API request error: ${errorMessage} (Status code: ${statusCode || 'unknown'})`);
      
      // Handle specific error cases
      if (statusCode === 400) {
        if (errorMessage.includes('credit') || errorMessage.includes('insufficient') || errorMessage.includes('quota')) {
          throw new Error('Insufficient credits on your Runway account. Please add credits to continue.');
        } else {
          throw new Error(`Runway API validation error: ${errorMessage}`);
        }
      } else if (statusCode === 401 || statusCode === 403) {
        throw new Error('Authentication error with Runway API. Please check your API key.');
      } else if (statusCode === 429) {
        throw new Error('Rate limit exceeded on Runway API. Please try again later.');
      } else {
        throw new Error(`Runway API error: ${errorMessage}`);
      }
    }
    
  } catch (error) {
    logger.error(`Runway API error: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      videoPath: '',
      duration: 0,
      error: `Error generating video: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Generate video by interpolating between multiple images using Runway's Interpolate model
 * 
 * @param imagePaths Paths to the source images to interpolate between
 * @param outputPath Path where the resulting video will be saved
 * @param options Additional interpolation options
 * @returns Information about the generated video
 */
export async function interpolateImages(
  imagePaths: string[],
  outputPath: string,
  options: {
    mode?: InterpolateMode,
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
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      throw new Error('RUNWAY_API_KEY is not set in environment variables');
    }

    if (imagePaths.length < 2) {
      throw new Error('At least two images are required for interpolation');
    }

    logger.info(`Starting image interpolation with Runway API`);
    logger.info(`Number of images: ${imagePaths.length}`);
    logger.info(`Output path: ${outputPath}`);
    
    // Set default options
    const {
      mode = 'standard',
      fps = 30,
      margin = 0
    } = options;

    // Create form data for the API request
    const formData = new FormData();
    formData.append('mode', mode);
    formData.append('fps', fps.toString());
    formData.append('margin', margin.toString());
    
    // Add images to form data
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      
      // Check if image file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found at path: ${imagePath}`);
      }
      
      // Determine the image type based on the file extension or default to jpeg
      const fileExt = path.extname(imagePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (fileExt === '.png') mimeType = 'image/png';
      if (fileExt === '.webp') mimeType = 'image/webp';
      if (fileExt === '.gif') mimeType = 'image/gif';
      
      logger.info(`Image ${i+1}: ${path.basename(imagePath)}, MIME type: ${mimeType}`);
      
      const fileStream = fs.createReadStream(imagePath);
      formData.append('image', fileStream, {
        filename: path.basename(imagePath),
        contentType: mimeType
      });
    }
    
    // Make sure the output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    logger.info(`Sending request to Runway API: ${RUNWAY_API_BASE_URL}${RUNWAY_INTERPOLATE_ENDPOINT}`);
    logger.info(`Mode: ${mode}, FPS: ${fps}`);
    
    try {
      // Send request to Runway API
      const response = await axios.post(
        `${RUNWAY_API_BASE_URL}${RUNWAY_INTERPOLATE_ENDPOINT}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${apiKey}`
          },
          responseType: 'json',
          timeout: 120000 // 2 minute timeout
        }
      );
      
      if (!response.data || !response.data.url) {
        throw new Error('No video URL in Runway API response');
      }
      
      // Download the generated video
      const videoUrl = response.data.url;
      logger.info(`Downloading interpolated video from: ${videoUrl}`);
      
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'stream'
      });
      
      // Save the video to the output path
      const writer = fs.createWriteStream(outputPath);
      videoResponse.data.pipe(writer);
      
      // Return a promise that resolves when the file is written
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (err) => {
          logger.error(`Error writing output file: ${err.message}`);
          reject(err);
        });
      });
      
      // Verify the file was successfully written and has content
      const fileStats = fs.statSync(outputPath);
      if (fileStats.size === 0) {
        throw new Error('Generated video file is empty');
      }
      
      // Calculate approximated duration based on number of images and fps
      // This is just an estimate as actual interpolation duration depends on various factors
      const estimatedFrames = (imagePaths.length - 1) * 30; // Assuming ~30 frames between each pair of images
      const durationInSeconds = estimatedFrames / fps;
      
      logger.info(`Successfully generated interpolated video: ${outputPath} (${fileStats.size} bytes)`);
      
      return {
        success: true,
        videoPath: outputPath,
        duration: durationInSeconds,
        message: 'Successfully created interpolated video'
      };
    } catch (apiError: any) {
      // Handle API call errors with more detail
      const statusCode = apiError.response?.status;
      const errorMessage = apiError.response?.data?.message || apiError.message;
      
      logger.error(`Runway API request error: ${errorMessage} (Status code: ${statusCode || 'unknown'})`);
      
      // Handle specific error cases
      if (statusCode === 400) {
        if (errorMessage.includes('credit') || errorMessage.includes('insufficient') || errorMessage.includes('quota')) {
          throw new Error('Insufficient credits on your Runway account. Please add credits to continue.');
        } else {
          throw new Error(`Runway API validation error: ${errorMessage}`);
        }
      } else if (statusCode === 401 || statusCode === 403) {
        throw new Error('Authentication error with Runway API. Please check your API key.');
      } else if (statusCode === 429) {
        throw new Error('Rate limit exceeded on Runway API. Please try again later.');
      } else {
        throw new Error(`Runway API error: ${errorMessage}`);
      }
    }
    
  } catch (error) {
    logger.error(`Runway API error: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      videoPath: '',
      duration: 0,
      error: `Error generating interpolated video: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get available models from the Runway API
 * 
 * @returns List of available Runway models
 */
export async function getAvailableModels(): Promise<{
  id: string,
  name: string,
  description: string,
  type: 'gen-video' | 'interpolate' | 'other'
}[]> {
  try {
    // Runway doesn't have a specific models endpoint accessible through the public API
    // So we return a hardcoded list of the models we support
    return [
      {
        id: 'gen-2',
        name: 'Gen-2',
        description: 'Latest generation for high-quality image-to-video transformations',
        type: 'gen-video'
      },
      {
        id: 'gen-1',
        name: 'Gen-1',
        description: 'First generation model for basic image-to-video transformations',
        type: 'gen-video'
      },
      {
        id: 'interpolate',
        name: 'Interpolate',
        description: 'Creates smooth transitions between multiple images',
        type: 'interpolate'
      }
    ];
  } catch (error) {
    logger.error(`Error getting Runway models: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}