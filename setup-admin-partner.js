// Script to set up an admin user with partner access
import fetch from 'node-fetch';
import fs from 'fs';

async function setupAdminPartner() {
  console.log('Setting up admin partner account...');
  
  try {
    const response = await fetch('http://localhost:5000/api/admin-partner-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Get the raw text first to debug any potential issues
    const rawText = await response.text();
    
    try {
      // Try to parse it as JSON
      const result = JSON.parse(rawText);
      console.log('Admin partner setup successful!');
      console.log('\nToken:', result.token);
      
      console.log('\nUser Info:');
      console.log('  ID:', result.user.id);
      console.log('  Email:', result.user.email);
      console.log('  Display Name:', result.user.displayName);
      console.log('  Admin:', result.user.isAdmin ? 'Yes' : 'No');
      
      console.log('\nPartner Info:');
      console.log('  ID:', result.partner.id);
      console.log('  Company:', result.partner.company_name);
      console.log('  Referral Code:', result.partner.referral_code);
      console.log('  Status:', result.partner.status);
      
      console.log('\n-------------');
      console.log('To use this token in API requests, add this header:');
      console.log('Authorization: Bearer ' + result.token);
      console.log('-------------');
      
      // Save token to a file for easy access
      fs.writeFileSync('admin-token.txt', result.token);
      console.log('\nToken saved to admin-token.txt');
      
    } catch (parseError) {
      console.error('Failed to parse JSON response. Raw response:');
      console.error(rawText.substring(0, 500) + '...');  // Print just the first part to avoid overwhelming output
    }
  } catch (error) {
    console.error('Error setting up admin partner:', error);
  }
}

setupAdminPartner();