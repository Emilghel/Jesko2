# OpenAI Image Generation Update Instructions

To update the image generation in the routes.ts file, replace the existing image generation code with the improved version that uses the fixed OpenAI client implementation.

## Step 1: Import the fixed OpenAI image module

```typescript
// Import the fixed implementation at the top of routes.ts
import { generateImageFromText, generateImageFromImageAndText } from './lib/openai-image-fixed';
```

## Step 2: Update the route implementation

Replace the existing image generation route with this updated implementation:

```typescript
app.post('/api/image/generate', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { prompt, size } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid request. Required field: prompt' });
    }
    
    // Check if prompt is too short
    if (prompt.trim().length < 3) {
      return res.status(400).json({ error: 'Prompt is too short. Please provide a more detailed description.' });
    }
    
    // The cost for image generation is 5 coins per image
    const coinCost = 5;
    
    // Check if user has enough coins
    const userCoins = await storage.getUserCoins(user.id);
    
    if (userCoins < coinCost) {
      return res.status(403).json({ 
        error: 'Insufficient coins', 
        required: coinCost, 
        available: userCoins,
        message: `You need ${coinCost} coins to generate this image, but you only have ${userCoins} coins.`
      });
    }
    
    try {
      // First deduct coins from the user account
      const deductResult = await storage.deductUserCoins(
        user.id,
        coinCost,
        `Generated AI image from text`
      );
      
      if (!deductResult) {
        return res.status(403).json({ error: 'Failed to deduct coins from account' });
      }
      
      // Log the coin deduction
      await logMessage(LogLevel.INFO, 'Coins', `User ${user.email} used ${coinCost} coins for image generation`);
      
      // Generate the image with OpenAI - use the fixed implementation
      const result = await generateImageFromText(
        prompt,
        user.id,
        size || "1024x1024"
      );
      
      // Return success response with updated coin balance and image URL
      const updatedCoins = await storage.getUserCoins(user.id);
      
      res.json({ 
        success: true, 
        coins: updatedCoins,
        coinCost,
        imageUrl: result.url,
        promptUsed: result.promptUsed,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      // If image generation fails, refund the coins
      await storage.addUserCoins(
        user.id,
        coinCost,
        'Refund: Failed to generate image'
      );
      
      // Log the error with better details
      console.error('Error generating image:', error instanceof Error ? error.message : 'Unknown error');
      
      if (error instanceof Error && error.message.includes('permission')) {
        return res.status(500).json({ 
          error: 'API permission error', 
          details: 'The OpenAI account does not have permission to generate images.',
          message: 'Our AI service is temporarily unavailable. Please try again later.'
        });
      } else {
        return res.status(500).json({ 
          error: 'Failed to process image generation request',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  } catch (error) {
    console.error('Unexpected error in image generation endpoint:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});
```

Similarly, update the image edit route to use the fixed implementation.

## Step 3: Update your .env file

Make sure your `.env` file has the OpenAI API key with proper image generation permissions:

```
OPENAI_API_KEY=your_api_key_here
# Add this if you have an organization ID and multiple organizations
# OPENAI_ORGANIZATION=your_organization_id
```

## Step 4: Testing

After making these changes, test the image generation API by:

1. Using the test-openai-image.js script directly:
   ```
   node test-openai-image.js "A majestic mountain landscape at sunset"
   ```

2. Using the API endpoint through the application:
   - Log in to the application
   - Go to the AI Image page
   - Enter a prompt and submit
   - Check the server logs for detailed error information if needed

## Additional Troubleshooting

If you're still experiencing permission issues:

1. Verify your API key has access to DALL-E by visiting the OpenAI Dashboard
2. Check if you have billing enabled and payment method set up
3. Try using DALL-E 2 rather than DALL-E 3 which may have different permissions
4. If you have multiple organizations, ensure you're using the correct one by setting the OPENAI_ORGANIZATION environment variable