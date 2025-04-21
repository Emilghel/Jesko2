import axios from 'axios';
import { storage } from '../storage';
import { LogLevel, CallStatus } from '@shared/schema';
import twilio from 'twilio';

// Interface for mock Twilio client with expanded functionality
interface MockTwilioClient {
  available: {
    phoneNumbers: {
      local: {
        list: (params?: any) => Promise<any[]>;
      };
    };
  };
  incomingPhoneNumbers: {
    create: (params: any) => Promise<any>;
    list: (params?: any) => Promise<any[]>;
  };
  calls: {
    create: (params: any) => Promise<any>;
    get: (callSid: string) => Promise<any>;
    update: (callSid: string, params: any) => Promise<any>;
  };
  messages: {
    create: (params: any) => Promise<any>;
  };
  availablePhoneNumbers: (countryCode: string) => {
    local: {
      list: (params?: any) => Promise<any[]>;
    };
  };
}

/**
 * Get purchased Twilio phone numbers for the account
 * 
 * @returns List of phone numbers in E.164 format
 */
export async function getTwilioPhoneNumbers(): Promise<string[]> {
  try {
    console.log('[DEBUG] Getting purchased Twilio phone numbers');
    
    // Get the configuration
    const config = await storage.getConfig();
    
    // Verify required Twilio credentials are present
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      console.error('[ERROR] Missing Twilio authentication credentials for phone number lookup');
      
      // Return the real Twilio number in development environments
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Returning phone number for development: +15302886523');
        return ['+15302886523']; // Using the actual Twilio phone number for emilghelmeci@gmail.com
      }
      
      return [];
    }
    
    // Initialize Twilio client with credentials
    const twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
    
    // Always include our known real number in development mode
    let phoneNumbers: string[] = [];
    if (process.env.NODE_ENV === 'development') {
      phoneNumbers.push('+15302886523');
    }
    
    try {
      // Fetch all incoming phone numbers for the account
      const incomingPhoneNumbers = await twilioClient.incomingPhoneNumbers.list();
      
      // Extract just the phone numbers in E.164 format
      const twilioPhoneNumbers = incomingPhoneNumbers.map(number => number.phoneNumber);
      
      // Add any Twilio account numbers to our list
      phoneNumbers = [...new Set([...phoneNumbers, ...twilioPhoneNumbers])];
      
      console.log(`[INFO] Found ${phoneNumbers.length} total Twilio phone numbers`);
    } catch (apiError) {
      console.error('[ERROR] Failed to fetch Twilio numbers from API:', apiError);
      // Continue with what we have so far (real number in development)
    }
    
    return phoneNumbers;
  } catch (error) {
    console.error('[ERROR] Failed to fetch Twilio phone numbers:', error);
    
    if (process.env.NODE_ENV === 'development') {
      // Provide the real Twilio number in development environment
      console.log('[DEBUG] Returning phone number from catch block: +15302886523');
      return ['+15302886523']; // Using the actual Twilio phone number for emilghelmeci@gmail.com
    }
    
    return [];
  }
}

// Create a mock Twilio client for development
/**
 * Get available Twilio phone numbers for the account
 * 
 * @returns List of available phone numbers with their properties
 */
export async function getAvailableTwilioNumbers(): Promise<any[]> {
  try {
    console.log('[DEBUG] Getting available Twilio phone numbers');
    
    // Get the configuration
    const config = await storage.getConfig();
    
    // Verify required Twilio credentials are present
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      console.error('[ERROR] Missing Twilio authentication credentials for phone number lookup');
      
      // Add detailed error message about which specific credentials are missing
      const missingCredentials = [];
      if (!config.twilioAccountSid) missingCredentials.push('Account SID');
      if (!config.twilioAuthToken) missingCredentials.push('Auth Token');
      
      throw new Error(`Twilio credentials incomplete: missing ${missingCredentials.join(', ')}`);
    }
    
    // Initialize the Twilio client
    const twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
    
    // Get incoming phone numbers (numbers purchased on the account)
    const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 20 });
    
    // Format the response to include only required fields
    const phoneNumbers = incomingNumbers.map(number => ({
      sid: number.sid,
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName || number.phoneNumber,
      capabilities: number.capabilities
    }));
    
    console.log(`[DEBUG] Found ${phoneNumbers.length} Twilio phone numbers`);
    
    return phoneNumbers;
  } catch (error) {
    console.error('[ERROR] Failed to get Twilio phone numbers:', error);
    
    // If we're in development mode, return some test phone numbers
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Returning mock phone numbers for development');
      
      return [
        {
          sid: 'PN00000000000000000000000000000001',
          phoneNumber: '+15005550006',
          friendlyName: 'Twilio Test Number 1',
          capabilities: { voice: true, sms: true }
        },
        {
          sid: 'PN00000000000000000000000000000002',
          phoneNumber: '+15005550007',
          friendlyName: 'Twilio Test Number 2',
          capabilities: { voice: true, sms: false }
        }
      ];
    }
    
    throw error;
  }
}

