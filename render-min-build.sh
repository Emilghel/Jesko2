#!/bin/bash
# ======================================================
# Minimal Render Build Script
# 
# This script creates a minimal version of the app that
# can function without database access and within Render's
# memory constraints.
# ======================================================

set -e  # Exit on any error

echo "=== Starting Minimal Render Build ==="

# Create necessary directories
echo "Creating build directories..."
mkdir -p dist
mkdir -p dist/public
mkdir -p dist/public/assets
mkdir -p dist/public/static

# Create a minimal frontend with diagnostic tools
echo "Creating minimal frontend..."
cat > dist/public/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jesko AI - API Online</title>
  <style>
    :root {
      --primary: #4361ee;
      --primary-foreground: white;
      --muted: #f3f4f6;
      --muted-foreground: #6b7280;
      --background: white;
      --foreground: #1f2937;
      --border: #e5e7eb;
      --success: #10b981;
      --success-foreground: white;
      --warning: #f59e0b;
      --warning-foreground: white;
      --error: #ef4444;
      --error-foreground: white;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
                  "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: var(--foreground);
      background: var(--background);
      padding: 0;
      margin: 0;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .logo {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .subtitle {
      font-size: 1.25rem;
      color: var(--muted-foreground);
    }

    .status-badge {
      display: inline-block;
      background: var(--success);
      color: var(--success-foreground);
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-weight: 500;
      margin: 1rem 0;
    }

    .status-badge.warning {
      background: var(--warning);
      color: var(--warning-foreground);
    }

    .status-badge.error {
      background: var(--error);
      color: var(--error-foreground);
    }

    .panel {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .panel-header {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .button {
      display: inline-block;
      background: var(--primary);
      color: var(--primary-foreground);
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      border: none;
      font-size: 0.875rem;
      line-height: 1.5;
      transition: background-color 0.2s;
    }

    .button:hover {
      background: color-mix(in srgb, var(--primary) 80%, black);
    }

    .button-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .text-center {
      text-align: center;
    }

    .endpoint-list {
      background: var(--muted);
      padding: 1rem;
      border-radius: 0.375rem;
      margin: 1rem 0;
      overflow-x: auto;
    }

    .endpoint-list code {
      font-family: monospace;
      font-size: 0.875rem;
    }

    .status-item {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .status-icon {
      width: 1.25rem;
      height: 1.25rem;
      margin-right: 0.5rem;
      border-radius: 9999px;
    }

    .status-icon.success {
      background-color: var(--success);
    }

    .status-icon.warning {
      background-color: var(--warning);
    }

    .status-icon.error {
      background-color: var(--error);
    }

    pre {
      background: var(--muted);
      padding: 1rem;
      border-radius: 0.375rem;
      overflow-x: auto;
      font-size: 0.875rem;
      margin: 1rem 0;
    }

    @media (max-width: 640px) {
      .button-group {
        flex-direction: column;
      }
      .button {
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">Jesko AI</div>
      <div class="subtitle">API Server Online</div>
      <div class="status-badge">API v1.5.0</div>
    </header>

    <div class="panel">
      <div class="panel-header">Deployment Status</div>
      <div class="status-item">
        <div class="status-icon success"></div>
        <div>API Server: <strong>Online</strong></div>
      </div>
      <div class="status-item">
        <div class="status-icon success"></div>
        <div>Static Files: <strong>Available</strong></div>
      </div>
      <div class="status-item" id="database-status-item">
        <div class="status-icon error"></div>
        <div>Database: <strong>Not Connected</strong></div>
      </div>
      <div class="status-item">
        <div class="status-icon warning"></div>
        <div>Full Frontend: <strong>Not Available</strong></div>
      </div>

      <div class="button-group">
        <a href="/api/status" class="button">Check API Status</a>
        <a href="/api/database-status" class="button">Check Database</a>
        <a href="/debug-index-location" class="button">Debug File Locations</a>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">Available API Endpoints</div>
      <p>The following endpoints are available for testing:</p>
      <div class="endpoint-list">
        <code>GET /api/status</code> - Server status and version<br>
        <code>GET /api/database-status</code> - Database connection test<br>
        <code>POST /api/login</code> - User authentication<br>
        <code>POST /api/register</code> - New user registration<br>
        <code>GET /api/partner/*</code> - Partner dashboard endpoints<br>
        <code>GET /api/admin/*</code> - Admin dashboard endpoints
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">Next Steps</div>
      <p>To complete the deployment:</p>
      <ol>
        <li>Set up a PostgreSQL database on Render</li>
        <li>Configure the DATABASE_URL environment variable</li>
        <li>Build the frontend locally and upload to Render</li>
        <li>Redeploy the application</li>
      </ol>
      <p class="text-center" style="margin-top: 1rem">
        <a href="https://github.com/Emilghel/Jesko2/blob/deployment-new/RENDER_DEPLOYMENT_SUMMARY.md" class="button">View Full Deployment Guide</a>
      </p>
    </div>

    <div class="panel" id="database-test-panel">
      <div class="panel-header">Database Connection Test</div>
      <p>Click the button below to test the database connection:</p>
      <div class="button-group">
        <button onclick="testDatabaseConnection()" class="button">Test Database Connection</button>
      </div>
      <div id="database-result"></div>
    </div>
  </div>

  <script>
    async function testDatabaseConnection() {
      const resultElement = document.getElementById('database-result');
      const statusItem = document.getElementById('database-status-item');
      
      resultElement.innerHTML = '<pre>Testing database connection...</pre>';
      
      try {
        const response = await fetch('/api/database-status');
        const data = await response.json();
        
        if (data.status === 'connected') {
          resultElement.innerHTML = `<pre class="success">${JSON.stringify(data, null, 2)}</pre>`;
          statusItem.innerHTML = `
            <div class="status-icon success"></div>
            <div>Database: <strong>Connected</strong></div>
          `;
        } else {
          resultElement.innerHTML = `<pre class="warning">${JSON.stringify(data, null, 2)}</pre>`;
          statusItem.innerHTML = `
            <div class="status-icon error"></div>
            <div>Database: <strong>Connection Failed</strong></div>
          `;
        }
      } catch (error) {
        resultElement.innerHTML = `<pre class="error">Error: ${error.message}</pre>`;
        statusItem.innerHTML = `
          <div class="status-icon error"></div>
          <div>Database: <strong>Error</strong></div>
        `;
      }
    }

    // Automatically test database connection on page load
    window.onload = testDatabaseConnection;
  </script>
</body>
</html>
EOL

# Create a minimal database check page
echo "Creating database check page..."
cat > dist/public/database-check.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Check - Jesko AI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #4361ee;
      border-bottom: 1px solid #eee;
    }
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .success {
      background-color: #d4edda;
      border-color: #c3e6cb;
    }
    .warning {
      background-color: #fff3cd;
      border-color: #ffeeba;
    }
    .error {
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }
    button {
      background-color: #4361ee;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #3249c9;
    }
    pre {
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>Database Connection Check</h1>
  
  <div class="card" id="db-status">
    <h2>Database Status</h2>
    <p>Checking database connection...</p>
    <button onclick="checkDatabaseStatus()">Check Again</button>
    <div id="db-result"></div>
  </div>
  
  <div class="card">
    <h2>Database URL Format</h2>
    <p>The DATABASE_URL environment variable should be in this format:</p>
    <pre>postgres://username:password@hostname:port/database_name</pre>
    <p>Make sure this environment variable is correctly set in your Render dashboard.</p>
  </div>
  
  <div class="card">
    <h2>Next Steps</h2>
    <ol>
      <li>Create a PostgreSQL database in Render</li>
      <li>Set the DATABASE_URL environment variable in your web service</li>
      <li>Redeploy your application</li>
      <li>Return to this page and check the connection again</li>
    </ol>
  </div>

  <script>
    async function checkDatabaseStatus() {
      const dbResult = document.getElementById('db-result');
      dbResult.innerHTML = '<p>Checking...</p>';
      
      try {
        const response = await fetch('/api/database-status');
        const data = await response.json();
        
        if (data.status === 'connected') {
          dbResult.innerHTML = `
            <p class="success">Database connected! ✅</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `;
        } else {
          dbResult.innerHTML = `
            <p class="warning">Database issue: ${data.message} ⚠️</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `;
        }
      } catch (error) {
        dbResult.innerHTML = `
          <p class="error">Failed to check database ❌</p>
          <pre>${error.message}</pre>
        `;
      }
    }
    
    // Run check on page load
    window.onload = checkDatabaseStatus;
  </script>
</body>
</html>
EOL

# Build backend (using production-server.ts instead of index.ts to avoid Vite dependencies)
echo "Building backend using production server..."
npx esbuild server/production-server.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

# Make sure static assets are copied
echo "Copying static assets..."
if [ -d "public" ]; then
  cp -r public/* dist/public/
fi

echo "=== Minimal Render Build Completed Successfully ==="
echo "Use NODE_ENV=production node dist/index.js to start the server"