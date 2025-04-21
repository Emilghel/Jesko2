/**
 * Test script for the website scraping API
 * 
 * This script tests the functionality of the /api/scrape-website endpoint
 * by sending a POST request with a URL to scrape.
 */

import axios from 'axios';

async function testWebsiteScraper() {
  console.log('Testing website scraper API...');
  
  try {
    // Test website URL to scrape (using a well-known site with stable content)
    const url = 'https://example.com';
    
    console.log(`Scraping website: ${url}`);
    
    // Call the API
    const response = await axios.post('http://localhost:5000/api/scrape-website', {
      url: url,
    });
    
    // Check the response
    if (response.data.success) {
      console.log('\nScraped content:');
      console.log('--------------------------------------');
      // Truncate the content for display
      const previewContent = response.data.content.substring(0, 500) + 
        (response.data.content.length > 500 ? '...' : '');
      console.log(previewContent);
      console.log('--------------------------------------');
      console.log(`Total content length: ${response.data.contentLength} characters`);
      console.log('Scraping successful!');
    } else {
      console.error('Scraping failed:', response.data.error);
    }
  } catch (error) {
    console.error('Error during scraping test:', error.response ? error.response.data : error.message);
  }
}

// Run the test
testWebsiteScraper();