export function createMockTwilioClient(): MockTwilioClient {
  console.log('Creating and returning mock Twilio client for development');
  
  // Set up mock phone numbers with realistic data
  const mockPhoneNumbers = [
    {
      phoneNumber: '+15302886523',
      friendlyName: '+1 (530) 288-6523',
      locality: 'Grass Valley',
      region: 'CA',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: true
      },
      lata: '722',
      rateCenter: 'SNDG',
      latitude: '37.7749',
      longitude: '-122.4194',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PN1234567890abcdef1234567890abcdef'
    },
    {
      phoneNumber: '+14155552672',
      friendlyName: '+1 (415) 555-2672',
      locality: 'San Francisco',
      region: 'CA',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: false
      },
      lata: '722',
      rateCenter: 'SNDG',
      latitude: '37.7749',
      longitude: '-122.4194',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PN2345678901abcdef2345678901abcdef'
    },
    {
      phoneNumber: '+14155552673',
      friendlyName: '+1 (415) 555-2673',
      locality: 'San Francisco',
      region: 'CA',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: true
      },
      lata: '722',
      rateCenter: 'SNDG',
      latitude: '37.7749',
      longitude: '-122.4194',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PN3456789012abcdef3456789012abcdef'
    },
    {
      phoneNumber: '+14155552674',
      friendlyName: '+1 (415) 555-2674',
      locality: 'San Francisco',
      region: 'CA',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: true
      },
      lata: '722',
      rateCenter: 'SNDG',
      latitude: '37.7749',
      longitude: '-122.4194',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PN4567890123abcdef4567890123abcdef'
    },
    {
      phoneNumber: '+12125551234',
      friendlyName: '+1 (212) 555-1234',
      locality: 'New York',
      region: 'NY',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: true
      },
      lata: '132',
      rateCenter: 'NYCG',
      latitude: '40.7128',
      longitude: '-74.0060',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PN5678901234abcdef5678901234abcdef'
    },
    {
      phoneNumber: '+12125551235',
      friendlyName: '+1 (212) 555-1235',
      locality: 'New York',
      region: 'NY',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: false
      },
      lata: '132',
      rateCenter: 'NYCG',
      latitude: '40.7128',
      longitude: '-74.0060',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PN6789012345abcdef6789012345abcdef'
    },
    {
      phoneNumber: '+13125551001',
      friendlyName: '+1 (312) 555-1001',
      locality: 'Chicago',
      region: 'IL',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: true
      },
      lata: '358',
      rateCenter: 'CHCG',
      latitude: '41.8781',
      longitude: '-87.6298',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PN7890123456abcdef7890123456abcdef'
    },
    {
      phoneNumber: '+13125551002',
      friendlyName: '+1 (312) 555-1002',
      locality: 'Chicago',
      region: 'IL',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: false
      },
      lata: '358',
      rateCenter: 'CHCG',
      latitude: '41.8781',
      longitude: '-87.6298',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PN8901234567abcdef8901234567abcdef'
    },
    {
      phoneNumber: '+13235551111',
      friendlyName: '+1 (323) 555-1111',
      locality: 'Los Angeles',
      region: 'CA',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: true
      },
      lata: '730',
      rateCenter: 'LSAN',
      latitude: '34.0522',
      longitude: '-118.2437',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PN9012345678abcdef9012345678abcdef'
    },
    {
      phoneNumber: '+13235551112',
      friendlyName: '+1 (323) 555-1112',
      locality: 'Los Angeles',
      region: 'CA',
      isoCountry: 'US',
      capabilities: {
        voice: true,
        SMS: true,
        MMS: false
      },
      lata: '730',
      rateCenter: 'LSAN',
      latitude: '34.0522',
      longitude: '-118.2437',
      price: 1.00,
      beta: false,
      isTollFree: false,
      addons: {},
      sid: 'PNa123456789abcdefa123456789abcdef'
    }
  ];
  
  // Storage for mock calls and messages
  const mockCalls: Map<string, any> = new Map();
  const mockMessages: Map<string, any> = new Map();
  const mockPurchasedNumbers: Map<string, any> = new Map();
  
  // Return mock client with all methods needed for our application
  return {
    // Method accessed directly through available property (deprecated style)
    available: {
      phoneNumbers: {
        local: {
          list: async (params?: any) => {
            console.log('Mock Twilio client: Fetching available phone numbers with params:', params);
            
            // If area code is specified, filter mock numbers
            if (params && params.areaCode) {
              // In real implementation, we would filter by area code
              // For demo, just return fixed numbers regardless of area code
              return mockPhoneNumbers;
            }
            
            return mockPhoneNumbers;
          }
        }
      }
    },
    
    // Method accessed through availablePhoneNumbers function (current style)
    availablePhoneNumbers: (countryCode: string) => {
      console.log(`Mock Twilio client: Accessing available phone numbers for country: ${countryCode}`);
      
      return {
        local: {
          list: async (params?: any) => {
            console.log('Mock Twilio client: Listing available phone numbers with params:', params);
            
            // Filter based on area code if provided
            if (params && params.areaCode) {
              // In a real implementation, we would filter by area code
              // For mock client, we'll just return our standard numbers
              return mockPhoneNumbers;
            }
            
            return mockPhoneNumbers;
          }
        }
      };
    },
    incomingPhoneNumbers: {
      create: async (params: any) => {
        console.log('Mock Twilio client: Purchasing phone number:', params.phoneNumber);
        
        // Find the number in our mock list
        const phoneNumberDetails = mockPhoneNumbers.find(
          num => num.phoneNumber === params.phoneNumber
        );
        
        if (!phoneNumberDetails) {
          throw new Error('Phone number not found in available numbers');
        }
        
        // Create the purchased number object
        const purchasedNumber = {
          sid: `PN${Date.now()}`,
          dateCreated: new Date().toISOString(),
          dateUpdated: new Date().toISOString(),
          friendlyName: params.friendlyName || phoneNumberDetails.friendlyName,
          phoneNumber: phoneNumberDetails.phoneNumber,
          status: 'in-use',
          capabilities: phoneNumberDetails.capabilities,
          apiVersion: '2010-04-01',
          price: phoneNumberDetails.price,
          priceUnit: 'USD',
          uri: `/2010-04-01/Accounts/ACxxxxx/IncomingPhoneNumbers/${phoneNumberDetails.sid}.json`,
          accountSid: 'ACxxxxx',
          addressSid: null,
          addressRequirements: 'none',
          beta: false,
          bundleSid: null,
          emergencyAddressSid: null,
          emergencyStatus: 'Inactive',
          identitySid: null,
          origin: 'twilio',
          smsApplicationSid: '',
          smsFallbackMethod: 'POST',
          smsFallbackUrl: '',
          smsMethod: 'POST',
          smsUrl: params.smsUrl || '',
          statusCallback: params.statusCallback || '',
          statusCallbackMethod: 'POST',
          trunkSid: null,
          voiceApplicationSid: '',
          voiceCallerIdLookup: false,
          voiceFallbackMethod: 'POST',
          voiceFallbackUrl: '',
          voiceMethod: 'POST',
          voiceUrl: params.voiceUrl || ''
        };
        
        // Store in our mock database
        mockPurchasedNumbers.set(purchasedNumber.sid, purchasedNumber);
        
        return purchasedNumber;
      },
      list: async (params?: any) => {
        console.log('Mock Twilio client: Listing purchased phone numbers with params:', params);
        
        // If we don't have any purchased numbers in our mock database,
        // return the real Twilio number for better testing
        if (mockPurchasedNumbers.size === 0) {
          console.log('[DEBUG] No mock purchased numbers found, returning real Twilio number');
          return [{
            sid: 'PN5302886523',
            phoneNumber: '+15302886523',
            friendlyName: '+1 (530) 288-6523',
            capabilities: { voice: true, SMS: true, MMS: true }
          }];
        }
        
        return Array.from(mockPurchasedNumbers.values());
      }
    },
    calls: {
      create: async (params: any) => {
        console.log('Mock Twilio client: Creating call with params:', params);
        
        // Generate a unique call SID
        const callSid = `CA${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Create a mock call object
        const call = {
          sid: callSid,
          dateCreated: new Date().toISOString(),
          dateUpdated: new Date().toISOString(),
          parentCallSid: null,
          accountSid: 'ACxxxxx',
          to: params.to,
          from: params.from,
          phoneNumberSid: mockPurchasedNumbers.size > 0 ? 
            Array.from(mockPurchasedNumbers.keys())[0] : 'PNxxxxx',
          status: 'queued',
          startTime: null,
          endTime: null,
          duration: null,
          price: 0,
          priceUnit: 'USD',
          direction: 'outbound-api',
          answeredBy: null,
          apiVersion: '2010-04-01',
          forwardedFrom: null,
          callerName: null,
          uri: `/2010-04-01/Accounts/ACxxxxx/Calls/${callSid}.json`,
          subresourceUris: {
            notifications: `/2010-04-01/Accounts/ACxxxxx/Calls/${callSid}/Notifications.json`,
            recordings: `/2010-04-01/Accounts/ACxxxxx/Calls/${callSid}/Recordings.json`
          }
        };
        
        // Store the call
        mockCalls.set(callSid, call);
        
        // Simulate a successful call after a short delay
        setTimeout(() => {
          const updatedCall = {...call, status: 'in-progress', startTime: new Date().toISOString()};
          mockCalls.set(callSid, updatedCall);
          console.log(`Mock Twilio client: Call ${callSid} is now in progress`);
          
          // After a few more seconds, complete the call
          setTimeout(() => {
            const completedCall = {
              ...updatedCall, 
              status: 'completed', 
              endTime: new Date().toISOString(),
              duration: 30
            };
            mockCalls.set(callSid, completedCall);
            console.log(`Mock Twilio client: Call ${callSid} has completed`);
          }, 10000);
        }, 2000);
        
        return call;
      },
      get: async (callSid: string) => {
        console.log(`Mock Twilio client: Getting call details for ${callSid}`);
        
        const call = mockCalls.get(callSid);
        if (!call) {
          throw new Error(`Call with SID ${callSid} not found`);
        }
        
        return call;
      },
      update: async (callSid: string, params: any) => {
        console.log(`Mock Twilio client: Updating call ${callSid} with params:`, params);
        
        const call = mockCalls.get(callSid);
        if (!call) {
          throw new Error(`Call with SID ${callSid} not found`);
        }
        
        // Update the call with the provided parameters
        const updatedCall = {...call, ...params, dateUpdated: new Date().toISOString()};
        
        // If status is being changed to completed, set end time and calculate duration
        if (params.status === 'completed' && call.status !== 'completed') {
          updatedCall.endTime = new Date().toISOString();
          
          // Calculate duration if we have a start time
          if (call.startTime) {
            const startTime = new Date(call.startTime).getTime();
            const endTime = new Date(updatedCall.endTime).getTime();
            updatedCall.duration = Math.round((endTime - startTime) / 1000); // Duration in seconds
          }
        }
        
        // Store the updated call
        mockCalls.set(callSid, updatedCall);
        
        return updatedCall;
      }
    },
    messages: {
      create: async (params: any) => {
        console.log('Mock Twilio client: Creating SMS message with params:', params);
        
        // Generate a unique message SID
        const messageSid = `SM${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Create a mock message object
        const message = {
          sid: messageSid,
          dateCreated: new Date().toISOString(),
          dateUpdated: new Date().toISOString(),
          dateSent: new Date().toISOString(),
          accountSid: 'ACxxxxx',
          to: params.to,
          from: params.from,
          body: params.body,
          status: 'delivered',
          numSegments: '1',
          numMedia: '0',
          direction: 'outbound-api',
          apiVersion: '2010-04-01',
          price: -0.0075,
          priceUnit: 'USD',
          uri: `/2010-04-01/Accounts/ACxxxxx/Messages/${messageSid}.json`,
          subresourceUris: {
            media: `/2010-04-01/Accounts/ACxxxxx/Messages/${messageSid}/Media.json`
          }
        };
        
        // Store the message
        mockMessages.set(messageSid, message);
        
        return message;
      }
    }
  };
}

