/**
 * Specialized Runway Gen-2 API Test
 * 
 * This script specifically tests Runway's Gen-2 model API using their 
 * documented approach and endpoint structure.
 */

import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test image path
const testImagePath = path.join(__dirname, 'attached_assets', 'deepseek.jpg');

async function testRunwayGen2API() {
  console.log('Testing Runway Gen-2 API with documented approach...');
  const apiKey = process.env.RUNWAY_API_KEY;
  
  if (!apiKey) {
    console.error('Error: RUNWAY_API_KEY environment variable is not set');
    return;
  }
  
  console.log(`API Key found: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
  
  try {
    // Verify test image exists
    if (!fs.existsSync(testImagePath)) {
      console.error(`Test image not found at: ${testImagePath}`);
      return;
    }
    
    console.log(`Using test image: ${testImagePath}`);
    
    // Read image as base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Try Gen-2 API with documented approach
    const baseUrl = 'https://api.runwayml.com';
    
    // Test different API versions and endpoints
    const testConfigs = [
      // Try different header formats
      { endpoint: '/v1/gen-2/imagine', versionHeader: { 'X-Runway-API-Version': '1' }, method: 'POST' },
      { endpoint: '/v1/images/text-to-video', versionHeader: { 'X-Runway-API-Version': 'v1' }, method: 'POST' },
      { endpoint: '/v1/images/text-to-video', versionHeader: { 'X-Runway-API-Version': '2023-06-01' }, method: 'POST' },
      
      // Try alternate header names
      { endpoint: '/v1/images/text-to-video', versionHeader: { 'X-API-Version': '1' }, method: 'POST' },
      { endpoint: '/v1/generations', versionHeader: { 'API-Version': '1' }, method: 'POST' },
      
      // Try with common date formats
      { endpoint: '/v1/images/text-to-video', versionHeader: { 'X-Runway-Version': '20230601' }, method: 'POST' },
      { endpoint: '/v1/images/text-to-video', versionHeader: { 'X-Runway-Version': '2023.06.01' }, method: 'POST' },
      
      // Try with Accept header
      { endpoint: '/v1/images/text-to-video', versionHeader: { 'Accept': 'application/json;version=1' }, method: 'POST' },
      
      // Try with URLs with versions embedded
      { endpoint: '/api/v1/images/text-to-video', versionHeader: null, method: 'POST' },
      { endpoint: '/api/v2/text-to-video', versionHeader: null, method: 'POST' },
      
      // Try with latest standard format for modern APIs
      { endpoint: '/v1/images/text-to-video', versionHeader: { 'Accept-Version': '1.0' }, method: 'POST' },
      { endpoint: '/v1/images/text-to-video', versionHeader: { 'X-API-Key': process.env.RUNWAY_API_KEY }, method: 'POST' },
    ];
    
    // Options for image-to-video transformation
    const payload = {
      prompt: "A gentle zoom out with subtle camera movement",
      image: `data:image/jpeg;base64,${base64Image}`,
      model: "gen-2",
      output_format: "mp4",
      num_frames: 48,
      fps: 24
    };
    
    // Try each configuration
    for (const config of testConfigs) {
      try {
        console.log(`\nTrying endpoint: ${config.endpoint}`);
        console.log(`Version header: ${config.versionHeader ? JSON.stringify(config.versionHeader) : 'None'}`);
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...config.versionHeader
        };
        
        console.log(`Request headers: ${JSON.stringify(headers)}`);
        
        const response = await axios({
          method: config.method,
          url: `${baseUrl}${config.endpoint}`,
          headers,
          data: payload,
          timeout: 20000, // 20 second timeout
        });
        
        console.log(`SUCCESS with ${config.endpoint}`);
        console.log(`Status: ${response.status}`);
        console.log(`Data: ${JSON.stringify(response.data, null, 2)}`);
        
        // If we got a successful response, exit the loop
        return;
      } 
      catch (error) {
        console.error(`Failed with ${config.endpoint}: ${error.message}`);
        if (error.response) {
          console.error(`Status: ${error.response.status}`);
          console.error(`Error data: ${JSON.stringify(error.response.data)}`);
        }
      }
    }
    
    console.log('\nAll endpoint configurations failed. Check Runway API documentation for updates.');
  }
  catch (error) {
    console.error('Error testing Runway API:', error.message);
  }
}

// Run the test
testRunwayGen2API().catch(console.error);