/**
 * Replit Port Compatibility Module
 * 
 * This module ensures that the application correctly binds to port 5000,
 * which is the expected port for Replit deployments.
 * 
 * In Replit, external traffic is automatically forwarded from port 443 (HTTPS)
 * to port 5000 internally, so we need to make sure our application listens on port 5000.
 */

const isReplitEnv = process.env.REPL_ID || process.env.REPL_SLUG;

/**
 * Sets up port configuration compatible with Replit
 */
function setupPortProxy() {
  // Always use port 5000 in Replit environment
  if (isReplitEnv) {
    console.log('Replit environment detected, using port 5000');
    process.env.PORT = '5000';
    
    // Also set up trust proxy to handle X-Forwarded-For headers correctly
    return {
      port: 5000,
      trustProxy: true
    };
  }
  
  // Set Replit environment even when no REPL_ID is found
  // This is useful for Replit environments that don't set REPL_ID
  if (process.env.REPLIT) {
    console.log('Alternative Replit environment detected (REPLIT env var), using port 5000');
    process.env.PORT = '5000';
    
    return {
      port: 5000,
      trustProxy: true
    };
  }
  
  // For non-Replit environments, use the PORT env var or default to 3000
  console.log('Standard environment detected, using port from environment variable or default');
  return {
    port: process.env.PORT || 3000,
    trustProxy: false
  };
}

// Add a utility function to check if we're in a Replit environment
function isReplitEnvironment() {
  return !!isReplitEnv;
}

module.exports = {
  setupPortProxy,
  isReplitEnvironment
};