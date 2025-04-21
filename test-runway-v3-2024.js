/**
 * Runway API v3 (2024) Integration Test
 * 
 * This test script validates the Runway API integration with the
 * 2024-11-06 API version requirements.
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
const ENDPOINT = 'https://api.runwayml.com/v1/image_to_video';
const API_VERSION = '2024-11-06';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Main test function
 */
async function runRunwayApiTest() {
  console.log('=== Runway API 2024 Version Test ===');
  console.log(`Using API KEY: ${RUNWAY_API_KEY.slice(0, 4)}...${RUNWAY_API_KEY.slice(-4)}`);
  console.log(`API Version: ${API_VERSION}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Test image: ${TEST_IMAGE_PATH}`);
  console.log('-'.repeat(50));
  
  // Create test data
  const outputPath = path.join(OUTPUT_DIR, `runway-test-${Date.now()}.mp4`);
  
  try {
    // Read and encode the test image
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.error(`Test image not found: ${TEST_IMAGE_PATH}`);
      process.exit(1);
    }
    
    console.log('Reading test image...');
    const imageData = fs.readFileSync(TEST_IMAGE_PATH);
    const base64Image = imageData.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64Image}`;
    
    // Prepare payload according to 2024-11-06 API version
    const payload = {
      promptImage: dataURI,
      promptText: "Gentle camera zoom, cinematic lighting",
      model: "gen4_turbo",
      duration: 5,
      ratio: "1280:720"
    };
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      'X-Runway-Version': API_VERSION
    };
    
    console.log('Sending API request...');
    console.log(`Headers: ${JSON.stringify(headers)}`);
    console.log(`Payload: ${JSON.stringify({
      ...payload,
      promptImage: "data:image/jpeg;base64,<base64 data omitted>"
    }, null, 2)}`);
    
    // Make API request
    const response = await axios.post(
      ENDPOINT,
      payload,
      {
        headers,
        timeout: 30000 // 30 second timeout
      }
    );
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    
    // Check if we have a successful task creation response (should have an ID)
    if (response.data && response.data.id) {
      console.log('✓ SUCCESS! Task created successfully.');
      console.log(`Task ID: ${response.data.id}`);
      
      // Query task status endpoint
      console.log('\nChecking task status...');
      const taskUrl = `https://api.runwayml.com/v1/tasks/${response.data.id}`;
      
      // Make initial status check
      const statusResponse = await axios.get(
        taskUrl,
        {
          headers: {
            'Authorization': `Bearer ${RUNWAY_API_KEY}`,
            'X-Runway-Version': API_VERSION
          },
          timeout: 10000
        }
      );
      
      console.log(`Task status: ${JSON.stringify(statusResponse.data, null, 2)}`);
      console.log('\nNote: Full task processing may take several minutes to complete.');
      console.log('You can track progress by querying the task endpoint manually.');
    } else {
      console.log('✗ FAILED. Response did not contain task ID');
    }
  } catch (error) {
    console.error('✗ Test failed with error:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Headers: ${JSON.stringify(error.response.headers)}`);
      
      try {
        if (typeof error.response.data === 'object') {
          console.error(`Data: ${JSON.stringify(error.response.data)}`);
        } else {
          console.error(`Data: ${error.response.data}`);
        }
      } catch (e) {
        console.error(`Data: (unparseable)`);
      }
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

// Run the test
runRunwayApiTest().catch(console.error);