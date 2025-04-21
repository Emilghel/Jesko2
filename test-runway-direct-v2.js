/**
 * Direct Runway API Test with minimal dependency on external modules
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

dotenv.config();

// Get API key from environment
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

if (!RUNWAY_API_KEY) {
  console.error('RUNWAY_API_KEY environment variable is not set');
  process.exit(1);
}

// Minimal 1x1 transparent PNG image encoded as base64
const TINY_BASE64_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const IMAGE_DATA_URL = `data:image/png;base64,${TINY_BASE64_IMAGE}`;

// Test with multiple endpoints
const endpoints = [
  'https://api.dev.runwayml.com/v1/image_to_video',
  'https://api.runwayml.com/v1/image_to_video',
  'https://api.dev.runwayml.com/v1/image-to-video',
  'https://api.runwayml.com/v1/image-to-video',
];

// Version header combinations
const versionHeaders = [
  { name: null, value: null },                 // No version header
  { name: 'X-Runway-Version', value: null },   // Empty version value
  { name: 'X-Runway-Version', value: '20240401' },
  { name: 'X-Runway-Version', value: '2024-04-01' },
  { name: 'X-Runway-Version', value: '2023-12-01' },
  { name: 'X-Api-Version', value: '2024-04-01' },
  { name: 'Api-Version', value: '2024-04-01' }
];

// Test data
const payload = {
  prompt: "gentle camera zoom in, cinematic lighting",
  negative_prompt: "poor quality, blurry",
  image: IMAGE_DATA_URL,
  model: "gen-2",
  num_frames: 8,
  fps: 8,
  output_format: "mp4"
};

/**
 * Test a specific API endpoint with different version headers
 */
async function testEndpoint(url) {
  console.log(`\n\nTesting endpoint: ${url}`);
  console.log('='.repeat(url.length + 18));
  
  for (const headerConfig of versionHeaders) {
    // Create headers for this test
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNWAY_API_KEY}`
    };
    
    // Add version header if provided
    if (headerConfig.name && headerConfig.value) {
      headers[headerConfig.name] = headerConfig.value;
      console.log(`\nTrying with ${headerConfig.name}: ${headerConfig.value}`);
    } else if (headerConfig.name) {
      console.log(`\nTrying with ${headerConfig.name} but no value`);
    } else {
      console.log('\nTrying without any version header');
    }
    
    try {
      const response = await axios.post(url, payload, {
        headers: headers,
        validateStatus: () => true, // Accept any status code
        timeout: 30000 // 30 seconds
      });
      
      console.log(`Status: ${response.status}`);
      
      // Format response headers for better readability
      console.log('Response Headers:');
      Object.entries(response.headers).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      
      // Check for success
      if (response.status === 200 || response.status === 201 || response.status === 202) {
        console.log('✓ SUCCESS!');
        console.log('Response Data:', response.data);
        
        // Save the working configuration to a file
        const config = {
          endpoint: url,
          versionHeader: headerConfig.name,
          versionValue: headerConfig.value,
          timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync('runway-working-config.json', JSON.stringify(config, null, 2));
        console.log('Saved working configuration to runway-working-config.json');
        
        return true;
      } else {
        console.log('✗ Failed');
        console.log('Response Data:', response.data);
      }
    } catch (error) {
      console.log('✗ Error:');
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log('Response Data:', error.response.data);
      } else if (error.request) {
        console.log('No response received');
      } else {
        console.log(`Error message: ${error.message}`);
      }
    }
  }
  
  return false;
}

/**
 * Main function to test all endpoints
 */
async function testRunwayDirectAPI() {
  console.log('Runway API Direct Test');
  console.log('=====================');
  console.log(`Using API Key: ${RUNWAY_API_KEY.slice(0, 7)}...${RUNWAY_API_KEY.slice(-7)}`);
  
  let success = false;
  
  for (const endpoint of endpoints) {
    success = await testEndpoint(endpoint);
    if (success) {
      console.log('\n✓ Found working configuration!');
      break;
    }
  }
  
  if (!success) {
    console.log('\n✗ Could not find a working configuration with any tested combination.');
    console.log('Suggestions:');
    console.log('1. Verify the API key is correct and active');
    console.log('2. Check Runway API documentation for updated version header formats');
    console.log('3. Inspect the error responses for specific guidance');
  }
}

// Run the tests
testRunwayDirectAPI().catch(console.error);