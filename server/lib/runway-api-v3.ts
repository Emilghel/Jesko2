/**
 * Runway API Integration v3
 * 
 * This module provides a resilient implementation of the Runway API
 * with automatic fallback and recovery mechanisms.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

import { logger } from '../logger';
import { 
  getApiConfig, 
  getFallbackConfigs, 
  cacheSuccessfulConfig 
} from './api-config';

// Environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_BASE_URL = process.env.RUNWAY_API_BASE_URL || 'https://api.dev.runwayml.com';

// Types 
export type RunwayGenVideoModel = 'gen4_turbo' | 'gen3a_turbo';
export type RunwayInterpolateModel = 'interpolate';
export type InterpolateMode = 'standard' | 'linear' | 'cubic';
export type AspectRatio = '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672' | '1280:768' | '768:1280';

/**
 * Generate a video from an image using Runway's Gen-3a or Gen-4 models
 * 
 * This implementation follows the Runway API documentation from 2024-11-06
 * and includes fallback mechanisms for reliability.
 */
export async function generateVideoFromImage(
  imagePath: string,
  prompt: string,
  outputPath: string,
  options: {
    modelVersion?: RunwayGenVideoModel,
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
  error?: string
}> {
  try {
    // Validate API key
    if (!RUNWAY_API_KEY) {
      throw new Error('RUNWAY_API_KEY is not set in environment variables');
    }

    // Verify image exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at path: ${imagePath}`);
    }
    
    logger.info(`Starting Runway image-to-video transformation`);
    logger.info(`Image: ${path.basename(imagePath)}`);
    logger.info(`Prompt text: ${prompt}`);
    
    // Set default options according to the 2024-11-06 API version
    const {
      modelVersion = 'gen4_turbo',
      negativePrompt,
      ratio = modelVersion === 'gen4_turbo' ? '1280:720' : '1280:768',
      duration = 10,
      seed
    } = options;
    
    // Prepare output directory
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Read image file as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    
    // Create the request payload according to the 2024-11-06 API version
    const payload: any = {
      promptImage: `data:${mimeType};base64,${base64Image}`,
      promptText: prompt,
      model: modelVersion,
      duration,
      ratio
    };
    
    // Add optional parameters
    if (negativePrompt) {
      payload.negative_prompt = negativePrompt;
    }
    
    // Add seed parameter if specified (the only additional parameter supported in the current API)
    if (seed !== undefined) {
      payload.seed = seed;
    }
    
    logger.info(`Using payload with parameters: ${JSON.stringify({
      ...payload,
      image: "data:image/... [base64 data omitted]" // Don't log the full base64 image
    }, null, 2)}`);
    
    // Try with primary configuration first
    try {
      const config = getApiConfig('runway', 'imageToVideo');
      logger.info(`Trying primary Runway configuration: ${config.baseUrl}${config.endpoint}`);
      
      if (config.versionHeader && config.versionValue) {
        logger.info(`Using version header: ${config.versionHeader}=${config.versionValue}`);
      }
      
      const response = await callRunwayAPI(
        config.baseUrl, 
        config.endpoint, 
        config.versionHeader, 
        config.versionValue, 
        payload
      );
      
      // Download the generated video
      const videoUrl = response.data.url || response.data.output || response.data.video;
      await downloadVideo(videoUrl, outputPath);
      
      // Cache the successful configuration
      cacheSuccessfulConfig('runway', 'imageToVideo', config.endpoint, config.versionValue);
      
      // Return the actual duration specified in the API request
      return {
        success: true,
        videoPath: outputPath,
        duration: duration,
        message: `Successfully generated video from image using ${modelVersion}`
      };
    } 
    catch (error: any) {
      // If primary config failed, try fallbacks
      logger.warn(`Primary Runway configuration failed: ${error.message}`);
      logger.info('Trying fallback configurations...');
      
      const fallbackConfigs = getFallbackConfigs('runway', 'imageToVideo');
      
      // Try each fallback configuration
      for (const config of fallbackConfigs) {
        try {
          logger.info(`Trying fallback: ${config.baseUrl}${config.endpoint}`);
          
          if (config.versionHeader && config.versionValue) {
            logger.info(`Using version header: ${config.versionHeader}=${config.versionValue}`);
          } else {
            logger.info('Using no version header');
          }
          
          const response = await callRunwayAPI(
            config.baseUrl, 
            config.endpoint, 
            config.versionHeader, 
            config.versionValue, 
            payload
          );
          
          // Download the generated video
          const videoUrl = response.data.url || response.data.output || response.data.video;
          await downloadVideo(videoUrl, outputPath);
          
          // Cache the successful configuration
          cacheSuccessfulConfig('runway', 'imageToVideo', config.endpoint, config.versionValue);
          
          // Return the actual duration specified in the API request
          return {
            success: true,
            videoPath: outputPath,
            duration: duration,
            message: `Successfully generated video from image using ${modelVersion} (fallback configuration)`
          };
        } 
        catch (fallbackError: any) {
          logger.warn(`Fallback configuration failed: ${fallbackError.message}`);
          // Continue to next fallback
        }
      }
      
      // If we've tried all fallbacks and none worked, throw the original error
      throw error;
    }
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
 * Call the Runway API with specific configuration
 * 
 * This function includes resilient error handling with various fallback mechanisms:
 * 1. Trying different version header formats
 * 2. Flexible endpoint handling
 * 3. Error reporting with details to help debugging
 */
async function callRunwayAPI(
  baseUrl: string,
  endpoint: string,
  versionHeaderName: string | null,
  versionHeaderValue: string | null,
  payload: any
) {
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RUNWAY_API_KEY}`,
    'Accept': 'application/json'
  };
  
  // Add version header if specified
  if (versionHeaderName && versionHeaderValue) {
    headers[versionHeaderName] = versionHeaderValue;
  }
  
  try {
    // Handle full URLs in the endpoint
    const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const apiUrl = isFullUrl ? endpoint : `${baseUrl}${endpoint}`;
    
    logger.info(`Making API request to: ${apiUrl}`);
    
    // Make the API request with initial headers
    const response = await axios.post(
      apiUrl,
      payload,
      {
        headers,
        timeout: 180000 // 3 minute timeout
      }
    );
    
    logger.info(`API request successful. Status: ${response.status}`);
    
    // Validate the response data structure
    if (!response.data) {
      throw new Error('API response missing data field');
    }
    
    // Verify that we have a video URL in the response
    const videoUrl = response.data.url || response.data.output || response.data.video;
    if (!videoUrl) {
      logger.error(`API response does not contain video URL. Response data: ${JSON.stringify(response.data)}`);
      throw new Error('API response missing video URL. The response may have succeeded but did not return a video URL.');
    }
    
    return response;
  } catch (error: any) {
    // Log detailed error information
    logger.error(`API request failed with error: ${error.message}`);
    
    if (error.response) {
      // The request was made and the server responded with a status code outside the 2xx range
      logger.error(`Response status: ${error.response.status}`);
      logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      
      try {
        if (typeof error.response.data === 'object') {
          logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        } else if (typeof error.response.data === 'string') {
          logger.error(`Response data: ${error.response.data}`);
        } else {
          logger.error(`Response data: (unable to stringify response data)`);
        }
      } catch (err) {
        logger.error(`Response data: (error stringifying response data)`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      logger.error('No response received from API');
    }
    
    // If we get an API version error, try alternate header formats
    let hasApiVersionError = false;
    
    // Safely check if it's an API version error
    if (error.response?.status === 400) {
      try {
        if (typeof error.response.data === 'object' && error.response.data) {
          // Check object properties for API version mentions
          const message = error.response.data.message;
          const errorText = error.response.data.error;
          
          if (typeof message === 'string' && message.includes('API version')) {
            hasApiVersionError = true;
          } else if (typeof errorText === 'string' && errorText.includes('API version')) {
            hasApiVersionError = true;
          }
        } 
        else if (typeof error.response.data === 'string') {
          // Check if the string contains API version message
          if (error.response.data.includes('API version')) {
            hasApiVersionError = true;
          }
        }
        
        // Check status text as well
        if (typeof error.response.statusText === 'string' && 
            error.response.statusText.includes('API version')) {
          hasApiVersionError = true;
        }
      } catch (err) {
        logger.warn(`Error checking for API version issues: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    if (hasApiVersionError) {
      
      if (versionHeaderName && versionHeaderValue) {
        logger.info('Detected API version error. Trying alternate version header formats...');
        
        // List of alternative version header formats to try
        const alternateHeaders = [
          'Runway-Version',
          'Accept-Version',
          'API-Version',
          'X-API-Version',
          'version',
          'Version'
        ];
        
        // Try each alternate header format
        for (const altHeader of alternateHeaders) {
          // Skip if it's the same as what we already tried
          if (altHeader === versionHeaderName) continue;
          
          logger.info(`Trying alternate header: ${altHeader}=${versionHeaderValue}`);
          
          // Clone headers but use alternative header name
          const altHeaders = { ...headers };
          delete altHeaders[versionHeaderName];
          altHeaders[altHeader] = versionHeaderValue;
          
          try {
            const altResponse = await axios.post(
              `${baseUrl}${endpoint}`,
              payload,
              {
                headers: altHeaders,
                timeout: 120000 // 2 minute timeout
              }
            );
            
            // If successful, cache the configuration for future use
            logger.info(`Success with alternate header: ${altHeader}`);
            cacheSuccessfulConfig('runway', 'imageToVideo', endpoint, versionHeaderValue);
            
            return altResponse;
          } catch (altError: any) {
            // If still API version error, continue to next header format
            logger.warn(`Failed with ${altHeader}: ${altError.message}`);
          }
        }
        
        // Try without any version header as a last resort
        logger.info('Trying request without any version header...');
        
        const noVersionHeaders = { ...headers };
        delete noVersionHeaders[versionHeaderName];
        
        try {
          const noVersionResponse = await axios.post(
            `${baseUrl}${endpoint}`,
            payload,
            {
              headers: noVersionHeaders,
              timeout: 120000 // 2 minute timeout
            }
          );
          
          // If successful, cache the configuration
          logger.info('Success without version header');
          cacheSuccessfulConfig('runway', 'imageToVideo', endpoint, null);
          
          return noVersionResponse;
        } catch (noVersionError: any) {
          logger.warn(`Failed without version header: ${noVersionError.message}`);
        }
      }
    }
    
    // If all alternative attempts failed, throw the original error
    throw error;
  }
}

