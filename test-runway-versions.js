/**
 * Test script to try different Runway API version formats
 * 
 * This script attempts various common API version header formats
 * to find the one that works with the Runway API.
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const API_BASE_URL = 'https://api.dev.runwayml.com';
const ENDPOINT = '/v1/healthcheck'; // Use a lightweight endpoint for testing

// List of version formats to try
const VERSION_FORMATS = [
  '1', 
  '2',
  'v1',
  'v2',
  '1.0',
  '2.0',
  '2023-11-01',
  '2023-12-01',
  '2024-01-01',
  '2024-02-01',
  '2024-03-01',
  '2024-04-01'
];

// List of header names to try
const HEADER_NAMES = [
  'X-Runway-Version',
  'Runway-Version',
  'Accept-Version',
  'API-Version',
  'X-API-Version'
];

async function testVersionFormat(headerName, versionValue) {
  try {
    console.log(`Testing with ${headerName}: ${versionValue}`);
    
    // Prepare headers
    const headers = {
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      'Accept': 'application/json'
    };
    
    // Add the version header
    headers[headerName] = versionValue;
    
    // Make the API request
    const response = await axios.get(
      `${API_BASE_URL}${ENDPOINT}`,
      {
        headers,
        timeout: 10000 // 10 second timeout
      }
    );
    
    console.log('✅ SUCCESS!');
    console.log(`${headerName}: ${versionValue}`);
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('');
    
    return true;
  } catch (error) {
    // Only log errors related to version
    if (error.response?.status === 400) {
      const errorData = error.response?.data;
      if (errorData?.error && errorData.error.includes('version')) {
        console.log(`❌ Failed: ${errorData.error}`);
      } else {
        console.log(`❌ Failed with 400 status`);
      }
    } else if (error.response?.status === 401) {
      console.log(`⚠️ Authentication error. Check your API key.`);
    } else {
      console.log(`❌ Other error: ${error.message}`);
    }
    console.log('');
    
    return false;
  }
}

async function runTests() {
  console.log('Starting Runway API version format tests...');
  console.log(`API: ${API_BASE_URL}${ENDPOINT}`);
  console.log('');
  
  if (!RUNWAY_API_KEY) {
    console.error('ERROR: RUNWAY_API_KEY is not set in environment variables');
    return;
  }
  
  // Try each combination of header name and version format
  for (const headerName of HEADER_NAMES) {
    for (const versionFormat of VERSION_FORMATS) {
      await testVersionFormat(headerName, versionFormat);
    }
  }
  
  console.log('All tests completed.');
}

// Run the tests
runTests();