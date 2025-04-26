#!/bin/bash
# Script to push just the static directory
# Usage: ./push-static.sh <github_token>

if [ -z "$1" ]; then
  echo "Please provide your GitHub token as the first argument"
  echo "Usage: ./push-static.sh <github_token>"
  exit 1
fi

GITHUB_TOKEN=$1

# Clone the existing repository
echo "Cloning the existing repository..."
rm -rf /tmp/jesko-static
git clone https://${GITHUB_TOKEN}@github.com/Emilghel/Jesko2.git /tmp/jesko-static
cd /tmp/jesko-static

# Configure Git for this repository
git config http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 120

# Copy static directory
echo "Copying static directory..."
mkdir -p static
cp -r $HOME/workspace/static/* static/ 2>/dev/null || echo "Warning: Static directory might be empty"

# Add and commit
echo "Adding and committing static directory..."
git add static
git commit -m "Add static directory"
git push origin main

echo "Static directory added to GitHub!"