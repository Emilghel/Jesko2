#!/bin/bash

echo "Starting Replit build process..."

# Set NODE_OPTIONS to increase memory limit for Node.js
export NODE_OPTIONS=--max_old_space_size=4096

# Create required directories
mkdir -p client/dist
mkdir -p dist
mkdir -p static
mkdir -p temp
mkdir -p uploads

# Copy index.html to the root for Vite build
echo "Copying index.html..."
cp index.html client/

# Copy static assets
echo "Copying static assets..."
cp -r attached_assets/* static/ 2>/dev/null || echo "No assets copied"

# Build the frontend only first
echo "Building frontend..."
npx vite build

# Copy the server files to dist directly without bundling with esbuild
echo "Copying server files..."
mkdir -p dist/server
cp -r server/* dist/server/

# Copy any needed files
echo "Copying additional files..."
cp package.json dist/
cp start-render.sh dist/
cp index.html dist/

echo "Build completed for Replit deployment!"