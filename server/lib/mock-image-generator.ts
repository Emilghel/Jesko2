import fs from 'fs';
import path from 'path';
import { LogLevel } from '@shared/schema';
import { storage } from '../storage';

/**
 * A fallback mock image generator for testing when OpenAI API keys have issues
 * This allows the rest of the application to function while API issues are resolved
 */

// List of stock images to use as fallbacks
const stockImages = [
  '/attached_assets/12.jpg',
  '/attached_assets/13.jpg',
  '/attached_assets/15.jpg',
];

/**
 * Generate a "mock" image based on the prompt
 * This just returns one of our stock images but allows the UI flow to be tested
 */
export async function mockGenerateImageFromText(
  prompt: string,
  userId: number
): Promise<{ url: string, promptUsed: string, localFilePath: string }> {
  try {
    const startTime = Date.now();
    
    // Log the process
    console.log(`[${LogLevel.INFO}] [Mock Generator] Generating mock image from text prompt: ${prompt}`);
    
    // Select a random stock image from our list
    const randomIndex = Math.floor(Math.random() * stockImages.length);
    const selectedStockImage = stockImages[randomIndex];
    
    // Create temp directory if it doesn't exist
    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create a copy of the stock image to simulate a new generation
    const timestamp = Date.now();
    const filename = `image_${userId}_${timestamp}.jpg`;
    const filePath = path.join(tempDir, filename);
    
    // Get the path to the stock image
    const stockImagePath = path.join(process.cwd(), selectedStockImage);
    
    try {
      // Copy the stock image to our temp directory
      if (fs.existsSync(stockImagePath)) {
        fs.copyFileSync(stockImagePath, filePath);
        console.log(`[${LogLevel.INFO}] [Mock Generator] Mock image saved to: ${filePath}`);
      } else {
        console.error(`[${LogLevel.ERROR}] [Mock Generator] Stock image not found: ${stockImagePath}`);
        // Return a direct URL to one of the assets in this case
        return {
          url: selectedStockImage,
          promptUsed: prompt,
          localFilePath: ''
        };
      }
    } catch (error) {
      console.error(`[${LogLevel.ERROR}] [Mock Generator] Error saving image:`, error);
      // Return a direct URL to one of the assets
      return {
        url: selectedStockImage,
        promptUsed: prompt,
        localFilePath: ''
      };
    }
    
    // Calculate duration and log metrics
    const duration = (Date.now() - startTime) / 1000;
    console.log(`[${LogLevel.INFO}] [Mock Generator] Mock image generated in ${duration.toFixed(2)} seconds`);
    await storage.incrementApiMetric('openai', duration);
    
    return {
      url: `/temp/${filename}`,
      promptUsed: `[MOCK] ${prompt}`,
      localFilePath: filePath
    };
  } catch (error: any) {
    console.error(`[${LogLevel.ERROR}] [Mock Generator] Error:`, error.message);
    throw error;
  }
}

/**
 * Generate a mock image variation
 */
export async function mockGenerateImageFromImageAndText(
  prompt: string,
  imageFilePath: string,
  userId: number
): Promise<{ url: string, promptUsed: string, localFilePath: string }> {
  // For simplicity, we'll just reuse the text-based mock generator
  return mockGenerateImageFromText(prompt, userId);
}