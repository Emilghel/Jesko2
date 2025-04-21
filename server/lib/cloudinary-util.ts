/**
 * Cloudinary Video Editor Utility
 * 
 * This file contains utilities for interacting with Cloudinary's video editing API
 * to perform transformations such as cropping, filtering, adding captions, and more.
 */

import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../logger';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

// Configuration handling
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

// For now, we'll use this fallback mechanism to make development easier
// In a production environment, we would require actual credentials
if (!CLOUDINARY_URL || !CLOUDINARY_URL.startsWith('cloudinary://')) {
  logger.warn('Valid CLOUDINARY_URL not found. Using client-side video editing only.');
  
  // Set a fallback configuration just to avoid errors when importing this module
  cloudinary.config({
    cloud_name: 'demo',
    api_key: '123456789012345',
    api_secret: 'abcdefghijklmnopqrstuvwxyz',
    secure: true
  });
} else {
  // If we have a valid CLOUDINARY_URL, use it
  logger.info('Using Cloudinary configuration from environment...');
  cloudinary.config({ secure: true });
  
  try {
    const configTest = cloudinary.config();
    logger.info(`Cloudinary configuration valid for cloud name: ${configTest.cloud_name}`);
  } catch (error) {
    logger.error('Error with Cloudinary configuration:', String(error));
  }
}

/**
 * Upload a video file to Cloudinary
 * 
 * @param filePath Path to the video file
 * @param options Upload options
 * @returns Upload result
 */
export async function uploadVideo(filePath: string, options: any = {}): Promise<any> {
  try {
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'ai-clip-studio',
      ...options,
    });
    
    logger.info(`Video uploaded to Cloudinary: ${uploadResult.public_id}`);
    return uploadResult;
  } catch (error) {
    logger.error('Error uploading video to Cloudinary: ' + String(error));
    throw error;
  }
}

/**
 * Upload a video buffer to Cloudinary
 * 
 * @param buffer Video buffer
 * @param filename Filename for the upload
 * @param options Upload options
 * @returns Upload result
 */
export async function uploadVideoBuffer(buffer: Buffer, filename: string, options: any = {}): Promise<any> {
  try {
    // Create a temporary file
    const tempPath = path.join('/tmp', filename);
    fs.writeFileSync(tempPath, buffer);
    
    // Upload the file
    const result = await uploadVideo(tempPath, options);
    
    // Clean up the temporary file
    fs.unlinkSync(tempPath);
    
    return result;
  } catch (error) {
    logger.error('Error uploading video buffer to Cloudinary: ' + String(error));
    throw error;
  }
}

/**
 * Create a video URL with transformations
 * 
 * @param publicId The public ID of the video in Cloudinary
 * @param transformations Array of transformation objects
 * @returns URL with transformations applied
 */
export function createVideoUrl(publicId: string, transformations: any[] = []): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: transformations,
  });
}

/**
 * Generate a signed URL for a video with transformations
 * This allows for secure, time-limited access to videos
 * 
 * @param publicId The public ID of the video in Cloudinary
 * @param transformations Array of transformation objects
 * @param expiresAt Expiration timestamp (seconds since epoch)
 * @returns Signed URL with transformations applied
 */
export function generateSignedUrl(publicId: string, transformations: any[] = [], expiresAt?: number): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: transformations,
    sign_url: true,
    expires_at: expiresAt || Math.floor(Date.now() / 1000) + 3600, // Default 1 hour
  });
}

/**
 * Download a transformed video from Cloudinary
 * 
 * @param publicId The public ID of the video in Cloudinary
 * @param transformations Array of transformation objects
 * @returns Buffer containing the video file
 */
export async function downloadTransformedVideo(publicId: string, transformations: any[] = []): Promise<Buffer> {
  try {
    const url = cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: transformations,
    });
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }
    
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    logger.error('Error downloading transformed video from Cloudinary: ' + String(error));
    throw error;
  }
}

