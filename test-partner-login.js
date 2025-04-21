/**
 * Test Script for Partner Login
 */
import fetch from 'node-fetch';

async function testPartnerLogin() {
  try {
    const email = 'mulondo@partner.com';
    const password = 'testpassword123';
    
    console.log(`Attempting to login with ${email}...`);
    
    // Call the login API
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
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
      console.error('Login failed:', data.error || data.message || 'Unknown error');
      process.exit(1);
    }
    
    console.log('Login successful!');
    console.log(`User ID: ${data.id}`);
    console.log(`Username: ${data.username}`);
    console.log(`Email: ${data.email}`);
    console.log(`Token: ${data.token.substring(0, 10)}...`);
    console.log(`Token expires: ${new Date(data.expiresAt).toLocaleString()}`);
    
    const token = data.token;
    const apiEndpoints = [
      { name: 'Partner Stats', url: '/api/partner/stats' },
      { name: 'Partner Commissions', url: '/api/partner/commissions' },
      { name: 'Partner Referrals', url: '/api/partner/referrals' },
      { name: 'Partner Clicks', url: '/api/partner/clicks' }
    ];
    
    // Test all partner API endpoints
    for (const endpoint of apiEndpoints) {
      console.log(`\nTesting ${endpoint.name} API...`);
      
      const apiResponse = await fetch(`http://localhost:5000${endpoint.url}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (apiResponse.ok) {
        console.log(`✅ ${endpoint.name} API access successful!`);
        const responseData = await apiResponse.json();
        console.log(`Response:`, JSON.stringify(responseData, null, 2).substring(0, 300) + (JSON.stringify(responseData, null, 2).length > 300 ? '...' : ''));
      } else {
        console.error(`❌ ${endpoint.name} API access failed with status ${apiResponse.status}`);
        try {
          const apiError = await apiResponse.json();
          console.error('Error details:', apiError);
        } catch (e) {
          console.error('Could not parse error response');
        }
      }
    }
    
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

testPartnerLogin();