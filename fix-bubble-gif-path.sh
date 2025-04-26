#!/bin/bash

# Script to fix the bubble.gif build issue on Render
echo "Fixing bubble.gif issue for Render deployment..."

# 1. Make sure client/public directory exists
mkdir -p client/public

# 2. Copy bubble.gif to the public directory
echo "Copying bubble.gif to client/public directory..."
cp attached_assets/bubble.gif client/public/

# 3. Commit and push changes
echo "Committing and pushing changes to GitHub..."
git add client/public/bubble.gif
git add client/src/components/FloatingChatBubble.tsx
git commit -m "Fix: Use public path for bubble.gif to resolve Render build issue"
git push

echo "Done! Now redeploy on Render."