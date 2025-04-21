/**
 * Register Admin Token for UI Integration
 * 
 * This script registers the admin token in the format expected by the UI,
 * allowing the admin panel tab to work correctly.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';

// Configure Neon to use the ws package for WebSockets
neonConfig.webSocketConstructor = ws;

async function registerTokenForUI() {
  try {
    console.log('Registering admin token for UI integration...');
    
    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Get admin user
    const { rows: adminUsers } = await pool.query(
      'SELECT id, email, username FROM users WHERE is_admin = true ORDER BY id ASC'
    );
    
    if (adminUsers.length === 0) {
      console.log('No admin users found');
      await pool.end();
      return;
    }
    
    const adminUser = adminUsers[0];
    console.log(`Found admin user: ${adminUser.username} (${adminUser.email}) with ID ${adminUser.id}`);
    
    // Get the latest token from database
    const { rows: tokens } = await pool.query(
      'SELECT token, expires_at FROM auth_tokens WHERE user_id = $1 ORDER BY expires_at DESC LIMIT 1',
      [adminUser.id]
    );
    
    if (tokens.length === 0) {
      console.log('No tokens found for admin user');
      console.log('Running fix-admin-token.js to create a new token...');
      
      // Spawn a child process to run fix-admin-token.js
      const { execSync } = require('child_process');
      execSync('node fix-admin-token.js', { stdio: 'inherit' });
      
      // Get the new token
      const { rows: newTokens } = await pool.query(
        'SELECT token, expires_at FROM auth_tokens WHERE user_id = $1 ORDER BY expires_at DESC LIMIT 1',
        [adminUser.id]
      );
      
      if (newTokens.length === 0) {
        console.log('Failed to create new token');
        await pool.end();
        return;
      }
      
      tokens[0] = newTokens[0];
    }
    
    const token = tokens[0].token;
    const expiresAt = new Date(tokens[0].expires_at);
    
    console.log(`Using token: ${token.substring(0, 10)}...`);
    console.log(`Token expires: ${expiresAt.toISOString()}`);
    
    // Call the restore tokens API to ensure the token is loaded into memory
    const apiResponse = await fetch('http://localhost:5000/api/admin/restore-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        adminId: adminUser.id,
        forceReload: true
      })
    });
    
    if (apiResponse.ok) {
      console.log('Token restored successfully via API');
    } else {
      // Check and create the API endpoint if it doesn't exist
      console.log('Token restoration API failed, adding the endpoint...');
      
      // Create a file with the new route
      const routeCode = `
// Import this at the top of your routes.ts file
import { restoreTokens, activeTokens } from './lib/auth-simple';

// Add this to your admin routes section
app.post('/api/admin/restore-tokens', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Directly load tokens from database to memory
    await restoreTokens();
    
    console.log('Tokens restored via admin API call');
    console.log('Current active tokens:', activeTokens.size);
    
    res.status(200).json({ 
      success: true, 
      message: 'Tokens restored successfully',
      activeTokenCount: activeTokens.size
    });
  } catch (error) {
    console.error('Failed to restore tokens:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to restore tokens' 
    });
  }
});
`;
      
      fs.writeFileSync('admin-token-route.txt', routeCode);
      console.log('Created admin-token-route.txt with the route code');
      console.log('Please add this code to your routes.ts file and restart the server');
    }
    
    // Create a script to save the token to localStorage when loaded in browser
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login Setup</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #2563eb;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }
    .info-box {
      background-color: #f3f4f6;
      border-left: 4px solid #2563eb;
      padding: 1rem;
      margin: 1.5rem 0;
    }
    .success {
      background-color: #dcfce7;
      border-left: 4px solid #16a34a;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      font-weight: bold;
      margin: 1rem 0;
      cursor: pointer;
    }
    code {
      background-color: #e5e7eb;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-family: monospace;
    }
    pre {
      background-color: #1f2937;
      color: #e5e7eb;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>Admin Login Setup</h1>
  
  <div class="info-box">
    <p><strong>Admin User:</strong> ${adminUser.username} (${adminUser.email})</p>
    <p><strong>Token:</strong> ${token.substring(0, 10)}...${token.substring(token.length - 5)}</p>
    <p><strong>Expires:</strong> ${expiresAt.toLocaleString()}</p>
  </div>
  
  <h2>Setup Admin Authentication</h2>
  <p>Click the button below to store the admin token in your browser's localStorage. This will enable you to access the admin panel directly from the navigation tabs.</p>
  
  <button onclick="setupAdminAuth()" class="button">Store Admin Token</button>
  
  <div id="result" class="info-box" style="display: none;"></div>
  
  <h2>Manual Setup</h2>
  <p>If the button doesn't work, you can manually set up admin authentication:</p>
  
  <ol>
    <li>Open your browser's developer console (F12 or Right-Click > Inspect > Console)</li>
    <li>Copy and paste the following code:</li>
  </ol>
  
  <pre>
localStorage.setItem('auth_token', '${token}');
console.log('Admin token stored successfully!');
  </pre>
  
  <h2>Test Admin Access</h2>
  <p>After setting up the token, try these links:</p>
  <p><a href="/admin-panel-1" target="_blank" class="button">Open Admin Panel 1</a></p>
  <p><a href="/admin" target="_blank" class="button">Open Admin Dashboard</a></p>
  
  <script>
    function setupAdminAuth() {
      try {
        localStorage.setItem('auth_token', '${token}');
        
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = '<p><strong>Success!</strong> Admin token has been stored in your browser.</p>' +
                              '<p>You can now access the admin panel from the navigation tabs.</p>';
        resultDiv.className = 'info-box success';
        resultDiv.style.display = 'block';
        
        // Also set in cookies for systems that check cookies
        document.cookie = 'auth_token=${token}; path=/; max-age=${60*60*24*7}';
      } catch (error) {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = '<p><strong>Error:</strong> ' + error.message + '</p>' +
                              '<p>Please try the manual setup instead.</p>';
        resultDiv.className = 'info-box warning';
        resultDiv.style.display = 'block';
      }
    }
  </script>
</body>
</html>`;
    
    // Write to HTML file
    fs.writeFileSync('admin-setup.html', htmlContent);
    fs.writeFileSync('public/admin-setup.html', htmlContent);
    
    console.log('\nAdmin setup page created: admin-setup.html and public/admin-setup.html');
    console.log('Open this page in your browser to set up admin access through the UI');
    
    // Close the database connection
    await pool.end();
    
  } catch (error) {
    console.error('Error registering admin token for UI:', error);
  }
}

// Run the function
registerTokenForUI();