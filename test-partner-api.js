/**
 * Partner API Integration Test
 * 
 * This script tests the complete partner API flow:
 * 1. Login as partner
 * 2. Check partner status
 * 3. Fetch dashboard data
 * 4. Fetch marketing materials
 * 5. Fetch stats, referrals, etc.
 */

import axios from 'axios';

// Test parameters - use your test partner credentials
const partnerEmail = 'mulondo@partner.com';
const partnerPassword = 'testpassword123';
const baseUrl = 'http://localhost:5000';

// API endpoints to test
const endpoints = {
  login: '/api/partner/login',
  dashboard: '/api/partner/dashboard',
  marketing: '/api/partner/marketing',
  stats: '/api/partner/stats',
  referrals: '/api/partner/referrals',
  status: '/api/partner/status',
  referralClicks: '/api/partner/referral-clicks',
  recentClicks: '/api/partner/referral-clicks/recent',
  commissions: '/api/partner/commissions',
  payments: '/api/partner/payments'
};

// Store authorization token
let authToken = null;

// Test status tracking
const testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  failedEndpoints: []
};

/**
 * Execute a test case
 */
async function runTest(name, testFn) {
  testResults.totalTests++;
  console.log(`\n[TEST] ${name}`);
  try {
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    testResults.passedTests++;
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error('Error:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    testResults.failedTests++;
    testResults.failedEndpoints.push(name);
    return false;
  }
}

/**
 * Test partner login and get authentication token
 */
async function testPartnerLogin() {
  const response = await axios.post(`${baseUrl}${endpoints.login}`, {
    email: partnerEmail,
    password: partnerPassword
  });
  
  authToken = response.data.token;
  console.log(`Got auth token (first 10 chars): ${authToken.substring(0, 10)}...`);
  
  if (!authToken) {
    throw new Error('Login successful, but no token received');
  }
  
  return authToken;
}

/**
 * Test fetching partner status
 */
async function testPartnerStatus() {
  const response = await axios.get(`${baseUrl}${endpoints.status}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  console.log('Partner status:', response.data);
  
  if (!response.data.isPartner) {
    throw new Error('User is not a partner or status check failed');
  }
  
  // Check status string formatting
  const rawStatus = response.data.partner?.status || '';
  const upperStatus = rawStatus.toUpperCase();
  console.log(`Status string: '${rawStatus}', uppercase: '${upperStatus}'`);
  
  if (upperStatus !== 'ACTIVE') {
    console.warn(`Warning: Partner status is not 'ACTIVE' (case-insensitive): ${rawStatus}`);
  }
}

/**
 * Test fetching dashboard data
 */
async function testDashboard() {
  const response = await axios.get(`${baseUrl}${endpoints.dashboard}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  // Check main dashboard sections
  const requiredKeys = ['partner', 'stats', 'referrals', 'recentPayments', 'marketing'];
  const missingKeys = requiredKeys.filter(key => !response.data[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Dashboard missing required sections: ${missingKeys.join(', ')}`);
  }
  
  // Check if marketing section is complete
  const marketingKeys = ['referral_link', 'referral_code', 'banner_urls', 'email_templates'];
  const missingMarketingKeys = marketingKeys.filter(key => !response.data.marketing[key]);
  
  if (missingMarketingKeys.length > 0) {
    throw new Error(`Marketing section missing required fields: ${missingMarketingKeys.join(', ')}`);
  }
  
  console.log('Dashboard data:', {
    partnerInfo: response.data.partner ? 'Present' : 'Missing',
    statsInfo: response.data.stats ? 'Present' : 'Missing',
    referralsCount: response.data.referrals?.length || 0,
    paymentsCount: response.data.recentPayments?.length || 0,
    emailTemplates: response.data.marketing?.email_templates?.length || 0,
  });
}

/**
 * Test marketing materials endpoint
 */
async function testMarketingMaterials() {
  const response = await axios.get(`${baseUrl}${endpoints.marketing}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  // Verify required marketing fields
  const requiredFields = ['referral_link', 'referral_code', 'banner_urls', 'email_templates'];
  const missingFields = requiredFields.filter(field => !response.data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Marketing materials missing required fields: ${missingFields.join(', ')}`);
  }
  
  console.log('Marketing materials:', {
    referralLink: response.data.referral_link,
    referralCode: response.data.referral_code,
    bannerUrls: response.data.banner_urls?.length || 0,
    emailTemplates: response.data.email_templates?.length || 0
  });
}

/**
 * Test partner stats endpoint
 */
async function testPartnerStats() {
  const response = await axios.get(`${baseUrl}${endpoints.stats}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  // Verify stats fields
  const statsFields = ['totalCommission', 'pendingCommission', 'paidCommission', 
                       'totalReferrals', 'activeReferrals', 'conversionRate'];
  const missingFields = statsFields.filter(field => response.data[field] === undefined);
  
  if (missingFields.length > 0) {
    throw new Error(`Partner stats missing required fields: ${missingFields.join(', ')}`);
  }
  
  console.log('Partner stats:', response.data);
}

/**
 * Test referrals endpoint
 */
async function testReferrals() {
  const response = await axios.get(`${baseUrl}${endpoints.referrals}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  console.log('Referrals data:', {
    total: response.data.total,
    active: response.data.active,
    referralsArray: Array.isArray(response.data.referrals)
  });
  
  if (!Array.isArray(response.data.referrals)) {
    throw new Error('Referrals are not returned as an array');
  }
}

/**
 * Test commissions endpoint
 */
async function testCommissions() {
  const response = await axios.get(`${baseUrl}${endpoints.commissions}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  console.log('Commissions data:', {
    total: response.data.total,
    pending: response.data.pending,
    paid: response.data.paid,
    commissionsArray: Array.isArray(response.data.commissions)
  });
  
  if (!Array.isArray(response.data.commissions)) {
    throw new Error('Commissions are not returned as an array');
  }
}

/**
 * Test payments endpoint
 */
async function testPayments() {
  const response = await axios.get(`${baseUrl}${endpoints.payments}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  console.log('Payments data:', {
    totalPaid: response.data.totalPaid,
    paymentsArray: Array.isArray(response.data.payments)
  });
  
  if (!Array.isArray(response.data.payments)) {
    throw new Error('Payments are not returned as an array');
  }
}

/**
 * Compare the marketing data in dashboard to dedicated marketing endpoint
 */
async function testMarketingConsistency() {
  // Get dashboard data
  const dashboardResponse = await axios.get(`${baseUrl}${endpoints.dashboard}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  // Get marketing data
  const marketingResponse = await axios.get(`${baseUrl}${endpoints.marketing}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const dashboardMarketing = dashboardResponse.data.marketing;
  const dedicatedMarketing = marketingResponse.data;
  
  // Check consistency for key fields
  const referralLinkMatch = dashboardMarketing.referral_link === dedicatedMarketing.referral_link;
  const referralCodeMatch = dashboardMarketing.referral_code === dedicatedMarketing.referral_code;
  const bannersLengthMatch = 
    (dashboardMarketing.banner_urls?.length || 0) === (dedicatedMarketing.banner_urls?.length || 0);
  const templatesLengthMatch = 
    (dashboardMarketing.email_templates?.length || 0) === (dedicatedMarketing.email_templates?.length || 0);
  
  console.log('Marketing consistency check:', {
    referralLinkMatch,
    referralCodeMatch,
    bannersLengthMatch,
    templatesLengthMatch
  });
  
  if (!referralLinkMatch || !referralCodeMatch || !bannersLengthMatch || !templatesLengthMatch) {
    throw new Error('Marketing data is not consistent between dashboard and dedicated endpoint');
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('===== PARTNER API INTEGRATION TEST =====');
  console.log(`Partner Email: ${partnerEmail}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log('======================================');
  
  // Login test first - required for other tests
  const loginSuccess = await runTest('Partner Login', testPartnerLogin);
  
  // Skip other tests if login fails
  if (!loginSuccess) {
    console.error('Login failed, skipping remaining tests');
    return;
  }
  
  // Test partner status
  await runTest('Partner Status', testPartnerStatus);
  
  // Test dashboard 
  await runTest('Partner Dashboard', testDashboard);
  
  // Test individual endpoints
  await runTest('Marketing Materials', testMarketingMaterials);
  await runTest('Partner Stats', testPartnerStats);
  await runTest('Referrals', testReferrals);
  await runTest('Commissions', testCommissions);
  await runTest('Payments', testPayments);
  
  // Test consistency between endpoints
  await runTest('Marketing Consistency', testMarketingConsistency);
  
  // Print final test summary
  console.log('\n===== TEST SUMMARY =====');
  console.log(`Total Tests: ${testResults.totalTests}`);
  console.log(`Passed: ${testResults.passedTests}`);
  console.log(`Failed: ${testResults.failedTests}`);
  
  if (testResults.failedTests > 0) {
    console.log('\nFailed Endpoints:');
    testResults.failedEndpoints.forEach(endpoint => {
      console.log(`- ${endpoint}`);
    });
  }
}

// Run all tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});