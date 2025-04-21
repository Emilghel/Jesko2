#!/bin/bash
# Script to push minimal essential files to GitHub

# Create directory for minimal repository
mkdir -p /tmp/jesko-minimal
echo "Creating minimal repository..."

# Copy only the most essential files for deployment
echo "Copying essential files..."

# Core config files
cp package.json package-lock.json tailwind.config.ts tsconfig.json vite.config.ts drizzle.config.ts theme.json .env.example README.md /tmp/jesko-minimal/

# Create directories
mkdir -p /tmp/jesko-minimal/server
mkdir -p /tmp/jesko-minimal/client/src
mkdir -p /tmp/jesko-minimal/shared
mkdir -p /tmp/jesko-minimal/public

# Minimal server files - focus on key functionality
cp server/index.ts server/routes.ts server/storage.ts server/db.ts /tmp/jesko-minimal/server/
cp -r server/lib /tmp/jesko-minimal/server/
cp -r server/routes /tmp/jesko-minimal/server/
cp -r server/middleware /tmp/jesko-minimal/server/

# Minimal client files
cp -r client/src /tmp/jesko-minimal/client/
cp client/index.html /tmp/jesko-minimal/client/

# Shared schema
cp -r shared/* /tmp/jesko-minimal/shared/

# Public assets (only essential ones)
cp -r public/*.js /tmp/jesko-minimal/public/ 2>/dev/null || :
cp -r public/*.css /tmp/jesko-minimal/public/ 2>/dev/null || :
cp -r public/*.html /tmp/jesko-minimal/public/ 2>/dev/null || :
cp -r public/*.ico /tmp/jesko-minimal/public/ 2>/dev/null || :

# Create a minimal .gitignore
cat > /tmp/jesko-minimal/.gitignore << EOF
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
EOF

# Setup Git
echo "Setting up Git repository..."
cd /tmp/jesko-minimal
git init
git config http.postBuffer 524288000
git add .
git commit -m "Initial commit with essential files"

# Push to GitHub
echo "Pushing to GitHub..."
if [ -z "$1" ]; then
  echo "Please provide your GitHub token as an argument"
  echo "Usage: ./push-minimal.sh <github_token>"
  exit 1
fi

git remote add origin https://$1@github.com/Emilghel/Jesko2.git
git push -f origin main

echo "Essential files have been pushed to GitHub!"
echo "You can now deploy this from GitHub to Render."
echo ""
echo "NEXT STEPS:"
echo "1. Go to Render.com and create a new Web Service"
echo "2. Connect to your GitHub repository"
echo "3. Configure build settings (npm install, npm run dev)"
echo "4. Add environment variables from your .env file"
echo "5. Deploy!"