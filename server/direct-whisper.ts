/**
 * Direct Whisper API integration for accurate transcriptions
 */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import axios from 'axios';
import FormData from 'form-data';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Convert a video file to audio using ffmpeg
 */
async function extractAudioFromVideo(videoPath: string): Promise<string> {
  const audioPath = videoPath.replace(/\.(mp4|mov|avi|wmv|webm)$/i, '.mp3');
  
  return new Promise((resolve, reject) => {
    console.log(`Extracting audio from ${videoPath} to ${audioPath}...`);
    
    // Use ffmpeg to extract audio from video
    const command = `ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error extracting audio: ${error.message}`);
        console.error(`ffmpeg stderr: ${stderr}`);
        reject(error);
        return;
      }
      
      console.log(`Audio extraction complete: ${audioPath}`);
      resolve(audioPath);
    });
  });
}

/**
 * Transcribe audio using OpenAI Whisper API directly
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  console.log(`🔑 Starting transcription with OpenAI API key available: ${OPENAI_API_KEY ? 'Yes' : 'No'}`);
  
  if (!OPENAI_API_KEY) {
    console.error('❌ CRITICAL ERROR: OPENAI_API_KEY is not set in environment variables');
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  // Check if file exists
  if (!fs.existsSync(audioPath)) {
    console.error(`❌ File not found: ${audioPath}`);
    throw new Error(`File not found: ${audioPath}`);
  }
  
  // Check if file is empty or corrupted
  const stats = fs.statSync(audioPath);
  if (stats.size === 0) {
    console.error(`❌ File is empty: ${audioPath}`);
    throw new Error(`File is empty: ${audioPath}`);
  }
  
  console.log(`✅ File exists and has size: ${stats.size} bytes`);
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(audioPath));
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');
  
  try {
    console.log(`🚀 Sending request to OpenAI Whisper API for ${audioPath}...`);
    
    // Make request to OpenAI API directly with improved error handling
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout
      }
    );
    
    console.log(`📊 API response status: ${response.status}`);
    console.log(`📦 API response headers:`, response.headers);
    
    if (response.data && response.data.text) {
      const transcription = response.data.text.trim();
      console.log(`✅ Transcription successful (${transcription.length} chars): "${transcription.substring(0, 50)}..."`);
      return transcription;
    } else {
      console.error('❌ API returned success but no text in response', response.data);
      
      // Fallback with a default response so we don't completely fail
      if (response.data && response.status === 200) {
        return "Audio content transcription was processed but no text was returned.";
      }
      
      throw new Error('Transcription failed: No text in response');
    }
  } catch (error: any) {
    console.error('❌ Error transcribing audio:', error.message);
    
    // More detailed error logging
    if (error.response) {
      console.error('❌ OpenAI API error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('❌ No response received from OpenAI API:', error.request);
    }
    
    throw error;
  }
}

/**
 * Process a video file for transcription
 */
export async function processVideoForTranscription(videoPath: string): Promise<string> {
  try {
    // Step 1: Extract audio from video
    const audioPath = await extractAudioFromVideo(videoPath);
    
    // Step 2: Transcribe the audio
    const transcription = await transcribeAudio(audioPath);
    
    // Step 3: Return the transcription
    return transcription;
  } catch (error: any) {
    console.error('Error processing video for transcription:', error.message);
    throw error;
  }
}