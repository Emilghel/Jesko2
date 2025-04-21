/**
 * Enhanced Twilio Direct Integration
 * 
 * This module implements a direct approach to Twilio voice calls
 * based on TwiML best practices, similar to how ElevenLabs integrates with Twilio.
 */
import { Response } from 'express';
import twilio from 'twilio';
import { storage } from '../storage';
import { LogLevel } from '@shared/schema';
import { VoiceSettings } from 'elevenlabs/api';
import { getTtsStream } from './elevenlabs';
import fs from 'fs';
import path from 'path';

// Helper function to build TwiML responses
export function buildTwiML(res: Response, twiml: string) {
  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml);
  return res;
}

// Generate a simple voice response for fallbacks
export function generateVoiceResponse(message: string, options: {
  voice?: string;
  language?: string;
  loop?: number;
}) {
  const { voice = 'man', language = 'en-US', loop = 1 } = options;
  
  return `
    <Response>
      <Say voice="${voice}" language="${language}" loop="${loop}">${message}</Say>
    </Response>
  `;
}

// Make a direct Twilio call without relying on our existing complex Twilio integration
export async function makeDirectCall(options: {
  to: string;
  from: string;
  webhookUrl: string;
  webhookParams?: Record<string, string>;
  record?: boolean;
}) {
  try {
    const { to, from, webhookUrl, webhookParams = {}, record = false } = options;
    
    // Get credentials
    let twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    let twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    
    // Debug credentials
    console.log('[TWILIO_DIRECT] Using Account SID:', twilioAccountSid?.substring(0, 10) + '...');
    
    // Fix phone number format if needed
    if (process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_PHONE_NUMBER.includes(' ')) {
      console.log('[TWILIO_DIRECT] Fixing TWILIO_PHONE_NUMBER format by removing spaces');
      process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER.replace(/\s+/g, '');
    }
    
    // Ensure TWILIO_PHONE_NUMBER is set
    if (!process.env.TWILIO_PHONE_NUMBER || !process.env.TWILIO_PHONE_NUMBER.startsWith('+')) {
      console.warn('[TWILIO_DIRECT] TWILIO_PHONE_NUMBER not set properly. Will attempt to get from config or use a fallback.');
      try {
        const config = await storage.getConfig();
        if (config.twilioPhoneNumber) {
          process.env.TWILIO_PHONE_NUMBER = config.twilioPhoneNumber;
          console.log('[TWILIO_DIRECT] Set TWILIO_PHONE_NUMBER from config to:', process.env.TWILIO_PHONE_NUMBER);
        }
      } catch (configError) {
        console.error('[TWILIO_DIRECT] Error getting config from database:', configError);
      }
    } else {
      console.log('[TWILIO_DIRECT] Using TWILIO_PHONE_NUMBER from env:', process.env.TWILIO_PHONE_NUMBER);
    }
    
    if (!twilioAccountSid || !twilioAuthToken) {
      // Fallback to database configuration if environment variables are not set
      try {
        const config = await storage.getConfig();
        twilioAccountSid = config.twilioAccountSid;
        twilioAuthToken = config.twilioAuthToken;
        console.log('[TWILIO_DIRECT] Using credentials from database');
      } catch (configError) {
        console.error('[TWILIO_DIRECT] Error getting config from database:', configError);
      }
      
      if (!twilioAccountSid || !twilioAuthToken) {
        throw new Error('Twilio credentials not found in environment variables or database');
      }
    }
    
    // Initialize Twilio client
    const client = twilio(twilioAccountSid, twilioAuthToken);
    
    // Building the URL with query parameters
    let fullWebhookUrl = webhookUrl;
    if (Object.keys(webhookParams).length > 0) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(webhookParams)) {
        queryParams.append(key, value);
      }
      fullWebhookUrl += `?${queryParams.toString()}`;
    }
    
    console.log(`[TWILIO_DIRECT] Initiating call from ${from} to ${to} with webhook: ${fullWebhookUrl}`);
    
    // Create the call with Twilio
    const call = await client.calls.create({
      to,
      from,
      url: fullWebhookUrl,
      method: 'POST',
      record: record,
      statusCallback: webhookUrl.replace('/voice', '/status'),
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['completed']
    });
    
    console.log(`[TWILIO_DIRECT] Call initiated with SID: ${call.sid}`);
    
    // Log successful call initiation
    await storage.addLog({
      level: LogLevel.INFO,
      source: 'Twilio Direct',
      message: `Direct call initiated from ${from} to ${to}, SID: ${call.sid}`,
      userId: null
    });
    
    return call;
  } catch (error) {
    console.error('[TWILIO_DIRECT] Error making direct call:', error);
    
    // Get detailed error properties if it's a Twilio error
    const twilioError = error as any;
    const errorDetails = {
      message: twilioError.message || 'Unknown error',
      code: twilioError.code || 'UNKNOWN',
      moreInfo: twilioError.moreInfo || '',
      status: twilioError.status || 500
    };
    
    // Log detailed error
    await storage.addLog({
      level: LogLevel.ERROR,
      source: 'Twilio Direct',
      message: `Failed to make direct call: ${JSON.stringify(errorDetails)}`,
      userId: null
    });
    
    // Re-throw the error to be handled by the caller
    throw error;
  }
}

