#!/bin/bash
# Script to push the server/lib directory
# Usage: ./push-server-lib.sh <github_token>

if [ -z "$1" ]; then
  echo "Please provide your GitHub token as the first argument"
  echo "Usage: ./push-server-lib.sh <github_token>"
  exit 1
fi

GITHUB_TOKEN=$1

# Clone the existing repository
echo "Cloning the existing repository..."
rm -rf /tmp/jesko-server-lib
git clone https://${GITHUB_TOKEN}@github.com/Emilghel/Jesko2.git /tmp/jesko-server-lib
cd /tmp/jesko-server-lib

# Configure Git for this repository
git config http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 120

# Copy server/lib directory
echo "Copying server/lib directory..."
mkdir -p server/lib
cp -r $HOME/workspace/server/lib/* server/lib/ 2>/dev/null || echo "Warning: Server/lib directory might be empty"

# Add and commit
echo "Adding and committing server/lib directory..."
git add server/lib
git commit -m "Add server/lib directory with additional utility modules"
git push origin main

echo "Server/lib directory added to GitHub!"