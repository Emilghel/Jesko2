import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processVideoForTranscription } from './direct-whisper';
import { storage } from './storage';
import { TransactionType } from "@shared/schema";

const router = Router();

// Configure multer for handling file uploads
const upload = multer({
  dest: 'temp/transcription-uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Check if the file is a video file
    const allowedMimeTypes = [
      'video/mp4', 
      'video/quicktime', 
      'video/x-msvideo', 
      'video/mpeg',
      'video/webm',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/mp4'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Check file extension as fallback
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ['.mp4', '.mov', '.avi', '.mpeg', '.webm', '.mp3', '.wav', '.ogg', '.m4a'];
      
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(null, false);
        return new Error('File type not supported');
      }
    }
  }
});

// Direct transcription endpoint that uses OpenAI Whisper API
router.post('/api/direct-transcribe', upload.single('file'), async (req, res) => {
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log(`Direct transcription request received for file: ${req.file.originalname}`);
  console.log(`File details: ${req.file.size} bytes, ${req.file.mimetype}`);
  
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set in environment variables');
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }
  
  // Coin cost for transcription
  const COIN_COST = 10;
  let userId = null;
  let userCoins = 0;
  
  // Check if user is authenticated to track coin costs
  try {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      userId = req.user.id;
      
      // Get the user's coin balance
      userCoins = await storage.getUserCoins(userId);
      console.log(`User ${userId} has ${userCoins} coins`);
      
      // Check if the user has enough coins
      if (userCoins < COIN_COST) {
        return res.status(403).json({ 
          error: 'Insufficient coins', 
          required: COIN_COST, 
          balance: userCoins 
        });
      }
      
      // Deduct coins from the user's balance
      await storage.addUserCoins(
        userId,
        -COIN_COST,
        TransactionType.USAGE,
        'Direct transcription with OpenAI Whisper'
      );
      
      console.log(`Deducted ${COIN_COST} coins from user ${userId} for transcription`);
    } else {
      console.log("Anonymous user accessing direct transcription - no authentication required for dev");
    }
  } catch (authError) {
    console.log("Error checking authentication, proceeding as anonymous:", authError);
  }
  
  try {
    // Process the video/audio file for transcription
    console.log(`Processing file for transcription: ${req.file.path}`);
    const transcription = await processVideoForTranscription(req.file.path);
    
    console.log(`Transcription successful, length: ${transcription.length} characters`);
    console.log(`Transcription preview: ${transcription.substring(0, 100)}...`);
    
    // Return the transcription
    res.json({
      success: true,
      transcription,
      file: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      }
    });
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(req.file.path);
      console.log(`Temporary file ${req.file.path} removed`);
    } catch (cleanupError) {
      console.error(`Error cleaning up temporary file: ${cleanupError}`);
    }
    
  } catch (error) {
    console.error('Error during direct transcription:', error);
    
    // If user was charged coins, refund them since the operation failed
    if (userId) {
      await storage.addUserCoins(
        userId,
        COIN_COST,
        TransactionType.REFUND,
        'Refund: Direct transcription failed'
      );
      console.log(`Refunded ${COIN_COST} coins to user ${userId} due to failed transcription`);
    }
    
    // Return error to client
    res.status(500).json({
      error: 'Transcription failed',
      details: error instanceof Error ? error.message : 'Unknown error during transcription'
    });
    
    // Clean up the temporary file
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log(`Temporary file ${req.file.path} removed after error`);
      }
    } catch (cleanupError) {
      console.error(`Error cleaning up temporary file after error: ${cleanupError}`);
    }
  }
});

export default router;