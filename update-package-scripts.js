import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to package.json
const packageJsonPath = path.join(__dirname, 'package.json');

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add the test scripts
packageJson.scripts = {
  ...packageJson.scripts,
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
  "test:security": "node --experimental-vm-modules node_modules/jest/bin/jest.js security.test.js",
  "test:login": "node --experimental-vm-modules node_modules/jest/bin/jest.js login-rate-limiter.test.js",
  "test:frontend": "node --experimental-vm-modules node_modules/jest/bin/jest.js frontend-security.test.js",
  "test:all": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
};

// Write the updated package.json file
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

console.log('Package.json updated with test scripts!');