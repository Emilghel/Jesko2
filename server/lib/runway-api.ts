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

// Runway API Configuration
// Use the correct development API base URL for Runway
// This is the specific endpoint for Runway's development API
// Try using the production API as the dev API may have different version requirements
// If the dev API is specified in environment variables, use that instead
const RUNWAY_API_BASE_URL = process.env.RUNWAY_API_BASE_URL || 'https://api.runwayml.com/v1';

// Log the configuration being used
logger.info(`Using Runway API base URL: ${RUNWAY_API_BASE_URL}`);

// Get API key from environment
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
if (RUNWAY_API_KEY) {
  // Mask key for security in logs
  const maskedKey = RUNWAY_API_KEY.substring(0, 5) + '...' + RUNWAY_API_KEY.substring(RUNWAY_API_KEY.length - 5);
  logger.info(`Runway API key configured (masked): ${maskedKey}`);
} else {
  logger.warn('⚠️ RUNWAY_API_KEY is not set in environment variables');
}

// API version is already included in the base URL
const API_VERSION = 'v1';

// Generate a current timestamp in the same format as the example
function getCurrentRunwayTimestamp() {
  // Generate a timestamp that matches "Sun, Apr 13, 2025 2:48 AM" format
  const now = new Date();
  
  // Build the string manually to avoid complex Date formatting issues
  // Get day of week (Sun, Mon, etc)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = dayNames[now.getUTCDay()];
  
  // Get month (Jan, Feb, etc)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[now.getUTCMonth()];
  
  // Get day of month (1, 2, ..., 31)
  const day = now.getUTCDate();
  
  // Get year (e.g., 2025)
  const year = now.getUTCFullYear();
  
  // Get hour (1-12)
  let hour = now.getUTCHours() % 12;
  if (hour === 0) hour = 12;
  
  // Get minute (00-59)
  const minute = now.getUTCMinutes().toString().padStart(2, '0');
  
  // Get AM/PM
  const ampm = now.getUTCHours() < 12 ? 'AM' : 'PM';
  
  // Format as "Sun, Apr 13, 2025 2:48 AM"
  return `${dayOfWeek}, ${month} ${day}, ${year} ${hour}:${minute} ${ampm}`;
}

// For versions that use a fixed format
const RUNWAY_API_VERSION = 'Sun, Apr 13, 2025 2:48 AM';

// Generate the headers for the API request
function getRunwayVersionHeaders() {
  const headers = [];
  
  // First, try with no version header at all as a baseline
  // This is the simplest approach and lets the API use its default version
  headers.push({});
  
  // Next try with the current timestamp - important for time-based versioning
  headers.push({ 'X-Runway-Version': getCurrentRunwayTimestamp() });
  
  // Try a simple date format without time (YYYY-MM-DD)
  // This is a common API versioning format
  const today = new Date();
  const simpleDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  headers.push({ 'X-Runway-Version': simpleDate });
  
  // Try specific formats based on Runway documentation
  headers.push({ 'X-Runway-Version': '2023-06-01' }); // Gen-2 release date
  headers.push({ 'X-Runway-Version': '2023-03-20' }); // Gen-1 release date
  
  // Try semantic version numbers
  headers.push({ 'X-Runway-Version': '2.0' });
  headers.push({ 'X-Runway-Version': '1.0' });
  
  // Try the static example
  headers.push({ 'X-Runway-Version': RUNWAY_API_VERSION });
  
  // Try alternative formats (lowercase header key)
  headers.push({ 'x-runway-version': 'latest' });
  headers.push({ 'x-runway-version': 'stable' });
  
  return headers;
}

// Identify all possible endpoint formats for Runway API
// These are all the potential endpoint patterns we've found in documentation or through research
// We'll try them all systematically until we find one that works

// Primary endpoint formats to try first (most likely to work)
const PRIMARY_ENDPOINTS = {
  generation: '/generations', // Simple, no version prefix
  interpolate: '/interpolations'
};

// Format 1: 2023-2024 API structure
const RUNWAY_API_V1_ENDPOINTS = {
  generation: '/v1/images/text-to-video',
  interpolate: '/v1/interpolate'
};

// Format 2: Early 2025 API structure
const RUNWAY_API_V2_ENDPOINTS = {
  generation: '/v2/generations',
  interpolate: '/v2/interpolations'
};

