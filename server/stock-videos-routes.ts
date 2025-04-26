import { Request, Response, Router } from 'express';
import { db } from './db';
import { stockVideos } from '@shared/schema';
import { eq, desc, asc, sql, and, like, inArray } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure multer storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

const stockVideosRouter = Router();

// Get all stock videos with pagination, filtering and sorting
stockVideosRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const category = (req.query.category as string) || undefined;
    const search = (req.query.search as string) || undefined;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const isAIGenerated = req.query.isAIGenerated !== undefined 
      ? req.query.isAIGenerated === 'true'
      : undefined;
    
    // Build query with filters
    let query = db.select().from(stockVideos);
    
    if (category) {
      query = query.where(eq(stockVideos.category, category));
    }
    
    if (search) {
      query = query.where(
        sql`(${stockVideos.title} ILIKE ${`%${search}%`} OR ${stockVideos.description} ILIKE ${`%${search}%`})`
      );
    }
    
    // Apply AI Generated filter if specified
    if (isAIGenerated !== undefined) {
      query = query.where(eq(stockVideos.isAIGenerated, isAIGenerated));
    }
    
    // Apply simple sort
    if (sortOrder === 'asc') {
      query = query.orderBy(asc(stockVideos.createdAt));
    } else {
      query = query.orderBy(desc(stockVideos.createdAt));
    }
    
    // Apply pagination
    query = query.limit(limit).offset(offset);
    
    // Print the SQL before executing
    console.log('SQL Query to execute:', query.toSQL());
    
    // Execute query
    try {
      const videos = await query;
      
      // Get total count for pagination
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(stockVideos);
      const totalCount = countResult[0]?.count || 0;
      
      // Get available categories
      const categoriesResult = await db
        .select({ category: stockVideos.category })
        .from(stockVideos)
        .groupBy(stockVideos.category);
      
      const categories = categoriesResult
        .map(c => c.category)
        .filter(Boolean) as string[];
      
      return res.json({
        videos,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalVideos: totalCount,
          videosPerPage: limit
        },
        categories
      });
    } catch (error) {
      console.error('Detailed SQL execution error:', error);
      return res.status(500).json({ error: 'Failed to fetch stock videos' });
    }
    
    // These sections are now done above
  } catch (error) {
    console.error('Error fetching stock videos:', error);
    return res.status(500).json({ error: 'Failed to fetch stock videos' });
  }
});

// Get a specific stock video by ID
stockVideosRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const [video] = await db
      .select()
      .from(stockVideos)
      .where(eq(stockVideos.id, id));
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    return res.json(video);
  } catch (error) {
    console.error('Error fetching stock video:', error);
    return res.status(500).json({ error: 'Failed to fetch video details' });
  }
});

// Create a new stock video
stockVideosRouter.post('/', upload.single('video'), async (req: Request, res: Response) => {
  try {
    const { title, description, category, tags, aspectRatio, userId, promptUsed, sourceImageUrl, modelUsed, isAIGenerated } = req.body;
    const videoFile = req.file;
    
    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Import video utility functions
    const { generateThumbnailFromVideo, getVideoDuration } = await import('./video-utils');
    
    // Get the full path of the uploaded video
    const videoPath = videoFile.path;
    
    // Get actual video duration using ffmpeg
    const duration = await getVideoDuration(videoPath);
    
    // Generate thumbnail from the video
    let thumbnailUrl;
    try {
      // Generate thumbnail from the first second of the video
      thumbnailUrl = await generateThumbnailFromVideo(videoPath);
      console.log('Generated thumbnail:', thumbnailUrl);
    } catch (thumbnailError) {
      console.error('Error generating thumbnail:', thumbnailError);
      thumbnailUrl = req.body.thumbnailUrl || '/images/default-thumbnail.jpg';
    }
    
    // Create video record in database
    const [newVideo] = await db
      .insert(stockVideos)
      .values({
        title,
        description: description || null,
        videoUrl: `/uploads/${videoFile.filename}`,
        thumbnailUrl: thumbnailUrl,
        duration,
        aspectRatio: aspectRatio || '16:9',
        category: category || 'general',
        tags: tags ? JSON.parse(tags) : [],
        userId: userId ? parseInt(userId) : null,
        downloadCount: 0,
        isAIGenerated: isAIGenerated === 'true',
        promptUsed: promptUsed || null,
        sourceImageUrl: sourceImageUrl || null,
        modelUsed: modelUsed || 'gen-2'
      })
      .returning();
    
    return res.status(201).json(newVideo);
  } catch (error) {
    console.error('Error creating stock video:', error);
    return res.status(500).json({ error: 'Failed to create video' });
  }
});

// Update a stock video
stockVideosRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const { title, description, category, tags } = req.body;
    
    // Get existing video to check if it exists
    const [existingVideo] = await db
      .select()
      .from(stockVideos)
      .where(eq(stockVideos.id, id));
    
    if (!existingVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Update video record
    const [updatedVideo] = await db
      .update(stockVideos)
      .set({
        title: title || existingVideo.title,
        description: description !== undefined ? description : existingVideo.description,
        category: category || existingVideo.category,
        tags: tags ? JSON.parse(tags) : existingVideo.tags
      })
      .where(eq(stockVideos.id, id))
      .returning();
    
    return res.json(updatedVideo);
  } catch (error) {
    console.error('Error updating stock video:', error);
    return res.status(500).json({ error: 'Failed to update video' });
  }
});

// Delete a stock video
stockVideosRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Get the video to find the file path
    const [video] = await db
      .select()
      .from(stockVideos)
      .where(eq(stockVideos.id, id));
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Delete the physical video file if it exists and is local
    if (video.videoUrl && video.videoUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), video.videoUrl);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete from database
    await db
      .delete(stockVideos)
      .where(eq(stockVideos.id, id));
    
    return res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock video:', error);
    return res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Increment download count
stockVideosRouter.post('/:id/download', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Get the video
    const [video] = await db
      .select()
      .from(stockVideos)
      .where(eq(stockVideos.id, id));
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Increment download count
    await db
      .update(stockVideos)
      .set({
        downloadCount: (video.downloadCount || 0) + 1
      })
      .where(eq(stockVideos.id, id));
    
    return res.json({ success: true, videoUrl: video.videoUrl });
  } catch (error) {
    console.error('Error recording download:', error);
    return res.status(500).json({ error: 'Failed to process download' });
  }
});

// Get video categories
stockVideosRouter.get('/categories/list', async (req: Request, res: Response) => {
  try {
    const categoriesResult = await db
      .select({ category: stockVideos.category })
      .from(stockVideos)
      .groupBy(stockVideos.category);
    
    const categories = categoriesResult
      .map(c => c.category)
      .filter(Boolean) as string[];
    
    return res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default stockVideosRouter;