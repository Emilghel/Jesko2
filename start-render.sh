#!/bin/bash
# start-render.sh - Script for starting the Jesko AI application on Render

# Set NODE_ENV to production
export NODE_ENV=production

# Print environment information
echo "Starting Jesko AI in $NODE_ENV mode"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
  echo "WARNING: DATABASE_URL is not set. Database functionality will be limited."
fi

if [ -z "$JWT_SECRET" ]; then
  echo "WARNING: JWT_SECRET is not set. Authentication will not work properly."
fi

# Create temp and uploads directories if they don't exist
mkdir -p temp
mkdir -p uploads
echo "Created temp and uploads directories"

# Start the server using the simplified Render server file
echo "Starting server..."
node server-render.js