/**
 * Direct Twilio Call Test
 * 
 * This is a standalone script to test Twilio call functionality directly
 * without going through the API or Express server.
 */

// Load environment variables
require('dotenv').config();

// Import Twilio
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Twilio credentials:');
console.log('- Account SID: ' + (twilioAccountSid ? twilioAccountSid.substring(0, 8) + '...' : 'Not set'));
console.log('- Auth Token: ' + (twilioAuthToken ? 'Set (length: ' + twilioAuthToken.length + ')' : 'Not set'));
console.log('- Phone Number: ' + (twilioPhoneNumber || 'Not set'));

// Initialize Twilio client
const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);

// Base URL for webhooks
const webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';

async function testDirectTwilioCall() {
  console.log('\n[TEST] Starting direct Twilio call test...');
  
  // Test recipient phone number - using Twilio test number
  const testRecipientNumber = '+15005550006'; // Twilio test number
  
  try {
    console.log(`[TEST] Making test call from ${twilioPhoneNumber} to ${testRecipientNumber}...`);
    console.log(`[TEST] Using webhook URL: ${webhookBaseUrl}/api/twilio/outbound-voice?agentId=1`);
    
    const call = await twilio.calls.create({
      to: testRecipientNumber,
      from: twilioPhoneNumber,
      url: `${webhookBaseUrl}/api/twilio/outbound-voice?agentId=1`,
      statusCallback: `${webhookBaseUrl}/api/twilio/outbound-status`,
      statusCallbackMethod: 'POST',
      record: true
    });
    
    console.log('\n[TEST] Call created successfully!');
    console.log('[TEST] Call SID:', call.sid);
    console.log('[TEST] Call status:', call.status);
    console.log('[TEST] Call direction:', call.direction);
    console.log('[TEST] Call from:', call.from);
    console.log('[TEST] Call to:', call.to);
    
    return call;
  } catch (error) {
    console.error('\n[TEST] Error creating call:');
    console.error(error);
    
    // Extract more details if available
    if (error.code) {
      console.error('[TEST] Error code:', error.code);
    }
    if (error.message) {
      console.error('[TEST] Error message:', error.message);
    }
    if (error.moreInfo) {
      console.error('[TEST] More info:', error.moreInfo);
    }
    if (error.status) {
      console.error('[TEST] Status:', error.status);
    }
    
    throw error;
  }
}

// Run the test
testDirectTwilioCall()
  .then(() => {
    console.log('\n[TEST] Test completed successfully!');
    process.exit(0);
  })
  .catch(() => {
    console.error('\n[TEST] Test failed!');
    process.exit(1);
  });