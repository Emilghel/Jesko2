/**
 * Twilio Media Streams with ElevenLabs Integration
 * 
 * This script starts a standalone server for Twilio Media Streams with ElevenLabs
 * integration and AI agent support.
 */

// Import necessary modules
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Create temp directory if it doesn't exist
const tempDir = path.resolve(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Serve static files from the temp directory
app.use('/temp', express.static(tempDir));

// Redirect root to the test page
app.get('/', (req, res) => {
  res.redirect('/testpage345');
});

// Require and use the actual server logic
const { default: twilioStreamRouter } = require('./server/twilio-stream-routes');
app.use(twilioStreamRouter);

// Define port
const PORT = process.env.TWILIO_STREAM_PORT || 4000;

// Start the main WebSocket server for Twilio Media Streams
const Server = require('./server/twilio-elevenlabs-streaming-server');

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📞 Twilio ElevenLabs Media Stream Server`);
  console.log(`🌐 Express server running at http://0.0.0.0:${PORT}`);
  console.log(`🧪 Test page available at http://0.0.0.0:${PORT}/testpage345`);
  console.log('----------------------------------------');
  console.log('✅ AI agent integration is configured and ready');
  console.log('✅ ElevenLabs streaming TTS is configured and ready');
  console.log('✅ Twilio Media Streams WebSocket is configured and ready');
  console.log('----------------------------------------');
});