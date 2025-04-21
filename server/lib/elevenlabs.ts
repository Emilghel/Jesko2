import axios from 'axios';
import { storage } from '../storage';
import { LogLevel } from '@shared/schema';

export async function getTtsStream(text: string | null, options: any = {}) {
  if (!text) {
    throw new Error('TTS text cannot be null or empty');
  }
  try {
    console.log('[TWILIO_DIRECT] [ELEVENLABS] Starting ElevenLabs TTS generation');
    
    // Get configuration
    const config = await storage.getConfig();
    
    // Use the API key from environment variable if not in config
    const apiKey = config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }
    
    // Allow overriding voice ID from options
    const voiceId = options.voiceId || config.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL'; // Rachel voice as default
    
    console.log(`[TWILIO_DIRECT] [ELEVENLABS] Using voice ID: ${voiceId}`);
    console.log(`[${LogLevel.INFO}] [ElevenLabs] Generating TTS for text (${text.length} chars)`);
    
    // Track character count for metrics - no need to await
    storage.incrementApiMetric('elevenlabs', 0, text.length)
      .catch(err => console.error('Error incrementing ElevenLabs metric:', err));
    
    // Default settings if not configured, prioritize options passed in the request
    const stability = options.stability !== undefined ? options.stability : 
                       (config.stability !== undefined ? config.stability : 0.5);
    
    const similarity = options.similarity !== undefined ? options.similarity : 
                        (config.similarity !== undefined ? config.similarity : 0.75);
    
    const style = options.style !== undefined ? options.style : 
                   (config.style !== undefined ? config.style : 0);
    
    const speakerBoost = options.speakerBoost !== undefined ? options.speakerBoost : 
                           (config.speakerBoost !== undefined ? config.speakerBoost : true);
    
    const modelId = options.modelId || config.modelId || 'eleven_monolingual_v1';
    console.log(`[TWILIO_DIRECT] [ELEVENLABS] Using model: ${modelId}`);
    
    // Use maximum optimization for latency if requested
    const optimize_streaming_latency = options.optimize_streaming_latency !== undefined ? 
                                        options.optimize_streaming_latency : 
                                        (config.optimize_streaming_latency !== undefined ? 
                                         config.optimize_streaming_latency : 0);
    
    // Optimize for faster audio encoding/decoding
    const output_format = options.output_format || config.output_format || "mp3_44100_128";
    
    // Advanced voice settings with prioritized options
    const voice_clarity = options.voice_clarity !== undefined ? options.voice_clarity : 
                           (config.voice_clarity !== undefined ? config.voice_clarity : 0.75);
    
    const voice_expressiveness = options.voice_expressiveness !== undefined ? options.voice_expressiveness : 
                                  (config.voice_expressiveness !== undefined ? config.voice_expressiveness : 0.75);
    
    const voice_naturalness = options.voice_naturalness !== undefined ? options.voice_naturalness : 
                               (config.voice_naturalness !== undefined ? config.voice_naturalness : 0.75);
    
    const voice_speed = options.voice_speed !== undefined ? options.voice_speed : 
                         (config.voice_speed !== undefined ? config.voice_speed : 1.0);
    
    const voice_pitch = options.voice_pitch !== undefined ? options.voice_pitch : 
                         (config.voice_pitch !== undefined ? config.voice_pitch : 0);
    
    // Set a faster timeout for quicker response
    const timeout = options.timeout || 15000; // 15 seconds default timeout
    
    console.log(`[TWILIO_DIRECT] [ELEVENLABS] Making API request to ElevenLabs with settings: ${JSON.stringify({
      modelId,
      voiceId,
      stability,
      similarity,
      optimize_streaming_latency,
      output_format
    })}`);
    
    // Make optimized request to ElevenLabs API
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        text,
        model_id: modelId,
        voice_settings: {
          stability: stability,
          similarity_boost: similarity,
          style: style,
          use_speaker_boost: speakerBoost,
          clarity: voice_clarity,
          expressiveness: voice_expressiveness,
          naturalness: voice_naturalness,
          pitch_shift: voice_pitch,
          speed: voice_speed
        },
        optimize_streaming_latency,
        output_format
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: timeout
      }
    );
    
    console.log(`[TWILIO_DIRECT] [ELEVENLABS] TTS generation successful, received stream response`);
    
    return response.data;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[TWILIO_DIRECT] [ELEVENLABS] Error getting TTS stream:', error);
    
    // Log the error
    const errorMessage = error.message || 'Unknown error';
    console.log(`[${LogLevel.ERROR}] [ElevenLabs] API error: ${errorMessage}`);
    
    throw error;
  }
}