// Generate ElevenLabs audio for Twilio TTS
export async function generateElevenLabsAudioForTwilio(
  text: string,
  voiceId: string = 'EXAVITQu4vr4xnSDxMaL',
  modelId: string = 'eleven_monolingual_v1'
): Promise<string> {
  try {
    // Voice settings
    const voiceSettings: VoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true
    };
    
    // Get the audio stream from ElevenLabs
    const audioStream = await getTtsStream(text, {
      voiceId,
      modelId,
      ...voiceSettings
    });
    
    // Create a temporary file to store the audio
    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `tts_${timestamp}.mp3`;
    const audioPath = path.join(tempDir, filename);
    
    // Write the audio to the file
    const fileStream = fs.createWriteStream(audioPath);
    audioStream.pipe(fileStream);
    
    // Wait for the file to be written
    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });
    
    // Return the path to the audio file
    return `/temp/${filename}`;
  } catch (error) {
    console.error('[TWILIO_DIRECT] Error generating ElevenLabs audio:', error);
    throw error;
  }
}

// Create mock client for development
export function createMockTwilioClient() {
  console.log('[TWILIO_DIRECT] Creating mock Twilio client for development');
  
  return {
    calls: {
      create: async (options: any) => {
        console.log('[TWILIO_DIRECT] Mock call created with options:', options);
        
        // Generate a fake SID
        const fakeSid = `CA${Math.random().toString(36).substring(2, 15)}`;
        
        return {
          sid: fakeSid,
          status: 'queued',
          to: options.to,
          from: options.from,
          dateCreated: new Date().toISOString()
        };
      }
    },
    available: {
      phoneNumbers: {
        local: {
          list: async (params: any) => {
            return [
              {
                friendlyName: 'Mock Twilio Number 1',
                phoneNumber: '+15005550006',
                capabilities: { voice: true, SMS: true, MMS: true }
              },
              {
                friendlyName: 'Mock Twilio Number 2',
                phoneNumber: '+15005550007',
                capabilities: { voice: true, SMS: true, MMS: true }
              }
            ];
          }
        }
      }
    },
    incomingPhoneNumbers: {
      create: async (params: any) => {
        console.log('[TWILIO_DIRECT] Mock phone number purchased:', params);
        
        // Generate a fake SID
        const fakeSid = `PN${Math.random().toString(36).substring(2, 15)}`;
        
        return {
          sid: fakeSid,
          phoneNumber: params.phoneNumber,
          friendlyName: params.friendlyName || 'Mock Purchased Number',
          dateCreated: new Date().toISOString()
        };
      }
    }
  };
}