/**
 * Runway Official SDK Test
 * 
 * This script uses the official Runway SDK to test API functionality
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import RunwayML from '@runwayml/sdk';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up Runway client
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
process.env.RUNWAYML_API_SECRET = RUNWAY_API_KEY; // Set the env var expected by the SDK

// Test Constants
const TEST_IMAGE_PATH = path.join(__dirname, 'attached_assets', '1738184347911.jpeg');
const OUTPUT_DIR = path.join(__dirname, 'temp');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Main test function for the Runway SDK
 */
async function testRunwaySDK() {
  console.log('=== Runway Official SDK Test ===');
  
  try {
    // Create SDK client
    const client = new RunwayML();
    console.log('SDK client initialized successfully');
    
    // Read and encode the test image
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.error(`Test image not found: ${TEST_IMAGE_PATH}`);
      process.exit(1);
    }
    
    console.log('Reading test image...');
    const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const base64Image = imageBuffer.toString('base64');
    const imageDataUri = `data:image/jpeg;base64,${base64Image}`;
    
    console.log('Creating image-to-video task...');
    
    // Create a new image-to-video task using the gen4_turbo model
    const imageToVideo = await client.imageToVideo.create({
      model: 'gen4_turbo',
      promptImage: imageDataUri,
      promptText: 'Gentle camera movement with cinematic lighting',
      ratio: '1280:720', // Required parameter
    });
    
    console.log(`Task created successfully! Task ID: ${imageToVideo.id}`);
    
    // Poll for task completion
    console.log('Polling for task completion (this may take some time)...');
    
    let task;
    let pollCount = 0;
    const maxPolls = 6; // Limit to 6 polls for testing (60 seconds)
    
    do {
      // Wait for 10 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 10000));
      pollCount++;
      
      console.log(`Poll attempt ${pollCount}...`);
      task = await client.tasks.retrieve(imageToVideo.id);
      console.log(`Task status: ${task.status}`);
      
      // Break early for testing purposes
      if (pollCount >= maxPolls) {
        console.log('Maximum poll attempts reached. Exiting polling loop.');
        break;
      }
    } while (!['SUCCEEDED', 'FAILED'].includes(task.status));
    
    // Handle task completion
    if (task.status === 'SUCCEEDED') {
      console.log('Task completed successfully!');
      
      // The output URLs for completed tasks are in task.outputs
      if (task.outputs && task.outputs.length > 0) {
        const outputUrl = task.outputs[0].url;
        console.log(`Video URL: ${outputUrl}`);
        
        // Download the generated video
        const outputPath = path.join(OUTPUT_DIR, `runway-sdk-test-${Date.now()}.mp4`);
        console.log(`Downloading video to ${outputPath}...`);
        
        // For this test, we'll just log the URL rather than downloading
        console.log('Video URL available for download');
      } else {
        console.log('Task succeeded but no outputs found');
      }
    } else if (task.status === 'FAILED') {
      console.error('Task failed:', task.error);
    } else {
      console.log(`Task is still processing. Current status: ${task.status}`);
    }
    
    // Log complete task details
    console.log('\nComplete task details:');
    console.log(JSON.stringify(task, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testRunwaySDK().catch(console.error);