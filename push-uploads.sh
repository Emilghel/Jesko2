#!/bin/bash
# Script to push just the uploads directory
# Usage: ./push-uploads.sh <github_token>

if [ -z "$1" ]; then
  echo "Please provide your GitHub token as the first argument"
  echo "Usage: ./push-uploads.sh <github_token>"
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

# Copy uploads directory
echo "Copying uploads directory..."
mkdir -p uploads
cp -r $HOME/workspace/uploads/* uploads/ 2>/dev/null || echo "Warning: Uploads directory might be empty"

# Add and commit
echo "Adding and committing uploads directory..."
git add uploads
git commit -m "Add uploads directory"
git push origin main

echo "Uploads directory added to GitHub!"