/**
 * Emergency Direct Admin Access
 * 
 * This module provides a special route to access the admin panel directly,
 * bypassing the normal authentication flow.
 */

export function setupDirectAdminAccess(app) {
  // Special admin middleware that always grants admin access
  const forceAdminAccess = (req, res, next) => {
    // Inject admin user directly into request
    req.user = {
      id: 4,
      username: 'admin',
      email: 'admin@warmleadnetwork.com',
      displayName: 'System Administrator',
      isAdmin: true,
      role: 'admin'
    };
    
    // Set isAuthenticated to always return true
    req.isAuthenticated = () => true;
    
    next();
  };
  
  // Create special "/direct-admin" route that forces admin access
  app.get('/direct-admin', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Direct Admin Access</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
          }
          h1 { color: #2563eb; }
          .panel {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            margin-bottom: 2rem;
          }
          .success {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 1rem;
            margin-bottom: 1rem;
          }
          .btn {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            font-weight: bold;
            margin-right: 1rem;
            margin-bottom: 1rem;
          }
          .btn-green {
            background-color: #10b981;
          }
          .btn-red {
            background-color: #ef4444;
          }
        </style>
      </head>
      <body>
        <h1>Direct Admin Access</h1>
        
        <div class="panel">
          <div class="success">
            <strong>Direct Admin Access Enabled!</strong>
            <p>You now have access to the admin panel using the special direct links below.</p>
          </div>
          
          <h2>Admin Panel Access</h2>
          <p>Click on any of these links to access the admin panel directly:</p>
          
          <div>
            <a href="/direct-admin/panel-1" class="btn btn-green">Admin Panel 1</a>
            <a href="/direct-admin/full" class="btn">Full Admin Panel</a>
            <a href="/direct-admin/simple" class="btn">Simple Admin</a>
          </div>
          
          <h3>Admin Functions</h3>
          <p>Access specific admin functionality directly:</p>
          
          <div>
            <a href="/direct-admin/users" class="btn">User Management</a>
            <a href="/direct-admin/coins" class="btn">Coins Management</a>
            <a href="/direct-admin/partners" class="btn">Partner Management</a>
            <a href="/direct-admin/personality" class="btn">Personality Prompts</a>
          </div>
          
          <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <div>
            <a href="/" class="btn btn-red">Return to Homepage</a>
          </div>
        </div>
        
        <div class="panel">
          <h2>Security Notice</h2>
          <p>This page provides direct access to the admin panel, bypassing the normal authentication flow. It should only be used for emergency access when the normal admin authentication is not working.</p>
        </div>
      </body>
      </html>
    `);
  });
  
  // Admin Panel 1
  app.get('/direct-admin/panel-1', forceAdminAccess, (req, res) => {
    res.redirect('/admin-panel-1');
  });
  
  // Full Admin Panel
  app.get('/direct-admin/full', forceAdminAccess, (req, res) => {
    res.redirect('/admin-full');
  });
  
  // Simple Admin Panel
  app.get('/direct-admin/simple', forceAdminAccess, (req, res) => {
    res.redirect('/admin-simple');
  });
  
  // User Management
  app.get('/direct-admin/users', forceAdminAccess, (req, res) => {
    res.redirect('/admin-panel-1?tab=users');
  });
  
  // Coins Management
  app.get('/direct-admin/coins', forceAdminAccess, (req, res) => {
    res.redirect('/admin/coins');
  });
  
  // Partner Management
  app.get('/direct-admin/partners', forceAdminAccess, (req, res) => {
    res.redirect('/admin/partner-management');
  });
  
  // Personality Prompts
  app.get('/direct-admin/personality', forceAdminAccess, (req, res) => {
    res.redirect('/admin/personality-prompts');
  });
  
  console.log('🔐 Direct admin access routes have been set up at /direct-admin');
}