// Format 3: Newer API structure with "api" prefix
const RUNWAY_API_PREFIXED_ENDPOINTS = {
  generation: '/api/v1/text-to-video',
  interpolate: '/api/v1/interpolate'
};

// Format 4: Gen-2 specific API
const RUNWAY_API_GEN2_ENDPOINTS = {
  generation: '/v1/gen-2/text-to-video',
  interpolate: '/v1/gen-2/interpolate'
};

// Runway model types
export type RunwayGenVideoModel = 'gen-2' | 'gen-1';
export type RunwayInterpolateModel = 'interpolate';

// Interpolation modes
export type InterpolateMode = 'standard' | 'linear' | 'cubic';

/**
 * Generate a video from an image using Runway's Gen-1 or Gen-2 models
 * 
 * This implementation handles the API version compatibility issues with Runway's API
 * by:
 * 1. Trying multiple endpoint formats
 * 2. Providing detailed error logging
 * 3. Implementing a robust fallback mechanism
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
    
    
    logger.info(`Starting Runway API request with model: ${modelVersion}`);
    logger.info(`Parameters: Frames: ${numFrames}, Steps: ${numSteps}`);
    
    try {
      // Log the complete API request for debugging
      console.log('Starting Runway API request with multiple endpoint formats');
      console.log('Headers:', {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.substring(0, 5)}...` // Show just start of key for security
      });
      console.log('Payload template (excluding image):', {
        ...payload,
        input_image: '[Base64 image data omitted for logging]'
      });
      
      // Try using the provided API version first, then fallback to other variations
      // This adapts to the current Runway API structure as of April 2025
      let response;
      
      // Log the API information
      logger.info(`Using Runway API base URL: ${RUNWAY_API_BASE_URL}`);
      
      // Use standard API versions (v1 is most common for Runway)
      const API_VERSION = 'v1';
      logger.info(`Using Runway API version: ${API_VERSION}`);
      
      // Try a range of possible endpoints in order of likelihood
      const endpoints = [
        // Try simpler endpoints first with no version prefix
        '/generations',           // New simplified endpoint from PRIMARY_ENDPOINTS
        
        // Standard endpoints
        '/generations/image-to-video',  // Primary endpoint for image-to-video in v1
        '/text-to-video',       // Standard text-to-video endpoint
        '/image-to-video',      // Standard image-to-video endpoint
        '/videos/generate',     // Alternative format
        '/generation',          // Generic generation endpoint
        
        // Additional versioned endpoints
        '/v1/generations',      // Versioned simple endpoint
        '/v2/generations',      // V2 simple endpoint
        
        // Additional endpoints to try if the primary ones fail
        '/gen-2/image-to-video',  // Gen-2 specific endpoint
        '/gen-1/image-to-video',  // Gen-1 specific endpoint
        '/images/text-to-video',   // Legacy format
        
        // Fallback to API prefixed endpoints
        '/api/generations',
        '/api/v1/generations'
      ];
      
      // Track errors for better debugging
      const errors = [];
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          logger.info(`Trying Runway API endpoint: ${RUNWAY_API_BASE_URL}${endpoint}`);
          console.log(`Attempting request to: ${RUNWAY_API_BASE_URL}${endpoint}`);
          
          // Try with multiple version header formats
          let versionHeaderErrors = [];
          
          for (const versionHeader of getRunwayVersionHeaders()) {
            try {
              // Try Bearer token authentication
              try {
                response = await axios.post(
                  `${RUNWAY_API_BASE_URL}${endpoint}`,
                  payload,
                  {
                    headers: {
                      'Accept': 'application/json',
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${apiKey}`,
                      ...versionHeader
                    },
                    responseType: 'json',
                    timeout: 120000 // 2 minute timeout as video generation can take time
                  }
                );
                
                // If request succeeded, log which version header worked
                logger.info(`Successfully connected to Runway API with version header: ${JSON.stringify(versionHeader)}`);
                // Store the working version header for future reference
                logger.info(`*** SUCCESSFUL RUNWAY API VERSION FORMAT: ${JSON.stringify(versionHeader)} ***`);
                break;
              } catch (bearerError) {
                // If Bearer token auth fails, try with X-Api-Key header
                logger.info(`Bearer token auth failed, trying X-Api-Key header with version: ${JSON.stringify(versionHeader)}`);
                
                response = await axios.post(
                  `${RUNWAY_API_BASE_URL}${endpoint}`,
                  payload,
                  {
                    headers: {
                      'Accept': 'application/json',
                      'Content-Type': 'application/json',
                      'X-Api-Key': apiKey,
                      ...versionHeader
                    },
                    responseType: 'json',
                    timeout: 120000
                  }
                );
                
                // If request succeeded, log which version header worked
                logger.info(`Successfully connected to Runway API with X-Api-Key and version header: ${JSON.stringify(versionHeader)}`);
                // Store the working version header for future reference
                logger.info(`*** SUCCESSFUL RUNWAY API VERSION FORMAT: ${JSON.stringify(versionHeader)} ***`);
                break;
              }
            } catch (error) {
              const versionError: any = error;
              versionHeaderErrors.push({
                versionHeader,
                status: versionError.response?.status,
                message: versionError.response?.data?.message || versionError.message,
                error: versionError.response?.data?.error
              });
              
              // Only log detailed errors for invalid API versions to avoid too much noise
              if (versionError.response?.data?.error?.includes('API version')) {
                logger.warn(`Version header ${JSON.stringify(versionHeader)} failed: ${versionError.response?.data?.error}`);
              }
            }
          }
          
          // If all version headers failed, throw a detailed error
          if (versionHeaderErrors.length === getRunwayVersionHeaders().length) {
            logger.error(`All Runway API version headers failed for endpoint ${endpoint}`);
            throw new Error(`The Runway API rejected all API version formats we tried. Please check the API documentation for the correct version format.`);
          }
          
          // If we get here without an error, we found a working endpoint
          logger.info(`Successfully found working Runway API endpoint: ${endpoint}`);
          break;
        } catch (err: any) {
          const errorDetails = {
            endpoint,
            status: err.response?.status,
            message: err.response?.data?.message || err.message,
            data: err.response?.data,
            error: err.response?.data?.error
          };
          errors.push(errorDetails);
          
          // Enhanced error logging with more details
          logger.warn(`Endpoint ${endpoint} failed: ${JSON.stringify(errorDetails)}`);
          console.log(`API Error Details for ${endpoint}:`, {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data || '<no response data>',
            message: err.message
          });
          
          // If this isn't an API version error, and it's not a 404, don't try other endpoints
          // 404 errors likely mean the endpoint doesn't exist, so we should try the next one
          // Other errors might indicate auth issues or payload problems
          if (err.response?.status !== 404 && err.response?.data?.error !== 'Invalid API Version') {
            throw err;
          }
        }
      }
      
      // If we tried all endpoints and none worked
      if (!response) {
        logger.error(`All Runway API endpoints failed. Errors: ${JSON.stringify(errors)}`);
        throw new Error(`Failed to connect to Runway API after trying multiple endpoints. Please check API key and documentation for current endpoint structure.`);
      }
      
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
    
    logger.info(`Starting Runway interpolation API request`);
    logger.info(`Mode: ${mode}, FPS: ${fps}`);
    
    try {
      // Try using the provided API version first, then fallback to other variations
      // This adapts to the current Runway API structure for interpolation
      let response;
      
      // Log the API information
      logger.info(`Using Runway API base URL: ${RUNWAY_API_BASE_URL}`);
      
      // Use standard API versions (v1 is most common for Runway)
      const API_VERSION = 'v1';
      logger.info(`Using Runway API version: ${API_VERSION}`);
      
      // Since we're using the exact Runway development API URL (which includes /v1),
      // we'll simplify our endpoint structure to focus on the paths without version prefix
      const endpoints = [
        // Primary endpoints for the Runway API (most likely to work)
        '/interpolations',      // Primary endpoint for interpolations
        '/interpolate',         // Alternative format
        '/images/interpolate',  // Specific endpoint for image interpolation
        '/transitions'          // Alternative term for interpolations
      ];
      
      // Track errors for better debugging
      const errors = [];
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          logger.info(`Trying Runway interpolation API endpoint: ${RUNWAY_API_BASE_URL}${endpoint}`);
          console.log(`Attempting interpolation request to: ${RUNWAY_API_BASE_URL}${endpoint}`);
          
          // Try with multiple version header formats
          let versionHeaderErrors = [];
          
          // Using the same header format testing across both functions
          // This ensures consistency in how we approach the API
          for (const versionHeader of getRunwayVersionHeaders()) {
            try {
              // Try Bearer token authentication
              try {
                response = await axios.post(
                  `${RUNWAY_API_BASE_URL}${endpoint}`,
                  formData,
                  {
                    headers: {
                      ...formData.getHeaders(),
                      'Authorization': `Bearer ${apiKey}`,
                      ...versionHeader
                    },
                    responseType: 'json',
                    timeout: 120000 // 2 minute timeout as video generation can take time
                  }
                );
                
                // If request succeeded, log which version header worked
                logger.info(`Successfully connected to Runway interpolation API with version header: ${JSON.stringify(versionHeader)}`);
                // Store the working version header for future reference
                logger.info(`*** SUCCESSFUL RUNWAY API VERSION FORMAT: ${JSON.stringify(versionHeader)} ***`);
                break;
              } catch (bearerError) {
                // If Bearer token auth fails, try with X-Api-Key header
                logger.info(`Bearer token auth failed, trying X-Api-Key header with version: ${JSON.stringify(versionHeader)}`);
                
                response = await axios.post(
                  `${RUNWAY_API_BASE_URL}${endpoint}`,
                  formData,
                  {
                    headers: {
                      ...formData.getHeaders(),
                      'X-Api-Key': apiKey,
                      ...versionHeader
                    },
                    responseType: 'json',
                    timeout: 120000
                  }
                );
                
                // If request succeeded, log which version header worked
                logger.info(`Successfully connected to Runway interpolation API with X-Api-Key and version header: ${JSON.stringify(versionHeader)}`);
                // Store the working version header for future reference
                logger.info(`*** SUCCESSFUL RUNWAY API VERSION FORMAT: ${JSON.stringify(versionHeader)} ***`);
                break;
              }
            } catch (error) {
              const versionError: any = error;
              versionHeaderErrors.push({
                versionHeader,
                status: versionError.response?.status,
                message: versionError.response?.data?.message || versionError.message,
                error: versionError.response?.data?.error
              });
              
              // Only log detailed errors for invalid API versions to avoid too much noise
              if (versionError.response?.data?.error?.includes('API version')) {
                logger.warn(`Interpolation version header ${JSON.stringify(versionHeader)} failed: ${versionError.response?.data?.error}`);
              }
            }
          }
          
          // If all version headers failed, throw a detailed error
          if (versionHeaderErrors.length === getRunwayVersionHeaders().length) {
            logger.error(`All Runway API version headers failed for interpolation endpoint ${endpoint}`);
            throw new Error(`The Runway interpolation API rejected all API version formats we tried. Please check the API documentation for the correct version format.`);
          }
          
          // If we get here without an error, we found a working endpoint
          logger.info(`Successfully found working Runway interpolation API endpoint: ${endpoint}`);
          break;
        } catch (err: any) {
          const errorDetails = {
            endpoint,
            status: err.response?.status,
            message: err.response?.data?.message || err.message,
            data: err.response?.data,
            error: err.response?.data?.error
          };
          errors.push(errorDetails);
          
          // Enhanced error logging with more details
          logger.warn(`Interpolation endpoint ${endpoint} failed: ${JSON.stringify(errorDetails)}`);
          console.log(`API Error Details for interpolation ${endpoint}:`, {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data || '<no response data>',
            message: err.message
          });
          
          // If this isn't an API version error, and it's not a 404, don't try other endpoints
          // 404 errors likely mean the endpoint doesn't exist, so we should try the next one
          // Other errors might indicate auth issues or payload problems
          if (err.response?.status !== 404 && err.response?.data?.error !== 'Invalid API Version') {
            throw err;
          }
        }
      }
      
      // If we tried all endpoints and none worked
      if (!response) {
        logger.error(`All Runway interpolation API endpoints failed. Errors: ${JSON.stringify(errors)}`);
        throw new Error(`Failed to connect to Runway interpolation API after trying multiple endpoints. Please check API key and documentation for current endpoint structure.`);
      }
      
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