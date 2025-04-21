/**
 * Debug test for Partner Login
 * 
 * This script tests the partner login functionality and adds detailed logging
 * to help diagnose the 401 error issue.
 */

import axios from 'axios';

async function testPartnerLogin() {
  try {
    console.log("Starting partner login test...");
    
    // Test credentials
    // const email = 'zach@partner.com';
    // const password = 'zachwarmleadnetwork345';
    // const email = 'admin@warmleadnetwork.com';
    // const password = 'emilwarm345';
    
    // Use the newly created partner account
    const email = 'mulondo@partner.com';
    const password = 'testpassword123';
    
    console.log(`Testing partner login with email: ${email}`);
    
    // Detailed logging of request
    console.log("Preparing request to /api/partner/login");
    console.log("Request payload:", { email, password: '***REDACTED***' });
    
    // Use the actual server URL from the Replit environment
    const baseUrl = 'https://5fe85faa-bd9b-4169-96b1-c3fd2204b4f8-00-ionfmnsuwdkb.worf.replit.dev';
    console.log(`Using server URL: ${baseUrl}`);
    
    const response = await axios.post(`${baseUrl}/api/partner/login`, { 
      email, 
      password 
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log("Partner login successful!");
    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);
    console.log("Response data:", response.data);
    
    // Check token format
    if (response.data.token) {
      console.log("Token received:", response.data.token.substring(0, 10) + "...");
      console.log("Token length:", response.data.token.length);
    } else {
      console.log("WARNING: No token in response!");
    }
    
    // Check partner data
    if (response.data.partner) {
      console.log("Partner data:", response.data.partner);
    } else {
      console.log("WARNING: No partner data in response!");
    }
    
    console.log("Partner login test completed successfully");
  } catch (error) {
    console.error("Partner login test failed!");
    
    if (error.response) {
      // Server responded with error
      console.error("Server response error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // Request was made but no response
      console.error("No response received from server");
      console.error("Request details:", error.request);
    } else {
      // Error in setting up the request
      console.error("Error in request setup:", error.message);
    }
    
    console.error("Full error:", error);
  }
}

// Run the test and handle the promise
testPartnerLogin()
  .catch(error => {
    console.error("Top-level error handling:", error);
  });