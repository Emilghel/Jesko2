/**
 * Runway Gen-2 Direct API Test
 * 
 * This script follows Runway ML's published API documentation
 * for Gen-2 image-to-video specifically
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test image path
const testImagePath = path.join(__dirname, 'attached_assets', 'deepseek.jpg');

async function testRunwayGen2Direct() {
  console.log('Testing Runway Gen-2 API with direct documented approach...');
  
  try {
    // Verify API key
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      console.error('Error: RUNWAY_API_KEY environment variable is not set');
      return;
    }
    
    console.log(`API Key found: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
    
    // Verify test image exists
    if (!fs.existsSync(testImagePath)) {
      console.error(`Test image not found at: ${testImagePath}`);
      return;
    }
    
    console.log(`Using test image: ${testImagePath}`);
    
    // Read image as base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // 1. METHOD ONE: Using Gen-2 with direct format
    console.log('\n==== TESTING METHOD 1: Direct Gen-2 Format ====');
    
    try {
      const response = await axios({
        method: 'POST',
        url: 'https://api.runwayml.com/v1/gen-2/image-to-video',  // Try exact Gen-2 endpoint
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          // No version header for this test
        },
        data: {
          prompt: "A gentle zoom out with subtle camera movement",
          image: `data:image/jpeg;base64,${base64Image}`,
          num_frames: 48,
          fps: 24
        },
        timeout: 30000
      });
      
      console.log('SUCCESS! Direct Gen-2 format worked');
      console.log(`Status: ${response.status}`);
      console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('METHOD 1 FAILED:');
      console.error(`  Error message: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Error data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // 2. METHOD TWO: Using specific "model" format
    console.log('\n==== TESTING METHOD 2: Specific Model Format ====');
    
    try {
      const response = await axios({
        method: 'POST',
        url: 'https://api.runwayml.com/v1/images',  // Try images endpoint
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        data: {
          prompt: "A gentle zoom out with subtle camera movement",
          source_image: `data:image/jpeg;base64,${base64Image}`,
          model: "gen-2",
          num_outputs: 1,
          num_frames: 48,
          fps: 24
        },
        timeout: 30000
      });
      
      console.log('SUCCESS! Model-specific format worked');
      console.log(`Status: ${response.status}`);
      console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('METHOD 2 FAILED:');
      console.error(`  Error message: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Error data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // 3. METHOD THREE: Using Gen-2 with form data approach
    console.log('\n==== TESTING METHOD 3: Form Data Approach ====');
    
    try {
      // Create FormData with raw image file
      const formData = new FormData();
      formData.append('prompt', 'A gentle zoom out with subtle camera movement');
      formData.append('image', new Blob([imageBuffer], {type: 'image/jpeg'}), 'image.jpg');
      formData.append('num_frames', '48');
      formData.append('fps', '24');
      
      const response = await axios({
        method: 'POST',
        url: 'https://api.runwayml.com/v1/gen-2/transform',  // Try transform endpoint
        headers: {
          'Authorization': `Bearer ${apiKey}`
          // Content-Type is set automatically with FormData
        },
        data: formData,
        timeout: 30000
      });
      
      console.log('SUCCESS! Form data approach worked');
      console.log(`Status: ${response.status}`);
      console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('METHOD 3 FAILED:');
      console.error(`  Error message: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Error data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    console.log('\n==== TEST SUMMARY ====');
    console.log('If all methods failed, please check the current Runway API documentation');
    console.log('for updated endpoint formats or headers requirements.');
  }
  catch (error) {
    console.error('Overall error in test execution:', error.message);
  }
}

testRunwayGen2Direct().catch(console.error);