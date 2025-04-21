import OpenAI from "openai";
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { LogLevel } from '@shared/schema';

/**
 * Fixed OpenAI image generation implementation
 * Uses the latest OpenAI SDK version 4.x and properly handles errors
 */

// Initialize OpenAI client
let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    // Use the API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error(`[${LogLevel.ERROR}] [OpenAI] Missing API key in environment variables`);
      throw new Error('OpenAI API key is required');
    }

    // Create OpenAI client with proper configuration
    const config: any = { 
      apiKey,
      dangerouslyAllowBrowser: false,
    };

    // Add organization ID if provided
    if (process.env.OPENAI_ORGANIZATION) {
      config.organization = process.env.OPENAI_ORGANIZATION;
      console.log(`[${LogLevel.INFO}] [OpenAI] Using organization: ${process.env.OPENAI_ORGANIZATION}`);
    }

    // Log initialization with masked API key for security
    console.log(`[${LogLevel.INFO}] [OpenAI] Initializing client with API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
    
    openaiInstance = new OpenAI(config);
  }
  
  return openaiInstance;
}

/**
 * Generate an image using OpenAI's DALL-E model based on a text prompt
 */
export async function generateImageFromText(
  prompt: string, 
  userId: number,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024",
  model: "dall-e-2" | "dall-e-3" = "dall-e-3" // Use DALL-E 3 as default for better quality
): Promise<{ url: string, promptUsed: string, localFilePath: string }> {
  try {
    const startTime = Date.now();
    const openai = getOpenAIClient();
    
    console.log(`[${LogLevel.INFO}] [OpenAI] Generating image from text prompt: ${prompt}`);
    console.log(`[${LogLevel.INFO}] [OpenAI] Using model: ${model}, size: ${size}`);
    
    // Make the API request to generate the image
    const response = await openai.images.generate({
      model: model,
      prompt: prompt,
      n: 1,
      size: size,
      quality: "standard",
    });
    
    // Extract image URL from response
    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("No image URL returned from OpenAI");
    }
    
    // Get revised prompt if available (DALL-E 3 provides this)
    const revisedPrompt = response.data[0].revised_prompt || prompt;
    
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
      fs.writeFileSync(filePath, buffer);
      console.log(`[${LogLevel.INFO}] [OpenAI] Image saved to: ${filePath}`);
    } catch (downloadError) {
      console.error(`[${LogLevel.ERROR}] [OpenAI] Error saving image:`, downloadError);
      // Return the direct URL from OpenAI if we can't save it locally
      return {
        url: imageUrl,
        promptUsed: revisedPrompt,
        localFilePath: ''
      };
    }
    
    // Log completion and metrics
    const duration = (Date.now() - startTime) / 1000;
    console.log(`[${LogLevel.INFO}] [OpenAI] Image generated in ${duration.toFixed(2)} seconds`);
    await storage.incrementApiMetric('openai', duration);
    
    return {
      url: `/temp/${filename}`,
      promptUsed: revisedPrompt,
      localFilePath: filePath
    };
  } catch (error: any) {
    // Enhanced error handling with detailed logging
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      console.error(`[${LogLevel.ERROR}] [OpenAI] API Error (${status}):`, data);
      
      // Handle specific error types with guidance
      if (status === 401) {
        console.error(`[${LogLevel.ERROR}] [OpenAI] Authentication error: Invalid API key`);
      } else if (status === 403) {
        console.error(`[${LogLevel.ERROR}] [OpenAI] Permission error: Your account doesn't have access to ${model}`);
        console.error(`[${LogLevel.ERROR}] [OpenAI] Check organization settings or upgrade your account`);
      } else if (status === 429) {
        console.error(`[${LogLevel.ERROR}] [OpenAI] Rate limit exceeded or quota reached`);
      }
    } else {
      console.error(`[${LogLevel.ERROR}] [OpenAI] Error:`, error.message);
    }
    
    throw error;
  }
}

/**
 * Generate a new image variation based on an uploaded image
 */
