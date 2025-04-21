import OpenAI from "openai";
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Validate environment
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set');
  console.error('Create a .env file with your OpenAI API key');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Include organization if needed
  // organization: process.env.OPENAI_ORGANIZATION,
});

async function generateImage(prompt) {
  console.log(`Generating image for prompt: "${prompt}"`);
  console.log('Using OpenAI API Key:', process.env.OPENAI_API_KEY ? '***present***' : '***missing***');
  
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });
    
    const imageUrl = response.data[0].url;
    console.log('Image generated successfully!');
    console.log('Image URL:', imageUrl);
    
    // Save URL to file for reference
    const logDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'image-urls.txt');
    fs.appendFileSync(logFile, `${new Date().toISOString()}: ${imageUrl}\n`);
    console.log(`URL saved to ${logFile}`);
    
    return imageUrl;
  } catch (error) {
    console.error('ERROR GENERATING IMAGE:');
    
    // Handle API errors with specific guidance
    if (error.response) {
      const { status, data } = error.response;
      console.error(`Status: ${status}`);
      console.error('Error details:', data);
      
      if (status === 401) {
        console.error('AUTHENTICATION ERROR: Your API key is invalid or expired');
        console.error('Solution: Go to https://platform.openai.com/api-keys to generate a new key');
      } else if (status === 403) {
        console.error('PERMISSION ERROR: You don\'t have permission to use DALL-E');
        console.error('Solutions:');
        console.error('1. Verify account has image capabilities: https://platform.openai.com/account/billing');
        console.error('2. Check organization permissions: https://platform.openai.com/account/organization');
        console.error('3. If you have multiple orgs, specify correct one:');
        console.error('   const openai = new OpenAI({');
        console.error('     apiKey: process.env.OPENAI_API_KEY,');
        console.error('     organization: "org_..."  // Add your org ID here');
        console.error('   });');
      } else if (status === 429) {
        console.error('RATE LIMIT ERROR: Too many requests or exceeded quota');
        console.error('Solution: Wait or upgrade your plan at https://platform.openai.com/account/billing');
      }
    } else {
      // Network or other errors
      console.error(`Error type: ${error.name}`);
      console.error(`Error message: ${error.message}`);
    }
    
    return null;
  }
}

// Run test if executed directly
const prompt = process.argv[2] || "A beautiful mountain landscape at sunset";
generateImage(prompt);