#!/bin/bash
set -e

# Install dependencies
echo "Installing dependencies..."
npm install

# Create directories 
echo "Creating build directories..."
mkdir -p dist
mkdir -p dist/public

# Create more robust copy process for static assets
echo "Setting up static file directories..."
mkdir -p dist/public
mkdir -p dist/public/static
mkdir -p dist/public/temp

# Instead of using emergency frontend, use the existing frontend files
echo "Using existing frontend files instead of emergency frontend..."

# Check if client/dist exists and use it
if [ -d "client/dist" ]; then
  echo "Found client/dist directory, using it for frontend..."
  cp -r client/dist/* dist/public/ || echo "Warning: Could not copy from client/dist"
  # Create an explicit copy in the root dist folder too
  cp -r client/dist/* dist/ || echo "Warning: Could not copy to root dist folder"
elif [ -d "dist/public" ]; then
  echo "Using existing dist/public directory for frontend..."
else
  echo "WARNING: No frontend files found! Creating minimal placeholder..."
  # Create a very minimal placeholder
  cat > dist/public/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jesko AI</title>
    <style>body{font-family:Arial,sans-serif;margin:40px;text-align:center;}</style>
</head>
<body>
    <h1>Jesko AI</h1>
    <p>The application is online, but the frontend files were not found.</p>
    <p>API endpoints are working. Check /api/status for more information.</p>
</body>
</html>
EOL
fi

# Copy index.html to multiple locations to ensure it's found
echo "Copying index.html to multiple locations for redundancy..."
find dist -name "index.html" -exec cp {} dist/index.html \; 2>/dev/null || true
find dist -name "index.html" -exec cp {} index.html \; 2>/dev/null || true

# Copy additional static assets from various locations
echo "Copying additional static assets..."

# Copy from public directory
if [ -d "public" ]; then
  echo "Copying from public directory..."
  cp -r public/* dist/public/ 2>/dev/null || echo "Warning: Error copying from public directory"
fi

# Copy from static directory
if [ -d "static" ]; then
  echo "Copying from static directory..."
  cp -r static/* dist/public/static/ 2>/dev/null || echo "Warning: Error copying from static directory"
fi

# Copy individual important files
echo "Copying specific important files..."

# Copy bubble.gif (important for chat UI)
find . -name "bubble.gif" -exec cp {} dist/public/static/bubble.gif \; 2>/dev/null || echo "Warning: bubble.gif not found"

# List created directories for verification
echo "Static file directories after setup:"
ls -la dist/
ls -la dist/public/ || echo "Warning: dist/public directory not created properly"

# Build backend (using production-server.ts instead of index.ts to avoid Vite dependencies)
echo "Building backend using production server..."
npx esbuild server/production-server.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

echo "Build completed successfully!"
