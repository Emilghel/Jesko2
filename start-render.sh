#!/bin/bash
# Startup script for Render.com deployment

# Set environment to production
export NODE_ENV=production

# Check if we need to rebuild
if [ ! -d "./dist" ] || [ ! -f "./dist/index.html" ]; then
    echo "Building application..."
    npm run build
fi

# Start the production server
echo "Starting server in production mode..."
node dist/server-render.js
