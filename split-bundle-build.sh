#!/bin/bash

# Split Bundle Build Script
# This script splits the build process into separate chunks to avoid memory issues

echo "📦 Starting split bundle build process..."

# Set maximum memory allocation for Node
export NODE_OPTIONS="--max-old-space-size=6144"

# Create temporary split directories
mkdir -p temp_build/{client,server,static}

# Step 1: Build the client code in chunks
echo "🔨 Building client chunks..."

# Main app code
echo "  ↳ Building main app code..."
CHUNK_TARGET="app" npx esbuild client/src/App.tsx client/src/main.tsx --bundle --format=esm --outdir=temp_build/client --minify --splitting --target=es2020 --platform=browser

# Handle API/services code separately
echo "  ↳ Building API/services code..."
CHUNK_TARGET="api" npx esbuild client/src/lib/*.ts --bundle --format=esm --outdir=temp_build/client/lib --minify --target=es2020 --platform=browser

# Handle components separately
echo "  ↳ Building components code..."
CHUNK_TARGET="components" npx esbuild client/src/components/*.tsx --bundle --format=esm --outdir=temp_build/client/components --minify --target=es2020 --platform=browser

# Step 2: Build the server code separately
echo "🔨 Building server code..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=temp_build/server --minify

# Step 3: Copy static assets
echo "📂 Copying static assets..."
cp -r public/* temp_build/static/ 2>/dev/null || true

# Step 4: Combine everything into the final build
echo "🔄 Combining chunks into final build..."
mkdir -p dist/{client,server}
cp -r temp_build/client/* dist/client/ 2>/dev/null || true
cp -r temp_build/server/* dist/server/ 2>/dev/null || true
cp -r temp_build/static/* dist/client/ 2>/dev/null || true

# Step 5: Clean up temporary directory
echo "🧹 Cleaning up temporary files..."
rm -rf temp_build

echo "✅ Split bundle build completed successfully!"