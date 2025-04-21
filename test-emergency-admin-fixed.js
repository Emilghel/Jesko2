/**
 * Emergency Admin Panel Test - Updated for Fixed Version
 * 
 * This script tests the emergency admin panel functionality to verify
 * it works correctly without WebSockets.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@warmleadnetwork.com';
const ADMIN_PASSWORD = 'emilwarm345';

async function testEmergencyAdmin() {
  console.log('Testing Emergency Admin Panel functionality...');
  let adminToken;
  
  // Test direct admin login first
  console.log('Logging in via emergency admin login...');
  
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/admin-emergency/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login result:', loginData);
    
    if (loginData.token) {
      adminToken = loginData.token;
      console.log('Login successful, got token');
    } else {
      console.error('Login failed, no token received');
      return;
    }
  } catch (error) {
    console.error('Error during emergency admin login:', error);
    return;
  }
  
  // Test authentication check
  console.log('\nTesting authentication check...');
  
  try {
    const statusResponse = await fetch(`${BASE_URL}/api/admin-emergency/check-status`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    
    console.log('Status check response:', statusResponse.status);
    const statusData = await statusResponse.json();
    console.log('Status check result:', statusData);
  } catch (error) {
    console.error('Error checking authentication status:', error);
  }
  
  // Test admin stats
  console.log('\nGetting admin stats...');
  
  try {
    const statsResponse = await fetch(`${BASE_URL}/api/admin-emergency/stats`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    
    console.log('Stats response status:', statsResponse.status);
    const statsData = await statsResponse.json();
    console.log('Admin stats:', statsData);
  } catch (error) {
    console.error('Error getting admin stats:', error);
  }
  
  // Test withdrawal requests
  console.log('\nGetting withdrawal requests...');
  
  try {
    const withdrawalsResponse = await fetch(`${BASE_URL}/api/admin-emergency/withdrawals`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    
    console.log('Withdrawals response status:', withdrawalsResponse.status);
    const withdrawalsData = await withdrawalsResponse.json();
    console.log('Withdrawal requests data:', withdrawalsData);
  } catch (error) {
    console.error('Error getting withdrawal requests:', error);
  }
  
  console.log('\nEmergency Admin Panel test completed successfully');
}

testEmergencyAdmin();