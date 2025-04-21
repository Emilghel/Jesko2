/**
 * Register Partner via API
 * 
 * This script uses the application's API to register a new partner account.
 */

import fetch from 'node-fetch';

async function registerPartner() {
  // Command line arguments
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.error('Usage: node register-partner.js <email> <password>');
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
        email,
        password,
        role: 'partner'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error registering partner:', data.message || 'Unknown error');
      process.exit(1);
    }
    
    console.log('Partner registration successful:');
    console.log(`Email: ${email}`);
    console.log(`User ID: ${data.user?.id || 'Unknown'}`);
    console.log('\nPartner can now log in at /login with these credentials.');
    
  } catch (error) {
    console.error('Error connecting to API:', error.message);
    process.exit(1);
  }
}

registerPartner();