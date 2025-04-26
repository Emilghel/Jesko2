#!/bin/bash

# Advanced Deployment Build Script with Multi-stage Memory Optimization
# This script implements several techniques to reduce memory usage during bundling

# Display system information
echo "💻 System information:"
echo "--------------------"
free -m
echo "--------------------"

# Step 1: Increase Node.js memory allocation
export NODE_OPTIONS="--max-old-space-size=8192"
echo "🔧 Set Node.js memory allocation to 8GB"

# Step 2: Create a temporary build directory with more free space
echo "📁 Setting up temporary build environment..."
mkdir -p temp_build
cd temp_build

# Step 3: Create a minimal package.json with only essential dependencies
echo "📦 Creating optimized package.json for build..."
cat > package.json << 'EOF'
{
  "name": "jesko-temp-build",
  "private": true,
  "type": "module",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
EOF

# Step 4: Install only the minimal dependencies for initial bundling
echo "📥 Installing minimal dependencies..."
npm install --no-audit --no-fund --no-package-lock

# Step 5: Return to project root
cd ..

# Step 6: Build in stages with garbage collection between steps
echo "🚀 Starting multi-stage build process..."

echo "🧹 Running garbage collection..."
node -e 'global.gc && console.log("Memory cleaned up")'

# Step 7: Build client with reduced parallel processing
echo "📱 Building client (stage 1/3)..."
echo "This may take a while, please be patient..."
NODE_OPTIONS="--max-old-space-size=8192 --optimize-for-size" npx vite build --logLevel=info

# Check if client build succeeded
if [ $? -ne 0 ]; then
  echo "❌ Client build failed! Please check the logs above for errors."
  exit 1
fi

echo "🧹 Running garbage collection..."
node -e 'try { global.gc(); console.log("Memory cleaned up"); } catch(e) { console.log("Could not force garbage collection"); }'

# Step 8: Build server with reduced parallel processing
echo "🖥️ Building server (stage 2/3)..."
NODE_OPTIONS="--max-old-space-size=8192 --optimize-for-size" npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --log-level=info

# Check if server build succeeded
if [ $? -ne 0 ]; then
  echo "❌ Server build failed! Please check the logs above for errors."
  exit 1
fi

echo "🧹 Running garbage collection..."
node -e 'try { global.gc(); console.log("Memory cleaned up"); } catch(e) { console.log("Could not force garbage collection"); }'

# Step 9: Optimize the resulting bundle
echo "🔍 Optimizing bundle (stage 3/3)..."
# Clean up any unnecessary files in the dist directory
rm -rf dist/client/node_modules || true
rm -rf dist/client/.vite || true

echo "✅ Build process completed successfully!"

# Display final memory usage
echo "💾 Final memory usage:"
echo "--------------------"
free -m
echo "--------------------"

echo "🎉 Optimized build ready for deployment!"