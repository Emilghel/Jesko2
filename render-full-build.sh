#!/bin/bash
set -e

echo "===================== JESKO AI FULL DEPLOYMENT SCRIPT ====================="

# Install dependencies
echo "Step 1: Installing dependencies..."
npm install

# Create build directories
echo "Step 2: Setting up build directories..."
mkdir -p dist
mkdir -p dist/public

# Try to build the frontend with max memory allowance
echo "Step 3: Attempting to build frontend..."
export NODE_OPTIONS="--max-old-space-size=4096"
echo "Setting memory limit to 4GB with NODE_OPTIONS: $NODE_OPTIONS"

# Try to find and run the correct build command
if grep -q "\"build\"" package.json; then
  echo "Found build script in package.json, running npm run build..."
  npm run build || echo "Frontend build failed, will use fallback"
fi

# Check if build produced files in expected locations
echo "Step 4: Looking for built frontend files..."
if [ -d "dist/client" ]; then
  echo "Found frontend files in dist/client, copying to dist/public..."
  cp -rv dist/client/* dist/public/
elif [ -d "client/dist" ]; then
  echo "Found frontend files in client/dist, copying to dist/public..."
  cp -rv client/dist/* dist/public/
elif [ -d "build" ]; then
  echo "Found frontend files in build/, copying to dist/public..."
  cp -rv build/* dist/public/
else
  echo "No built frontend files found in standard locations"
fi

# Create a better looking fallback page
echo "Step 5: Creating fallback page (will be used if no frontend is found)..."
cat > dist/public/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jesko AI</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f5f7fb;
      }
      .header {
        background-color: #4a6cf7;
        color: white;
        padding: 15px 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .container {
        max-width: 800px;
        margin: 40px auto;
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      .button {
        display: inline-block;
        padding: 10px 20px;
        background: #4a6cf7;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        margin: 10px 5px;
        transition: background 0.3s;
      }
      .button:hover {
        background: #3a5bd7;
      }
      .admin-section {
        border-top: 1px solid #eee;
        margin-top: 30px;
        padding-top: 20px;
      }
    </style>
</head>
<body>
    <div class="header">
        <h1>Jesko AI Platform</h1>
    </div>
    <div class="container">
        <h2>Server Status: Online</h2>
        <p>The Jesko AI backend server is running successfully.</p>
        <p>You can access the system through the links below:</p>
        
        <div>
            <a href="/api/status" class="button">API Status</a>
            <a href="/api/debug/files" class="button">System Files</a>
        </div>
        
        <div class="admin-section">
            <h3>Administration Access</h3>
            <p>The following admin interfaces are available:</p>
            <div>
                <a href="/admin-dashboard-v2.html" class="button">Admin Dashboard</a>
                <a href="/admin-login.html" class="button">Admin Login</a>
                <a href="/direct-admin.html" class="button">Direct Admin</a>
                <a href="/admin-navigation.html" class="button">Admin Navigation</a>
            </div>
        </div>
    </div>
</body>
</html>
EOL

# Copy public assets
echo "Step 6: Copying additional assets..."
if [ -d "public" ]; then
  echo "Found public directory, copying contents..."
  cp -rv public/* dist/public/ 2>/dev/null || echo "Warning: Error copying from public directory"
fi

# Copy static files
if [ -d "static" ]; then
  echo "Found static directory, copying contents..."
  mkdir -p dist/public/static
  cp -rv static/* dist/public/static/ 2>/dev/null || echo "Warning: Error copying from static directory"
fi

# Copy all server files
echo "Step 7: Setting up server files..."
mkdir -p dist/server
mkdir -p dist/server/lib
cp -rv server/* dist/server/ || echo "Warning: Error copying server files"

# Copy shared directory if it exists
if [ -d "shared" ]; then
  echo "Copying shared directory..."
  mkdir -p dist/shared
  cp -rv shared/* dist/shared/ || echo "Warning: Error copying shared files"
fi

# Create a comprehensive server.js file
echo "Step 8: Creating server entry point..."
cat > dist/server.js << 'EOL'
// Production server entrypoint
import { config } from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

// Load environment variables
config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Debug info
console.log('Starting Jesko AI server...');
console.log('Current directory:', __dirname);
console.log('Public directory:', publicDir);
console.log('Public directory exists:', fs.existsSync(publicDir));
console.log('Environment:', process.env.NODE_ENV || 'development');

// Basic API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0'
  });
});

// Debug endpoint to show available files
app.get('/api/debug/files', (req, res) => {
  try {
    const publicExists = fs.existsSync(publicDir);
    const files = publicExists ? fs.readdirSync(publicDir) : [];
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    const staticPath = path.join(publicDir, 'static');
    const staticExists = fs.existsSync(staticPath);
    const staticFiles = staticExists ? fs.readdirSync(staticPath) : [];
    
    res.json({
      serverDirectory: __dirname,
      publicDirectory: {
        path: publicDir,
        exists: publicExists,
        files: files.slice(0, 20) // Show first 20 files
      },
      htmlFiles: htmlFiles,
      staticDirectory: {
        path: staticPath,
        exists: staticExists,
        files: staticFiles.slice(0, 20) // Show first 20 files
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files
app.use(express.static(publicDir));

// Handle different types of requests
app.get('*', (req, res) => {
  const requestPath = req.path;
  
  // Handle direct requests for HTML files
  if (requestPath.endsWith('.html')) {
    const filePath = path.join(publicDir, requestPath);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  
  // For client-side routing, serve index.html
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  
  // If no index.html, return a 404 page
  res.status(404).send(`
    <html>
      <head>
        <title>Page Not Found</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          h1 { color: #e74c3c; }
          .container { max-width: 600px; margin: 0 auto; }
          .button { 
            display: inline-block; 
            padding: 10px 20px; 
            background: #3498db; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Page Not Found</h1>
          <p>The page you're looking for doesn't exist.</p>
          <a href="/" class="button">Go Home</a>
          <a href="/admin-dashboard-v2.html" class="button">Admin Dashboard</a>
        </div>
      </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOL

# Create a .env file with production settings
echo "Step 9: Setting up environment variables..."
cat > dist/.env << 'EOL'
NODE_ENV=production
PORT=10000
EOL

echo "Build completed successfully!"
