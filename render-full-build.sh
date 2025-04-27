#!/bin/bash
set -e

# Install dependencies
echo "Installing dependencies..."
npm install

# Create directories 
echo "Creating build directories..."
mkdir -p dist
mkdir -p dist/public

# Instead of using emergency frontend, use the existing frontend files
echo "Using existing frontend files..."

# Create a minimal placeholder as fallback if no frontend files are found
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
    <p>The application is online.</p>
    <p>API endpoints should be working. Check /api/status for more information.</p>
</body>
</html>
EOL

# Copy from multiple potential frontend sources to ensure we have the files
if [ -d "client/dist" ]; then
  echo "Found client/dist directory, copying..."
  cp -r client/dist/* dist/public/ || echo "Warning: Could not copy from client/dist"
fi

if [ -d "public" ]; then
  echo "Found public directory, copying..."
  cp -r public/* dist/public/ || echo "Warning: Could not copy from public directory"
fi

if [ -d "static" ]; then
  echo "Found static directory, copying..."
  mkdir -p dist/public/static
  cp -r static/* dist/public/static/ || echo "Warning: Could not copy from static directory"
fi

# Copy individual important files with verbose output
echo "Copying specific important files..."
mkdir -p dist/public/static
find . -name "bubble.gif" -exec cp -v {} dist/public/static/bubble.gif \; 2>/dev/null || echo "Warning: bubble.gif not found"
find . -name "*.css" -exec cp -v {} dist/public/ \; 2>/dev/null || echo "No CSS files found"
find . -name "*.js" -type f -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/server/*" -exec cp -v {} dist/public/ \; 2>/dev/null || echo "No JS files found"

# Make sure index.html exists in multiple locations for redundancy
echo "Ensuring index.html exists in all necessary locations..."
cp -v dist/public/index.html dist/index.html || echo "Warning: Could not copy index.html to dist/"

# List created directories and files for verification
echo "Checking frontend files:"
ls -la dist/ || echo "Warning: dist directory not created properly"
ls -la dist/public/ || echo "Warning: dist/public directory not created properly"
ls -la dist/public/static/ 2>/dev/null || echo "Warning: static directory not present"

# Find all HTML files to verify we have front-end content
echo "Checking for HTML files:"
find dist -name "*.html" | sort || echo "No HTML files found!"

# Create server directory structure
echo "Creating server directory structure..."
mkdir -p dist/server
mkdir -p dist/server/lib

# Copy all server files
echo "Copying server files..."
cp -r server/* dist/server/

# Copy shared directory if it exists
if [ -d "shared" ]; then
  echo "Copying shared directory..."
  mkdir -p dist/shared
  cp -r shared/* dist/shared/
fi

# Create a custom server entrypoint with extra debugging
cat > dist/server.js << 'EOL'
// Production server entrypoint
import { config } from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple express server for the frontend
const app = express();
const PORT = process.env.PORT || 3000;

// Add basic API health endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint to list directories
app.get('/api/debug/files', (req, res) => {
  try {
    const publicDir = path.join(__dirname, 'public');
    const files = fs.readdirSync(publicDir);
    
    const result = {
      currentDirectory: __dirname,
      publicDirectory: publicDir,
      publicDirectoryExists: fs.existsSync(publicDir),
      files: files,
      indexHtmlExists: fs.existsSync(path.join(publicDir, 'index.html'))
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Serve static files with verbose logging
app.use(express.static(path.join(__dirname, 'public')));
console.log('Static files directory:', path.join(__dirname, 'public'));

// For any other route, serve index.html
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  console.log('Attempting to serve:', indexPath);
  console.log('File exists:', fs.existsSync(indexPath));
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If index.html doesn't exist, send a basic HTML response
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Jesko AI</title></head>
        <body>
          <h1>Jesko AI</h1>
          <p>The index.html file could not be found at ${indexPath}</p>
          <p>You can check system status at <a href="/api/status">/api/status</a> 
            or file system details at <a href="/api/debug/files">/api/debug/files</a></p>
        </body>
      </html>
    `);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Current directory:', __dirname);
  console.log('Public directory:', path.join(__dirname, 'public'));
  console.log('Index.html exists:', fs.existsSync(path.join(__dirname, 'public', 'index.html')));
});
EOL

# Create a .env file if it doesn't exist
if [ ! -f "dist/.env" ]; then
  echo "Creating basic .env file..."
  echo "NODE_ENV=production" > dist/.env
fi

# Verify structure before upload
echo "Final structure overview:"
find dist -type f | sort | head -n 20
echo "... and more files"

echo "Build completed successfully!"
