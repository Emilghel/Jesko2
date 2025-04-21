/**
 * Test script for the Runway API v2 implementation
 * 
 * This script tests the new Runway API integration by:
 * 1. Getting a list of available models 
 * 2. Generating a video from a sample image
 * 
 * Run with: node test-runway-v2.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Test configuration
const TEST_IMAGE_PATH = path.join(process.cwd(), 'test-image.jpg');
const API_BASE_URL = 'http://localhost:5000';

async function testRunwayAPIv2() {
  try {
    console.log('=== Testing Runway API v2 Implementation ===');
    
    // Step 1: Generate a simple test image if it doesn't exist
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.log('Creating a test image...');
      await createTestImage(TEST_IMAGE_PATH);
      console.log(`Test image created: ${TEST_IMAGE_PATH}`);
    } else {
      console.log(`Using existing test image: ${TEST_IMAGE_PATH}`);
    }
    
    // Step 2: Test getting available models
    console.log('\nTesting GET /api/runway/models...');
    const modelsResponse = await axios.get(`${API_BASE_URL}/api/runway/models`);
    
    if (modelsResponse.data.success) {
      console.log('✅ Successfully retrieved models:');
      console.table(modelsResponse.data.models);
    } else {
      console.error('❌ Failed to get models:', modelsResponse.data);
      return;
    }
    
    // Step 3: Test generating a video
    console.log('\nTesting POST /api/runway/image-to-video...');
    
    // Create form data with the test image and parameters
    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(TEST_IMAGE_PATH)], { type: 'image/jpeg' });
    formData.append('image', fileBlob, 'test-image.jpg');
    formData.append('prompt', 'A gentle zoom in motion with slight camera movement');
    formData.append('modelVersion', 'gen-2');
    formData.append('numFrames', '48');  // Shorter video for testing
    
    try {
      const videoResponse = await axios.post(
        `${API_BASE_URL}/api/runway/image-to-video`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000 // 5 min timeout
        }
      );
      
      if (videoResponse.data.success) {
        console.log('✅ Successfully generated video:');
        console.log(`Video URL: ${API_BASE_URL}${videoResponse.data.videoUrl}`);
        console.log(`Duration: ${videoResponse.data.duration} seconds`);
        console.log(`Message: ${videoResponse.data.message}`);
      } else {
        console.error('❌ Failed to generate video:', videoResponse.data);
      }
    } catch (error) {
      console.error('❌ Error during video generation test:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Helper function to create a simple test image
async function createTestImage(outputPath) {
  // Use an existing image from attached_assets if available
  const sampleImagePaths = [
    'attached_assets/deepseek.jpg',
    'attached_assets/1738184347911.jpeg'
  ];
  
  for (const imagePath of sampleImagePaths) {
    if (fs.existsSync(imagePath)) {
      fs.copyFileSync(imagePath, outputPath);
      return;
    }
  }
  
  // If no sample images are available, create a simple one with solid color
  // Since we don't have Canvas in Node.js by default, we'll download a placeholder image
  try {
    const response = await axios.get('https://via.placeholder.com/512x512/3498db/ffffff?text=Test+Image', {
      responseType: 'arraybuffer'
    });
    
    fs.writeFileSync(outputPath, Buffer.from(response.data));
  } catch (error) {
    throw new Error(`Failed to create test image: ${error.message}`);
  }
}

// Run the test
testRunwayAPIv2().catch(console.error);