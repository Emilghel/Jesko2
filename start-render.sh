#!/bin/bash
#!/bin/bash
# Super-minimal emergency startup script for Render.com

# Set environment to production
export NODE_ENV=production

echo "Starting Jesko AI emergency deployment script..."

# Create emergency server directly
cat > emergency-server.js << 'EOF'
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Home page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Jesko AI</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #333; }
          .status { padding: 15px; background: #f8f9fa; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>Jesko AI Platform</h1>
        <p>Emergency server is running. Current time: ${new Date().toLocaleString()}</p>
        
        <div class="status">
          <h2>Deployment Status</h2>
          <p>Server is running in emergency fallback mode.</p>
          <p>This is a temporary landing page while the full application is being prepared for deployment.</p>
        </div>
        
        <p><a href="/health">Check API status</a></p>
      </body>
    </html>
  `);
});

// Catch-all route
app.get('*', (req, res) => {
  res.status(404).send('Page not found - Jesko AI Emergency Server');
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Emergency server running on port ${port}`);
});
EOF

# Run the emergency server
node emergency-server.js
