/**
 * Test Script for Partner Agent Creation
 */
import fetch from 'node-fetch';

async function testPartnerAgentCreate() {
  try {
    const email = 'partner2@partner.com';
    const password = 'mulundo3412';
    
    console.log(`Attempting to login with ${email}...`);
    
    // 1. First login to get a token
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('Login failed:', errorText);
      process.exit(1);
    }
    
    // Check content type to ensure we're getting JSON
    const contentType = loginResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await loginResponse.text();
      console.error('Unexpected response format:', responseText.substring(0, 100) + '...');
      process.exit(1);
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful!');
    console.log(`Token: ${loginData.token.substring(0, 10)}...`);
    
    // 2. Create a new agent
    const newAgent = {
      name: "Partner Test Agent",
      description: "A test agent created by a partner account",
      personality: "Friendly and helpful",
      voice: "Matthew",
      knowledge_base: "I'm a test agent for the partner account. I can help with various tasks.",
      goals: "Help users with their questions.",
      max_knowledge_length: 5000
    };
    
    console.log('\nCreating a new agent...');
    
    const createResponse = await fetch('http://localhost:5000/api/user/agents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newAgent)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Agent creation failed:', errorText);
      process.exit(1);
    }
    
    // Check content type to ensure we're getting JSON
    const createContentType = createResponse.headers.get('content-type');
    if (!createContentType || !createContentType.includes('application/json')) {
      const responseText = await createResponse.text();
      console.error('Unexpected create response format:', responseText.substring(0, 100) + '...');
      process.exit(1);
    }
    
    const agentData = await createResponse.json();
    console.log('Agent created successfully!');
    console.log('Agent ID:', agentData.id);
    console.log('Agent name:', agentData.name);
    
    // 3. List all agents for this user
    console.log('\nFetching all agents for this user...');
    
    const listResponse = await fetch('http://localhost:5000/api/user/agents', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('Failed to fetch agents:', errorText);
      process.exit(1);
    }
    
    // Check content type to ensure we're getting JSON
    const listContentType = listResponse.headers.get('content-type');
    if (!listContentType || !listContentType.includes('application/json')) {
      const responseText = await listResponse.text();
      console.error('Unexpected list response format:', responseText.substring(0, 100) + '...');
      process.exit(1);
    }
    
    const agentsList = await listResponse.json();
    console.log(`Found ${agentsList.length} agents:`);
    agentsList.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name} (ID: ${agent.id})`);
    });
    
    // 4. Test agent deletion
    if (agentsList.length > 0) {
      const agentToDelete = agentsList[0];
      console.log(`\nDeleting agent: ${agentToDelete.name} (ID: ${agentToDelete.id})...`);
      
      // Try the direct database deletion endpoint which has more reliable deletion logic
      const deleteResponse = await fetch(`http://localhost:5000/api/agents/direct-db-delete/${agentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json',
          'X-Delete-Request-ID': `test-delete-${Date.now()}`
        }
      });
      
      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('Agent deletion failed:', errorText);
        process.exit(1);
      }
      
      console.log('Agent deleted successfully!');
      
      // Verify agent was actually deleted
      console.log('\nVerifying agent deletion...');
      
      const verifyResponse = await fetch('http://localhost:5000/api/user/agents', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error('Failed to verify agent deletion:', errorText);
        process.exit(1);
      }
      
      const updatedAgentsList = await verifyResponse.json();
      console.log(`After deletion: Found ${updatedAgentsList.length} agents`);
      
      // Check if the agent was actually deleted
      const agentStillExists = updatedAgentsList.some(a => a.id === agentToDelete.id);
      if (agentStillExists) {
        console.error(`ERROR: Agent ID ${agentToDelete.id} still exists after deletion!`);
        process.exit(1);
      } else {
        console.log(`Verified: Agent ID ${agentToDelete.id} was successfully deleted`);
      }
    }
    
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

testPartnerAgentCreate();