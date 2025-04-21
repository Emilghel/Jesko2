/**
 * Node.js-based test script for the Runway API v2 implementation
 * 
 * This script tests the new Runway API integration directly from Node
 * without relying on the Express API endpoints
 * 
 * Run with: node test-runway-v2-node.js
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Get current directory (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the v2 module
async function testRunwayAPIv2() {
  try {
    console.log('=== Directly Testing Runway API v2 Implementation ===');
    
    // Dynamically import the TypeScript module
    console.log('Importing Runway API v2 module...');
    const { generateVideoFromImage, getAvailableModels } = await import('./server/lib/runway-api-v2.js');
    
    // Get sample image from attached_assets
    let sampleImagePath = '';
    const possibleImages = [
      'attached_assets/deepseek.jpg',
      'attached_assets/1738184347911.jpeg'
    ];
    
    for (const imagePath of possibleImages) {
      if (fs.existsSync(imagePath)) {
        sampleImagePath = imagePath;
        break;
      }
    }
    
    if (!sampleImagePath) {
      console.error('No sample image found in attached_assets');
      return;
    }
    
    console.log(`Using sample image: ${sampleImagePath}`);
    
    // Set output path
    const outputPath = path.join(process.cwd(), 'temp', `runway-test-${Date.now()}.mp4`);
    console.log(`Output will be saved to: ${outputPath}`);
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Call the API
    console.log('Calling Runway API to generate video...');
    console.log('This might take a minute or two...');
    
    const result = await generateVideoFromImage(
      sampleImagePath,
      'A gentle zoom in motion with subtle camera movement',
      outputPath,
      {
        modelVersion: 'gen-2',
        numFrames: 48, // Shorter for testing
        numSteps: 30,
        motionScale: 0.6,
        guidance: 25
      }
    );
    
    if (result.success) {
      console.log('✅ Successfully generated video:');
      console.log(`Video path: ${result.videoPath}`);
      console.log(`Duration: ${result.duration} seconds`);
      console.log(`Message: ${result.message}`);
      
      // Get file size
      const stats = fs.statSync(result.videoPath);
      console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.error('❌ Failed to generate video:', result.error);
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testRunwayAPIv2().catch(console.error);