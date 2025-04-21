/**
 * Test script for Twilio authentication fix
 * 
 * This script tests the new token-based authentication middleware
 * for the Twilio direct call feature.
 */

import axios from 'axios';
const baseUrl = process.env.BASE_URL || 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';

/**
 * Make a test call using the API
 */
async function testTwilioDirectCall() {
  try {
    console.log('Starting Twilio direct call authentication test...');
    
    // Create a fake token for testing
    const token = 'token-' + Math.random().toString(36).substring(2, 15);
    
    // Prepare the request
    const url = `${baseUrl}/api/twilio-direct/call`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Prepare test data
    const data = {
      agentId: 1,
      phoneNumber: '+15551234567', // Fake number for testing
      record: false
    };
    
    console.log(`Making API call to ${url} with test token: ${token}`);
    console.log('Request data:', data);
    
    // Make the request
    const response = await axios.post(url, data, { headers });
    
    // Check the response
    if (response.status === 200) {
      console.log('SUCCESS: Authentication middleware accepted the request');
      console.log('Response:', response.data);
    } else {
      console.log(`Unexpected status code: ${response.status}`);
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('Error making test call:', error.message);
    
    if (error.response) {
      console.log(`Status code: ${error.response.status}`);
      console.log('Response data:', error.response.data);
      
      // Check if the error is related to authentication
      if (error.response.status === 401) {
        console.log('FAILED: Authentication middleware rejected the token');
      } else if (error.response.status === 500) {
        console.log('FAILED: Server error, check the server logs for details');
      }
    } else if (error.request) {
      console.log('No response received - server might not be running');
    } else {
      console.log('Error setting up the request:', error.message);
    }
  }
}

// Run the test
testTwilioDirectCall().catch(err => {
  console.error('Uncaught error during test:', err);
});