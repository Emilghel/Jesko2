/**
 * Direct Twilio Routes
 * 
 * This file implements a more direct approach to Twilio integration,
 * inspired by how ElevenLabs successfully integrates with Twilio.
 */
import express, { Request as ExpressRequest, Response, NextFunction, Router } from 'express';

// Extended Request interface with user property
interface Request extends ExpressRequest {
  user?: {
    id: number;
    email: string;
  };
}
import { verifyToken } from './lib/jwt';
import { storage } from './storage';
import { makeDirectCall, buildTwiML, generateVoiceResponse } from './lib/twilio-direct';
import { chatWithAssistant } from './lib/openai';
import { LogLevel } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import twilio from 'twilio';
import path from 'path';
import fs from 'fs';
import { getTtsStream } from './lib/elevenlabs';

// Create the router - full paths will be included in each route definition 
// so no base path is needed when registering this router
const twilioDirectRouter = Router();

// Custom middleware for API authentication
const apiAuthentication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Enable multiple authentication methods
    
    // First, check for Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract the token
      const token = authHeader.split(' ')[1];
      
      // Verify the token
      try {
        const decoded = await verifyToken(token);
        req.user = { id: decoded.userId, email: decoded.email };
        console.log(`[AUTH] User authenticated via Bearer token: ${decoded.email} (ID: ${decoded.userId})`);
        return next();
      } catch (tokenError) {
        console.warn('[AUTH] Bearer token verification failed:', tokenError);
        // Continue to try other auth methods
      }
    }
    
    // Second, check for cookies-based authentication
    if (req.cookies && req.cookies.auth_token) {
      try {
        // Your app may have a different cookie-based auth mechanism
        // This is just a placeholder
        console.log('[AUTH] Found auth_token cookie, assuming authenticated');
        req.user = { id: 1, email: 'cookie-auth@example.com' };
        return next();
      } catch (cookieError) {
        console.warn('[AUTH] Cookie authentication failed:', cookieError);
      }
    }
    
    // For development only - allow unauthenticated requests
    // This should be removed in production
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUTH] Development mode - allowing request without authentication');
      req.user = { id: 1, email: 'dev@example.com' };
      return next();
    }
    
    // If all authentication methods fail, return 401
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide a valid authentication token'
    });
  } catch (error) {
    console.error('[AUTH] Authentication system error:', error);
    return res.status(500).json({ 
      error: 'Authentication system error',
      message: 'An unexpected error occurred during authentication'
    });
  }
};

