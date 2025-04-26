#!/bin/bash
# Script to push an empty uploads directory with a README
# Usage: ./push-empty-uploads.sh <github_token>

if [ -z "$1" ]; then
  echo "Please provide your GitHub token as the first argument"
  echo "Usage: ./push-empty-uploads.sh <github_token>"
  exit 1
fi

GITHUB_TOKEN=$1

# Clone the existing repository
echo "Cloning the existing repository..."
rm -rf /tmp/jesko-uploads
git clone https://${GITHUB_TOKEN}@github.com/Emilghel/Jesko2.git /tmp/jesko-uploads
cd /tmp/jesko-uploads

# Configure Git for this repository
git config http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 120

# Create uploads directory and a README
echo "Creating uploads directory with README..."
mkdir -p uploads
cat > uploads/README.md << EOF
# Uploads Directory

This directory is used to store uploaded files:
- Audio files from AI audio generation
- Video files from users
- Image uploads
- Temporary files for processing

The directory structure will be automatically created by the application when needed.
EOF

# Add and commit
echo "Adding and committing uploads directory..."
git add uploads
git commit -m "Add uploads directory with README"
git push origin main

echo "Empty uploads directory added to GitHub!"