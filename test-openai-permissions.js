/**
 * Test script to check OpenAI API key permissions
 * 
 * This script tests permissions of the OpenAI API key to diagnose issues with the SalesGPT.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configure dotenv
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testOpenAIPermissions() {
  console.log("Testing OpenAI API key permissions...");
  
  if (!OPENAI_API_KEY) {
    console.error("Error: No OpenAI API key found in environment variables.");
    return;
  }
  
  // Log key format info (safely)
  console.log(`API Key Format: ${OPENAI_API_KEY.substring(0, 9)}... (total length: ${OPENAI_API_KEY.length})`);
  
  // Try to list available models - requires basic permissions
  try {
    console.log("\nTesting models endpoint...");
    const modelsResponse = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });
    
    console.log(`✅ Models list access successful! Got ${modelsResponse.data.data.length} models.`);
    
    // Check if GPT-4 models are available
    const gpt4Models = modelsResponse.data.data.filter(model => 
      model.id.includes('gpt-4')
    );
    
    if (gpt4Models.length > 0) {
      console.log(`✅ GPT-4 models available: ${gpt4Models.map(m => m.id).join(', ')}`);
    } else {
      console.log("❌ No GPT-4 models available with this API key.");
    }
  } catch (error) {
    console.error("❌ Error accessing models:", error.response?.data || error.message);
  }
  
  // Test chat completion with GPT-3.5-turbo
  try {
    console.log("\nTesting chat completion with gpt-3.5-turbo...");
    const chat35Response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hello world' }],
      max_tokens: 20
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });
    
    console.log("✅ GPT-3.5-turbo response:", chat35Response.data.choices[0].message.content);
  } catch (error) {
    console.error("❌ Error with GPT-3.5-turbo:", error.response?.data || error.message);
  }
  
  // Test chat completion with GPT-4 (if available)
  try {
    console.log("\nTesting chat completion with gpt-4...");
    const chat4Response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say hello world' }],
      max_tokens: 20
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });
    
    console.log("✅ GPT-4 response:", chat4Response.data.choices[0].message.content);
  } catch (error) {
    console.error("❌ Error with GPT-4:", error.response?.data?.error || error.message);
    
    if (error.response?.data?.error?.code === 'model_not_found') {
      console.log("This API key does not have access to GPT-4 models.");
    } else if (error.response?.data?.error?.type === 'insufficient_quota') {
      console.log("You've exceeded your quota or don't have quota for GPT-4.");
    } else if (error.response?.data?.error?.message?.includes('permission')) {
      console.log("Your API key does not have permission to use GPT-4.");
    }
  }
}

testOpenAIPermissions().catch(err => {
  console.error("Unhandled error:", err);
});