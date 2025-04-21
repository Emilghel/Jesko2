/**
 * Admin Login Helper
 * 
 * This file generates HTML that provides a direct login link to the Admin Panel 1
 * with the authentication token embedded in the URL.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';

// Configure Neon to use the ws package for WebSockets
neonConfig.webSocketConstructor = ws;

async function createAdminLoginHelper() {
  try {
    console.log('Creating admin login helper...');
    
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
    console.log(`Found admin user: ${adminUser.username} (${adminUser.email})`);
    
    // Get latest token for admin
    const { rows: tokens } = await pool.query(
      'SELECT token, expires_at FROM auth_tokens WHERE user_id = $1 ORDER BY expires_at DESC LIMIT 1',
      [adminUser.id]
    );
    
    if (tokens.length === 0) {
      console.log('No tokens found for admin user');
      await pool.end();
      return;
    }
    
    const token = tokens[0].token;
    const expiresAt = new Date(tokens[0].expires_at);
    
    console.log(`Found token for admin: ${token.substring(0, 10)}...`);
    console.log(`Token expires: ${expiresAt.toISOString()}`);
    
    // Generate HTML content with direct links
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login Helper</title>
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
  <h1>Admin Login Helper</h1>
  
  <div class="info-box">
    <p><strong>Admin User:</strong> ${adminUser.username} (${adminUser.email})</p>
    <p><strong>Token:</strong> ${token.substring(0, 10)}...${token.substring(token.length - 5)}</p>
    <p><strong>Expires:</strong> ${expiresAt.toLocaleString()}</p>
  </div>
  
  <h2>Direct Access Links</h2>
  <p>Click on any of these links to access the admin panel directly:</p>
  
  <p><a href="/admin-panel-1?token=${token}" class="button">Access Admin Panel 1</a></p>
  <p><a href="/admin-full?token=${token}" class="button">Access Full Admin Panel</a></p>
  <p><a href="/admin?token=${token}" class="button">Access Basic Admin Panel</a></p>
  
  <h2>Manual Token Usage</h2>
  <p>You can also use this token manually:</p>
  
  <div class="info-box">
    <p><strong>Authentication Header:</strong></p>
    <pre>Authorization: Bearer ${token}</pre>
  </div>
  
  <h2>JavaScript Usage</h2>
  <p>To use this token in JavaScript:</p>
  
  <pre>
// Store token in localStorage
localStorage.setItem('auth_token', '${token}');

// Then navigate to admin panel
window.location.href = '/admin-panel-1';
  </pre>
  
  <div class="info-box warning">
    <p><strong>Important:</strong> This token will expire on ${expiresAt.toLocaleString()}. After that, you'll need to generate a new token.</p>
  </div>
</body>
</html>
    `;
    
    // Write to HTML file
    fs.writeFileSync('admin-login.html', htmlContent);
    console.log('\nAdmin login helper created: admin-login.html');
    console.log('Use this HTML page to access the admin panels directly.');
    
    // Close the database connection
    await pool.end();
    
  } catch (error) {
    console.error('Error creating admin login helper:', error);
  }
}

// Run the function
createAdminLoginHelper();