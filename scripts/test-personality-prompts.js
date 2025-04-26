// Test script for personality prompts API
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const AUTH_TOKEN = ''; // Add your auth token here if needed

async function testPersonalityPromptsAPI() {
  try {
    console.log('Testing Personality Prompts API...');
    
    // Set up headers with authentication token if available
    const headers = AUTH_TOKEN
      ? { Authorization: `Bearer ${AUTH_TOKEN}` }
      : {};
    
    // 1. Get all personality prompts
    console.log('\n1. Testing GET /api/personality-prompts');
    const allPromptsResponse = await axios.get(`${BASE_URL}/api/personality-prompts`, { headers });
    console.log(`Status: ${allPromptsResponse.status}`);
    console.log(`Found ${allPromptsResponse.data.length} personality prompts`);
    
    if (allPromptsResponse.data.length > 0) {
      // Get the first prompt's ID for subsequent tests
      const firstPromptId = allPromptsResponse.data[0].id;
      
      // 2. Get a specific personality prompt
      console.log(`\n2. Testing GET /api/personality-prompts/${firstPromptId}`);
      const singlePromptResponse = await axios.get(`${BASE_URL}/api/personality-prompts/${firstPromptId}`, { headers });
      console.log(`Status: ${singlePromptResponse.status}`);
      console.log(`Prompt name: ${singlePromptResponse.data.name}`);
      
      // 3. Test the merge endpoint with the first personality
      const firstPersonalityId = allPromptsResponse.data[0].personality_id;
      console.log(`\n3. Testing POST /api/personality-prompts/merge`);
      const mergeResponse = await axios.post(
        `${BASE_URL}/api/personality-prompts/merge`,
        {
          personalityId: firstPersonalityId,
          userPrompt: "Please help me sell our new product to potential customers."
        },
        { headers }
      );
      console.log(`Status: ${mergeResponse.status}`);
      console.log('Merged prompt first 100 chars:', mergeResponse.data.mergedPrompt.substring(0, 100) + '...');
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error testing personality prompts API:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
  }
}

testPersonalityPromptsAPI();