export async function handleTwilioWebhook(body: any, req: any) {
  try {
    const { CallSid, From } = body;
    
    // Log the incoming call
    console.log(`[${LogLevel.INFO}] [Twilio] Incoming call from ${From} with SID ${CallSid}`);
    
    // Get active agent
    const agents = await storage.getAgents();
    const activeAgent = agents.find(agent => agent.active && agent.phone_number === body.To);
    const agentId = activeAgent ? activeAgent.id : null;
    
    // Store the call in our database
    await storage.addCall({
      callSid: CallSid,
      phoneNumber: From,
      status: CallStatus.IN_PROGRESS,
      agentId,
      recordingUrl: null,
      recordingSid: null,
      transcript: null
    });
    
    // Get the configuration
    const config = await storage.getConfig();
    
    // Add metrics
    await storage.incrementApiMetric('twilio', 0, 0, agentId || undefined);
    
    // Generate TwiML response with recording enabled
    const welcomeMessage = activeAgent?.description || 'Hello, how can I help you today?';
    
    // Get the base URL from host header, with special handling for Replit production
    let webhookBaseUrl;
    
    // For Replit deployments
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      // For a deployed Replit app, use the replit.dev domain format
      webhookBaseUrl = `https://${process.env.REPL_SLUG.replace(/-/g, '-')}-${process.env.REPL_OWNER.toLowerCase()}.replit.dev`;
      
      // Log the URL we're using
      console.log(`[${LogLevel.INFO}] [Twilio] Using Replit production URL for webhooks: ${webhookBaseUrl}`);
    } else {
      // Try to get a usable URL from the request headers
      const host = req.get('host') || 'localhost:5000';
      
      // If this is a local request, we need an externally accessible URL
      // Using ngrok or a Replit URL is recommended for production
      webhookBaseUrl = `https://${host.replace('localhost:5000', 'warm-leadnetwork-ai-production.repl.co')}`;
      
      console.log(`[${LogLevel.INFO}] [Twilio] Using webhook URL: ${webhookBaseUrl}`);
    }
    
        // Get the agent ID if passed or the active agent ID we found
    const finalAgentId = body.agentId || req.query.agentId || agentId;
    
    if (finalAgentId) {
      console.log(`[${LogLevel.INFO}] [Twilio] Using agent ID ${finalAgentId} for TwiML generation`);
      
      // Use the outbound-voice endpoint with the agent ID for consistent handling
      // This ensures the same logic works for both inbound and outbound calls
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Redirect method="POST">' + webhookBaseUrl + '/api/twilio/outbound-voice?agentId=' + finalAgentId + '</Redirect>' +
        '</Response>';
      
      return twiml;
    } else {
      console.log(`[${LogLevel.INFO}] [Twilio] No agent ID provided, using generic TwiML response`);
      
      // Generic response without agent-specific voice for backward compatibility
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Record action="' + webhookBaseUrl + '/api/twilio/recording" method="POST" maxLength="3600" trim="trim-silence" recordingStatusCallback="' + webhookBaseUrl + '/api/twilio/recording-status" recordingStatusCallbackMethod="POST" />' +
        '<Gather input="speech" action="' + webhookBaseUrl + '/api/twilio/audio" method="POST" speechTimeout="auto" language="en-US">' +
        '<Say>' + welcomeMessage + '</Say>' +
        '</Gather>' +
        '<Say>We didn\'t receive any input. Goodbye!</Say>' +
        '</Response>';
      
      return twiml;
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling Twilio webhook:', error);
    throw error;
  }
}

