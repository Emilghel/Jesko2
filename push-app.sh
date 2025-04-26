#!/bin/bash
# Script to push just the app directory
# Usage: ./push-app.sh <github_token>

if [ -z "$1" ]; then
  echo "Please provide your GitHub token as the first argument"
  echo "Usage: ./push-app.sh <github_token>"
  exit 1
fi

GITHUB_TOKEN=$1

# Clone the existing repository
echo "Cloning the existing repository..."
rm -rf /tmp/jesko-app
git clone https://${GITHUB_TOKEN}@github.com/Emilghel/Jesko2.git /tmp/jesko-app
cd /tmp/jesko-app

# Configure Git for this repository
git config http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 120

# Copy app directory
echo "Copying app directory..."
mkdir -p app
cp -r $HOME/workspace/app/* app/ 2>/dev/null || echo "Warning: App directory might be empty"

# Add and commit
echo "Adding and committing app directory..."
git add app
git commit -m "Add app directory"
git push origin main

echo "App directory added to GitHub!"