/**
 * Test Script for Partner Routes
 * 
 * This script tests the partner API endpoints to verify they're working correctly.
 */
import fetch from 'node-fetch';

async function testPartnerRoutes() {
  try {
    console.log('Testing partner routes...');
    
    // 1. First, check our debug endpoint to get a test token
    const tokenResponse = await fetch('http://localhost:5000/api/debug/get-test-token');
    
    if (!tokenResponse.ok) {
      console.error('Failed to get test token:', tokenResponse.status, tokenResponse.statusText);
      return;
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Test token obtained:', tokenData.token.substring(0, 10) + '...');
    
    const testEndpoints = [
      { name: 'Partner Status', url: '/api/partner/status' },
      { name: 'Partner Dashboard', url: '/api/partner/dashboard' },
      { name: 'Partner Stats', url: '/api/partner/stats' },
      { name: 'Partner Referrals', url: '/api/partner/referrals' },
      { name: 'Partner Commissions', url: '/api/partner/commissions' },
      { name: 'Partner Payments', url: '/api/partner/payments' },
      { name: 'Partner Marketing', url: '/api/partner/marketing' }
    ];
    
    for (const endpoint of testEndpoints) {
      console.log(`\nTesting ${endpoint.name} endpoint: ${endpoint.url}`);
      
      const response = await fetch(`http://localhost:5000${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${tokenData.token}`
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
      } else {
        console.error('Error response:', await response.text());
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPartnerRoutes();