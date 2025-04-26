#!/bin/bash

# Script to fix the asset loading issue on Render
echo "Creating assets fix for Render deployment..."

# 1. Make sure static directory exists
mkdir -p static

# 2. Copy all image files from attached_assets to static directory
cp attached_assets/*.jpg attached_assets/*.gif static/ 2>/dev/null || echo "Some files might not have been copied"

# 3. Update TeamCarousel.tsx to use static paths
sed -i 's|import teamImage1 from "@assets/12.jpg"|// Use static paths for deployment\nconst teamImage1 = "/static/12.jpg"|g' client/src/components/TeamCarousel.tsx
sed -i 's|import teamImage2 from "@assets/13.jpg"|const teamImage2 = "/static/13.jpg"|g' client/src/components/TeamCarousel.tsx
sed -i 's|import teamImage3 from "@assets/15.jpg"|const teamImage3 = "/static/15.jpg"|g' client/src/components/TeamCarousel.tsx

# 4. Make sure FloatingChatBubble.tsx uses static bubble.gif
sed -i 's|import bubbleGifPath from "@assets/bubble.gif"|// Using static path for deployment\nconst bubbleGifPath = "/static/bubble.gif";|g' client/src/components/FloatingChatBubble.tsx 2>/dev/null || echo "FloatingChatBubble.tsx fix not needed"

# 5. Add static directory to vite build process (if vite.config.ts exists)
if [ -f vite.config.ts ]; then
  # Check if 'publicDir' is already set in vite.config.ts
  if ! grep -q "publicDir:" vite.config.ts; then
    sed -i '/plugins: \[/i \  publicDir: "static",\n' vite.config.ts
    echo "Added publicDir configuration to vite.config.ts"
  else
    echo "publicDir already configured in vite.config.ts"
  fi
fi

echo "Asset fixes completed. Now commit and push these changes to GitHub."
echo "Then update your Render build command to a simple 'npm install && npm run build'"