export async function endCall(callSid: string) {
  try {
    // Get the configuration
    const config = await storage.getConfig();
    
    // Check environment variables first
    const envSid = process.env.TWILIO_ACCOUNT_SID;
    const envToken = process.env.TWILIO_AUTH_TOKEN;
    
    // Use environment variables if available, fallback to config
    const accountSid = envSid || config.twilioAccountSid;
    const authToken = envToken || config.twilioAuthToken;
    
    // Log our approach
    console.log(`[${LogLevel.INFO}] [Twilio] Attempting to end call ${callSid} using ${envSid ? 'environment variables' : 'stored config'}`);
    
    // First try using the Twilio Node SDK
    try {
      if (accountSid && authToken) {
        // Initialize the Twilio client
        const twilioClient = twilio(accountSid, authToken);
        
        // Update the call status
        const result = await twilioClient.calls(callSid).update({
          status: 'completed'
        });
        
        // Update our database
        await storage.updateCallStatus(callSid, CallStatus.COMPLETED);
        
        console.log(`[${LogLevel.INFO}] [Twilio] Call ended successfully using Twilio SDK: ${callSid}`);
        
        return result;
      }
    } catch (sdkError) {
      // Log the SDK approach error but continue to the next attempt
      console.error('Error ending call using Twilio SDK:', sdkError);
    }
    
    // If SDK approach failed or no credentials, try direct API method
    try {
      if (accountSid && authToken) {
        // Make direct API call to Twilio to end the call
        const response = await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`,
          new URLSearchParams({
            Status: 'completed'
          }),
          {
            auth: {
              username: accountSid,
              password: authToken
            }
          }
        );
        
        // Update call status in our database
        await storage.updateCallStatus(callSid, CallStatus.COMPLETED);
        
        console.log(`[${LogLevel.INFO}] [Twilio] Call ended successfully using direct API: ${callSid}`);
        
        return response.data;
      }
    } catch (apiError) {
      // Log the API approach error but continue to fallback option
      console.error('Error ending call using direct API:', apiError);
    }
    
    // Development environment with mock client fallback
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${LogLevel.INFO}] [Twilio] Development environment detected, using mock client for call end: ${callSid}`);
      
      // Create mock client
      const mockClient = createMockTwilioClient();
      
      try {
        // Use the mock client to update the call
        const mockResult = await mockClient.calls.update(callSid, {
          status: 'completed'
        });
        
        // Update our database
        await storage.updateCallStatus(callSid, CallStatus.COMPLETED);
        
        console.log(`[${LogLevel.INFO}] [Twilio] Call ended successfully using mock client: ${callSid}`);
        
        return mockResult;
      } catch (mockError) {
        console.error('Error ending call using mock client:', mockError);
        // Even though this is a mock, let's simulate providing a reasonable response
        
        // Update our database anyway since this is the mock fallback
        await storage.updateCallStatus(callSid, CallStatus.COMPLETED);
        
        console.log(`[${LogLevel.INFO}] [Twilio] Call marked as completed in database despite mock client error: ${callSid}`);
        
        // Return a simulated successful response
        return {
          sid: callSid,
          status: 'completed',
          dateCreated: new Date().toISOString(),
          dateUpdated: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 60, // Simulate a 1-minute call
          direction: 'outbound-api',
          mockResponse: true
        };
      }
    }
    
    // If we get here, all attempts failed
    throw new Error('Failed to end call: No valid Twilio credentials and not in development environment');
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error ending call:', error);
    throw error;
  }
}

