// Simple script to test the Runway API directly
import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function testRunwayAPI() {
  const apiKey = process.env.RUNWAY_API_KEY;
  const apiBaseUrl = process.env.RUNWAY_API_BASE_URL || 'https://api.dev.runwayml.com/v1';
  
  if (!apiKey) {
    console.error('RUNWAY_API_KEY is not set in environment variables');
    return;
  }
  
  // Test image file
  const imagePath = './attached_assets/1738184347911.jpeg';
  if (!fs.existsSync(imagePath)) {
    console.error(`Test image file not found at path: ${imagePath}`);
    return;
  }
  
  // Read test image
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  // Basic payload
  const payload = {
    prompt: "Gentle camera zoom, subtle movement",
    input_image: `data:image/jpeg;base64,${base64Image}`,
    num_frames: 24,
    num_steps: 10,
    model: 'gen-2'
  };
  
  // Define different version formats to try
  const versionFormats = [
    // Try different capitalization exactly as shown in the example
    { 'X-Runway-Version': 'Sun, Apr 13, 2025 2:48 AM' },  // Exact format provided
    
    // Try without the header (API might have default version)
    {}, // No version header at all
    
    // Try with "v" prefixes
    { 'X-Runway-Version': 'v1' },
    { 'X-Runway-Version': 'v2' },
    
    // Try exact release dates (rather than current date)
    { 'X-Runway-Version': '2023-06-01' }, // Runway Gen-2 release date
    { 'X-Runway-Version': '2023-03-20' }, // Runway Gen-1 release date
    
    // Try using the API key as the version (strange but worth a try)
    { 'X-Runway-Version': process.env.RUNWAY_API_KEY },
    
    // Try the "v" prefix on the URL instead of in the header
    { 'urlSuffix': '/v1' }
  ];
  
  // Try each version format
  for (const versionHeader of versionFormats) {
    console.log(`\n--- Testing with version header: ${JSON.stringify(versionHeader)} ---`);
    
    try {
      // Try with Bearer token
      try {
        console.log('Trying Bearer token authentication...');
        // Check if we need to adjust the URL (for URL suffix test)
        const urlSuffix = versionHeader.urlSuffix || '';
        delete versionHeader.urlSuffix; // Remove from headers
        
        const endpoint = '/generations/image-to-video';
        const url = versionHeader.urlSuffix 
          ? `${apiBaseUrl}${urlSuffix}${endpoint}` 
          : `${apiBaseUrl}${endpoint}`;
          
        console.log(`Sending request to URL: ${url}`);
        
        const response = await axios.post(
          url,
          payload,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              ...versionHeader
            },
            timeout: 10000
          }
        );
        
        console.log('SUCCESS with Bearer token!');
        console.log('Response:', response.data);
        return; // Exit on success
      } catch (bearerError) {
        console.log(`Bearer auth failed: ${bearerError.message}`);
        
        // Check specific error
        if (bearerError.response) {
          console.log('Status:', bearerError.response.status);
          console.log('Response data:', bearerError.response.data);
        }
        
        // Try with X-Api-Key instead
        console.log('Trying X-Api-Key authentication...');
        // We need to redefine the URL for this section
        const apiKeyUrl = versionHeader.urlSuffix 
          ? `${apiBaseUrl}${urlSuffix}${endpoint}` 
          : `${apiBaseUrl}${endpoint}`;
          
        console.log(`Sending request to URL with X-Api-Key: ${apiKeyUrl}`);
        
        const response = await axios.post(
          apiKeyUrl,
          payload,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-Api-Key': apiKey,
              ...versionHeader
            },
            timeout: 10000
          }
        );
        
        console.log('SUCCESS with X-Api-Key!');
        console.log('Response:', response.data);
        return; // Exit on success
      }
    } catch (error) {
      console.log(`Failed with version header ${JSON.stringify(versionHeader)}`);
      
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response data:', error.response.data);
      } else {
        console.log('Error:', error.message);
      }
    }
  }
  
  console.log('\nAll version formats failed.');
}

testRunwayAPI().catch(err => console.error('Unexpected error:', err));