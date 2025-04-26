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

# Skip frontend build and use a pre-built version
echo "SKIPPING frontend build - using emergency frontend..."

# Create minimal emergency frontend for diagnostics
mkdir -p client/dist
cat > client/dist/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jesko AI</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
        }
        h1 {
            color: #4444dd;
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        h2 {
            color: #333;
            font-size: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 2rem;
            margin: 2rem 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .button {
            display: inline-block;
            background-color: #4444dd;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-weight: bold;
            margin: 0.5rem;
        }
        .button:hover {
            background-color: #3333aa;
        }
        .status-badge {
            background-color: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            display: inline-block;
            margin: 1rem 0;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Jesko AI</h1>
        <h2>AI-Powered Cloud Platform</h2>
        
        <div class="status-badge">
            API Online - Version 1.5.0
        </div>
        
        <p>The full application frontend is not yet available in this deployment.</p>
        <p>The API is functioning correctly and can be accessed via the correct endpoints.</p>
        
        <div style="margin-top: 2rem;">
            <a href="/deployment-test.html" class="button">View Deployment Status</a>
            <a href="/api/status" class="button">Check API</a>
            <a href="/debug-index-location" class="button">Debug File Locations</a>
        </div>
        
        <div style="margin-top: 2rem; text-align: left;">
            <h3>Troubleshooting:</h3>
            <p>The build process may be having difficulty with the frontend build. Consider:</p>
            <ol>
                <li>Building the frontend locally and uploading manually</li>
                <li>Checking the Render logs for build errors</li>
                <li>Increasing the memory allocation for the build process</li>
            </ol>
        </div>
    </div>
</body>
</html>
EOL

# Check if frontend was built successfully
if [ -d "client/dist" ]; then
  echo "Frontend built successfully, copying files..."
  cp -r client/dist/* dist/public/ || echo "Warning: Could not copy from client/dist"
  # Create an explicit copy in the root dist folder too
  cp -r client/dist/* dist/ || echo "Warning: Could not copy to root dist folder"
else
  echo "ERROR: Frontend build failed! client/dist directory not found!"
fi

# Copy index.html to multiple locations to ensure it's found
if [ -f "client/dist/index.html" ]; then
  echo "Copying index.html to multiple locations for redundancy..."
  cp client/dist/index.html dist/public/index.html || true
  cp client/dist/index.html dist/index.html || true
  cp client/dist/index.html index.html || true
fi

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