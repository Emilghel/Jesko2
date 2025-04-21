/**
 * Advanced Twilio Call Testing Script - Debug Version
 * 
 * This script provides detailed diagnostic information for Twilio call issues
 * and includes multiple tests to isolate problems.
 */

import 'dotenv/config';
import twilio from 'twilio';
import axios from 'axios';

// Create Twilio client using environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+15302886523';

// Create a test phone number that is DIFFERENT from the Twilio number
// Use a valid phone number in E.164 format (+1XXXXXXXXXX) that you want to test calls to
// Important: Do NOT use the same number as twilioPhoneNumber!
const testPhoneNumber = '+14155552671'; // Twilio test number

// Get the Replit domain for webhooks
// Use the current Replit domain format
let webhookBaseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';

async function runTests() {
  console.log('=== TWILIO CALL DIAGNOSTIC TEST ===');
  console.log('Testing Twilio API credentials and connection...');
  
  // Validate environment variables
  console.log('\n=== CREDENTIAL CHECK ===');
  if (!accountSid) {
    console.error('ERROR: TWILIO_ACCOUNT_SID environment variable not set');
    return;
  }
  if (!authToken) {
    console.error('ERROR: TWILIO_AUTH_TOKEN environment variable not set');
    return;
  }
  
  console.log(`SID starts with: ${accountSid.substring(0, 6)}...`);
  console.log(`AUTH TOKEN exists: ${authToken ? 'YES' : 'NO'}`);
  console.log(`AUTH TOKEN length: ${authToken?.length || 0}`);
  console.log(`Using phone number: ${twilioPhoneNumber}`);
  
  // Create the client
  console.log('\nInitializing Twilio client...');
  const client = twilio(accountSid, authToken);
  
  // Test Basic API Connection
  try {
    console.log('\n=== TESTING BASIC API CONNECTION ===');
    // Just get account info to test basic authentication
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`Account connection verified: ${account.friendlyName}`);
    console.log(`Account status: ${account.status}`);
  } catch (err) {
    console.error('ERROR: Failed to connect to Twilio API');
    console.error(`Error details: ${err.message}`);
    return;
  }
  
  // Check if there are phone numbers available
  try {
    console.log('\n=== CHECKING AVAILABLE PHONE NUMBERS ===');
    const incomingNumbers = await client.incomingPhoneNumbers.list({limit: 5});
    
    if (incomingNumbers && incomingNumbers.length > 0) {
      console.log(`Found ${incomingNumbers.length} phone number(s) in account:`);
      incomingNumbers.forEach((number, i) => {
        console.log(`${i+1}. ${number.phoneNumber} - ${number.friendlyName}`);
      });
    } else {
      console.warn('WARNING: No phone numbers found in Twilio account');
    }
  } catch (err) {
    console.error('ERROR: Failed to retrieve phone numbers');
    console.error(`Error details: ${err.message}`);
  }
  
  // Check if the webhook URL is accessible
  try {
    console.log('\n=== TESTING WEBHOOK ACCESSIBILITY ===');
    console.log(`Testing webhook base URL: ${webhookBaseUrl}`);
    
    const webhookResponse = await axios.get(`${webhookBaseUrl}/api/twilio/test-webhook`);
    
    if (webhookResponse.status === 200) {
      console.log('Webhook URL is accessible from the internet!');
      console.log(`Response status: ${webhookResponse.status}`);
      
      if (webhookResponse.data && webhookResponse.data.webhookUrls) {
        console.log('Webhook URLs detected:');
        Object.entries(webhookResponse.data.webhookUrls).forEach(([key, value]) => {
          console.log(`- ${key}: ${value}`);
        });
      }
    } else {
      console.warn(`WARNING: Webhook URL returned status ${webhookResponse.status}`);
    }
  } catch (err) {
    console.error('ERROR: Webhook URL is not accessible');
    console.error(`Error details: ${err.message}`);
    console.warn('This will cause Twilio to fail when it tries to call back to your webhooks');
  }
  
  // Test making an actual call
  try {
    console.log('\n=== INITIATING TEST CALL ===');
    console.log(`Calling from: ${twilioPhoneNumber} to: ${testPhoneNumber}`);
    console.log(`Using webhooks with base URL: ${webhookBaseUrl}`);
    
    // For direct test, provide a direct TwiML response first
    console.log('\nMethod 1: Testing with direct TwiML response...');
    const call1 = await client.calls.create({
      to: testPhoneNumber,
      from: twilioPhoneNumber,
      twiml: '<Response><Say>This is a test call from your Twilio application.</Say></Response>'
    });
    
    console.log(`Success! Direct TwiML Call created with SID: ${call1.sid}`);
    console.log(`Call status: ${call1.status}`);
    
    // Wait 5 seconds before making the second test
    console.log('\nWaiting 5 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Use the webhook method
    console.log('\nMethod 2: Testing with webhook URL...');
    console.log(`Using URL: ${webhookBaseUrl}/api/twilio/outbound-voice?agentId=1`);
    
    const call2 = await client.calls.create({
      to: testPhoneNumber,
      from: twilioPhoneNumber,
      url: `${webhookBaseUrl}/api/twilio/outbound-voice?agentId=1`,
      statusCallback: `${webhookBaseUrl}/api/twilio/outbound-status`,
      statusCallbackMethod: 'POST',
      record: true
    });
    
    console.log(`Success! Webhook Call created with SID: ${call2.sid}`);
    console.log(`Call status: ${call2.status}`);
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    console.log('Both test methods were able to initiate calls.');
    console.log('If you still experience issues, please check the logs when the actual application makes a call.');
    
  } catch (err) {
    console.error('ERROR: Failed to create test call');
    console.error(`Error details: ${err.message}`);
    
    // Check for common issues
    if (err.message.includes('not a valid phone number')) {
      console.error('The phone number format is invalid. Make sure to use E.164 format (+1XXXXXXXXXX)');
    }
    if (err.message.includes('authenticate')) {
      console.error('Authentication failed. Check your Account SID and Auth Token');
    }
    if (err.message.includes('webhook')) {
      console.error('Webhook error. Ensure your webhook URLs are publicly accessible');
    }
  }
}

// Run all the tests
runTests().catch(err => {
  console.error('Unhandled error in test script:');
  console.error(err);
});