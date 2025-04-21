/**
 * KLAP API Integration for Image-to-Video Generation
 * 
 * This module handles communication with the KLAP API for turning static images
 * into dynamic videos with customized motion.
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

// KLAP API base URL
const KLAP_API_BASE_URL = 'https://api.klapai.com/v1';

/**
 * Generate a video from an image using the KLAP API
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
    style?: 'realistic' | 'artistic' | 'cinematic' | 'dramatic',
    duration?: number, // in seconds, between 3-15
    resolution?: '720p' | '1080p',
    fps?: 24 | 30 | number,
  } = {}
): Promise<{
  success: boolean,
  videoPath: string,
  duration: number,
  message?: string,
  error?: string
}> {
  try {
    const apiKey = process.env.KLAP_API_KEY;
    if (!apiKey) {
      throw new Error('KLAP_API_KEY is not set in environment variables');
    }

    logger.info(`Starting image-to-video generation with KLAP API`);
    logger.info(`Image path: ${imagePath}`);
    logger.info(`Prompt: ${prompt}`);
    logger.info(`Output path: ${outputPath}`);
    
    // Set default options
    const {
      style = 'realistic',
      duration = 5,
      resolution = '720p',
      fps = 24
    } = options;

    // Create form data with image file and parameters
    const formData = new FormData();
    
    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at path: ${imagePath}`);
    }
    
    // Read the image file
    const fileStream = fs.createReadStream(imagePath);
    
    formData.append('image', fileStream, {
      filename: path.basename(imagePath),
      contentType: 'image/jpeg' // Adjust based on your file type
    });
    
    formData.append('prompt', prompt);
    formData.append('style', style);
    formData.append('duration', duration.toString());
    formData.append('resolution', resolution);
    formData.append('fps', fps.toString());
    
    // Make sure the output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Log request details for debugging
    logger.info(`Sending request to KLAP API: ${KLAP_API_BASE_URL}/generate`);
    
    try {
      // Send request to KLAP API
      const response = await axios.post(
        `${KLAP_API_BASE_URL}/generate`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${apiKey}`
          },
          responseType: 'stream',
          timeout: 60000 // 60 second timeout
        }
      );
      
      // Check response status
      logger.info(`KLAP API response status: ${response.status}`);
      
      // Save the response stream to the output file
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);
      
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
      
      logger.info(`Successfully generated video from image: ${outputPath} (${fileStats.size} bytes)`);
      
      return {
        success: true,
        videoPath: outputPath,
        duration: duration,
        message: 'Video successfully generated from image'
      };
    } catch (apiError) {
      // Handle API call errors
      logger.error(`KLAP API request error: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      throw apiError;
    }
    
  } catch (error) {
    logger.error(`KLAP API error: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      videoPath: '',
      duration: 0,
      error: `Error generating video: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get available styles from the KLAP API
 * 
 * @returns List of available animation styles
 */
export async function getAvailableStyles(): Promise<string[]> {
  try {
    const apiKey = process.env.KLAP_API_KEY;
    if (!apiKey) {
      throw new Error('KLAP_API_KEY is not set in environment variables');
    }
    
    const response = await axios.get(
      `${KLAP_API_BASE_URL}/styles`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    return response.data.styles || ['realistic', 'artistic', 'cinematic', 'dramatic'];
  } catch (error) {
    logger.error(`Error fetching KLAP API styles: ${error instanceof Error ? error.message : String(error)}`);
    // Return default styles in case of error
    return ['realistic', 'artistic', 'cinematic', 'dramatic'];
  }
}

/**
 * Check the status of a pending video generation job
 * 
 * @param jobId The ID of the job to check
 * @returns Current status of the job
 */
export async function checkGenerationStatus(jobId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress?: number,
  videoUrl?: string,
  error?: string
}> {
  try {
    const apiKey = process.env.KLAP_API_KEY;
    if (!apiKey) {
      throw new Error('KLAP_API_KEY is not set in environment variables');
    }
    
    const response = await axios.get(
      `${KLAP_API_BASE_URL}/status/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error(`Error checking KLAP job status: ${error instanceof Error ? error.message : String(error)}`);
    return {
      status: 'failed',
      error: `Error checking status: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}