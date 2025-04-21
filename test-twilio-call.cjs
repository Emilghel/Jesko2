/**
 * Test script to validate Twilio call functionality
 * 
 * This script tests whether Twilio is properly configured to make calls
 * by directly calling the Twilio API with the environment credentials.
 */

const twilio = require('twilio');
require('dotenv').config();

async function testTwilioCall() {
  // Log environment details for debugging
  console.log('=== Twilio Test Call Script ===');
  console.log('Environment Mode:', process.env.NODE_ENV || 'not set');
  
  // Validate essential environment variables
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.error('ERROR: TWILIO_ACCOUNT_SID environment variable is missing');
    return;
  }
  
  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.error('ERROR: TWILIO_AUTH_TOKEN environment variable is missing');
    return;
  }
  
  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.warn('WARNING: TWILIO_PHONE_NUMBER environment variable is missing, using hardcoded value');
  }
  
  // Print masked credentials for verification
  const maskedSid = process.env.TWILIO_ACCOUNT_SID.substring(0, 6) + '...' + 
                    process.env.TWILIO_ACCOUNT_SID.substring(process.env.TWILIO_ACCOUNT_SID.length - 4);
  console.log('Using Account SID:', maskedSid);
  console.log('Auth Token is set:', !!process.env.TWILIO_AUTH_TOKEN);
  
  // Create Twilio client
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Test phone number (Twilio test number that always succeeds in test mode)
    const testPhoneNumber = '+15005550006';
    
    // Get the from number (use environment var or default)
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+15302886523';
    console.log('Using From Number:', fromNumber);
    
    // First, list phone numbers to see what's available
    console.log('Fetching available phone numbers from your Twilio account...');
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 10 });
    
    if (phoneNumbers.length === 0) {
      console.warn('WARNING: No phone numbers found in your Twilio account');
    } else {
      console.log(`Found ${phoneNumbers.length} phone numbers in your account:`);
      phoneNumbers.forEach(number => {
        console.log(`- ${number.phoneNumber} (${number.friendlyName})`);
      });
    }
    
    // Create a simple test call (will not actually dial in test mode)
    console.log(`\nAttempting to create test call from ${fromNumber} to ${testPhoneNumber}...`);
    const call = await client.calls.create({
      to: testPhoneNumber,
      from: fromNumber,
      url: 'http://demo.twilio.com/docs/voice.xml', // Twilio demo TwiML
      record: false
    });
    
    console.log('Call successfully created!');
    console.log('Call SID:', call.sid);
    console.log('Call Status:', call.status);
    
    // Also test account balance to ensure you have credits
    const balance = await client.balance.fetch();
    console.log(`\nAccount Balance: ${balance.currency} ${balance.balance}`);
    
    console.log('\nTwilio test completed successfully! Your Twilio configuration is working.');
  } catch (error) {
    console.error('ERROR testing Twilio functionality:');
    console.error(error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    if (error.moreInfo) {
      console.error('More Info:', error.moreInfo);
    }
    
    console.error('\nTwilio test failed. Please check your credentials and phone number configuration.');
  }
}

// Run the test
testTwilioCall();