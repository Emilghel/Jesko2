/**
 * Advanced Debugging Script for Twilio Direct API Integration
 * 
 * This script tests the direct Twilio API call implementation
 * with detailed debugging and error handling.
 */
import 'dotenv/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import twilio from 'twilio';

// Configuration
const baseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev'; // Use the Replit URL
const testPhoneNumber = '+14155551212'; // Use a test phone number
const testAgentId = 1; // Use a valid agent ID
const testLeadId = 1; // Use a valid lead ID

// Test a direct API call to the Twilio endpoint
async function testDirectTwilioAPI() {
  try {
    console.log('Starting Twilio Direct API test...');
    
    // 1. Check if Twilio environment variables are set
    console.log('\nChecking Twilio environment variables:');
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    console.log(`TWILIO_ACCOUNT_SID: ${twilioAccountSid ? '✓ Set' : '✗ Not set'}`);
    console.log(`TWILIO_AUTH_TOKEN: ${twilioAuthToken ? '✓ Set' : '✗ Not set'}`);
    console.log(`TWILIO_PHONE_NUMBER: ${twilioPhoneNumber ? '✓ Set' : '✗ Not set'}`);
    
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('\n❌ ERROR: Twilio environment variables not fully set. Please check your .env file.');
      return;
    }
    
    // 2. Validate the Twilio client can be initialized
    console.log('\nTesting Twilio client initialization:');
    try {
      const client = twilio(twilioAccountSid, twilioAuthToken);
      console.log('✓ Twilio client initialized successfully');
    } catch (error) {
      console.error('❌ ERROR: Failed to initialize Twilio client', error);
      return;
    }
    
    // 3. Test direct API call to the endpoint
    console.log('\nTesting direct API call to /api/twilio-direct/call:');
    try {
      const response = await axios.post(`${baseUrl}/api/twilio-direct/call`, {
        agentId: testAgentId,
        phoneNumber: testPhoneNumber,
        leadId: testLeadId,
        twilioPhoneNumber: twilioPhoneNumber
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer token-${uuidv4()}` // Generate a random token for testing
        }
      });
      
      console.log('✓ API call successful');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ ERROR: API call failed');
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log('Status:', error.response.status);
        console.log('Response data:', error.response.data);
        console.log('Response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.log('Request made but no response received');
        console.log('Request:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error message:', error.message);
      }
    }
    
    // 4. Test the Twilio API directly
    console.log('\nTesting Twilio API directly:');
    try {
      const client = twilio(twilioAccountSid, twilioAuthToken);
      
      // Only establish a connection, don't actually make a call to save credits
      const accounts = await client.api.accounts.list({limit: 1});
      console.log(`✓ Successfully connected to Twilio API. Account SID: ${accounts[0].sid.substring(0, 10)}...`);
    } catch (error) {
      console.error('❌ ERROR: Failed to connect to Twilio API directly', error);
    }
    
    console.log('\nTest completed.');
  } catch (error) {
    console.error('Unexpected error during testing:', error);
  }
}

// Run the test
testDirectTwilioAPI().catch(err => console.error('Test failed with error:', err));