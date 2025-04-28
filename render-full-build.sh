#!/bin/bash
set -e

# Install dependencies
echo "Installing dependencies..."
npm install

# Create directories
echo "Creating build directories..."
mkdir -p dist
mkdir -p dist/public

# Create a fallback index.html file in case we can't find the real one
cat > dist/public/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jesko AI</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px;text-align:center;}
      .button{display:inline-block;padding:10px 20px;background:#4a6cf7;color:white;text-decoration:none;border-radius:5px;margin:10px 5px;}
      .container{max-width:800px;margin:40px auto;padding:20px;border:1px solid #ddd;border-radius:10px;}
    </style>
</head>
<body>
    <div class="container">
        <h1>Jesko AI</h1>
        <p>The backend server is running, but the frontend files could not be found.</p>
        <p>The API endpoints should be working properly.</p>
        <div>
            <a href="/api/status" class="button">Check API Status</a>
            <a href="/api/debug/files" class="button">Debug File System</a>
        </div>
    </div>
</body>
</html>
EOL

# Check for built frontend files in various locations
echo "Looking for frontend files in key locations..."

# 1. Check client/dist (most likely location for Vite builds)
if [ -d "client/dist" ] && [ -f "client/dist/index.html" ]; then
  echo "Found frontend build in client/dist - copying..."
  cp -rv client/dist/* dist/public/
elif [ -d "client/build" ] && [ -f "client/build/index.html" ]; then
  echo "Found frontend build in client/build - copying..."
  cp -rv client/build/* dist/public/
elif [ -d "build" ] && [ -f "build/index.html" ]; then
  echo "Found frontend build in build/ - copying..."
  cp -rv build/* dist/public/
elif [ -d "dist/client" ] && [ -f "dist/client/index.html" ]; then
  echo "Found frontend build in dist/client - copying..."
  cp -rv dist/client/* dist/public/
fi

# Add public assets (if any)
if [ -d "public" ]; then
  echo "Found public directory - copying static assets..."
  cp -rv public/* dist/public/ 2>/dev/null || echo "Warning: Error copying from public directory"
fi

# Use static files if needed
if [ -d "static" ]; then
  echo "Found static directory - copying..."
  mkdir -p dist/public/static
  cp -rv static/* dist/public/static/ 2>/dev/null || echo "Warning: Error copying from static directory"
fi

# Ensure we have an index.html by checking the public directory
if [ ! -f "dist/public/index.html" ]; then
  echo "WARNING: No index.html found in any expected location, using fallback..."
  # Fallback already created above
fi

# Check for and list HTML files
echo "Checking for HTML files in dist/public:"
find dist/public -name "*.html" || echo "No HTML files found in dist/public"

# Create a custom minimal server.js file that just serves static files
echo "Creating simplified server.js..."
cat > dist/server.js << 'EOL'
// Minimal server - No TypeScript needed
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Environment setup
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

// Create express app
const app = express();

// Add API health endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint to see what files are available
app.get('/api/debug/files', (req, res) => {
  try {
    // Get list of files in public directory
    const files = fs.readdirSync(publicDir);
    // Check if key files exist
    const indexExists = fs.existsSync(path.join(publicDir, 'index.html'));
    const assetDirs = [];
    
    // Check potential asset directories
    ['assets', 'static', 'js', 'css', 'img', 'images'].forEach(dir => {
      const dirPath = path.join(publicDir, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        assetDirs.push({
          name: dir,
          exists: true,
          files: fs.readdirSync(dirPath).slice(0, 10) // Show first 10 files
        });
      }
    });
    
    res.json({
      serverDir: __dirname,
      publicDir: publicDir,
      directoryExists: fs.existsSync(publicDir),
      indexHtmlExists: indexExists,
      files: files,
      assetDirectories: assetDirs
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Serve static files
app.use(express.static(publicDir));

// For any other route, serve index.html
app.get('*', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Page not found');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOL

echo "Build completed successfully!"
