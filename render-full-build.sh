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

# Use TypeScript to properly compile the server files
echo "Compiling server files with TypeScript..."

# Create a proper tsconfig for the build
cat > tsconfig.server.json << 'EOL'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "esModuleInterop": true,
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": ".",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "server/**/*"
  ]
}
EOL

# Install TypeScript
echo "Installing TypeScript..."
npm install -g typescript

# Copy entire server directory to keep all imports intact
echo "Copying server directory..."
cp -r server dist/server

# Copy any shared files that might be needed
if [ -d "shared" ]; then
  echo "Copying shared directory..."
  cp -r shared dist/shared
fi

# Compile the TypeScript files
echo "Compiling TypeScript files..."
npx tsc -p tsconfig.server.json

# Create a production-ready server entrypoint
cat > dist/server.js << 'EOL'
// Production server entrypoint
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

// Check if server/index.js exists (compiled from TypeScript)
if (fs.existsSync(path.join(__dirname, 'server/index.js'))) {
  // If it exists, use it
  console.log('Using compiled server/index.js...');
  require('./server/index.js');
} else {
  // Fallback to basic static server
  console.log('Fallback to basic static server...');
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')));
  
  // For any other route, serve index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
  
  app.listen(PORT, () => {
    console.log(`Basic static server running on port ${PORT}`);
  });
}
EOL

# Update Start Command for Render
echo "Updating Render start command..."
echo "node dist/server.js" > dist/start.txt

echo "Build completed successfully!"
