#!/bin/bash
# Intelligent startup script for Render.com deployment

echo "Starting Jesko AI deployment script..."

# Skip the build step for now
echo "Skipping build process..."

# Check if server-render.js exists directly in the project root
if [ -f server-render.js ]; then
  echo "Starting fallback server (server-render.js)..."
  node server-render.js
else
  echo "server-render.js not found. Looking in other locations..."
  # Try potential other locations
  if [ -f server/index.js ]; then
    echo "Found server/index.js - Starting main application..."
    node server/index.js
  elif [ -f dist/server/index.js ]; then
    echo "Found dist/server/index.js - Starting built application..."
    node dist/server/index.js
  elif [ -f dist/server-render.js ]; then
    echo "Found dist/server-render.js - Starting fallback server..."
    node dist/server-render.js
  else
    echo "No server found. Starting minimal Express server..."
    # Use a one-line Express server as an absolute fallback
    node -e "const express=require('express');const app=express();app.get('*',(req,res)=>res.send('<h1>Jesko AI</h1><p>Temporary server</p>'));app.listen(process.env.PORT||3000,()=>console.log('Minimal server running'));"
  fi
fi