/**
 * Download a video from a URL and save it to a file
 */
async function downloadVideo(videoUrl: string, outputPath: string): Promise<void> {
  logger.info(`Downloading video from: ${videoUrl}`);
  
  const videoResponse = await axios.get(videoUrl, {
    responseType: 'stream'
  });
  
  // Write the video to a file
  const writer = fs.createWriteStream(outputPath);
  videoResponse.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', (err) => {
      logger.error(`Error downloading video: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Generate video by interpolating between multiple images using Runway's Interpolate model
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
    
    // Try with primary configuration first
    try {
      const config = getApiConfig('runway', 'interpolate');
      logger.info(`Trying primary Runway interpolation: ${config.baseUrl}${config.endpoint}`);
      
      if (config.versionHeader && config.versionValue) {
        logger.info(`Using version header: ${config.versionHeader}=${config.versionValue}`);
      }
      
      // Prepare headers
      const headers: Record<string, string> = {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${RUNWAY_API_KEY}`
      };
      
      // Add version header if specified
      if (config.versionHeader && config.versionValue) {
        headers[config.versionHeader] = config.versionValue;
      }
      
      // Make the API request
      const response = await axios.post(
        `${config.baseUrl}${config.endpoint}`,
        formData,
        {
          headers,
          timeout: 300000 // 5 minute timeout for interpolation
        }
      );
      
      // Cache the successful configuration
      cacheSuccessfulConfig('runway', 'interpolate', config.endpoint, config.versionValue);
      
      // Download the generated video
      const videoUrl = response.data.url || response.data.output || response.data.video;
      await downloadVideo(videoUrl, outputPath);
      
      // Calculate approximate duration based on number of images and fps
      const durationInSeconds = (imagePaths.length - 1) * (30 / fps);
      
      return {
        success: true,
        videoPath: outputPath,
        duration: durationInSeconds,
        message: `Successfully generated interpolated video from ${imagePaths.length} images`
      };
    } 
    catch (error: any) {
      // If primary config failed, try fallbacks
      logger.warn(`Primary Runway interpolation failed: ${error.message}`);
      logger.info('Trying fallback configurations...');
      
      const fallbackConfigs = getFallbackConfigs('runway', 'interpolate');
      
      // Try each fallback configuration
      for (const config of fallbackConfigs) {
        try {
          logger.info(`Trying fallback: ${config.baseUrl}${config.endpoint}`);
          
          if (config.versionHeader && config.versionValue) {
            logger.info(`Using version header: ${config.versionHeader}=${config.versionValue}`);
          } else {
            logger.info('Using no version header');
          }
          
          // Prepare headers
          const headers: Record<string, string> = {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${RUNWAY_API_KEY}`
          };
          
          // Add version header if specified
          if (config.versionHeader && config.versionValue) {
            headers[config.versionHeader] = config.versionValue;
          }
          
          // Make the API request
          const response = await axios.post(
            `${config.baseUrl}${config.endpoint}`,
            formData,
            {
              headers,
              timeout: 300000 // 5 minute timeout for interpolation
            }
          );
          
          // Cache the successful configuration
          cacheSuccessfulConfig('runway', 'interpolate', config.endpoint, config.versionValue);
          
          // Download the generated video
          const videoUrl = response.data.url || response.data.output || response.data.video;
          await downloadVideo(videoUrl, outputPath);
          
          // Calculate approximate duration based on number of images and fps
          const durationInSeconds = (imagePaths.length - 1) * (30 / fps);
          
          return {
            success: true,
            videoPath: outputPath,
            duration: durationInSeconds,
            message: `Successfully generated interpolated video from ${imagePaths.length} images (fallback configuration)`
          };
        } 
        catch (fallbackError: any) {
          logger.warn(`Fallback interpolation failed: ${fallbackError.message}`);
          // Continue to next fallback
        }
      }
      
      // If we've tried all fallbacks and none worked, throw the original error
      throw error;
    }
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