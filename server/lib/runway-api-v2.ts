/**
 * Runway API Integration v2
 * 
 * This module handles communication with the Runway API for turning static images
 * into dynamic videos with customized motion.
 * 
 * This implementation provides:
 * 1. Simplified endpoint discovery
 * 2. Multiple API version handling
 * 3. Robust error recovery
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { logger } from '../logger';

// Get API base URL from environment variables (with fallback to production)
const RUNWAY_API_BASE_URL = process.env.RUNWAY_API_BASE_URL || 'https://api.runwayml.com/v1';

// Get API key from environment
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
if (RUNWAY_API_KEY) {
  // Only show the first and last 5 characters of the API key for security
  const maskedKey = RUNWAY_API_KEY.substring(0, 5) + '...' + RUNWAY_API_KEY.substring(RUNWAY_API_KEY.length - 5);
  logger.info(`Runway API key configured (masked): ${maskedKey}`);
} else {
  logger.warn('⚠️ RUNWAY_API_KEY is not set in environment variables');
  logger.warn('Runway API integration will not function without a valid API key');
}

// Define available Runway models for video generation
export type RunwayGenVideoModel = 'gen-2' | 'gen-1';
export type RunwayInterpolateModel = 'interpolate';
export type InterpolateMode = 'standard' | 'linear' | 'cubic';

/**
 * Generate a video from an image using Runway Gen-1 or Gen-2 models
 * 
 * This v2 implementation uses a simplified approach with clearer error handling
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
    // Validate API key
    if (!RUNWAY_API_KEY) {
      throw new Error('RUNWAY_API_KEY is not set in environment variables');
    }

    // Log the operation
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
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Determine image mime type based on file extension
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
    
    // Try the API call
    const response = await callRunwayAPI(payload);
    
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
  } 
  catch (error) {
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
 * Try multiple Runway API endpoints and version formats
 * This function systematically attempts different endpoints and headers
 */