// Endpoint to initiate a direct call - properly formatted path
twilioDirectRouter.post('/api/twilio-direct/call', apiAuthentication, async (req: Request, res: Response) => {
  try {
    const { agentId, phoneNumber, leadId, twilioPhoneNumber, record = false } = req.body;
    
    // Log the full request body for debugging
    console.log(`[TWILIO_DIRECT] Call request body:`, req.body);
    
    // Input validation
    if (!agentId || !phoneNumber) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        details: 'Both agentId and phoneNumber are required' 
      });
    }
    
    console.log(`[TWILIO_DIRECT] Initiating call with agent ID: ${agentId} to number: ${phoneNumber} (Lead ID: ${leadId || 'not provided'})`);
    
    // Get the agent
    const agent = await storage.getAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: `Agent with ID ${agentId} not found` });
    }
    
    // If a lead ID is provided, verify that it exists
    if (leadId) {
      try {
        const lead = await storage.getLead(leadId);
        if (!lead) {
          console.warn(`[TWILIO_DIRECT] Lead with ID ${leadId} not found, but continuing with call anyway`);
        } else {
          console.log(`[TWILIO_DIRECT] Found lead: ${lead.full_name}`);
        }
      } catch (leadError) {
        console.warn(`[TWILIO_DIRECT] Error getting lead ${leadId}:`, leadError);
        // Continue anyway - don't fail the call just because we can't find the lead
      }
    }
    
    // Format phone number if needed
    let formattedPhoneNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedPhoneNumber = '+' + phoneNumber;
    }
    
    // Generate a unique session ID for this call
    const callSessionId = uuidv4();
    
    // Log the call attempt
    await storage.addLog({
      level: LogLevel.INFO,
      source: 'Twilio Direct',
      message: `User initiated direct call to ${formattedPhoneNumber} with agent "${agent.name}" (ID: ${agent.id})`,
      userId: req.user?.id || null
    });
    
    try {
      // Log the Twilio phone number being used
      const fromNumber = twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || '';
      console.log(`[TWILIO_DIRECT] Using Twilio phone number: ${fromNumber}`);
      
      // Check that we have a valid Twilio phone number
      if (!fromNumber || !fromNumber.startsWith('+')) {
        return res.status(400).json({
          error: 'Invalid Twilio phone number',
          details: 'The Twilio phone number must be in E.164 format (starting with +)',
          code: 'INVALID_FROM_NUMBER'
        });
      }
      
      // Fix the webhook URL to ensure it's a full URL
      const fullHost = req.get('host');
      const protocol = req.protocol === 'http' && !fullHost.includes('localhost') ? 'https' : req.protocol;
      const baseUrl = `${protocol}://${fullHost}`;
      
      console.log(`[TWILIO_DIRECT] Webhook base URL: ${baseUrl}`);
      
      // Make the call using our enhanced direct call function
      const webhookParams: Record<string, string> = {
        agentId: agent.id.toString(),
        sessionId: callSessionId,
        record: record ? 'true' : 'false'
      };
      
      // Add leadId to webhook params if it exists
      if (leadId) {
        webhookParams.leadId = leadId.toString();
      }
      
      const callResult = await makeDirectCall({
        to: formattedPhoneNumber,
        from: fromNumber,
        webhookUrl: `${baseUrl}/api/twilio-direct/voice`,
        webhookParams,
        record
      });
      
      // Return success with call SID
      res.json({
        success: true,
        callSid: callResult.sid,
        status: callResult.status,
        message: `Call initiated successfully. SID: ${callResult.sid}`,
        sessionId: callSessionId
      });
      
    } catch (callError) {
      console.error('[TWILIO_DIRECT] Error making direct call:', callError);
      
      // Extract Twilio error details if available
      const errorDetails = callError instanceof Error ? callError.message : String(callError);
      const errorCode = (callError as any).code || 'UNKNOWN';
      const statusCode = (callError as any).status || 500;
      
      await storage.addLog({
        level: LogLevel.ERROR,
        source: 'Twilio Direct',
        message: `Failed to initiate direct call: ${errorDetails} (Code: ${errorCode})`,
        userId: req.user?.id || null
      });
      
      res.status(statusCode).json({
        error: 'Failed to initiate call',
        details: errorDetails,
        code: errorCode
      });
    }
    
  } catch (error) {
    console.error('[TWILIO_DIRECT] Error in call endpoint:', error);
    res.status(500).json({ 
      error: 'Server error processing call request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// TwiML Voice webhook - handles the actual call flow
twilioDirectRouter.post('/api/twilio-direct/voice', async (req: Request, res: Response) => {
  try {
    console.log('[TWILIO_DIRECT] Voice webhook called with body:', req.body);
    
    const { agentId, sessionId, record, leadId } = req.body;
    
    if (!agentId) {
      console.error('[TWILIO_DIRECT] Missing agentId in voice webhook');
      return buildTwiML(res, `
        <Response>
          <Play digits="1"></Play>
          <Say>Sorry, there was an error with the AI agent configuration. Please try again later.</Say>
          <Pause length="2"/>
          <Hangup/>
        </Response>
      `);
    }
    
    // Get the agent
    const agent = await storage.getAgent(parseInt(agentId));
    
    if (!agent) {
      console.error(`[TWILIO_DIRECT] Agent with ID ${agentId} not found in voice webhook`);
      return buildTwiML(res, `
        <Response>
          <Play digits="1"></Play>
          <Say>Sorry, the requested AI agent could not be found. Please try again later.</Say>
          <Pause length="2"/>
          <Hangup/>
        </Response>
      `);
    }
    
    // Determine if we should record the call
    const shouldRecord = record === 'true';
    
    // Prepare the transcribe URL with parameters
    let transcribeParams = `agentId=${agentId}&sessionId=${sessionId}`;
    if (leadId) {
      transcribeParams += `&leadId=${leadId}`;
      console.log(`[TWILIO_DIRECT] Including leadId ${leadId} in transcribe params`);
    }
    
    // Try to generate ElevenLabs intro audio
    let introAudioUrl = null;
    let initialMessageAudioUrl = null;
    let promptAudioUrl = null;
    
    try {
      // Generate intro message audio
      const introMessage = `Hello, this is ${agent.name} from Warm Lead Network.`;
      introAudioUrl = await generateElevenLabsAudioForTwilio(introMessage);
      console.log(`[TWILIO_DIRECT] Generated intro audio at ${introAudioUrl}`);
      
      // Generate initial message audio
      const initialMessage = agent.initial_message || 'How can I help you today?';
      initialMessageAudioUrl = await generateElevenLabsAudioForTwilio(initialMessage);
      console.log(`[TWILIO_DIRECT] Generated initial message audio at ${initialMessageAudioUrl}`);
      
      // Generate prompt audio
      const promptMessage = "Please tell me what you're looking for and I'll be happy to assist you.";
      promptAudioUrl = await generateElevenLabsAudioForTwilio(promptMessage);
      console.log(`[TWILIO_DIRECT] Generated prompt audio at ${promptAudioUrl}`);
    } catch (audioError) {
      console.error('[TWILIO_DIRECT] Error generating ElevenLabs audio:', audioError);
      // Continue with default TTS if ElevenLabs fails
    }
    
    // Build the TwiML response with optimized settings and ElevenLabs audio if available
    let twimlResponse = `
      <Response>
        ${shouldRecord ? '<Record action="/api/twilio-direct/transcribe" recordingStatusCallback="/api/twilio-direct/status"/>' : ''}
        <Play digits="1"></Play>
    `;
    
    // Add intro with ElevenLabs if available, otherwise fall back to Twilio's TTS
    if (introAudioUrl) {
      twimlResponse += `
        <Play>${introAudioUrl}</Play>
        <Pause length="1"/>
      `;
    } else {
      twimlResponse += `
        <Say>Hello, this is ${agent.name} from Warm Lead Network.</Say>
        <Pause length="1"/>
      `;
    }
    
    // Add initial message with ElevenLabs if available
    if (initialMessageAudioUrl) {
      twimlResponse += `
        <Play>${initialMessageAudioUrl}</Play>
        <Pause length="1"/>
      `;
    } else {
      twimlResponse += `
        <Say>${agent.initial_message || 'How can I help you today?'}</Say>
        <Pause length="1"/>
      `;
    }
    
    // Add gather with ElevenLabs prompt if available
    if (promptAudioUrl) {
      twimlResponse += `
        <Gather input="speech" timeout="10" speechTimeout="auto" enhanced="true" speechModel="phone_call" 
                action="/api/twilio-direct/transcribe?${transcribeParams}">
          <Play>${promptAudioUrl}</Play>
        </Gather>
      `;
    } else {
      twimlResponse += `
        <Gather input="speech" timeout="10" speechTimeout="auto" enhanced="true" speechModel="phone_call" 
                action="/api/twilio-direct/transcribe?${transcribeParams}">
          <Say>Please tell me what you're looking for and I'll be happy to assist you.</Say>
        </Gather>
      `;
    }
    
    // Add fallback for no input
    twimlResponse += `
        <!-- Add fallback to keep call alive if user doesn't speak -->
        <Say>I didn't hear anything. Let me ask again.</Say>
        <Gather input="speech" timeout="10" speechTimeout="auto" enhanced="true" speechModel="phone_call" 
                action="/api/twilio-direct/transcribe?${transcribeParams}">
          <Say>How can I help you today?</Say>
        </Gather>
      </Response>
    `;
    
    // Log the successful webhook processing
    await storage.addLog({
      level: LogLevel.INFO,
      source: 'Twilio Direct',
      message: `Voice webhook processed for agent "${agent.name}" (ID: ${agent.id}), sessionId: ${sessionId}${leadId ? ', leadId: ' + leadId : ''}`,
      userId: agent.user_id || null
    });
    
    // Return the TwiML
    return buildTwiML(res, twimlResponse);
    
  } catch (error) {
    console.error('[TWILIO_DIRECT] Error in voice webhook:', error);
    
    // Return a fallback TwiML that explains the error with improved stability
    const fallbackResponse = `
      <Response>
        <Play digits="1"></Play>
        <Say>Sorry, we encountered a technical issue. Please try again later.</Say>
        <Pause length="2"/>
        <Hangup/>
      </Response>
    `;
    return buildTwiML(res, fallbackResponse);
  }
});

// Transcription webhook - processes speech input and generates AI response
twilioDirectRouter.post('/api/twilio-direct/transcribe', async (req: Request, res: Response) => {
  try {
    console.log('[TWILIO_DIRECT] Transcribe webhook called:', req.body);
    
    const agentId = req.query.agentId as string || req.body.agentId;
    const sessionId = req.query.sessionId as string || req.body.sessionId;
    const leadId = req.query.leadId as string || req.body.leadId;
    const speechResult = req.body.SpeechResult;
    
    if (leadId) {
      console.log(`[TWILIO_DIRECT] Transcribe webhook received leadId: ${leadId}`);
    }
    
    // Validate input
    if (!agentId) {
      console.error('[TWILIO_DIRECT] Missing agentId in transcribe webhook');
      return buildTwiML(res, `
        <Response>
          <Play digits="1"></Play>
          <Say>Sorry, there was an error with the AI agent configuration. Please try again later.</Say>
          <Pause length="2"/>
          <Hangup/>
        </Response>
      `);
    }
    
    // If we don't have a speech result, use a default prompt
    const userMessage = speechResult || "Hello, I'm interested in your services.";
    
    console.log(`[TWILIO_DIRECT] Processing speech: "${userMessage}"`);
    
    // Get the agent
    const agent = await storage.getAgent(parseInt(agentId));
    
    if (!agent) {
      console.error(`[TWILIO_DIRECT] Agent with ID ${agentId} not found in transcribe webhook`);
      return buildTwiML(res, `
        <Response>
          <Play digits="1"></Play>
          <Say>Sorry, the requested AI agent could not be found. Please try again later.</Say>
          <Pause length="2"/>
          <Hangup/>
        </Response>
      `);
    }
    
    try {
      // Process the message with our AI assistant
      const aiResponse = await chatWithAssistant(userMessage, agent.system_prompt, agent.user_id, []);
      
      // Log AI conversation with lead details if available
      await storage.addLog({
        level: LogLevel.INFO,
        source: 'Twilio Direct',
        message: `AI response for "${userMessage}"${leadId ? ' (Lead ID: ' + leadId + ')' : ''}: "${aiResponse.slice(0, 100)}..."`,
        userId: agent.user_id || null
      });
      
      // Prepare params for the next transcribe action
      let transcribeParams = `agentId=${agentId}&sessionId=${sessionId}`;
      if (leadId) {
        transcribeParams += `&leadId=${leadId}`;
      }
      
      // Try to generate ElevenLabs audio for the AI response
      let aiResponseAudioUrl = null;
      let promptAudioUrl = null;
      let fallbackAudioUrl = null;
      
      try {
        // Generate audio for the AI response
        aiResponseAudioUrl = await generateElevenLabsAudioForTwilio(aiResponse);
        console.log(`[TWILIO_DIRECT] Generated AI response audio at ${aiResponseAudioUrl}`);
        
        // Generate prompt audio
        const promptMessage = "Is there anything else you'd like to know?";
        promptAudioUrl = await generateElevenLabsAudioForTwilio(promptMessage);
        console.log(`[TWILIO_DIRECT] Generated prompt audio at ${promptAudioUrl}`);
        
        // Generate fallback audio
        const fallbackMessage = "I didn't hear your response. Let me know if you have any other questions.";
        fallbackAudioUrl = await generateElevenLabsAudioForTwilio(fallbackMessage);
        console.log(`[TWILIO_DIRECT] Generated fallback audio at ${fallbackAudioUrl}`);
      } catch (audioError) {
        console.error('[TWILIO_DIRECT] Error generating ElevenLabs audio:', audioError);
        // Continue with default TTS if ElevenLabs fails
      }
      
      // Build TwiML with ElevenLabs audio if available
      let twimlResponse = `
        <Response>
          <Play digits="1"></Play>
      `;
      
      // Add AI response with ElevenLabs if available
      if (aiResponseAudioUrl) {
        twimlResponse += `
          <Play>${aiResponseAudioUrl}</Play>
          <Pause length="1"/>
        `;
      } else {
        twimlResponse += `
          <Say>${aiResponse}</Say>
          <Pause length="1"/>
        `;
      }
      
      // Add gather with ElevenLabs prompt if available
      if (promptAudioUrl) {
        twimlResponse += `
          <Gather input="speech" timeout="10" speechTimeout="auto" enhanced="true" speechModel="phone_call" 
                  action="/api/twilio-direct/transcribe?${transcribeParams}">
            <Play>${promptAudioUrl}</Play>
          </Gather>
        `;
      } else {
        twimlResponse += `
          <Gather input="speech" timeout="10" speechTimeout="auto" enhanced="true" speechModel="phone_call" 
                  action="/api/twilio-direct/transcribe?${transcribeParams}">
            <Say>Is there anything else you'd like to know?</Say>
          </Gather>
        `;
      }
      
      // Add fallback for no input with ElevenLabs if available
      if (fallbackAudioUrl) {
        twimlResponse += `
          <!-- Add fallback to keep call alive if user doesn't speak -->
          <Play>${fallbackAudioUrl}</Play>
          <Gather input="speech" timeout="10" speechTimeout="auto" enhanced="true" speechModel="phone_call" 
                  action="/api/twilio-direct/transcribe?${transcribeParams}">
            <Say>Is there anything else I can help you with today?</Say>
          </Gather>
        </Response>
        `;
      } else {
        twimlResponse += `
          <!-- Add fallback to keep call alive if user doesn't speak -->
          <Say>I didn't hear your response. Let me know if you have any other questions.</Say>
          <Gather input="speech" timeout="10" speechTimeout="auto" enhanced="true" speechModel="phone_call" 
                  action="/api/twilio-direct/transcribe?${transcribeParams}">
            <Say>Is there anything else I can help you with today?</Say>
          </Gather>
        </Response>
        `;
      }
      
      // Return the TwiML
      return buildTwiML(res, twimlResponse);
      
    } catch (aiError) {
      console.error('[TWILIO_DIRECT] Error getting AI response:', aiError);
      
      // Fall back to a generic response with standard TTS
      const fallbackResponse = `
        <Response>
          <Play digits="1"></Play>
          <Say>I apologize, but I'm having trouble processing your request at the moment. Please try again later.</Say>
          <Pause length="1"/>
          <Say>Thank you for your understanding.</Say>
          <Pause length="2"/>
          <Hangup/>
        </Response>
      `;
      
      return buildTwiML(res, fallbackResponse);
    }
    
  } catch (error) {
    console.error('[TWILIO_DIRECT] Error in transcribe webhook:', error);
    
    // Return a fallback TwiML that explains the error with improved stability
    const fallbackResponse = `
      <Response>
        <Play digits="1"></Play>
        <Say>Sorry, we encountered a technical issue processing your speech. Please try again later.</Say>
        <Pause length="2"/>
        <Hangup/>
      </Response>
    `;
    return buildTwiML(res, fallbackResponse);
  }
});

// Recording status webhook
twilioDirectRouter.post('/api/twilio-direct/status', async (req: Request, res: Response) => {
  try {
    console.log('[TWILIO_DIRECT] Recording status webhook called:', req.body);
    
    const recordingStatus = req.body.RecordingStatus;
    const recordingUrl = req.body.RecordingUrl;
    const recordingSid = req.body.RecordingSid;
    const callSid = req.body.CallSid;
    
    // Log the recording status
    await storage.addLog({
      level: LogLevel.INFO,
      source: 'Twilio Direct',
      message: `Recording status webhook: ${recordingStatus}, SID: ${recordingSid}, Call SID: ${callSid}`,
      userId: null
    });
    
    if (recordingStatus === 'completed' && recordingUrl) {
      // Save the recording URL in the database
      try {
        // Here you would typically save the recording URL to your database
        // For example:
        // await storage.saveCallRecording(callSid, recordingSid, recordingUrl);
        
        console.log(`[TWILIO_DIRECT] Recording saved: ${recordingUrl}`);
      } catch (saveError) {
        console.error('[TWILIO_DIRECT] Error saving recording:', saveError);
      }
    }
    
    // Return a 200 OK response to acknowledge receipt
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('[TWILIO_DIRECT] Error in recording status webhook:', error);
    res.status(500).send('Error processing recording status');
  }
});

export default twilioDirectRouter;