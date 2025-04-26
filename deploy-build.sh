#!/bin/bash
set -e

# Install dependencies
echo "Installing dependencies..."
npm install

# Create directories 
echo "Creating build directories..."
mkdir -p dist
mkdir -p dist/public

# Copy pre-built frontend files from GitHub
echo "Copying pre-built frontend files..."
cp -r client/dist/* dist/public/

# Build backend (using production-server.ts instead of index.ts to avoid Vite dependencies)
echo "Building backend using production server..."
npx esbuild server/production-server.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

echo "Build completed successfully!"