/**
 * Runway API Version Format Test
 * 
 * This test script tries different formats for the X-Runway-Version header
 * to determine which one works with the API.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

// Validation
if (!RUNWAY_API_KEY) {
  console.error('RUNWAY_API_KEY environment variable is not set');
  process.exit(1);
}

// Test Constants
const ENDPOINT = 'https://api.runwayml.com/v1/image_to_video';

// Create a minimal 1x1 transparent PNG image encoded as base64
// This avoids having to read a file from disk
const TINY_BASE64_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const IMAGE_DATA_URL = `data:image/png;base64,${TINY_BASE64_IMAGE}`;

// List of version formats to try
const VERSION_FORMATS = [
  // Standard ISO date formats
  '2024-11-06',
  '2024-11-6',
  '11-06-2024',
  '20241106',
  
  // Quotes
  '"2024-11-06"',
  
  // Alternate separators
  '2024/11/06',
  '2024.11.06',
  
  // Other formats
  'v2024-11-06',
  '2024-11-06+00:00',
  '20241106T000000Z',
  '2024-11-06T00:00:00Z',
  
  // API specific formats
  'latest',
  'current',
  'stable',
  'v1',
  'v2',
  'v3',
  
  // Alternative headers
  'Headers'
];

// List of alternate header names to try
const HEADER_NAMES = [
  'X-Runway-Version',
  'Runway-Version',
  'x-api-version',
  'X-API-Version', 
  'api-version',
  'API-Version',
  'version',
  'Version',
  'Accept-Version'
];

/**
 * Main test function
 */
async function testVersionFormats() {
  console.log('=== Runway API Version Format Test ===');
  console.log(`Using API KEY: ${RUNWAY_API_KEY.slice(0, 4)}...${RUNWAY_API_KEY.slice(-4)}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log('-'.repeat(50));
  
  // Prepare minimal payload
  const payload = {
    promptImage: IMAGE_DATA_URL,
    promptText: "Gentle camera movement",
    model: "gen4_turbo",
    duration: 5,
    ratio: "1280:720"
  };
  
  // Test each header name with each version format
  for (const headerName of HEADER_NAMES) {
    for (const versionFormat of VERSION_FORMATS) {
      console.log(`\nTesting: ${headerName} = ${versionFormat}`);
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      };
      
      // Add version header
      headers[headerName] = versionFormat;
      
      try {
        // Make API request
        const response = await axios.post(
          ENDPOINT,
          payload,
          {
            headers,
            timeout: 10000 // 10 second timeout
          }
        );
        
        // Success!
        console.log(`✓ SUCCESS with ${headerName}=${versionFormat}`);
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
        
        // Exit on first success
        console.log('\n-'.repeat(50));
        console.log(`Found working configuration: ${headerName}=${versionFormat}`);
        process.exit(0);
      } catch (error) {
        // The request was made but we got an error
        if (error.response) {
          const errorResponse = (typeof error.response.data === 'object') 
            ? JSON.stringify(error.response.data)
            : String(error.response.data).slice(0, 100);
          
          console.log(`✗ Failed: Status ${error.response.status}, Error: ${errorResponse}`);
        } else if (error.request) {
          console.log('✗ Failed: No response received');
        } else {
          console.log(`✗ Failed: ${error.message}`);
        }
      }
    }
  }
  
  console.log('\n-'.repeat(50));
  console.log('❌ All version format combinations failed.');
}

// Run the test
testVersionFormats().catch(console.error);