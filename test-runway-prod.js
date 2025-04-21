/**
 * Simpler test focused on the production Runway API
 */
import dotenv from 'dotenv';
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

// Production API endpoint
const ENDPOINT = 'https://api.runwayml.com/v1/image_to_video';

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

// Test versions to try
const versionTests = [
  { desc: "No version header", headers: {} },
  { desc: "api-key as version", headers: { 'X-Runway-Version': "api-key" } },
  { desc: "Gen-2 as version", headers: { 'X-Runway-Version': "gen-2" } },
  { desc: "V1 lowercase", headers: { 'X-Runway-Version': "v1" } },
  { desc: "V1 uppercase", headers: { 'X-Runway-Version': "V1" } },
  { desc: "gen-1 as version", headers: { 'X-Runway-Version': "gen-1" } },
  { desc: "latest as version", headers: { 'X-Runway-Version': "latest" } },
  { desc: "current as version", headers: { 'X-Runway-Version': "current" } }
];

async function runTests() {
  console.log(`Testing production Runway API endpoint: ${ENDPOINT}`);
  console.log(`API Key: ${RUNWAY_API_KEY.slice(0, 7)}...${RUNWAY_API_KEY.slice(-7)}`);
  console.log('=======================================\n');
  
  for (const test of versionTests) {
    console.log(`Test: ${test.desc}`);
    
    // Create headers with auth token and content type
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      ...test.headers
    };
    
    try {
      const response = await axios.post(ENDPOINT, payload, {
        headers,
        validateStatus: () => true, // Accept any status
        timeout: 15000 // 15 second timeout
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200 || response.status === 201 || response.status === 202) {
        console.log('✓ SUCCESS!');
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        console.log('✗ Failed');
        console.log(JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.log('✗ Error:');
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(JSON.stringify(error.response.data, null, 2));
      } else {
        console.log(`Error: ${error.message}`);
      }
    }
    
    console.log('\n---\n');
  }
}

runTests().catch(console.error);