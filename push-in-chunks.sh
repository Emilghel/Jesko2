#!/bin/bash
# Script to push a large repository in smaller chunks to avoid timeout issues

# Create a fresh Git repository with only essential files
mkdir -p /tmp/jesko-core
echo "Step 1: Creating a fresh repository with core files..."

# Copy core configuration files
echo "Copying core configuration files..."
cp package.json package-lock.json tailwind.config.ts tsconfig.json vite.config.ts drizzle.config.ts postcss.config.js theme.json .env.example README.md /tmp/jesko-core/

# Create important directories
mkdir -p /tmp/jesko-core/server /tmp/jesko-core/client /tmp/jesko-core/shared /tmp/jesko-core/public

# Copy most important source code directories
echo "Copying core source code..."
cp -r server/* /tmp/jesko-core/server/
cp -r client/* /tmp/jesko-core/client/
cp -r shared/* /tmp/jesko-core/shared/
cp -r public/* /tmp/jesko-core/public/

# Create a clean .gitignore
cat > /tmp/jesko-core/.gitignore << EOF
# Dependencies
node_modules
.cache
__pycache__
*.pyc

# Build outputs
dist
build

# Environment variables
.env
.env.local
.env.*.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
*.log

# OS files
.DS_Store
Thumbs.db

# Large files
*.png
*.jpg
*.jpeg
*.gif
*.mp3
*.mp4
*.wav
*.mov
EOF

# Initialize Git repository
echo "Initializing Git repository..."
cd /tmp/jesko-core
git init
git config http.postBuffer 524288000
git add .
git commit -m "Initial commit with core application files"

# Add remote and push
echo "Setting up remote and pushing..."
if [ -z "$1" ]; then
  echo "Please provide your GitHub token as an argument"
  echo "Usage: ./push-in-chunks.sh <github_token>"
  exit 1
fi

# Configure remote with token
git remote add origin https://$1@github.com/Emilghel/Jesko2.git
git push -f origin main

echo "Core repository has been pushed to GitHub!"
echo "You can now deploy this from GitHub to Render."