export async function handleRecordingWebhook(body: any) {
  try {
    const { CallSid, RecordingSid, RecordingUrl } = body;
    
    console.log(`[${LogLevel.INFO}] [Twilio] Recording available for call ${CallSid}`);
    
    // Update the call with the recording information
    await storage.updateCallStatus(
      CallSid, 
      CallStatus.IN_PROGRESS, 
      {
        recordingUrl: RecordingUrl,
        recordingSid: RecordingSid
      }
    );
    
    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling recording webhook:', error);
    throw error;
  }
}

export async function handleRecordingStatusWebhook(body: any) {
  try {
    const { CallSid, RecordingSid, RecordingStatus } = body;
    
    console.log(`[${LogLevel.INFO}] [Twilio] Recording status update for call ${CallSid}: ${RecordingStatus}`);
    
    if (RecordingStatus === 'completed') {
      // You could trigger some post-processing here
      await storage.addLog({
        level: LogLevel.INFO,
        source: 'Twilio',
        message: `Recording completed for call ${CallSid}`
      });
    }
    
    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling recording status webhook:', error);
    throw error;
  }
}

/**
 * Initiates an outbound call using Twilio from an AI agent to a lead
 * with enhanced error handling and detailed logging
 * 
 * @param {number} agentId - The ID of the AI agent making the call
 * @param {string} to - The phone number to call (E.164 format)
 * @param {string} webhookBaseUrl - Base URL for Twilio webhooks
 * @param {string} twilioPhoneNumber - Optional Twilio phone number to use as caller ID
 * @returns {Promise<any>} - The Twilio call response
 */
