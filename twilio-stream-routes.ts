/**
 * Twilio Media Streams with ElevenLabs TTS Integration Routes
 * 
 * This module provides routes for the Twilio Media Streams integration
 * with ElevenLabs TTS to enable real-time AI voice conversations.
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';
import { LogLevel } from '@shared/schema';

// Create a router
const twilioStreamRouter = Router();

// Test page to demonstrate the Twilio + ElevenLabs integration
twilioStreamRouter.get('/testpage345', async (req: Request, res: Response) => {
  try {
    // Get hostname for proper WebSocket URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const streamEndpoint = process.env.TWILIO_STREAM_ENDPOINT || '/twilio-stream';
    
    // Log the access
    console.log(`[INFO] [Twilio Stream] Test page accessed by ${req.ip} with user agent: ${req.get('user-agent') || 'Unknown'}`);
    
    // Render test page HTML
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Twilio + ElevenLabs Streaming Integration</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
              pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
              h1, h2 { color: #333; }
              .note { background-color: #fffde7; padding: 10px; border-left: 4px solid #ffd600; margin: 20px 0; }
              .success { background-color: #e8f5e9; padding: 10px; border-left: 4px solid #4caf50; }
              .warning { background-color: #fff3e0; padding: 10px; border-left: 4px solid #ff9800; }
              button { background-color: #4285f4; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
              button:hover { background-color: #3367d6; }
          </style>
      </head>
      <body>
          <h1>Twilio + ElevenLabs AI Voice Streaming</h1>
          <p>This page demonstrates how to integrate ElevenLabs streaming TTS with Twilio Media Streams and our AI agent for real-time voice conversations.</p>
          
          <div class="success">
              <strong>Integration Status:</strong> Running and ready to use
          </div>
          
          <div class="note">
              <strong>Note:</strong> To use this integration, you'll need a Twilio account with a phone number capable of Voice calls.
          </div>
          
          <h2>Example TwiML for Twilio</h2>
          <p>Use the following TwiML in your Twilio Voice webhook to connect to the Media Stream:</p>
          
          <pre>&lt;Response&gt;
    &lt;Say&gt;Starting the AI voice assistant powered by Eleven Labs.&lt;/Say&gt;
    &lt;Connect&gt;
        &lt;Stream url="wss://${req.headers.host}${streamEndpoint}" /&gt;
    &lt;/Connect&gt;
    &lt;Say&gt;The AI voice assistant has disconnected.&lt;/Say&gt;
&lt;/Response&gt;</pre>
          
          <h2>Configuration</h2>
          <p>Make sure you have set up the following environment variables:</p>
          <ul>
              <li><strong>ELEVENLABS_API_KEY</strong>: Your ElevenLabs API key</li>
              <li><strong>ELEVENLABS_VOICE_ID</strong>: The voice ID to use (default is Adam)</li>
          </ul>
          
          <h2>Testing</h2>
          <p>To test this integration:</p>
          <ol>
              <li>Configure your Twilio number's Voice webhook to point to a TwiML Bin with the above TwiML</li>
              <li>Update the Stream URL in the TwiML to point to this server's public URL</li>
              <li>Call your Twilio number</li>
              <li>The call will connect to this server via WebSocket and stream AI-generated voice responses</li>
          </ol>
          
          <h2>Generate TwiML</h2>
          <p>You can also get the TwiML from this endpoint:</p>
          <pre>${baseUrl}/twiml</pre>
          <button onclick="window.open('${baseUrl}/twiml', '_blank')">Get TwiML</button>

          <h2>Integration with AI Agent</h2>
          <p>This implementation is connected to our AI agent system, which processes the user's speech and generates contextually relevant responses.</p>
          <p>The AI responses are then streamed in real-time using ElevenLabs voice synthesis, creating a natural conversation flow.</p>
          
          <footer style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; color: #666;">
              <p>Warm Lead Network - Twilio + ElevenLabs AI Voice Integration</p>
          </footer>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('[Twilio Stream] Error serving test page:', error);
    res.status(500).send('Error loading test page');
  }
});

// TwiML generation endpoint
twilioStreamRouter.post('/twiml', (req: Request, res: Response) => {
  try {
    // Get hostname for proper WebSocket URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const streamEndpoint = process.env.TWILIO_STREAM_ENDPOINT || '/twilio-stream';
    
    // Generate TwiML with Stream tag pointing to our WebSocket endpoint
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Starting the AI voice assistant powered by Eleven Labs.</Say>
    <Connect>
        <Stream url="wss://${req.headers.host}${streamEndpoint}" />
    </Connect>
    <Say>The AI voice assistant has disconnected.</Say>
</Response>`;
    
    // Set the appropriate content type and send the TwiML
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('[Twilio Stream] Error generating TwiML:', error);
    res.status(500).send('Error generating TwiML');
  }
});

export default twilioStreamRouter;