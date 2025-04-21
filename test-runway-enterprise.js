/**
 * Runway Gen-2 Enterprise API Test
 * 
 * This script tests Runway API with settings commonly used in enterprise APIs
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
const TEST_IMAGE_PATH = path.join(__dirname, 'attached_assets', '1738184347911.jpeg');
const OUTPUT_DIR = path.join(__dirname, 'temp');
const VERSION = '2024-11-06';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Alternative endpoints to try
const ENDPOINTS = [
  // Base endpoints with different versions
  'https://api.runwayml.com/v1/image_to_video',
  'https://api.runwayml.com/v1/image-to-video',
  'https://api.runwayml.com/v1/generation/image_to_video',
  'https://api.runwayml.com/v2/image_to_video',
  'https://api.runwayml.com/v3/image_to_video',
  'https://api.runwayml.com/v1/gen4/image_to_video',
  'https://api.runwayml.com/v1/gen3/image_to_video',
  
  // Enterprise-specific patterns
  'https://api.enterprise.runwayml.com/v1/image_to_video',
  'https://enterprise-api.runwayml.com/v1/image_to_video',
  'https://api.runwayml.com/enterprise/v1/image_to_video',
  
  // Developer/Beta environments
  'https://api.dev.runwayml.com/v1/image_to_video',
  'https://api-dev.runwayml.com/v1/image_to_video',
  'https://api.beta.runwayml.com/v1/image_to_video',
  
  // Different domain patterns
  'https://api.runwayml.ai/v1/image_to_video'
];

// Different header combinations
const HEADER_COMBINATIONS = [
  // No version header
  {},
  
  // Standard header
  { 'X-Runway-Version': VERSION },
  
  // Variant 1 - Different casing
  { 'x-runway-version': VERSION },
  
  // Variant 2 - Custom Accept header
  { 'X-Runway-Version': VERSION, 'Accept': 'application/json;api-version=2024-11-06' },
  
  // Variant 3 - Different header name
  { 'Runway-Version': VERSION },
  
  // Variant 4 - Different format
  { 'X-API-Version': VERSION },
  
  // Variant 5 - Enterprise pattern
  { 'X-Runway-Enterprise-Version': VERSION },
  
  // Variant 6 - Quoted value
  { 'X-Runway-Version': `"${VERSION}"` }
];

// Parameter variations
const PARAMETER_VARIATIONS = [
  // Standard parameters
  {
    promptText: "Gentle camera zoom, cinematic lighting",
    model: "gen4_turbo",
    duration: 5,
    ratio: "1280:720"
  },
  
  // Alternative parameter names
  {
    prompt: "Gentle camera zoom, cinematic lighting",
    model: "gen4_turbo",
    duration: 5,
    aspect_ratio: "1280:720"
  },
  
  // Legacy parameters
  {
    prompt: "Gentle camera zoom, cinematic lighting",
    model: "gen-2",
    num_frames: 30,
    fps: 6
  },
  
  // Different model names
  {
    promptText: "Gentle camera zoom, cinematic lighting",
    model: "gen-3a",
    duration: 5,
    ratio: "1280:720"
  }
];

/**
 * Main test function
 */
async function testRunwayEnterprisePatterns() {
  console.log('=== Runway Enterprise API Pattern Test ===');
  console.log(`Using API KEY: ${RUNWAY_API_KEY.slice(0, 4)}...${RUNWAY_API_KEY.slice(-4)}`);
  console.log(`Test image: ${TEST_IMAGE_PATH}`);
  console.log('-'.repeat(50));
  
  // Read and encode the test image
  console.log('Reading test image...');
  const imageData = fs.readFileSync(TEST_IMAGE_PATH);
  const base64Image = imageData.toString('base64');
  const dataURI = `data:image/jpeg;base64,${base64Image}`;
  
  // Test each endpoint with different header combinations and parameters
  for (const endpoint of ENDPOINTS) {
    console.log(`\nTesting endpoint: ${endpoint}`);
    
    for (const headers of HEADER_COMBINATIONS) {
      const headerDesc = Object.keys(headers).length > 0 
        ? Object.entries(headers).map(([k, v]) => `${k}=${v}`).join(', ')
        : 'No version headers';
      
      console.log(`\n  With headers: ${headerDesc}`);
      
      for (const params of PARAMETER_VARIATIONS) {
        // Create full payload with image
        const payload = {
          ...params,
          promptImage: dataURI
        };
        
        const paramsDesc = Object.entries(params)
          .filter(([k]) => k !== 'promptImage')
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        
        console.log(`    Parameters: ${paramsDesc}`);
        
        try {
          // Add authorization and content-type headers
          const fullHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RUNWAY_API_KEY}`,
            ...headers
          };
          
          // Make API request
          const response = await axios.post(
            endpoint,
            payload,
            {
              headers: fullHeaders,
              timeout: 10000 // 10 second timeout
            }
          );
          
          // Success!
          console.log(`    ✓ SUCCESS with endpoint ${endpoint}`);
          console.log(`    Status: ${response.status}`);
          console.log(`    Response: ${JSON.stringify(response.data, null, 2)}`);
          
          // Write successful combination to a log file
          const logEntry = {
            timestamp: new Date().toISOString(),
            endpoint,
            headers: fullHeaders,
            parameters: params,
            status: response.status,
            response: response.data
          };
          
          const logPath = `runway-api-test-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.log`;
          fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2));
          console.log(`    Logged successful combination to ${logPath}`);
          
          return; // Exit on first success
        } catch (error) {
          // Extract error details
          let errorSummary = 'Unknown error';
          
          if (error.response) {
            const status = error.response.status;
            let errorData = '';
            
            try {
              if (typeof error.response.data === 'object') {
                errorData = JSON.stringify(error.response.data);
              } else {
                errorData = String(error.response.data).slice(0, 100);
              }
            } catch (e) {
              errorData = '(unparseable error data)';
            }
            
            errorSummary = `Status ${status}: ${errorData}`;
          } else if (error.code === 'ECONNREFUSED') {
            errorSummary = 'Connection refused';
          } else if (error.code === 'ENOTFOUND') {
            errorSummary = 'Host not found';
          } else {
            errorSummary = error.message || 'Unknown error';
          }
          
          console.log(`    ✗ Failed: ${errorSummary}`);
        }
      }
    }
  }
  
  console.log('\n-'.repeat(50));
  console.log('❌ All combinations failed.');
}

// Run the test
testRunwayEnterprisePatterns().catch(console.error);