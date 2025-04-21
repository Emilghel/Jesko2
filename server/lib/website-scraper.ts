/**
 * Website Scraper Utility
 * 
 * This module provides functionality to extract content from websites for use
 * in AI agent knowledge bases.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Options for website scraping
 */
interface ScrapingOptions {
  // Maximum text length to extract (characters)
  maxLength?: number;
  // CSS selectors to focus on for content extraction
  contentSelectors?: string[];
  // CSS selectors to specifically exclude
  excludeSelectors?: string[];
}

/**
 * Default options for website scraping
 */
const defaultOptions: ScrapingOptions = {
  maxLength: 20000, // Character limit to prevent overly large knowledge bases
  contentSelectors: [
    'article',
    'main',
    '.content',
    '#content',
    '.main-content',
    '.article',
    '.post-content',
    '.page-content',
    'section',
    '.product-description',
    '.about-us',
    '.company-info',
    '.faq',
    '.faq-section'
  ],
  excludeSelectors: [
    'nav',
    'header',
    'footer',
    '.navigation',
    '.menu',
    '.sidebar',
    '.ads',
    '.advertisement',
    'script',
    'style',
    '.cookie-notice',
    '.popup',
    '.modal',
    '.comments',
    '.social-share',
    '.related-posts'
  ]
};

/**
 * Extract clean text content from HTML
 * 
 * @param $ - Cheerio instance loaded with HTML
 * @param element - Element to extract text from
 * @returns Clean text content
 */
function extractText($: cheerio.CheerioAPI, element: any, excludeSelectors: string[] = defaultOptions.excludeSelectors!): string {
  if (!element) {
    return '';
  }
  
  // Get all text nodes and join them
  const $element = $(element).clone();
  
  // Only attempt to find and remove elements if we have exclusion selectors
  if (excludeSelectors && excludeSelectors.length > 0) {
    $element.find(excludeSelectors.join(', ')).remove();
  }
  
  // Extract and clean the text
  const text = $element.text().trim();

  // Clean up whitespace
  return text.replace(/\s+/g, ' ');
}

/**
 * Format headings and lists from HTML
 * 
 * @param $ - Cheerio instance loaded with HTML
 * @param selector - CSS selector for the content
 * @returns Formatted text
 */
function formatStructuredContent($: cheerio.CheerioAPI, selector: string): string {
  if (!$ || !selector) {
    return '';
  }
  
  const content: string[] = [];
  const selectedElements = $(selector);
  
  if (selectedElements.length === 0) {
    return '';
  }
  
  try {
    // Process headings
    selectedElements.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
      if (el && el.name && typeof el.name === 'string') {
        const level = el.name.charAt(1);
        const text = $(el).text().trim();
        if (text) {
          // Add heading level indicators
          const prefix = '#'.repeat(parseInt(level) || 1);
          content.push(`${prefix} ${text}`);
        }
      }
    });
    
    // Process lists
    selectedElements.find('ul, ol').each((_, list) => {
      $(list).find('li').each((i, item) => {
        const text = $(item).text().trim();
        if (text) {
          // Format as bullet points
          content.push(`• ${text}`);
        }
      });
    });
    
    // Process paragraphs
    selectedElements.find('p').each((_, p) => {
      const text = $(p).text().trim();
      if (text) {
        content.push(text);
      }
    });
    
    // If no structured content was found, extract all text
    if (content.length === 0) {
      const text = selectedElements.text().trim().replace(/\s+/g, ' ');
      if (text) {
        content.push(text);
      }
    }
  } catch (err) {
    console.error('Error formatting structure:', err);
    // Fallback: just get the text
    const text = selectedElements.text().trim().replace(/\s+/g, ' ');
    if (text) {
      content.push(text);
    }
  }
  
  return content.join('\n\n');
}

/**
 * Extract useful knowledge from a webpage
 * 
 * @param url - URL of the website to scrape
 * @param options - Scraping options
 * @returns Extracted knowledge as text
 */
export async function scrapeWebsite(
  url: string,
  options: ScrapingOptions = {}
): Promise<string> {
  // Merge default options with provided options
  // We need to ensure arrays are properly merged
  const opts = { 
    maxLength: options.maxLength || defaultOptions.maxLength,
    contentSelectors: options.contentSelectors || defaultOptions.contentSelectors,
    excludeSelectors: options.excludeSelectors || defaultOptions.excludeSelectors
  };
  
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Fetch the webpage content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBot/1.0; +https://jeskochatbot.com)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    // Load HTML into cheerio
    const $ = cheerio.load(response.data);
    
    // Extract the page title
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Initialize result
    let result = `Website: ${url}\nTitle: ${title}\n`;
    if (metaDescription) {
      result += `Description: ${metaDescription}\n`;
    }
    result += '\n--- CONTENT ---\n\n';
    
    // Extract content from prioritized selectors
    let mainContent = '';
    
    // Try to find main content using specified selectors
    for (const selector of opts.contentSelectors!) {
      const elements = $(selector);
      if (elements.length > 0) {
        // Format content with structure preserved
        const formattedContent = formatStructuredContent($, selector);
        if (formattedContent.length > 100) { // Only use if meaningful content found
          mainContent += formattedContent + '\n\n';
        }
      }
    }
    
    // If no content found using selectors, extract body content
    if (!mainContent) {
      // Fall back to body content with exclusions
      const bodyContent = extractText($, $('body')[0]);
      mainContent = bodyContent;
    }
    
    // Limit the content length
    if (mainContent.length > opts.maxLength!) {
      mainContent = mainContent.substring(0, opts.maxLength!) + 
        '\n[Content truncated due to length limitations]';
    }
    
    result += mainContent;
    
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to scrape website: ${error.message}, status: ${error.response?.status}`);
    }
    throw new Error(`Failed to scrape website: ${(error as Error).message}`);
  }
}