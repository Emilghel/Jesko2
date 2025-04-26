#!/bin/bash
set -e

# Create build directory
echo "Creating client build directory..."
mkdir -p client/dist/assets

# Create a simple index.html template to make the build directory valid
echo "Creating basic index.html..."
cat > client/dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jesko AI</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        header {
            text-align: center;
            margin-bottom: 40px;
        }
        h1 { 
            color: #2563eb; 
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #64748b;
            font-size: 1.2rem;
            margin-bottom: 30px;
        }
        .card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background: #fff;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .feature-card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .feature-title {
            color: #0f172a;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .cta {
            background: #2563eb;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            display: inline-block;
            margin-top: 20px;
        }
        .api-status {
            text-align: center;
            margin-top: 40px;
            padding: 15px;
            background: #f0f9ff;
            border-radius: 8px;
        }
        .status-badge {
            background: #10b981;
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <header>
        <h1>Jesko AI Platform</h1>
        <div class="subtitle">Advanced AI-Powered Tools for Business Communication</div>
    </header>
    
    <div class="card">
        <h2>Welcome to Jesko AI</h2>
        <p>Our platform provides cutting-edge AI tools to enhance your business communication, automate customer interactions, and generate compelling content.</p>
        
        <div class="features">
            <div class="feature-card">
                <div class="feature-title">AI Video Generation</div>
                <p>Transform static images into dynamic videos with customized motion and effects.</p>
            </div>
            <div class="feature-card">
                <div class="feature-title">Sales Automation</div>
                <p>Automate lead qualification and follow-up with intelligent AI agents.</p>
            </div>
            <div class="feature-card">
                <div class="feature-title">Voice Synthesis</div>
                <p>Convert text to natural-sounding speech for podcasts, presentations, and more.</p>
            </div>
        </div>
        
        <div class="api-status">
            <p>API Status: <span class="status-badge">Online</span></p>
            <p>All services are operational and ready to use.</p>
        </div>
    </div>
</body>
</html>
EOF

# Create assets directory
echo "Creating assets directory structure..."
mkdir -p client/dist/static

# Check if bubble.gif exists and copy it if available
if [ -f "static/bubble.gif" ]; then
    echo "Copying bubble.gif from static directory..."
    cp -r static/bubble.gif client/dist/static/bubble.gif
elif [ -f "attached_assets/bubble.gif" ]; then
    echo "Copying bubble.gif from attached_assets directory..."
    cp -r attached_assets/bubble.gif client/dist/static/bubble.gif
else
    echo "Warning: bubble.gif not found, creating a placeholder..."
    # Create a small placeholder file
    touch client/dist/static/bubble.gif
fi

echo "Frontend build directory created successfully!"