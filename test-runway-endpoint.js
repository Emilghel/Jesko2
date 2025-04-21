/**
 * Test file for the Runway API endpoint
 * 
 * This script tests the /api/runway/transform-image endpoint
 * which uses our new SDK integration
 */
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test Constants
const TEST_IMAGE_PATH = path.join(__dirname, 'attached_assets', '1738184347911.jpeg');
const API_URL = 'http://localhost:5000/api/image-to-video';

/**
 * Main test function
 */
async function testRunwayEndpoint() {
  console.log('=== Testing Runway Transform-Image Endpoint ===');
  
  try {
    // Verify test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.error(`Test image not found: ${TEST_IMAGE_PATH}`);
      process.exit(1);
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('image', fs.createReadStream(TEST_IMAGE_PATH));
    formData.append('prompt', 'Gentle camera movement with cinematic lighting');
    formData.append('modelVersion', 'gen4_turbo');
    
    console.log('Sending request to endpoint...');
    
    // Make request to the endpoint
    const response = await axios.post(API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      // Set a longer timeout as generation can take time
      timeout: 60000,
    });
    
    console.log('Response received:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log(`Success! Video available at: ${response.data.videoUrl}`);
    } else {
      console.error(`Error from endpoint: ${response.data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('Error making request:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received');
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

// Run the test
testRunwayEndpoint();