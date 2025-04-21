/**
 * Direct API Test for Partner Login
 * 
 * This script directly tests the partner login endpoint with zack@partner.com credentials.
 */
import fetch from 'node-fetch';

async function testPartnerLoginDirect() {
  try {
    console.log('Testing partner login for Zack account...');
    
    // Make a direct POST request to the login endpoint
    const loginResponse = await fetch('http://localhost:5000/api/partner/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'zack@partner.com',
        password: 'zackwln34'
      })
    });
    
    console.log(`Login response status: ${loginResponse.status} ${loginResponse.statusText}`);
    
    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return;
    }
    
    // Parse response
    const loginData = await loginResponse.json();
    console.log('Login successful! Response data:');
    console.log(JSON.stringify(loginData, null, 2));
    
    // Extract token for further tests
    const token = loginData.token;
    if (!token) {
      console.error('No token returned in login response');
      return;
    }
    
    console.log(`\nToken obtained: ${token.substring(0, 10)}...`);
    
    // Test partner status endpoint with the token
    console.log('\nTesting Partner Status endpoint...');
    const statusResponse = await fetch('http://localhost:5000/api/partner/status', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Status response: ${statusResponse.status} ${statusResponse.statusText}`);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('Status data:');
      console.log(JSON.stringify(statusData, null, 2));
    } else {
      console.error('Status check failed:', await statusResponse.text());
    }
    
    // Test partner dashboard endpoint with the token
    console.log('\nTesting Partner Dashboard endpoint...');
    const dashboardResponse = await fetch('http://localhost:5000/api/partner/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Dashboard response: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard data:');
      console.log(JSON.stringify(dashboardData, null, 2));
    } else {
      console.error('Dashboard check failed:', await dashboardResponse.text());
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPartnerLoginDirect();