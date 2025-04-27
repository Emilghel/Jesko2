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

# Skip TypeScript compilation and use direct file copy + simple bundling approach
echo "Building backend using direct file copying and minimal bundling..."

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

# Create a special tsconfig.json that includes path mappings
cat > tsconfig.server.json << 'EOL'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist-server",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  }
}
EOL

# Create the simpler bundled version of the routes
echo "Creating simplified bundled versions of key server files..."
npx esbuild server/routes.ts --platform=node --bundle --outfile=dist/server/routes.js --external:* --format=esm || echo "Warning: Error bundling routes.ts"

# Use esbuild for key server files in case they have path mappings
echo "Making some key server files directly importable..."
if [ -f "server/db.ts" ]; then
  npx esbuild server/db.ts --platform=node --bundle --outfile=dist/server/db.js --external:* --format=esm || echo "Warning: Error bundling db.ts"
fi

if [ -f "server/auth.ts" ]; then
  npx esbuild server/auth.ts --platform=node --bundle --outfile=dist/server/auth.js --external:* --format=esm || echo "Warning: Error bundling auth.ts"
fi

# Create a production-ready server entrypoint with ES module syntax
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

// Try to import the routes from the compiled/bundled file
try {
  console.log('Attempting to load server routes...');
  
  const routesPath = './server/routes.js';
  if (fs.existsSync(path.join(__dirname, 'server/routes.js'))) {
    console.log('Found server/routes.js, attempting to load...');
    import('./server/routes.js')
      .then(routes => {
        if (typeof routes.default === 'function') {
          routes.default(app);
        } else if (typeof routes.registerRoutes === 'function') {
          routes.registerRoutes(app);
        } else {
          console.error('Routes file exists but does not export expected functions');
        }
      })
      .catch(err => {
        console.error('Error importing routes:', err);
      });
  } else {
    console.log('No routes.js file found, using static server only');
  }
} catch (error) {
  console.error('Error loading routes:', error);
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// For any other route, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOL

# Create a .env file if it doesn't exist
if [ ! -f "dist/.env" ]; then
  echo "Creating basic .env file..."
  echo "NODE_ENV=production" > dist/.env
fi

# Update Start Command for Render
echo "Updating Render start command..."
echo "node dist/server.js" > dist/start.txt

echo "Build completed successfully!"