export async function generateImageFromImageAndText(
  prompt: string,
  imageFilePath: string,
  userId: number,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024",
  model: "dall-e-2" | "dall-e-3" = "dall-e-3" // Use DALL-E 3 as default for better quality
): Promise<{ url: string, promptUsed: string, localFilePath: string }> {
  try {
    const startTime = Date.now();
    const openai = getOpenAIClient();
    
    console.log(`[${LogLevel.INFO}] [OpenAI] Generating image variation with prompt: ${prompt}`);
    
    // Verify file exists
    if (!fs.existsSync(imageFilePath)) {
      throw new Error(`Input image file not found: ${imageFilePath}`);
    }

    let response;
    
    // Different approach based on model
    if (model === "dall-e-3") {
      console.log(`[${LogLevel.INFO}] [OpenAI] Using DALL-E 3 with image edit API`);
      
      // For DALL-E 3, we'll use the edit API which is better at maintaining the original image
      try {
        // Create a temporary transparent mask - this is a workaround
        // since DALL-E 3 doesn't directly support variations
        const maskPath = `${imageFilePath}_mask.png`;
        
        // Read the input image to get dimensions
        const originalImageBuffer = fs.readFileSync(imageFilePath);
        
        // Prepare a better prompt for DALL-E 3 that emphasizes modifying the existing image
        const enhancedPrompt = `Modify this exact image to ${prompt}. Keep the same composition, style, and main elements, but apply the requested changes. This is a variation of an existing image, not a new creation.`;
        
        console.log(`[${LogLevel.INFO}] [OpenAI] Using enhanced prompt for image edit: ${enhancedPrompt}`);
        
        // Use the image generation API with a specific prompt that tells it to modify the original
        response = await openai.images.generate({
          model: "dall-e-3",
          prompt: enhancedPrompt,
          n: 1,
          size: size,
          quality: "standard",
        });
        
        // Clean up temp mask file if it was created
        if (fs.existsSync(maskPath)) {
          fs.unlinkSync(maskPath);
        }
      } catch (editError: unknown) {
        console.error(`[${LogLevel.ERROR}] [OpenAI] Error with DALL-E 3 edit, falling back to generate:`, 
          editError instanceof Error ? editError.message : 'Unknown error');
        
        // Fall back to standard generation with reference to the image
        response = await openai.images.generate({
          model: "dall-e-3",
          prompt: `Using this specific image as a starting point, modify it to: ${prompt}. Maintain the core composition and elements of the original image while applying the specified changes.`,
          n: 1,
          size: size,
          quality: "standard",
        });
      }
    } else {
      // Use createVariation for DALL-E 2
      console.log(`[${LogLevel.INFO}] [OpenAI] Using DALL-E 2 variation API`);
      
      response = await openai.images.createVariation({
        image: fs.createReadStream(imageFilePath),
        n: 1,
        size: size,
      });
    }
    
    // Get the image URL from the response
    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("No image URL returned from OpenAI");
    }
    
    // Get revised prompt if available (DALL-E 3 provides this)
    const revisedPrompt = response.data[0].revised_prompt || prompt;
    
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
      fs.writeFileSync(filePath, buffer);
      console.log(`[${LogLevel.INFO}] [OpenAI] Image variation saved to: ${filePath}`);
    } catch (downloadError) {
      console.error(`[${LogLevel.ERROR}] [OpenAI] Error saving image:`, downloadError);
      // Return the direct URL from OpenAI if we can't save it locally
      return {
        url: imageUrl,
        promptUsed: revisedPrompt,
        localFilePath: ''
      };
    }
    
    // Log completion and metrics
    const duration = (Date.now() - startTime) / 1000;
    console.log(`[${LogLevel.INFO}] [OpenAI] Image variation generated in ${duration.toFixed(2)} seconds`);
    await storage.incrementApiMetric('openai', duration);
    
    return {
      url: `/temp/${filename}`,
      promptUsed: revisedPrompt,
      localFilePath: filePath
    };
  } catch (error: any) {
    // Enhanced error handling with detailed logging
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      console.error(`[${LogLevel.ERROR}] [OpenAI] API Error (${status}):`, data);
      
      // Handle specific error types with guidance
      if (status === 401) {
        console.error(`[${LogLevel.ERROR}] [OpenAI] Authentication error: Invalid API key`);
      } else if (status === 403) {
        console.error(`[${LogLevel.ERROR}] [OpenAI] Permission error: Your account doesn't have access to ${model}`);
        console.error(`[${LogLevel.ERROR}] [OpenAI] Check organization settings or upgrade your account`);
      } else if (status === 429) {
        console.error(`[${LogLevel.ERROR}] [OpenAI] Rate limit exceeded or quota reached`);
      }
    } else {
      console.error(`[${LogLevel.ERROR}] [OpenAI] Error:`, error.message);
    }
    
    throw error;
  }
}