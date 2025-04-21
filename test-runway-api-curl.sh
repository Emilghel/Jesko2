#!/bin/bash

# Load environment variables from .env
source .env

# Verify API key is available
if [ -z "$RUNWAY_API_KEY" ]; then
  echo "Error: RUNWAY_API_KEY environment variable is not set"
  exit 1
fi

# Create a minimal test using a tiny 1x1 pixel PNG image encoded in base64
# This avoids needing to read from a file
TINY_IMAGE="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
ENDPOINT="https://api.runwayml.com/v1/image_to_video"
VERSION="2024-11-06"

echo "=== Runway API Curl Test ==="
echo "Using API KEY: ${RUNWAY_API_KEY:0:4}...${RUNWAY_API_KEY:(-4)}"
echo "API Version: $VERSION"
echo "Endpoint: $ENDPOINT"
echo "-------------------------------------------------"

# Create temporary JSON payload file
PAYLOAD_FILE=$(mktemp)
cat > "$PAYLOAD_FILE" << EOF
{
  "promptImage": "data:image/png;base64,$TINY_IMAGE",
  "promptText": "Gentle camera movement, cinematic lighting",
  "model": "gen4_turbo",
  "duration": 5,
  "ratio": "1280:720"
}
EOF

echo "Sending API request..."
echo "Request payload: $(cat $PAYLOAD_FILE | jq 'del(.promptImage)') + base64 image"

# Test with various version header formats
echo -e "\n1. Testing with X-Runway-Version: $VERSION"
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -H "X-Runway-Version: $VERSION" \
  -d @"$PAYLOAD_FILE" | jq .

echo -e "\n2. Testing with just authorization header (no version header)"
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -d @"$PAYLOAD_FILE" | jq .

echo -e "\n3. Testing with Runway-Version: $VERSION (alternate header name)"
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -H "Runway-Version: $VERSION" \
  -d @"$PAYLOAD_FILE" | jq .

echo -e "\n4. Testing with Accept-Version: $VERSION (alternate header name)"
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -H "Accept-Version: $VERSION" \
  -d @"$PAYLOAD_FILE" | jq .

echo -e "\n5. Try adding Accept header"
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -H "X-Runway-Version: $VERSION" \
  -d @"$PAYLOAD_FILE" | jq .

echo -e "\n6. Try GET request to models endpoint"
curl -s -X GET "https://api.runwayml.com/v1/models" \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -H "X-Runway-Version: $VERSION" | jq .

# Clean up
rm "$PAYLOAD_FILE"
echo -e "\nTest completed."