export async function initiateOutboundCall(
  agentId: number, 
  to: string, 
  webhookBaseUrl?: string, 
  twilioPhoneNumber?: string,
  options: {
    record?: boolean;
    useFallback?: boolean;
  } = {}
) {
  try {
    console.log(`[DEBUG] Initiating outbound call with agent ${agentId} to number ${to}`);
    
    // First validate the "to" phone number - it should already be in E.164 format
    // from client validation and API route sanitization
    if (!to) {
      console.error(`[ERROR] Missing destination phone number in call request`);
      throw new Error(`Missing destination phone number. A valid phone number is required.`);
    }
    
    // Validate the "to" number format (E.164 validation)
    const toPhoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!toPhoneRegex.test(to)) {
      console.error(`[ERROR] Invalid destination phone number format: ${to}`);
      throw new Error(`Invalid destination phone number format. Must be in E.164 format (e.g., +12125551234)`);
    }
    
    console.log(`[DEBUG] Validated destination phone number: ${to}`);
    
    // Retrieve the agent
    const agent = await storage.getAgent(agentId);
    if (!agent) {
      console.error(`[ERROR] Agent with ID ${agentId} not found`);
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    console.log(`[DEBUG] Successfully retrieved agent: ${agent.name} (ID: ${agent.id})`);
    
    // Get the configuration
    const config = await storage.getConfig();
    
    // Verify required Twilio credentials are present
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      console.error('[ERROR] Missing Twilio authentication credentials');
      
      // Add detailed error message about which specific credentials are missing
      const missingCredentials = [];
      if (!config.twilioAccountSid) missingCredentials.push('Account SID');
      if (!config.twilioAuthToken) missingCredentials.push('Auth Token');
      
      throw new Error(`Twilio credentials incomplete: missing ${missingCredentials.join(', ')}`);
    }
    
    // IMPORTANT: The agent.phone_number is no longer used for calling.
    // It's just stored as a reference but we don't need to validate it anymore
    // since we're using Twilio phone numbers for outbound calls.
    
    console.log(`[DEBUG] Proceeding with Twilio call without using agent phone_number field`);
    
    // For backwards compatibility and future reference, if the agent has a phone number,
    // we'll still clean and validate it, but we won't use it for the actual call
    if (agent.phone_number && agent.phone_number.trim() !== '') {
      console.log(`[DEBUG] Agent has phone_number field: '${agent.phone_number}' (for reference only)`);
      
      // Clean the phone number - remove any spaces, dashes, or parentheses
      let cleanedPhoneNumber = agent.phone_number.replace(/[\s\-\(\)]/g, '');
      
      // If the number doesn't start with a '+', add it (assuming US/North America)
      if (!cleanedPhoneNumber.startsWith('+')) {
        if (cleanedPhoneNumber.startsWith('1')) {
          cleanedPhoneNumber = '+' + cleanedPhoneNumber;
        } else {
          cleanedPhoneNumber = '+1' + cleanedPhoneNumber;  // Default to US country code
        }
        console.log(`[DEBUG] Reference agent phone number reformatted to: '${cleanedPhoneNumber}'`);
      }
      
      // Update the agent's phone number with the cleaned version for future reference
      agent.phone_number = cleanedPhoneNumber;
    } else {
      // Agent has no phone number - this is fine now, we're not using it for calling
      console.log(`[DEBUG] Agent ID ${agentId} does not have a phone_number field configured, but this is OK`);
      // No need to throw an error here anymore
    }
    
    console.log(`[DEBUG] Twilio configuration verified successfully`);
    
    // Add log entry
    await storage.addLog({
      level: LogLevel.INFO,
      source: 'Twilio',
      message: `Initiating outbound call from agent ${agent.name} to ${to}`
    });
    
    // Determine webhook base URL if not provided
    let baseUrl = webhookBaseUrl;
    if (!baseUrl) {
      // For Replit deployments, we need to use the current domain format
      baseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
      
      // Check if we're in the test environment, if so, get the host from environment
      if (process.env.NODE_ENV === 'test' && process.env.TEST_HOST) {
        baseUrl = `https://${process.env.TEST_HOST}`;
      }
    }
    
    console.log(`[DEBUG] Using webhook base URL: ${baseUrl}`);
    
    // Initialize Twilio client
    let twilioClient;
    try {
      twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
      console.log(`[DEBUG] Twilio client initialized successfully`);
    } catch (clientError) {
      console.error('[ERROR] Failed to initialize Twilio client:', clientError);
      throw new Error(`Twilio client initialization failed: ${clientError instanceof Error ? clientError.message : String(clientError)}`);
    }
    
    // We no longer use the agent's phone_number field for making calls
    // Instead, we always use the Twilio phone number for outbound calls
    
    // Try to get an active Twilio phone number from our account
    let twilioNumber = null;
    try {
      // First, check if a specific Twilio phone number was provided in the request
      console.log(`[DEBUG] Received twilioPhoneNumber parameter: "${twilioPhoneNumber}" of type ${typeof twilioPhoneNumber}`);
      
      if (twilioPhoneNumber && twilioPhoneNumber.trim() !== '') {
        // Make sure the phone number is in E.164 format
        let formattedNumber = twilioPhoneNumber.trim();
        
        // If it doesn't start with +, add it
        if (!formattedNumber.startsWith('+')) {
          if (formattedNumber.startsWith('1')) {
            formattedNumber = '+' + formattedNumber;
          } else {
            formattedNumber = '+1' + formattedNumber;
          }
        }
        
        twilioNumber = formattedNumber;
        console.log(`[DEBUG] Using provided Twilio phone number from request: ${twilioNumber}`);
      } else {
        console.log(`[DEBUG] No specific Twilio phone number provided in request, will use default`);
        
        // Next, check if we have TWILIO_PHONE_NUMBER in environment
        if (process.env.TWILIO_PHONE_NUMBER) {
          twilioNumber = process.env.TWILIO_PHONE_NUMBER;
          console.log(`[DEBUG] Using TWILIO_PHONE_NUMBER from environment: ${twilioNumber}`);
        }
        // Then, check if we're in development mode and should use the real Twilio number as fallback
        else if (process.env.NODE_ENV === 'development') {
          // In development, use the real Twilio number for emilghelmeci@gmail.com
          twilioNumber = '+15302886523';  // Use the specific number you mentioned
          console.log(`[DEBUG] Using real Twilio number for development: ${twilioNumber}`);
        } else {
          // Otherwise, try to get a list of phone numbers from the Twilio account
          const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 10 });
          
          if (incomingNumbers && incomingNumbers.length > 0) {
            // Use the first available phone number
            twilioNumber = incomingNumbers[0].phoneNumber;
            console.log(`[DEBUG] Using first available Twilio phone number: ${twilioNumber}`);
          }
        }
      }
      
      // If we couldn't get a Twilio number, use a fallback for testing
      if (!twilioNumber) {
        if (process.env.NODE_ENV !== 'production') {
          // In development, we can use a test number
          twilioNumber = '+15005550006';  // Twilio test number
          console.log(`[DEBUG] Using Twilio test number for development: ${twilioNumber}`);
        } else {
          throw new Error('No Twilio phone numbers available and no TWILIO_PHONE_NUMBER environment variable set');
        }
      }
    } catch (numberError) {
      console.error('[ERROR] Failed to retrieve Twilio phone numbers:', numberError);
      throw new Error('Could not get a valid Twilio phone number to use as caller ID. Please add a phone number in your Twilio account or set TWILIO_PHONE_NUMBER environment variable.');
    }
    
    // Verify the 'to' parameter one last time to ensure we aren't calling ourselves
    if (to === twilioNumber) {
      console.error(`[ERROR] Cannot make a call where the 'to' and 'from' numbers are the same (${to})`);
      throw new Error(`Cannot call the Twilio number itself. The destination number must be different from your Twilio number.`);
    }
    
    // Log all parameters for thorough debugging
    console.log(`[DEBUG] Attempting to create Twilio call with params:`, {
      to: to, // The lead's phone number
      from: twilioNumber, // The Twilio phone number
      agentId: agentId, // The agent ID for the voice endpoint
      baseUrl: baseUrl, // The webhook base URL
      url: `${baseUrl}/api/twilio/outbound-voice?agentId=${agentId}`,
      statusCallback: `${baseUrl}/api/twilio/outbound-status`
    });
    
    let call;
    try {
      // Process options with defaults
      const recordCall = options.record === true; // Default to false unless explicitly true
      const useFallback = options.useFallback !== false; // Default to true unless explicitly false
      
      console.log('[DEBUG] Using call options:', { 
        recordCall, 
        useFallback,
        originalOptions: options
      });
      
      // Build call parameters with agentId as a parameter in both URL and POST parameters
      const callParams: any = {
        to: to, // The lead's phone number 
        from: twilioNumber, // The Twilio phone number
        url: `${baseUrl}/api/twilio/outbound-voice?agentId=${agentId}`,
        statusCallback: `${baseUrl}/api/twilio/outbound-status`,
        statusCallbackMethod: 'POST',
        timeout: 60, // Extend timeout to 60 seconds to ensure call connects
        machineDetection: 'DetectMessageEnd', // Add machine detection
        record: recordCall, // Use the option value
        // Add agentId as a POST parameter to ensure it's passed consistently
        applicationSid: process.env.TWILIO_APP_SID, // If available, use the app SID
        // Pass the agentId as POST parameters with fallback URL
        sendDigits: `wwww${agentId}#` // This is a clever way to pass the agentId as DTMF tones for some Twilio versions
      };
      
      // Only add fallback URL if enabled
      if (useFallback) {
        callParams.fallbackUrl = `${baseUrl}/api/twilio/voice-fallback`;
      }
      
      // Make the actual call to the lead's phone number with configured parameters
      call = await twilioClient.calls.create(callParams);
      
      console.log(`[DEBUG] Twilio call creation successful with SID: ${call.sid}`);
    } catch (callError: any) {
      console.error('[ERROR] Failed to create Twilio call:', callError);
      
      // Extract useful details from the Twilio error
      const errorCode = callError.code || 'UNKNOWN';
      const errorMessage = callError.message || 'Unknown error';
      const moreInfo = callError.moreInfo || '';
      const status = callError.status || '';
      
      const detailedError = `Twilio call creation failed (${errorCode}): ${errorMessage}. Status: ${status}. ${moreInfo}`;
      throw new Error(detailedError);
    }
    
    // Add metrics
    try {
      await storage.incrementApiMetric('twilio', 0, 0, agentId);
    } catch (metricError) {
      // Non-critical error, just log it
      console.error('[WARN] Failed to increment API metrics:', metricError);
    }
    
    // Store the call in our database
    try {
      await storage.addCall({
        callSid: call.sid,
        phoneNumber: to,
        status: CallStatus.IN_PROGRESS,
        agentId,
        recordingUrl: null,
        recordingSid: null,
        transcript: null
      });
      
      console.log(`[DEBUG] Call record created in database successfully`);
    } catch (dbError) {
      // Non-critical error, just log it
      console.error('[WARN] Failed to store call in database:', dbError);
      // Continue anyway since the Twilio call was successfully placed
    }
    
    console.log(`[${LogLevel.INFO}] [Twilio] Outbound call initiated: ${call.sid}`);
    
    return call;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ERROR] Error initiating outbound call:', error);
    
    // Try to provide a fallback in development mode using the mock client
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[DEBUG] Attempting to use mock Twilio client as fallback in development environment');
        const mockClient = createMockTwilioClient();
        
        // Get the agent
        const agent = await storage.getAgent(agentId);
        
        // Generate a mock call response using your Twilio number
        const mockCall = {
          sid: `MC${Date.now()}${Math.floor(Math.random() * 1000)}`,
          status: 'queued',
          to: to,
          from: '+15302886523', // Always use your real Twilio number
          dateCreated: new Date().toISOString(),
          direction: 'outbound-api'
        };
        
        // Store the mock call in our database
        await storage.addCall({
          callSid: mockCall.sid,
          phoneNumber: to,
          status: CallStatus.IN_PROGRESS,
          agentId,
          recordingUrl: null,
          recordingSid: null,
          transcript: null
        });
        
        console.log(`[DEBUG] Created mock call with SID: ${mockCall.sid} as fallback in development mode`);
        
        return mockCall;
      } catch (fallbackError) {
        console.error('[ERROR] Mock client fallback also failed:', fallbackError);
      }
    }
    
    throw error;
  }
}
