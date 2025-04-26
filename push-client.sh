#!/bin/bash
# Script to push just the client directory
# Usage: ./push-client.sh <github_token>

if [ -z "$1" ]; then
  echo "Please provide your GitHub token as the first argument"
  echo "Usage: ./push-client.sh <github_token>"
  exit 1
fi

GITHUB_TOKEN=$1

# Clone the existing repository
echo "Cloning the existing repository..."
rm -rf /tmp/jesko-client
git clone https://${GITHUB_TOKEN}@github.com/Emilghel/Jesko2.git /tmp/jesko-client
cd /tmp/jesko-client

# Configure Git for this repository
git config http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 120

# Copy client directory
echo "Copying client directory..."
mkdir -p client
cp -r $HOME/workspace/client/* client/ 2>/dev/null || echo "Warning: Client directory might be empty"

# Add and commit
echo "Adding and committing client directory..."
git add client
git commit -m "Add client directory"
git push origin main

echo "Client directory added to GitHub!"