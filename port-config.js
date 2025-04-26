/**
 * Port Configuration for Replit
 * 
 * This script ensures that applications on Replit use port 5000,
 * which is the expected port for Replit deployments.
 * 
 * Add this to your package.json scripts:
 * "start": "node port-config.js && npm run dev"
 */

// Force PORT to 5000 in environment
process.env.PORT = 5000;

console.log('Port configured for Replit: Using port 5000');
console.log('Setting trust proxy to handle X-Forwarded-For headers correctly');

// Export for usage in other files
module.exports = {
  port: 5000,
  trustProxy: true
};