/**
 * Test Script for Partner Referral URL Generation
 * 
 * This script tests the partner referral URL generation endpoint.
 */
import fetch from 'node-fetch';

async function testPartnerReferralUrl() {
  try {
    console.log('Testing partner referral URL generation endpoint...');
    
    // 1. First, check our debug endpoint to get a test token
    const tokenResponse = await fetch('http://localhost:5000/api/debug/get-test-token');
    
    if (!tokenResponse.ok) {
      console.error('Failed to get test token:', tokenResponse.status, tokenResponse.statusText);
      return;
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Test token obtained:', tokenData.token.substring(0, 10) + '...');
    
    // 2. Test the referral URL generation endpoint
    console.log('\nTesting referral URL generation endpoint...');
    
    const referralData = {
      campaignName: "Spring Sale 2025",
      targetUrl: "https://warmleadnetwork.com/spring-sale"
    };
    
    const response = await fetch('http://localhost:5000/api/partner/generate-referral', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(referralData)
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Generated Referral URL:', data.referralUrl);
      console.log('Tracking ID:', data.trackingId);
      console.log('Referral Code:', data.referralCode);
    } else {
      console.error('Error response:', await response.text());
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPartnerReferralUrl();