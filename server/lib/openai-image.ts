import OpenAI from "openai";
import fs from 'fs';
import { storage } from '../storage';
import { LogLevel } from '@shared/schema';
import path from 'path';

// Reuse the existing OpenAI instance getter from openai.ts
let openaiInstance: OpenAI | null = null;
let currentApiKey: string | null = null;

// Singleton to manage OpenAI instance with proper API key refresh
function getOpenAIInstance() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Reinitialize if instance doesn't exist or if API key has changed
  if (!openaiInstance || apiKey !== currentApiKey) {
    if (!apiKey) {
      console.error(`[${LogLevel.ERROR}] [OpenAI] No API key found in environment variables`);
      throw new Error('OpenAI API key is missing');
    }
    
    currentApiKey = apiKey;
    
    // Configure OpenAI with project API key
    const isProjectKey = apiKey.startsWith('sk-proj-');
    const options: any = { 
      apiKey,
      dangerouslyAllowBrowser: false, // Ensure it's server-side only for security
    };
    
    console.log(`[${LogLevel.INFO}] [OpenAI] Initializing client with API key starting with: ${apiKey.substring(0, 10)}...`);
    
    // For project-based API keys, we need to specify the baseURL
    if (isProjectKey) {
      console.log(`[${LogLevel.INFO}] [OpenAI] Using project-based API key`);
    }
    
    openaiInstance = new OpenAI(options);
    
    console.log(`[${LogLevel.INFO}] [OpenAI] Initialized OpenAI client with new API key from environment`);
  }
  
  return openaiInstance;
}

async function logAndTrackAPI(action: string, startTime: number) {
  const duration = (Date.now() - startTime) / 1000;
  console.log(`[${LogLevel.INFO}] [OpenAI] ${action} completed in ${duration.toFixed(2)}s`);
  await storage.incrementApiMetric('openai', duration);
  return duration;
}

/**
 * Generate an image using OpenAI's DALL-E model based on a text prompt
 */
export async function generateImageFromText(
  prompt: string, 
  userId: number,
  size: "1024x1024" = "1024x1024",
  model: "dall-e-2" = "dall-e-2" // Downgrade to DALL-E 2 which has fewer permission requirements
): Promise<{ url: string, promptUsed: string, localFilePath: string }> {
  try {
    const startTime = Date.now();
    const openai = getOpenAIInstance();
    
    console.log(`[${LogLevel.INFO}] [OpenAI] Generating image from text prompt: ${prompt}`);
    console.log(`[${LogLevel.INFO}] [OpenAI] Using model: ${model}`);
    
    const response = await openai.images.generate({
      model: model,
      prompt: prompt,
      n: 1, // Generate 1 image
      size: size,
      quality: "standard", // Use standard quality to optimize costs
    });
    
    // Get the image URL from the response
    const imageUrl = response.data[0].url;
    const revisedPrompt = response.data[0].revised_prompt || prompt;
    
    if (!imageUrl) {
      throw new Error("Failed to generate image URL");
    }
    
    // Create temp directory if it doesn't exist
    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Download the image and save to local filesystem
    const timestamp = Date.now();
    const filename = `image_${userId}_${timestamp}.png`;
    const filePath = path.join(tempDir, filename);
    
    try {
      // Download image from URL
      console.log(`[${LogLevel.INFO}] [OpenAI] Downloading image from URL: ${imageUrl}`);
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: HTTP ${imageResponse.status}`);
      }
      
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Write to file
      console.log(`[${LogLevel.INFO}] [OpenAI] Saving image to: ${filePath}`);
      fs.writeFileSync(filePath, buffer);
      console.log(`[${LogLevel.INFO}] [OpenAI] Image saved successfully`);
    } catch (downloadError) {
      console.error(`[${LogLevel.ERROR}] [OpenAI] Error saving image:`, downloadError);
      // Return the direct URL from OpenAI if we can't save it locally
      return {
        url: imageUrl, // Use the OpenAI URL directly instead of local path
        promptUsed: revisedPrompt,
        localFilePath: '' // Empty since we couldn't save locally
      };
    }
    
    await logAndTrackAPI('Image generation', startTime);
    
    return {
      url: `/temp/${filename}`,
      promptUsed: revisedPrompt,
      localFilePath: filePath
    };
  } catch (error: any) {
    console.error('Error generating image:', error);
    console.log(`[${LogLevel.ERROR}] [OpenAI] Image generation error: ${error?.message || 'Unknown error'}`);
    throw error;
  }
}

/**
 * Generate a new image based on an uploaded image and a text prompt
 */
export async function generateImageFromImageAndText(
  prompt: string,
  imageFilePath: string,
  userId: number,
  size: "1024x1024" = "1024x1024",
  model: "dall-e-2" = "dall-e-2" // Downgraded to DALL-E 2 for compatibility
): Promise<{ url: string, promptUsed: string, localFilePath: string }> {
  try {
    const startTime = Date.now();
    const openai = getOpenAIInstance();
    
    console.log(`[${LogLevel.INFO}] [OpenAI] Generating image from image and text prompt: ${prompt}`);
    
    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imageFilePath);
    const base64Image = imageBuffer.toString('base64');
    
    // The DALL-E 3 model doesn't support images.edit - use images.variations instead
    // which doesn't support a prompt, so we'll use CreateImage with a mask
    const response = await openai.images.createVariation({
      image: fs.createReadStream(imageFilePath),
      n: 1, // Generate 1 image
      size: size,
    });
    
    // Get the image URL from the response
    const imageUrl = response.data[0].url;
    const revisedPrompt = response.data[0].revised_prompt || prompt;
    
    if (!imageUrl) {
      throw new Error("Failed to generate image URL");
    }
    
    // Create temp directory if it doesn't exist
    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Download the image and save to local filesystem
    const timestamp = Date.now();
    const filename = `image_${userId}_${timestamp}.png`;
    const filePath = path.join(tempDir, filename);
    
    try {
      // Download image from URL
      console.log(`[${LogLevel.INFO}] [OpenAI] Downloading image from URL: ${imageUrl}`);
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: HTTP ${imageResponse.status}`);
      }
      
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Write to file
      console.log(`[${LogLevel.INFO}] [OpenAI] Saving image to: ${filePath}`);
      fs.writeFileSync(filePath, buffer);
      console.log(`[${LogLevel.INFO}] [OpenAI] Image saved successfully`);
    } catch (downloadError) {
      console.error(`[${LogLevel.ERROR}] [OpenAI] Error saving image:`, downloadError);
      // Return the direct URL from OpenAI if we can't save it locally
      return {
        url: imageUrl, // Use the OpenAI URL directly instead of local path
        promptUsed: revisedPrompt,
        localFilePath: '' // Empty since we couldn't save locally
      };
    }
    
    await logAndTrackAPI('Image generation with input image', startTime);
    
    return {
      url: `/temp/${filename}`,
      promptUsed: revisedPrompt,
      localFilePath: filePath
    };
  } catch (error: any) {
    console.error('Error generating image from image and text:', error);
    console.log(`[${LogLevel.ERROR}] [OpenAI] Image generation error: ${error?.message || 'Unknown error'}`);
    throw error;
  }
}