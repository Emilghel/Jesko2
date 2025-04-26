#!/bin/bash
set -e

# Install dependencies
echo "Installing dependencies..."
npm install

# Create directories
echo "Creating build directories..."
mkdir -p dist
mkdir -p dist/public

# Build frontend with simpler inline configuration (instead of using vite.config.ts)
echo "Building frontend..."
echo "import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'client/dist',
    emptyOutDir: true,
  },
});" > simple-vite.config.js

npx vite build --config simple-vite.config.js

# Build backend
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Copy frontend assets
echo "Copying assets..."
cp -r client/dist/* dist/public/ || echo "Warning: No client build files found to copy"

echo "Build completed successfully!"