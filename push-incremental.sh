#!/bin/bash
# Script to incrementally add all code to GitHub repository
# Usage: ./push-incremental.sh <github_token> <step_number>

if [ -z "$1" ]; then
  echo "Please provide your GitHub token as the first argument"
  echo "Usage: ./push-incremental.sh <github_token> <step_number>"
  exit 1
fi

if [ -z "$2" ]; then
  echo "Please provide the step number to execute (1-8)"
  echo "Usage: ./push-incremental.sh <github_token> <step_number>"
  exit 1
fi

GITHUB_TOKEN=$1
STEP=$2

# Clone the existing repository
echo "Cloning the existing repository..."
rm -rf /tmp/jesko-full
git clone https://${GITHUB_TOKEN}@github.com/Emilghel/Jesko2.git /tmp/jesko-full
cd /tmp/jesko-full

# Configure Git for this repository
git config http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 120

# Function to add and commit a set of files
add_and_commit() {
  local message=$1
  shift
  local files=("$@")
  
  for file in "${files[@]}"; do
    cp -r $HOME/workspace/$file . 2>/dev/null || echo "Skipping $file (not found)"
  done
  
  git add .
  git commit -m "$message"
  git push origin main
  echo "Pushed: $message"
}

case $STEP in
  1)
    echo "Step 1: Adding Python files..."
    add_and_commit "Add Python files" "*.py" "SalesGPT" "whisper_transcription_app" "audio_transcription" "*.pyc" "__pycache__"
    ;;
    
  2)
    echo "Step 2: Adding utility scripts..."
    add_and_commit "Add utility scripts" "*.js" "*.cjs" "*.sh"
    ;;
    
  3)
    echo "Step 3: Adding server modules..."
    add_and_commit "Add server modules" "server/admin-dashboard-api.ts" "server/admin-emergency-fixed.ts" "server/admin-emergency-routes.ts" "server/auth-middleware.ts" "server/automated-call-routes.ts" "server/calendar-routes.ts" "server/character-routes.ts" "server/db-direct-operations.ts" "server/direct-admin-access.js" "server/direct-db-delete.js" "server/direct-whisper.ts" "server/discount-routes.ts" "server/google-auth.ts" "server/implementation-steps.md" "server/lead-calls-routes.ts" "server/leads-routes.ts" "server/logger.ts" "server/partner-routes.ts" "server/paypal-api.ts" "server/paypal-database.ts" "server/routes-update.md" "server/routes.ts.bak" "server/salesgpt-proxy.ts" "server/seo-keyword-routes.ts" "server/simple-delete.ts" "server/stock-videos-routes.ts" "server/stripe-api.ts" "server/stripe-database.ts" "server/stripe-routes.ts" "server/test-admin-api.ts" "server/transcription-proxy.ts" "server/transcription-route.ts" "server/twilio-direct-routes.ts" "server/twilio-elevenlabs-streaming-server.js" "server/twilio-stream-routes.ts" "server/types.d.ts" "server/user-profile-routes.ts" "server/video-edit-routes.ts" "server/video-history-routes.ts" "server/video-utils.ts" "server/vite.ts"
    ;;
    
  4)
    echo "Step 4: Adding test files..."
    add_and_commit "Add test files" "test-*" "*.test.js"
    ;;
    
  5)
    echo "Step 5: Adding tools and migrations..."
    add_and_commit "Add tools and migrations" "tools" "migrations"
    ;;
    
  6)
    echo "Step 6: Adding documentation files..."
    add_and_commit "Add documentation files" "*.md" "*.txt"
    ;;
    
  7)
    echo "Step 7: Adding remaining configuration files..."
    add_and_commit "Add remaining configuration files" "*.json" "*.nix" "*.lock" "Dockerfile"
    ;;
    
  8)
    echo "Step 8: Adding remaining files and directories..."
    add_and_commit "Add remaining files" "admin" "app" "temp" "static" "uploads"
    ;;
    
  *)
    echo "Invalid step number. Please use a number from 1 to 8."
    exit 1
    ;;
esac

echo "Step $STEP completed! Run the next step to continue adding files."