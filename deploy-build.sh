#!/bin/bash
set -e

# Install dependencies
echo "Installing dependencies..."
npm install

# Ensure vite is installed locally and available
echo "Installing Vite locally..."
npm install --no-save vite @vitejs/plugin-react

# Create directories
echo "Creating build directories..."
mkdir -p dist
mkdir -p dist/public

# Pre-compile a basic client build for API-only server
echo "Creating a basic index.html for the API server..."
cat > dist/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jesko AI API Server</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 { color: #2563eb; margin-bottom: 32px; }
        .card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background: #fff;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .status { font-weight: bold; color: #10b981; }
        .endpoints { margin-top: 20px; }
        code {
            background: #f1f5f9;
            padding: 2px 4px;
            border-radius: 4px;
            font-family: monospace;
        }
        .message {
            margin-top: 12px;
            font-style: italic;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <h1>Jesko AI Platform</h1>
    
    <div class="card">
        <h2>Server Status</h2>
        <p>Status: <span class="status">Online</span></p>
        <p>Deploy Time: <script>document.write(new Date().toLocaleString())</script></p>
        
        <div class="endpoints">
            <h3>API Endpoints</h3>
            <ul>
                <li><code>/api/status</code> - Check API status</li>
                <li><code>/api/stats/member-count</code> - Get member count</li>
                <li><code>/health</code> - Health check endpoint</li>
            </ul>
        </div>
        
        <div class="message">
            Note: This is the API server. The full frontend application will be deployed separately.
        </div>
    </div>
</body>
</html>
EOF

# Skip Vite build for now and just build the server
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Copy frontend assets
echo "Copying assets..."
cp -r client/dist/* dist/public/ || echo "Warning: No client build files found to copy"

echo "Build completed successfully!"