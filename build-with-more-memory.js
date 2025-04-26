#!/usr/bin/env node

/**
 * Enhanced Build Script
 * 
 * This script runs the build process with increased memory allocation
 * to prevent "out of memory" errors during bundling.
 */

import { execSync } from 'child_process';

// Set higher memory limit for Node process
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

console.log('🔧 Starting enhanced build process with increased memory (4GB)...');

try {
  // First build the client
  console.log('📦 Building client...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Then build the server
  console.log('📦 Building server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 
    { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}