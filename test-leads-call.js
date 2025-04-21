/**
 * Test script for initiating a call from the Leads Management interface
 */

import fetch from 'node-fetch';
import 'dotenv/config';

async function testLeadsCall() {
  console.log('=== TESTING LEADS MANAGEMENT CALL INITIATION ===');
  
  // Use the actual domain of the current Replit workspace
  const baseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
  console.log(`Using base URL: ${baseUrl}`);
  
  // Create test data - this simulates what would be sent from the LeadsManagementSection
  const testData = {
    phoneNumber: "+15302886523", // Using the Twilio number for a self-test (API expects "phoneNumber", not "leadPhoneNumber")
    agentId: 1,                  // ID of the agent to use
    userId: 18                   // User ID (e.g., for r34t32@gmail.com)
  };
  
  try {
    console.log('Sending test call request with data:', testData);
    
    // Make the API call to initiate an outbound call
    const response = await fetch(`${baseUrl}/api/calls/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer E+qo1xaJ+IlMZZ3qmoUIVxQZJeIOpT+mtHwqrUroPe/YzfSej2YGK6nbKKd9pizj'
      },
      body: JSON.stringify(testData)
    });
    
    // Get the response
    const data = await response.json();
    
    // Check if the call was initiated successfully
    if (response.ok) {
      console.log('✅ Call initiated successfully!');
      console.log('Response data:', data);
      console.log(`Call SID: ${data.callSid}`);
      console.log(`Status: ${data.status}`);
    } else {
      console.error('❌ Failed to initiate call');
      console.error('Error details:', data);
    }
  } catch (error) {
    console.error('❌ Error making API request:', error.message);
  }
}

// Run the test
testLeadsCall().catch(console.error);