/**
 * Start script for Twilio ElevenLabs Streaming Server
 * 
 * This script starts the Twilio Media Streams server with ElevenLabs integration
 * and connects it to the AI agent system for dynamic voice responses.
 */

// Load environment variables
require('dotenv').config();

// Import required modules
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Setup temp directory for audio files
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Serve static files from temp directory
app.use('/temp', express.static(tempDir));

// Create WebSocket server for Twilio Media Streams
const createTwilioStreamServer = require('./server/twilio-elevenlabs-streaming-server');
const wss = createTwilioStreamServer(server);

// Add routes from the main application
app.use(require('./server/twilio-stream-routes').default);

// Serve a simple home page
app.get('/', (req, res) => {
  res.redirect('/testpage345');
});

// Define port
const PORT = process.env.TWILIO_STREAM_PORT || 4000;

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║ Twilio + ElevenLabs Streaming Integration Server              ║
╠═══════════════════════════════════════════════════════════════╣
║ Express server running at http://0.0.0.0:${PORT}              ║
║ Test page available at http://0.0.0.0:${PORT}/testpage345     ║
║                                                               ║
║ ✅ WebSocket server initialized                               ║
║ ✅ AI agent integration configured                            ║
║ ✅ ElevenLabs streaming TTS ready                             ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});