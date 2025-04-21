/**
 * Test Google Authentication Configuration
 * 
 * This script tests the Google Auth configuration by:
 * 1. Checking if the required environment variables are set
 * 2. Verifying the OAuth callback URL is properly configured
 * 3. Providing instructions for manual testing
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

async function testGoogleAuthConfig() {
  try {
    console.log('Google Authentication Configuration Test');
    console.log('======================================');
    
    // Step 1: Check if environment variables are set
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    console.log(`GOOGLE_CLIENT_ID: ${googleClientId ? '✓ Set' : '✗ Not Set'}`);
    console.log(`GOOGLE_CLIENT_SECRET: ${googleClientSecret ? '✓ Set' : '✗ Not Set'}`);
    
    if (!googleClientId || !googleClientSecret) {
      console.error('Google authentication requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }
    
    // Step 2: Check for the Google auth module
    const googleAuthPath = join(__dirname, 'server', 'google-auth.ts');
    console.log('\nChecking Google Auth Module');
    console.log('-------------------------');
    try {
      if (fs.existsSync(googleAuthPath)) {
        console.log(`✓ Found Google Auth module at ${googleAuthPath}`);
      } else {
        console.log(`✗ Google Auth module not found at ${googleAuthPath}`);
      }
    } catch (err) {
      console.error(`Error checking for Google Auth module: ${err.message}`);
    }
    
    // Step 3: Check callback URL configuration
    console.log('\nCallback URL Configuration');
    console.log('-------------------------');
    console.log('Callback URL should be: /api/auth/google/callback');
    console.log('Make sure these URLs are registered in the Google Cloud Console:');
    console.log('1. For development (Replit):');
    console.log('   https://2c02c6b5-58d5-42a8-8f3e-4a4621472f8a-00-3cc54rc54e19j.janeway.replit.dev/api/auth/google/callback');
    console.log('2. For production:');
    console.log('   https://www.jesko.ai/api/auth/google/callback');
    
    // Test instructions
    console.log('\nManual Testing Instructions');
    console.log('--------------------------');
    console.log('1. Start the application');
    console.log('2. Navigate to the login page');
    console.log('3. Click "Sign in with Google" button');
    console.log('4. Sign in with your Google account');
    console.log('5. Verify you are redirected back to the application');
    
    console.log('\nAPI Testing Instructions');
    console.log('----------------------');
    console.log('To directly test the Google OAuth flow, visit:');
    console.log('/api/auth/google');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testGoogleAuthConfig().catch(console.error);