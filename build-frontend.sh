#!/bin/bash
# Frontend build script for Render deployment

# Ensure script exits on error
set -e

# Display information about the current environment
echo "==== Environment Information ===="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"
echo "=============================="

# Create frontend build directories
echo "Creating frontend build directories..."
mkdir -p client/dist
mkdir -p dist/public

# Build the frontend with increased memory limit
echo "Building frontend with increased memory limit..."
NODE_OPTIONS="--max-old-space-size=3072" npx vite build

# Check if the build was successful
if [ ! -f "client/dist/index.html" ]; then
  echo "ERROR: Frontend build failed! index.html not found in client/dist"
  exit 1
else
  echo "Frontend build completed successfully!"
  echo "Files in client/dist:"
  ls -la client/dist
fi

# Copy frontend files to the distribution directory
echo "Copying frontend files to distribution directory..."
cp -r client/dist/* dist/public/

# Verify files were copied correctly
echo "Verifying files in distribution directory..."
if [ -f "dist/public/index.html" ]; then
  echo "Files copied successfully to dist/public!"
  ls -la dist/public
else
  echo "ERROR: Failed to copy files to dist/public!"
  exit 1
fi

echo "Frontend build and copy process completed!"