/**
 * Video Editing Routes
 * 
 * This file contains routes for video editing functionality including:
 * - Uploading videos to Cloudinary
 * - Applying transformations (captions, filters, etc.)
 * - Retrieving edited videos
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import cloudinaryUtil from './lib/cloudinary-util';

// Set up multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with the original extension
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only accept video files
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Create a router
const router = Router();

// Endpoint to upload a video to Cloudinary
router.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    logger.info(`Uploading video: ${req.file.originalname}`);
    
    // Set upload options
    const uploadOptions = {
      resource_type: 'video',
      folder: 'ai-clip-studio',
      use_filename: true,
      unique_filename: true,
    };
    
    // Upload the file to Cloudinary
    const result = await cloudinaryUtil.uploadVideo(req.file.path, uploadOptions);
    
    // Delete the temporary file
    fs.unlinkSync(req.file.path);
    
    res.status(200).json({
      success: true,
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      duration: result.duration,
      format: result.format,
    });
  } catch (error) {
    logger.error('Error uploading video:', error);
    
    // Remove the temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      error: 'Failed to upload video',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint to apply transformations to a video
router.post('/transform', async (req: Request, res: Response) => {
  try {
    const { 
      publicId,  // Cloudinary public ID of the video
      transformations // Array of transformations to apply
    } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing required parameter: publicId' });
    }
    
    if (!transformations) {
      return res.status(400).json({ error: 'Missing required parameter: transformations' });
    }
    
    logger.info(`Transforming video: ${publicId}`);
    
    // Generate a signed URL with the transformations
    const transformedUrl = cloudinaryUtil.generateSignedUrl(publicId, transformations);
    
    res.status(200).json({
      success: true,
      url: transformedUrl
    });
  } catch (error) {
    logger.error('Error transforming video:', error);
    res.status(500).json({
      error: 'Failed to transform video',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint to apply a caption to a video
router.post('/add-caption', async (req: Request, res: Response) => {
  try {
    const { 
      publicId,   // Cloudinary public ID of the video
      caption,    // Caption text
      style,      // Caption style (default, trending, minimal, etc.)
      fontFamily, // Font family
      fontSize,   // Font size
      fontColor,  // Font color
      position,   // Position (south, north, etc.)
      background  // Background color
    } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing required parameter: publicId' });
    }
    
    if (!caption) {
      return res.status(400).json({ error: 'Missing required parameter: caption' });
    }
    
    logger.info(`Adding caption to video: ${publicId}`);
    
    let transformedUrl;
    
    // Apply different caption styles based on the style parameter
    if (style === 'trending') {
      transformedUrl = cloudinaryUtil.createTikTokStyleCaption(publicId, caption, {
        fontSize,
        position
      });
    } else if (style === 'animated') {
      transformedUrl = cloudinaryUtil.createAnimatedCaptionVideo(
        publicId,
        caption,
        'fade', // Animation style
        {
          fontFamily,
          fontSize,
          fontColor,
          position,
          background
        }
      );
    } else {
      // Default style
      transformedUrl = cloudinaryUtil.createCaptionedVideo(publicId, caption, {
        fontFamily,
        fontSize,
        fontColor,
        position,
        background
      });
    }
    
    res.status(200).json({
      success: true,
      url: transformedUrl
    });
  } catch (error) {
    logger.error('Error adding caption to video:', error);
    res.status(500).json({
      error: 'Failed to add caption to video',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint to create a social media ready vertical video
router.post('/create-social-video', async (req: Request, res: Response) => {
  try {
    const { publicId, caption } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing required parameter: publicId' });
    }
    
    logger.info(`Creating social media video from: ${publicId}`);
    
    const socialVideoUrl = cloudinaryUtil.createVerticalSocialVideo(publicId, caption || '');
    
    res.status(200).json({
      success: true,
      url: socialVideoUrl
    });
  } catch (error) {
    logger.error('Error creating social media video:', error);
    res.status(500).json({
      error: 'Failed to create social media video',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint to apply a filter to a video
router.post('/apply-filter', async (req: Request, res: Response) => {
  try {
    const { publicId, filter } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing required parameter: publicId' });
    }
    
    if (!filter) {
      return res.status(400).json({ error: 'Missing required parameter: filter' });
    }
    
    logger.info(`Applying filter ${filter} to video: ${publicId}`);
    
    // Apply the filter
    const filteredUrl = cloudinaryUtil.applyVideoFilter(publicId, filter);
    
    res.status(200).json({
      success: true,
      url: filteredUrl
    });
  } catch (error) {
    logger.error('Error applying filter to video:', error);
    res.status(500).json({
      error: 'Failed to apply filter to video',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint to add a watermark to a video
router.post('/add-watermark', async (req: Request, res: Response) => {
  try {
    const { 
      publicId, 
      watermarkPublicId, 
      width, 
      height, 
      x, 
      y, 
      opacity 
    } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing required parameter: publicId' });
    }
    
    if (!watermarkPublicId) {
      return res.status(400).json({ error: 'Missing required parameter: watermarkPublicId' });
    }
    
    logger.info(`Adding watermark to video: ${publicId}`);
    
    const watermarkedUrl = cloudinaryUtil.addWatermark(publicId, watermarkPublicId, {
      width,
      height,
      x,
      y,
      opacity
    });
    
    res.status(200).json({
      success: true,
      url: watermarkedUrl
    });
  } catch (error) {
    logger.error('Error adding watermark to video:', error);
    res.status(500).json({
      error: 'Failed to add watermark to video',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint to download a transformed video
router.post('/download', async (req: Request, res: Response) => {
  try {
    const { publicId, transformations } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Missing required parameter: publicId' });
    }
    
    logger.info(`Downloading transformed video: ${publicId}`);
    
    // Get the video with transformations
    const buffer = await cloudinaryUtil.downloadTransformedVideo(publicId, transformations || []);
    
    // Set the headers for download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="edited_video.mp4"');
    
    // Send the video
    res.status(200).send(buffer);
  } catch (error) {
    logger.error('Error downloading transformed video:', error);
    res.status(500).json({
      error: 'Failed to download transformed video',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint to get available fonts for captions
router.get('/fonts', (req: Request, res: Response) => {
  // List of fonts available in Cloudinary
  const fonts = [
    { id: 'Arial', name: 'Arial', type: 'Sans-serif' },
    { id: 'Montserrat', name: 'Montserrat', type: 'Sans-serif' },
    { id: 'Roboto', name: 'Roboto', type: 'Sans-serif' },
    { id: 'Open Sans', name: 'Open Sans', type: 'Sans-serif' },
    { id: 'Lato', name: 'Lato', type: 'Sans-serif' },
    { id: 'Poppins', name: 'Poppins', type: 'Sans-serif' },
    { id: 'Nunito', name: 'Nunito', type: 'Sans-serif' },
    { id: 'Merriweather', name: 'Merriweather', type: 'Serif' },
    { id: 'Georgia', name: 'Georgia', type: 'Serif' },
    { id: 'Times New Roman', name: 'Times New Roman', type: 'Serif' },
    { id: 'Courier New', name: 'Courier New', type: 'Monospace' },
    { id: 'Comic Sans MS', name: 'Comic Sans MS', type: 'Decorative' },
    { id: 'Impact', name: 'Impact', type: 'Display' },
  ];
  
  res.status(200).json({
    success: true,
    fonts
  });
});

// Endpoint to get available filters
router.get('/filters', (req: Request, res: Response) => {
  // List of filters available in Cloudinary
  const filters = [
    { id: 'sepia', name: 'Sepia', description: 'A warm brown tone for a vintage look' },
    { id: 'grayscale', name: 'Grayscale', description: 'Classic black and white effect' },
    { id: 'vignette', name: 'Vignette', description: 'Darkened edges for a dramatic focus' },
    { id: 'cartoonify', name: 'Cartoon', description: 'Transform your video into a cartoon style' },
    { id: 'art:zorro', name: 'Zorro', description: 'Artistic stylized filter with bold colors' },
    { id: 'art:audrey', name: 'Audrey', description: 'High contrast black and white artistic filter' },
    { id: 'art:primavera', name: 'Primavera', description: 'Bright and colorful artistic filter' },
  ];
  
  res.status(200).json({
    success: true,
    filters
  });
});

export default router;