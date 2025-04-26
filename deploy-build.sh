#!/bin/bash

# Enhanced Deployment Build Script
# This script handles the build process with increased memory allocation

# Display memory information before build
echo "💾 Memory before build:"
free -m

# Set Node options for increased memory
export NODE_OPTIONS="--max-old-space-size=4096"

echo "🔧 Starting build with increased memory allocation (4GB)..."

# Run the build commands
echo "📦 Building client..."
npx vite build

# Check if client build was successful
if [ $? -ne 0 ]; then
  echo "❌ Client build failed!"
  exit 1
fi

echo "📦 Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Check if server build was successful
if [ $? -ne 0 ]; then
  echo "❌ Server build failed!"
  exit 1
fi

# Display memory information after build
echo "💾 Memory after build:"
free -m

echo "✅ Build completed successfully!"