// Alternative test script for OpenAI image generation
// Using a simpler implementation to isolate the issue

import 'dotenv/config';
import OpenAI from 'openai';

// Function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Start execution
(async () => {
  try {
    console.log('Starting OpenAI image generation test...');
    console.log(`API key present: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
    
    // Initialize the OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('Using model: dall-e-2 (more widely available than dall-e-3)');
    console.log('Generating image from prompt: "A mountain landscape with a lake"');
    
    const response = await openai.images.generate({
      model: "dall-e-2", // Try DALL-E 2 which may have different permissions
      prompt: "A mountain landscape with a lake",
      n: 1,
      size: "1024x1024"
    });
    
    console.log('Response received:', JSON.stringify(response, null, 2));
    
    if (response.data && response.data.length > 0) {
      console.log('Image URL:', response.data[0].url);
      console.log('SUCCESS: Image generated');
    } else {
      console.log('ERROR: No image data returned');
    }
  } catch (error) {
    // Handle different types of errors
    console.error('ERROR generating image:');
    
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      
      // Check for organization ID issues
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('\nTroubleshooting steps:');
        console.error('1. Check if organization ID is needed:');
        console.error('   - If you belong to multiple organizations, specify which one to use:');
        console.error('     const openai = new OpenAI({');
        console.error('       apiKey: process.env.OPENAI_API_KEY,');
        console.error('       organization: "org_..."  // Your organization ID');
        console.error('     });');
        console.error('2. Verify the API key has correct permissions at https://platform.openai.com/api-keys');
        console.error('3. Check your usage limits and billing status at https://platform.openai.com/usage');
      }
    } else {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
})();