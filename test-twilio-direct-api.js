/**
 * Direct API Call Test for Twilio
 * 
 * This script tests the most direct path to the Twilio API by directly
 * hitting our calls/initiate endpoint with a properly formatted phone number.
 * It bypasses the UI components and custom formatting steps.
 */

const axios = require('axios');

// Set up test parameters
const TEST_PHONE_NUMBER = '+15005550006'; // Twilio test number that will always succeed
const REAL_PHONE_NUMBER = '+14155552671'; // You can replace this with an actual phone number to test
const TWILIO_NUMBER = '+15302886523'; // Our actual Twilio number
const AGENT_ID = 1; // Agent ID 1 should always exist

// The base API URL - change this if testing in a different environment
const API_BASE_URL = 'http://localhost:5000';

async function testDirectTwilioAPI() {
  try {
    console.log('Starting direct Twilio API test...');
    console.log(`API Base URL: ${API_BASE_URL}`);
    
    // Test with Twilio test number (will succeed but not make a real call)
    console.log(`\nTEST 1: Using Twilio test number: ${TEST_PHONE_NUMBER}`);
    console.log('This should succeed but not make a real call...');
    
    let response = await axios.post(`${API_BASE_URL}/api/calls/initiate`, {
      agentId: AGENT_ID,
      phoneNumber: TEST_PHONE_NUMBER,
      twilioPhoneNumber: TWILIO_NUMBER
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Only test with real number if specifically enabled (commented out by default)
    /*
    console.log(`\nTEST 2: Using real phone number: ${REAL_PHONE_NUMBER}`);
    console.log('WARNING: This will make an actual phone call...');
    
    response = await axios.post(`${API_BASE_URL}/api/calls/initiate`, {
      agentId: AGENT_ID,
      phoneNumber: REAL_PHONE_NUMBER,
      twilioPhoneNumber: TWILIO_NUMBER
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    */
  } catch (error) {
    console.error('Error during test:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status code: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
  }
}

// Run the test
testDirectTwilioAPI();