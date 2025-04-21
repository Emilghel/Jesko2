/**
 * Test script for AdminPanel1 API endpoints
 * 
 * This script tests the key API endpoints used by AdminPanel1:
 * - /api/admin/system-status
 * - /api/admin/users
 */

import fetch from 'node-fetch';

// Only use environment variable for token - no hardcoded fallback
const TEST_TOKEN = process.env.TEST_ADMIN_TOKEN;
if (!TEST_TOKEN) {
  console.error('ERROR: TEST_ADMIN_TOKEN environment variable is not set.');
  console.error('Please create a valid admin token and set it as TEST_ADMIN_TOKEN environment variable.');
  console.error('You can use the "create-admin.js" script to generate a token.');
  process.exit(1);
}

async function testAdminPanel1API() {
  try {
    console.log('Testing AdminPanel1 API endpoints...');
    console.log('=================================\n');
    
    // Test 1: System Status Endpoint
    console.log('1. Testing /api/admin/system-status endpoint:');
    let response = await fetch('http://localhost:5000/api/admin/system-status', {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   Response data:');
      console.log(`   - Database connected: ${data.dbConnected}`);
      console.log(`   - Schema exists: ${data.schemaExists}`);
      console.log(`   - User count: ${data.userCount}`);
      console.log(`   - Timestamp: ${data.timestamp}`);
      
      if (data.timeCheck) {
        console.log(`   - Time check - time: ${data.timeCheck.time}`);
        console.log(`   - Time check - database: ${data.timeCheck.database}`);
      }
    } else {
      console.error('   Error response:', await response.text());
    }
    
    console.log('\n');
    
    // Test 2: Users Endpoint
    console.log('2. Testing /api/admin/users endpoint:');
    response = await fetch('http://localhost:5000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const users = await response.json();
      console.log(`   Retrieved ${users.length} users`);
      
      // Display first 3 users as a sample
      const sampleUsers = users.slice(0, 3);
      console.log('   Sample users:');
      sampleUsers.forEach((user, index) => {
        console.log(`   User #${index + 1}:`);
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Username: ${user.username}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
        console.log(`   - Created: ${user.createdAt}`);
        console.log('');
      });
      
      // Count admin users
      const adminCount = users.filter(user => user.isAdmin).length;
      console.log(`   Total admin users: ${adminCount}`);
    } else {
      console.error('   Error response:', await response.text());
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testAdminPanel1API();