/**
 * Apply common video editing transformations
 * 
 * @param options Transformation options
 * @returns Array of transformation objects
 */
export function createVideoTransformations({
  trim,
  crop,
  resize,
  filter,
  caption,
  overlay,
  background,
  format,
}: {
  trim?: { startOffset: number, duration: number },
  crop?: { width: number, height: number, x: number, y: number },
  resize?: { width: number, height: number },
  filter?: string,
  caption?: { text: string, fontFamily?: string, fontSize?: number, fontColor?: string, position?: string, background?: string },
  overlay?: { publicId: string, width?: number, height?: number, x?: number, y?: number },
  background?: string,
  format?: string,
} = {}): any[] {
  const transformations: any[] = [];
  
  // Apply trimming if specified
  if (trim) {
    transformations.push({
      start_offset: trim.startOffset,
      duration: trim.duration,
    });
  }
  
  // Apply cropping if specified
  if (crop) {
    transformations.push({
      crop: 'crop',
      width: crop.width,
      height: crop.height,
      x: crop.x,
      y: crop.y,
    });
  }
  
  // Apply resizing if specified
  if (resize) {
    transformations.push({
      width: resize.width,
      height: resize.height,
      crop: 'scale',
    });
  }
  
  // Apply filter if specified
  if (filter) {
    transformations.push({
      effect: filter,
    });
  }
  
  // Apply background if specified
  if (background) {
    transformations.push({
      background: background,
    });
  }
  
  // Add caption if specified
  if (caption) {
    transformations.push({
      overlay: {
        font_family: caption.fontFamily || 'Arial',
        font_size: caption.fontSize || 30,
        font_weight: 'bold',
        text: caption.text,
        background: caption.background || 'rgb:000000A0',
        color: caption.fontColor || 'white',
      },
      gravity: caption.position || 'south',
      y: 20,
    });
  }
  
  // Add overlay if specified
  if (overlay) {
    transformations.push({
      overlay: overlay.publicId,
      width: overlay.width || 200,
      height: overlay.height || 100,
      x: overlay.x || 0,
      y: overlay.y || 0,
      gravity: 'center',
    });
  }
  
  // Apply format conversion if specified
  if (format) {
    transformations.push({
      fetch_format: format,
    });
  }
  
  return transformations;
}

/**
 * Create a video with custom caption
 * 
 * @param publicId The public ID of the video in Cloudinary
 * @param caption Text for the caption
 * @param options Additional caption styling options
 * @returns URL of the video with caption
 */
export function createCaptionedVideo(
  publicId: string, 
  caption: string, 
  options: {
    fontFamily?: string, 
    fontSize?: number, 
    fontColor?: string, 
    position?: string,
    background?: string
  } = {}
): string {
  const transformations = createVideoTransformations({
    caption: {
      text: caption,
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      fontColor: options.fontColor,
      position: options.position,
      background: options.background
    }
  });
  
  return createVideoUrl(publicId, transformations);
}

/**
 * Apply advanced caption with animation effects
 * 
 * @param publicId The public ID of the video in Cloudinary
 * @param caption Text for the caption
 * @param style Animation style ('fade', 'slide', 'typewriter', 'bounce')
 * @param options Additional styling options
 * @returns URL of the video with animated caption
 */