async function callRunwayAPI(payload: any) {
  // Potential endpoints to try
  const endpoints = [
    // Simple endpoints without version prefix
    '/generations',
    
    // Standard endpoints
    '/generations/image-to-video',
    '/text-to-video',
    '/image-to-video',
    
    // Versioned endpoints
    '/v1/generations',
    '/v2/generations',
    
    // Model-specific endpoints
    '/gen-2/image-to-video',
    '/gen-1/image-to-video',
    
    // Legacy or alternative formats
    '/videos/generate',
    '/images/text-to-video'
  ];
  
  // Version headers to try
  const versionHeaders = [
    // Updated version headers based on API error responses
    // The API specifically requires X-Runway-Version with a date format of 'YYYY-MM-DD'
    // Try with the recommended format
    { 'X-Runway-Version': '2023-12-01' }, // More recent stable version
    
    // Try with 2023 dates - these are more likely to be supported
    { 'X-Runway-Version': '2023-11-15' },
    { 'X-Runway-Version': '2023-10-30' },
    { 'X-Runway-Version': '2023-09-20' },
    { 'X-Runway-Version': '2023-08-01' },
    { 'X-Runway-Version': '2023-07-15' },
    { 'X-Runway-Version': '2023-06-15' },
    { 'X-Runway-Version': '2023-05-25' },
    { 'X-Runway-Version': '2023-04-20' },
    { 'X-Runway-Version': '2023-03-15' },
    { 'X-Runway-Version': '2023-02-10' },
    { 'X-Runway-Version': '2023-01-30' },
    
    // 2022 dates
    { 'X-Runway-Version': '2022-12-20' },
    { 'X-Runway-Version': '2022-11-15' },
    { 'X-Runway-Version': '2022-10-01' },
    
    // If we really need to, try without a version header
    // (This is unlikely to work based on error messages)
    { 'X-Runway-Version': '' }
  ];
  
  // Track all errors for debugging
  const errors = [];
  
  // Try each endpoint
  for (const endpoint of endpoints) {
    const fullEndpoint = `${RUNWAY_API_BASE_URL}${endpoint}`;
    logger.info(`Trying Runway API endpoint: ${fullEndpoint}`);
    
    // Try each version header with this endpoint
    for (const versionHeader of versionHeaders) {
      try {
        // Try with Bearer token authentication
        logger.info(`Trying API request with ${Object.keys(versionHeader).length ? 'version header: ' + JSON.stringify(versionHeader) : 'no version header'}`);
        
        const response = await axios.post(
          fullEndpoint,
          payload,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RUNWAY_API_KEY}`,
              ...versionHeader
            },
            responseType: 'json',
            timeout: 120000 // 2 minute timeout
          }
        );
        
        // If request succeeds, log which combination worked
        logger.info(`SUCCESS! Connected to Runway API at ${endpoint}`);
        if (Object.keys(versionHeader).length) {
          logger.info(`Using version header: ${JSON.stringify(versionHeader)}`);
        } else {
          logger.info('No version header was required');
        }
        
        // Return the successful response
        return response;
      } 
      catch (error: any) {
        // Log the error and continue trying
        const errorDetails = {
          endpoint,
          versionHeader,
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          error: error.response?.data?.error
        };
        
        errors.push(errorDetails);
        logger.warn(`API request failed: ${JSON.stringify(errorDetails)}`);
      }
    }
  }
  
  // If we get here, all attempts failed
  logger.error(`All Runway API attempts failed after trying ${endpoints.length} endpoints with ${versionHeaders.length} version headers`);
  throw new Error(`Failed to connect to Runway API. Please check API key and version requirements. Errors: ${JSON.stringify(errors.slice(0, 3))}`);
}

/**
 * Generate video by interpolating between multiple images using Runway's Interpolate model
 * 
 * This simplified implementation uses the same robust endpoint discovery approach
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
    // Validate API key
    if (!RUNWAY_API_KEY) {
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
      
      // Determine the image type based on the file extension
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
    
    logger.info(`Starting Runway interpolation API request`);
    logger.info(`Mode: ${mode}, FPS: ${fps}`);
    
    // Potential endpoints to try for interpolation
    const endpoints = [
      '/interpolations',
      '/interpolate',
      '/transitions',
      '/v1/interpolate',
      '/v1/interpolations',
      '/v2/interpolations'
    ];
    
    // Version headers to try - same as in generateVideoFromImage
    const versionHeaders = [
      // Updated version headers based on API error responses
      // The API specifically requires X-Runway-Version with a date format of 'YYYY-MM-DD'
      // Try with the recommended format
      { 'X-Runway-Version': '2023-12-01' }, // More recent stable version
      
      // Try with 2023 dates - these are more likely to be supported
      { 'X-Runway-Version': '2023-11-15' },
      { 'X-Runway-Version': '2023-10-30' },
      { 'X-Runway-Version': '2023-09-20' },
      { 'X-Runway-Version': '2023-08-01' },
      { 'X-Runway-Version': '2023-07-15' },
      { 'X-Runway-Version': '2023-06-15' },
      { 'X-Runway-Version': '2023-05-25' },
      { 'X-Runway-Version': '2023-04-20' },
      { 'X-Runway-Version': '2023-03-15' },
      { 'X-Runway-Version': '2023-02-10' },
      { 'X-Runway-Version': '2023-01-30' },
      
      // 2022 dates
      { 'X-Runway-Version': '2022-12-20' },
      { 'X-Runway-Version': '2022-11-15' },
      { 'X-Runway-Version': '2022-10-01' },
      
      // If we really need to, try without a version header
      // (This is unlikely to work based on error messages)
      { 'X-Runway-Version': '' }
    ];
    
    // Try each endpoint
    for (const endpoint of endpoints) {
      const fullEndpoint = `${RUNWAY_API_BASE_URL}${endpoint}`;
      logger.info(`Trying Runway interpolation API endpoint: ${fullEndpoint}`);
      
      // Try each version header with this endpoint
      for (const versionHeader of versionHeaders) {
        try {
          logger.info(`Trying version header: ${Object.keys(versionHeader).length ? JSON.stringify(versionHeader) : 'no header'}`);
          
          const response = await axios.post(
            fullEndpoint,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${RUNWAY_API_KEY}`,
                ...versionHeader
              },
              responseType: 'json',
              timeout: 300000 // 5 minute timeout for interpolation which can take longer
            }
          );
          
          // If request succeeds, log which combination worked
          logger.info(`SUCCESS! Connected to Runway interpolation API at ${endpoint}`);
          
          // Check if the response has the expected URL
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
              logger.error(`Error writing interpolated video file: ${err.message}`);
              reject(err);
            });
          });
          
          // Verify the file exists and has content
          const fileStats = fs.statSync(outputPath);
          if (fileStats.size === 0) {
            throw new Error('Generated interpolated video file is empty');
          }
          
          // Calculate approximate duration based on number of images and fps
          const durationInSeconds = (imagePaths.length - 1) * (30 / fps);
          
          logger.info(`Successfully generated interpolated video: ${outputPath} (${fileStats.size} bytes)`);
          
          return {
            success: true,
            videoPath: outputPath,
            duration: durationInSeconds,
            message: `Successfully generated interpolated video from ${imagePaths.length} images`
          };
        } 
        catch (error: any) {
          // Log the error and continue trying
          logger.warn(`Interpolation API request failed: ${error.message}`);
        }
      }
    }
    
    // If we get here, all attempts failed
    throw new Error('Failed to connect to Runway interpolation API after trying multiple endpoints');
  }
  catch (error) {
    logger.error(`Runway API interpolation error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      videoPath: '',
      duration: 0,
      error: `Error interpolating images: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Export helper function to check if API is properly configured
export function isConfigured(): boolean {
  return !!RUNWAY_API_KEY;
}

/**
 * Get available models from the Runway API - placeholder for now
 * Implementation would be added based on API documentation
 */
export async function getAvailableModels(): Promise<{
  name: string,
  id: string,
  type: string,
  description: string
}[]> {
  return [
    {
      name: 'Gen-2',
      id: 'gen-2',
      type: 'text-to-video',
      description: 'Latest generation AI video model'
    },
    {
      name: 'Gen-1',
      id: 'gen-1',
      type: 'text-to-video',
      description: 'First generation AI video model'
    }
  ];
}