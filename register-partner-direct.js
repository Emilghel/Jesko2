/**
 * Register Partner Directly
 */

import fetch from 'node-fetch';

async function registerPartner() {
  // Command line arguments
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.error('Usage: node register-partner-direct.js <email> <password>');
    process.exit(1);
  }
  
  try {
    // Register the partner via the API
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: email.split('@')[0], // Extract username from email
        email,
        password,
        role: 'partner'
      })
    });
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log('Response (not JSON):', responseText);
      process.exit(1);
    }
    
    if (!response.ok) {
      console.error('Error registering partner:', data.error || data.message || 'Unknown error');
      process.exit(1);
    }
    
    console.log('Partner registration successful:');
    console.log(`Email: ${email}`);
    console.log(`Username: ${email.split('@')[0]}`);
    console.log(`User ID: ${data.user?.id || 'Unknown'}`);
    console.log('\nPartner can now log in at /login with these credentials.');
    
  } catch (error) {
    console.error('Error connecting to API:', error.message);
    process.exit(1);
  }
}

registerPartner();