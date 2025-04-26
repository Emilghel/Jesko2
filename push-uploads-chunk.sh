#!/bin/bash
# Script to push the uploads directory in smaller chunks
# Usage: ./push-uploads-chunk.sh <github_token> <chunk_number>

if [ -z "$1" ]; then
  echo "Please provide your GitHub token as the first argument"
  echo "Usage: ./push-uploads-chunk.sh <github_token> <chunk_number>"
  exit 1
fi

if [ -z "$2" ]; then
  echo "Please provide the chunk number (1-3) as the second argument"
  echo "Usage: ./push-uploads-chunk.sh <github_token> <chunk_number>"
  exit 1
fi

GITHUB_TOKEN=$1
CHUNK=$2

# Clone the existing repository
echo "Cloning the existing repository..."
rm -rf /tmp/jesko-uploads
git clone https://${GITHUB_TOKEN}@github.com/Emilghel/Jesko2.git /tmp/jesko-uploads
cd /tmp/jesko-uploads

# Configure Git for this repository
git config http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 120

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Function to handle chunk specific files
process_chunk() {
  local chunk_number=$1
  local commit_message="Add uploads directory (chunk $chunk_number)"
  
  if [ "$chunk_number" -eq "1" ]; then
    echo "Processing chunk 1: images directory..."
    mkdir -p uploads/images
    cp -r $HOME/workspace/uploads/images uploads/ 2>/dev/null || echo "No images directory found"
  elif [ "$chunk_number" -eq "2" ]; then
    echo "Processing chunk 2: videos directory..."
    mkdir -p uploads/videos
    cp -r $HOME/workspace/uploads/videos uploads/ 2>/dev/null || echo "No videos directory found"
  elif [ "$chunk_number" -eq "3" ]; then
    echo "Processing chunk 3: remaining files and directories..."
    # Copy everything except images and videos which were already copied
    find $HOME/workspace/uploads -type d -not -path "*/images*" -not -path "*/videos*" -maxdepth 1 -mindepth 1 | while read dir; do
      dirname=$(basename "$dir")
      echo "Copying directory: $dirname"
      mkdir -p uploads/$dirname
      cp -r $dir/* uploads/$dirname/ 2>/dev/null || echo "Directory $dirname might be empty"
    done
    
    # Copy files directly in uploads directory (not in subdirectories)
    find $HOME/workspace/uploads -type f -maxdepth 1 | while read file; do
      filename=$(basename "$file")
      echo "Copying file: $filename"
      cp "$file" uploads/ 2>/dev/null || echo "Failed to copy $filename"
    done
  else
    echo "Invalid chunk number. Please use 1, 2, or 3."
    exit 1
  fi
  
  # Add and commit
  echo "Adding and committing uploads directory (chunk $chunk_number)..."
  git add uploads
  git commit -m "$commit_message"
  git push origin main
  
  echo "Uploads directory chunk $chunk_number added to GitHub!"
}

# Process the specified chunk
process_chunk $CHUNK