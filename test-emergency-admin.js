/**
 * Emergency Admin Panel Test
 * 
 * This script tests the emergency admin panel functionality to verify
 * it works correctly without WebSockets.
 */

import fetch from 'node-fetch';

// Configure variables
const API_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@warmleadnetwork.com';
const ADMIN_PASSWORD = 'emilwarm345';

async function testEmergencyAdmin() {
  console.log('Testing Emergency Admin Panel functionality...');
  
  try {
    // Step 1: Login to get token
    console.log('Logging in as admin...');
    const loginResponse = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });
    
    console.log(`Login response status: ${loginResponse.status}`);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('Login failed:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful, got token');
    
    const authToken = loginData.token || '';
    
    if (!authToken) {
      console.error('No auth token received in login response');
      return;
    }
    
    // Step 2: Test authentication check
    console.log('\nTesting authentication check...');
    const statusResponse = await fetch(`${API_URL}/api/admin-emergency/check-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Status check response: ${statusResponse.status}`);
    const statusData = await statusResponse.json();
    console.log('Status check result:', statusData);
    
    // Step 3: Get admin stats
    console.log('\nGetting admin stats...');
    const statsResponse = await fetch(`${API_URL}/api/admin-emergency/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Stats response status: ${statsResponse.status}`);
    const statsData = await statsResponse.json();
    console.log('Admin stats:', statsData);
    
    // Step 4: Get withdrawal requests
    console.log('\nGetting withdrawal requests...');
    const withdrawalsResponse = await fetch(`${API_URL}/api/admin-emergency/withdrawals`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Withdrawals response status: ${withdrawalsResponse.status}`);
    const withdrawalData = await withdrawalsResponse.json();
    console.log('Withdrawal requests data:', 
      Array.isArray(withdrawalData) 
        ? `Found ${withdrawalData.length} withdrawal requests` 
        : withdrawalData
    );
    
    // Print details of the first withdrawal if available
    if (Array.isArray(withdrawalData) && withdrawalData.length > 0) {
      console.log('\nSample withdrawal request:');
      console.log(withdrawalData[0]);
    }
    
    console.log('\nEmergency Admin Panel test completed successfully');
    
  } catch (error) {
    console.error('Error testing emergency admin panel:', error);
  }
}

// Execute main test function
testEmergencyAdmin();