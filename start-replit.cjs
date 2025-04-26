/**
 * Replit Startup Script (CommonJS version)
 * 
 * This script ensures that the application starts correctly in the Replit environment
 * by setting the appropriate environment variables and running the correct command.
 */

// Set required environment variables for Replit
process.env.PORT = '5000';
process.env.REPLIT = 'true';

// Print confirmation
console.log('Starting application in Replit environment');
console.log('PORT set to:', process.env.PORT);
console.log('Setting trust proxy to handle X-Forwarded-For headers correctly');

// Execute the main application using child_process
const { spawn } = require('child_process');
const child = spawn('tsx', ['server/index.ts'], { 
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: '5000',
    REPLIT: 'true'
  }
});

// Handle process events
child.on('error', (err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

// Forward signals to child process
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

console.log('Application startup delegated to tsx server/index.ts');