export function createAnimatedCaptionVideo(
  publicId: string,
  caption: string,
  style: 'fade' | 'slide' | 'typewriter' | 'bounce' = 'fade',
  options: {
    fontFamily?: string,
    fontSize?: number,
    fontColor?: string,
    position?: string,
    background?: string
  } = {}
): string {
  // Create base transformations
  const baseTransformations: any[] = [];
  
  // Add animation effect based on style
  let textOptions: any = {
    font_family: options.fontFamily || 'Arial',
    font_size: options.fontSize || 30,
    font_weight: 'bold',
    text: caption,
    background: options.background || 'rgb:000000A0',
    color: options.fontColor || 'white',
  };
  
  // Add specific animation effects
  switch (style) {
    case 'fade':
      textOptions = {
        ...textOptions,
        effect: 'fade:1000',
      };
      break;
    case 'slide':
      textOptions = {
        ...textOptions,
        effect: 'slide:right:1000',
      };
      break;
    case 'typewriter':
      textOptions = {
        ...textOptions,
        effect: 'typewiter:1000',
      };
      break;
    case 'bounce':
      textOptions = {
        ...textOptions,
        effect: 'accelerate:-40',
      };
      break;
  }
  
  baseTransformations.push({
    overlay: textOptions,
    gravity: options.position || 'south',
    y: 20,
  });
  
  return createVideoUrl(publicId, baseTransformations);
}

/**
 * Create a TikTok-style caption with gradient background
 * 
 * @param publicId The public ID of the video in Cloudinary
 * @param caption Text for the caption
 * @param options Additional styling options
 * @returns URL of the video with TikTok-style caption
 */
export function createTikTokStyleCaption(
  publicId: string,
  caption: string,
  options: {
    fontSize?: number,
    position?: string
  } = {}
): string {
  return createCaptionedVideo(publicId, caption, {
    fontFamily: 'Montserrat',
    fontSize: options.fontSize || 40,
    fontColor: 'white',
    position: options.position || 'south',
    background: 'rgb:FF5E5E60'  // Semi-transparent gradient
  });
}

/**
 * Create a video with a watermark
 * 
 * @param publicId The public ID of the video in Cloudinary
 * @param watermarkPublicId The public ID of the watermark image
 * @param options Watermark positioning options
 * @returns URL of the video with watermark
 */
export function addWatermark(
  publicId: string,
  watermarkPublicId: string,
  options: {
    width?: number,
    height?: number,
    x?: number,
    y?: number,
    opacity?: number
  } = {}
): string {
  const transformations = [
    {
      overlay: watermarkPublicId,
      width: options.width || 100,
      height: options.height || 'auto',
      x: options.x || 10,
      y: options.y || 10,
      gravity: 'south_east',
      opacity: options.opacity || 70
    }
  ];
  
  return createVideoUrl(publicId, transformations);
}

/**
 * Apply a visual filter to a video
 * 
 * @param publicId The public ID of the video in Cloudinary
 * @param filterName Name of the filter to apply
 * @returns URL of the filtered video
 */
export function applyVideoFilter(
  publicId: string,
  filterName: 'sepia' | 'grayscale' | 'vignette' | 'cartoonify' | 'art:zorro' | 'art:audrey' | 'art:primavera'
): string {
  const transformations = [{ effect: filterName }];
  return createVideoUrl(publicId, transformations);
}

/**
 * Create a social media ready vertical video
 * 
 * @param publicId The public ID of the video in Cloudinary
 * @param caption Caption text
 * @returns URL of vertical formatted video with caption
 */
export function createVerticalSocialVideo(
  publicId: string,
  caption: string
): string {
  const transformations = [
    // First resize to vertical format with padding
    {
      width: 720,
      height: 1280,
      crop: 'pad',
      background: 'black'
    },
    // Then add caption
    {
      overlay: {
        font_family: 'Arial',
        font_size: 35,
        font_weight: 'bold',
        text: caption,
        background: 'rgb:000000A0',
        color: 'white'
      },
      gravity: 'south',
      y: 50
    }
  ];
  
  return createVideoUrl(publicId, transformations);
}

export default {
  uploadVideo,
  uploadVideoBuffer,
  createVideoUrl,
  generateSignedUrl,
  downloadTransformedVideo,
  createVideoTransformations,
  createCaptionedVideo,
  createAnimatedCaptionVideo,
  createTikTokStyleCaption,
  addWatermark,
  applyVideoFilter,
  createVerticalSocialVideo
};