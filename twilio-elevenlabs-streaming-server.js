/**
 * Twilio Media Streams with ElevenLabs TTS Integration
 * 
 * This server integrates ElevenLabs streaming TTS with Twilio Media Streams to provide
 * real-time AI voice responses in phone calls. It also connects with the AI agent system
 * to generate dynamic responses.
 */

// Import required modules
const WebSocket = require('ws');
const { Transform } = require('stream');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'your-elevenlabs-api-key';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'ErXwobaYiN019PkySvjV'; // Adam voice
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1';
const STREAM_ENDPOINT = process.env.TWILIO_STREAM_ENDPOINT || '/twilio-stream';

console.log(`🔌 Initializing Twilio Media Streams WebSocket Server at ${STREAM_ENDPOINT}...`);

// Conversation state management
const conversations = new Map();

// Set up stream websocket server
const createServer = (httpServer) => {
  const wss = new WebSocket.Server({
    server: httpServer,
    path: STREAM_ENDPOINT
  });

  console.log(`✅ WebSocket server created and listening on path: ${STREAM_ENDPOINT}`);

  // Handle new connections
  wss.on('connection', (ws) => {
    console.log('👋 New WebSocket connection established');
    const connectionId = generateId();
    let streamSid;
    let callSid;
    
    // Initialize connection state
    conversations.set(connectionId, {
      messageHistory: [],
      audioResponses: []
    });

    // Send initial message
    setTimeout(() => {
      streamElevenLabsToTwilio("Hello, I'm your AI assistant powered by ElevenLabs. How can I help you today?", ws);
    }, 1000);

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message);
        
        // Handle stream start event
        if (msg.event === 'start') {
          streamSid = msg.streamSid;
          callSid = msg.start.callSid;
          console.log(`📞 Call started - CallSid: ${callSid}, StreamSid: ${streamSid}`);
          return;
        }
        
        // Handle media from the caller
        if (msg.event === 'media') {
          const audio = decodeAudio(msg.media.payload);
          // Process audio data here (e.g., speech recognition)
          // For now, we'll just log that we received audio
          console.log(`🎤 Received audio chunk of size: ${audio.length}`);
          return;
        }
        
        // Handle stream stop event
        if (msg.event === 'stop') {
          console.log(`📞 Call ended - CallSid: ${callSid}, StreamSid: ${streamSid}`);
          // Clean up any resources for this call
          conversations.delete(connectionId);
          return;
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log('👋 WebSocket connection closed');
      // Clean up
      conversations.delete(connectionId);
    });
  });
  
  return wss;
};

// Generate a random ID for tracking connections
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// Decode Twilio's base64 audio payload
function decodeAudio(mediaPayload) {
  return Buffer.from(mediaPayload, 'base64');
}

// Process text with AI agent (stub for now)
async function processWithAgent(text) {
  console.log(`🤖 Processing with AI agent: "${text}"`);
  
  // Here we would normally call our AI agent API
  // For now, we'll just echo the text back with a simple response
  return `I understood you said: "${text}". How can I assist you further?`;
}

// Transform chunk stream for Twilio's expected format
class ChunkTransformer extends Transform {
  constructor(options) {
    super(options);
    this.chunks = [];
  }
  
  _transform(chunk, encoding, callback) {
    // Store the chunk for processing
    this.chunks.push(chunk);
    callback();
  }
  
  _flush(callback) {
    // Combine all chunks into one buffer
    const completeBuffer = Buffer.concat(this.chunks);
    
    // Convert to Twilio's expected format (16-bit PCM, 8kHz, mono)
    const tempInputPath = path.join(__dirname, 'temp_input.mp3');
    const tempOutputPath = path.join(__dirname, 'temp_output.raw');
    
    // Write the buffer to a temporary file
    fs.writeFileSync(tempInputPath, completeBuffer);
    
    // Use ffmpeg to convert to the format Twilio expects
    ffmpeg(tempInputPath)
      .outputOptions([
        '-ar 8000',  // 8kHz sample rate
        '-ac 1',     // mono
        '-f s16le'   // 16-bit signed PCM
      ])
      .save(tempOutputPath)
      .on('end', () => {
        // Read the converted audio
        const convertedAudio = fs.readFileSync(tempOutputPath);
        
        // Push to output stream
        this.push(convertedAudio);
        
        // Clean up temp files
        try {
          fs.unlinkSync(tempInputPath);
          fs.unlinkSync(tempOutputPath);
        } catch (err) {
          console.error('Error cleaning up temp files:', err);
        }
        
        callback();
      })
      .on('error', (err) => {
        console.error('Error converting audio:', err);
        callback(err);
      });
  }
}

// Stream ElevenLabs TTS response to Twilio
async function streamElevenLabsToTwilio(text, ws) {
  console.log(`🔊 Streaming TTS response: "${text}"`);
  
  try {
    // Request streaming audio from ElevenLabs
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      data: {
        text: text,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      responseType: 'stream'
    });
    
    // Create transformer for the audio stream
    const transformer = new ChunkTransformer();
    
    // Pipe the response through our transformer
    response.data.pipe(transformer);
    
    // Collect chunks and send them to Twilio
    const chunks = [];
    transformer.on('data', (chunk) => {
      chunks.push(chunk);
      
      // Send each chunk to Twilio as a "media" message
      const payload = Buffer.from(chunk).toString('base64');
      const message = {
        streamSid: 'Streaming audio from ElevenLabs',
        event: 'media',
        media: {
          payload: payload
        }
      };
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
    
    transformer.on('end', () => {
      console.log('✅ Finished streaming TTS response');
    });
    
    transformer.on('error', (error) => {
      console.error('❌ Error transforming audio stream:', error);
    });
    
  } catch (error) {
    console.error('❌ Error streaming ElevenLabs TTS:', error);
    
    // Send a fallback text response if TTS fails
    if (ws.readyState === WebSocket.OPEN) {
      const fallbackMessage = {
        event: 'log',
        log: { level: 'error', message: 'Error generating voice response' }
      };
      ws.send(JSON.stringify(fallbackMessage));
    }
  }
}

// Export the server creation function
module.exports = createServer;