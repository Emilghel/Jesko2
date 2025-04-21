import express from 'express';
import { storage } from './storage';
import { z } from 'zod';
import { insertVideoHistorySchema } from '../shared/schema';
import { requireUser } from './auth-middleware';

const router = express.Router();

// Get user's video history
router.get('/', requireUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const videos = await storage.getUserVideoHistory(userId);
    
    res.json({
      success: true,
      videos
    });
  } catch (error) {
    console.error('Error retrieving video history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve video history'
    });
  }
});

// Get a specific video history entry
router.get('/:id', requireUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const videoId = parseInt(req.params.id);
    
    if (isNaN(videoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format'
      });
    }
    
    const video = await storage.getVideoHistoryById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Check if the video belongs to the current user
    if (video.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this video'
      });
    }
    
    res.json({
      success: true,
      video
    });
  } catch (error) {
    console.error('Error retrieving video history entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve video history entry'
    });
  }
});

// Create a new video history entry
router.post('/', requireUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const validationSchema = insertVideoHistorySchema.extend({
      videoUrl: z.string().url(),
      thumbnailUrl: z.string().url(),
      prompt: z.string().min(1),
      duration: z.number().positive(),
      aspectRatio: z.string().min(1),
      modelVersion: z.string().min(1)
    });
    
    const validatedData = validationSchema.parse({
      ...req.body,
      userId
    });
    
    const video = await storage.createVideoHistory(validatedData);
    
    res.status(201).json({
      success: true,
      id: video.id,
      video
    });
  } catch (error) {
    console.error('Error creating video history entry:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create video history entry'
    });
  }
});

// Delete a video history entry
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const videoId = parseInt(req.params.id);
    
    if (isNaN(videoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format'
      });
    }
    
    // First check if the video exists and belongs to the user
    const video = await storage.getVideoHistoryById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Check if the video belongs to the current user
    if (video.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this video'
      });
    }
    
    // Delete the video
    const deleted = await storage.deleteVideoHistory(videoId);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete video history entry'
      });
    }
    
    res.json({
      success: true,
      message: 'Video history entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting video history entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video history entry'
    });
  }
});

// Add video to stock library
router.post('/:id/add-to-stock', requireUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const videoId = parseInt(req.params.id);
    
    if (isNaN(videoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format'
      });
    }
    
    // First check if the video exists and belongs to the user
    const video = await storage.getVideoHistoryById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Check if the video belongs to the current user
    if (video.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add this video to the stock library'
      });
    }
    
    // Check if already in stock library
    if (video.isInStockLibrary) {
      return res.status(400).json({
        success: false,
        message: 'This video is already in the stock library'
      });
    }
    
    // Add to stock library
    const stockVideo = await storage.addVideoToStockLibrary(videoId);
    
    if (!stockVideo) {
      return res.status(500).json({
        success: false,
        message: 'Failed to add video to stock library'
      });
    }
    
    res.json({
      success: true,
      message: 'Video added to stock library successfully',
      stockVideo
    });
  } catch (error) {
    console.error('Error adding video to stock library:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add video to stock library'
    });
  }
});

export default router;