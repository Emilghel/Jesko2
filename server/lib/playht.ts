import axios from 'axios';
import { Readable } from 'stream';

// Play.ht API key and user ID (should be stored as environment variables)
const PLAYHT_API_KEY = process.env.PLAYHT_API_KEY || 'd54c02298bed426fab4736984d96677c';
const PLAYHT_USER_ID = process.env.PLAYHT_USER_ID || 'eDyfocGSpQOUCUJsKrzofVVwl7H2';

interface PlayHTOptions {
  voiceId: string;
  speed?: number;
  pitch?: number;
  language?: string;
}

/**
 * Creates a readable stream from the Play.ht API for text-to-speech conversion
 * @param text The text to convert to speech
 * @param options Options for voice, speed, pitch, etc.
 * @returns A readable stream of the audio data
 */
export async function createPlayHTVoiceStream(text: string, options: PlayHTOptions): Promise<Readable> {
  try {
    console.log(`Creating Play.ht voice stream for text: ${text.substring(0, 50)}...`);
    
    // Default options
    const voiceId = options.voiceId || 'en-US-JennyNeural';
    const speed = options.speed || 1.0;
    const pitch = options.pitch || 1.0;
    
    // Make request to Play.ht API
    const response = await axios({
      method: 'POST',
      url: 'https://play.ht/api/v2/tts',
      headers: {
        'Authorization': `Bearer ${PLAYHT_API_KEY}`,
        'X-User-ID': PLAYHT_USER_ID,
        'Content-Type': 'application/json',
      },
      data: {
        text,
        voice: voiceId,
        speed,
        pitch,
      },
      responseType: 'stream',
    });
    
    return response.data;
  } catch (error) {
    console.error('Error in createPlayHTVoiceStream:', error);
    throw new Error(`Failed to generate voice stream: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get available voices from Play.ht API
 * @returns Array of available voices
 */
export async function getPlayHTVoices() {
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://play.ht/api/v2/voices',
      headers: {
        'Authorization': `Bearer ${PLAYHT_API_KEY}`,
        'X-User-ID': PLAYHT_USER_ID,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching Play.ht voices:', error);
    throw new Error(`Failed to fetch voice options: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate audio file from text using Play.ht API
 * @param text The text to convert to speech
 * @param options Options for voice, speed, pitch, etc.
 * @returns URL to the generated audio file
 */
export async function generateAudio(text: string, options: PlayHTOptions) {
  try {
    // Initial request to start generation
    const initResponse = await axios({
      method: 'POST',
      url: 'https://play.ht/api/v2/tts',
      headers: {
        'Authorization': `Bearer ${PLAYHT_API_KEY}`,
        'X-User-ID': PLAYHT_USER_ID,
        'Content-Type': 'application/json',
      },
      data: {
        text,
        voice: options.voiceId,
        speed: options.speed || 1.0,
        pitch: options.pitch || 1.0,
        output_format: 'mp3',
      },
    });

    // Get the transcription ID
    const transcriptionId = initResponse.data.transcriptionId;

    // Poll for completion
    let isComplete = false;
    let audioUrl = null;
    let retries = 0;
    const maxRetries = 30; // Maximum number of retry attempts

    while (!isComplete && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      try {
        const statusResponse = await axios({
          method: 'GET',
          url: `https://play.ht/api/v2/tts/${transcriptionId}`,
          headers: {
            'Authorization': `Bearer ${PLAYHT_API_KEY}`,
            'X-User-ID': PLAYHT_USER_ID,
          },
        });
        
        if (statusResponse.data.status === 'COMPLETED') {
          isComplete = true;
          audioUrl = statusResponse.data.audioUrl;
        }
      } catch (pollError) {
        console.warn(`Polling error (attempt ${retries + 1}):`, pollError instanceof Error ? pollError.message : String(pollError));
      }
      
      retries++;
    }

    if (!audioUrl) {
      throw new Error('Failed to generate audio: Timed out or generation failed');
    }

    return audioUrl;
  } catch (error) {
    console.error('Error generating audio with Play.ht:', error);
    throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}