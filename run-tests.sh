#!/bin/bash

# Script to run security tests with proper Jest configuration

# Make the script executable first:
# chmod +x run-tests.sh

# Usage:
# ./run-tests.sh                   - Run all tests
# ./run-tests.sh security          - Run security.test.js
# ./run-tests.sh login             - Run login-rate-limiter.test.js
# ./run-tests.sh frontend          - Run frontend-security.test.js

# Default to running all tests if no argument provided
TEST_FILE="*"

if [ "$1" = "security" ]; then
  TEST_FILE="security.test.js"
  echo "Running security tests..."
elif [ "$1" = "login" ]; then
  TEST_FILE="login-rate-limiter.test.js"
  echo "Running login rate limiter tests..."
elif [ "$1" = "frontend" ]; then
  TEST_FILE="frontend-security.test.js"
  echo "Running frontend security tests..."
else
  echo "Running all tests..."
fi

# Run Jest with the specified file and configuration
node --experimental-vm-modules node_modules/jest/bin/jest.js --config=jest.config.cjs "$TEST_FILE"