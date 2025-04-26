#!/bin/bash
# Script to push just the admin directory
# Usage: ./push-admin.sh <github_token>

if [ -z "$1" ]; then
  echo "Please provide your GitHub token as the first argument"
  echo "Usage: ./push-admin.sh <github_token>"
  exit 1
fi

GITHUB_TOKEN=$1

# Clone the existing repository
echo "Cloning the existing repository..."
rm -rf /tmp/jesko-admin
git clone https://${GITHUB_TOKEN}@github.com/Emilghel/Jesko2.git /tmp/jesko-admin
cd /tmp/jesko-admin

# Configure Git for this repository
git config http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 120

# Copy admin directory
echo "Copying admin directory..."
mkdir -p admin
cp -r $HOME/workspace/admin/* admin/ 2>/dev/null || echo "Warning: Admin directory might be empty"

# Add and commit
echo "Adding and committing admin directory..."
git add admin
git commit -m "Add admin directory"
git push origin main

echo "Admin directory added to GitHub!"