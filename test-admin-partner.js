import fetch from 'node-fetch';

async function setupAdminPartner() {
  console.log('Setting up admin partner account...');

  try {
    const response = await fetch('https://e47d789a-4bf9-411f-aabe-9db70787900c-00-2ajtxwqj6b9o4.worf.replit.dev/api/admin-partner-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@warmleadnetwork.com',
        password: 'admin123'
      })
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers);
    
    // Get the raw text first to debug any potential issues
    const rawText = await response.text();
    console.log('Raw response:', rawText.substring(0, 500)); // Show first 500 chars
    
    let data;
    try {
      // Try to parse it as JSON
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      // Continue with execution, but data will be undefined
      throw new Error('Failed to parse JSON. See raw response above.');
    }
    console.log('Admin partner account setup successful:');
    console.log('Token:', data.token);
    console.log('User:', data.user);
    console.log('Partner:', data.partner);

    // Save token to environment variable for easy use in future requests
    process.env.ADMIN_TOKEN = data.token;
    console.log('Token saved to process.env.ADMIN_TOKEN');
    
    return data;
  } catch (error) {
    console.error('Error setting up admin partner:', error.message);
    throw error;
  }
}

// Execute the function
setupAdminPartner()
  .then(data => {
    console.log('Script completed successfully');
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });