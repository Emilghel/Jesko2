/**
 * Test script for the Runway API v3 implementation
 * 
 * This script tests the configurable API system that provides robust
 * fallback mechanisms and automatic version recovery for Runway API calls.
 * 
 * Run with: node test-runway-api-v3.js
 */

import path from 'path';
import fs from 'fs';
import { config } from 'dotenv'; // Load environment variables from .env file
import { fileURLToPath } from 'url';
import { dirname } from 'path';

config();

// Get dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the Runway API v3 module
async function testRunwayAPIv3() {
  try {
    // Create test data directory if it doesn't exist
    const testDataDir = path.join(__dirname, 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Generate a simple test image if it doesn't exist
    const testImagePath = path.join(testDataDir, 'test-image.jpg');
    if (!fs.existsSync(testImagePath)) {
      console.log('Creating test image...');
      await createTestImage(testImagePath);
    }
    
    // Test image-to-video generation
    console.log('\n=== Testing Runway Gen-2 Image-to-Video (v3 implementation) ===');

    // Import the Runway API v3 module (dynamically to ensure latest code is used)
    const { generateVideoFromImage, getAvailableModels } = await import('./server/lib/runway-api-v3.js');
    
    // Check if the API is properly configured
    const { isConfigured } = await import('./server/lib/runway-api-v3.js');
    if (!isConfigured()) {
      console.error('RUNWAY_API_KEY is not set in environment variables.');
      return;
    }
    
    console.log('RUNWAY_API_KEY is configured.');

    // First get available models
    console.log('\nFetching available Runway models...');
    const models = await getAvailableModels();
    console.log('Available models:', models);

    // Define output path for the generated video
    const outputPath = path.join(testDataDir, `runway-test-output-${Date.now()}.mp4`);
    
    // Generate video from image
    console.log('\nGenerating video from image...');
    console.log('Test image:', testImagePath);
    console.log('Output path:', outputPath);
    
    console.time('videoGeneration');
    
    const result = await generateVideoFromImage(
      testImagePath,
      'Camera zooming out to reveal a beautiful mountain landscape with snow peaks and sunset colors',
      outputPath,
      {
        modelVersion: 'gen-2',
        numFrames: 24,
        fps: 8,
      }
    );
    
    console.timeEnd('videoGeneration');
    
    if (result.success) {
      console.log('\n✅ Success! Video generated at:', outputPath);
      console.log('Video duration:', result.duration, 'seconds');
      console.log('Message:', result.message);
      
      // Get file stats to confirm it worked
      const stats = fs.statSync(outputPath);
      console.log('Video file size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    } else {
      console.error('\n❌ Error generating video:', result.error);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Create a simple test image using Node Canvas
async function createTestImage(outputPath) {
  // For simplicity, we'll create a small colored square image with sharp
  // Or just copy an existing image from the public folder if available
  try {
    // Try to copy an existing image from attached_assets or public folders
    const possibleSourceImages = [
      path.join(__dirname, 'attached_assets', '1738184347911.jpeg'),
      path.join(__dirname, 'attached_assets', 'deepseek.jpg'),
      path.join(__dirname, 'public', 'default-avatar.png'),
      path.join(__dirname, 'public', 'logo.png')
    ];
    
    for (const sourcePath of possibleSourceImages) {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, outputPath);
        console.log(`Copied existing image from ${sourcePath} to ${outputPath}`);
        return;
      }
    }
    
    // If no images found, create a simple 300x200 color gradient image
    // using file system 
    console.log('No source images found, creating a basic gradient JPG file...');
    
    // Create a simple HTML file with a canvas
    const htmlContent = `
      <html>
        <body>
          <canvas id="canvas" width="300" height="200"></canvas>
          <script>
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            
            // Create a gradient
            const gradient = ctx.createLinearGradient(0, 0, 300, 200);
            gradient.addColorStop(0, 'blue');
            gradient.addColorStop(0.5, 'purple');
            gradient.addColorStop(1, 'red');
            
            // Fill with gradient
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 300, 200);
            
            // Add some text
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('Test Image', 100, 100);
            
            // Output as data URL
            console.log(canvas.toDataURL('image/jpeg'));
          </script>
        </body>
      </html>
    `;
    
    // Create a small JPG file with some colored pixels
    const jpgHeader = Buffer.from([
      0xFF, 0xD8, // SOI marker
      0xFF, 0xE0, // APP0 marker
      0x00, 0x10, // Length of APP0 block
      0x4A, 0x46, 0x49, 0x46, 0x00, // JFIF identifier
      0x01, 0x01, // JFIF version
      0x00, // Units: no units
      0x00, 0x01, // X density
      0x00, 0x01, // Y density
      0x00, 0x00, // No thumbnail
      
      // Define a minimal color space
      0xFF, 0xDB, // DQT marker
      0x00, 0x43, // Length
      0x00, // Table ID
      // Simplified luminance quantization table (1 value repeated)
      0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
      0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
      0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
      0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
      0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
      0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
      0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
      0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
      
      // Start of frame
      0xFF, 0xC0, // SOF0 marker
      0x00, 0x11, // Length
      0x08, // 8 bits per component
      0x00, 0x10, // Height: 16 pixels
      0x00, 0x10, // Width: 16 pixels
      0x03, // 3 color components
      0x01, 0x11, 0x00, // Component 1: ID=1, Factor=1x1, QuantTable=0
      0x02, 0x11, 0x00, // Component 2: ID=2, Factor=1x1, QuantTable=0
      0x03, 0x11, 0x00, // Component 3: ID=3, Factor=1x1, QuantTable=0
      
      // End of image
      0xFF, 0xD9
    ]);
    
    // Write the minimal JPG file
    fs.writeFileSync(outputPath, jpgHeader);
    console.log(`Created a minimal JPG file at ${outputPath}`);
  } catch (error) {
    console.error('Error creating test image:', error);
    
    // Last resort: create a text file with JPG extension
    fs.writeFileSync(outputPath, Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00,
      0x10, 0x00, 0x10, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11,
      0x01, 0xFF, 0xD9
    ]));
    console.log('Created emergency fallback JPG file');
  }
}

// Run the test
testRunwayAPIv3().catch(console.error);