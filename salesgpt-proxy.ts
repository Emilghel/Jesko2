/**
 * SalesGPT Proxy Router
 * 
 * This router forwards requests from the main Express server to the Python FastAPI
 * SalesGPT application, allowing us to integrate the AI sales conversation functionality
 * into the main app.
 */

import express from 'express';
import { spawn } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuration
const SALESGPT_PORT = 3001; // The port the SalesGPT FastAPI will run on
const SALESGPT_ENDPOINT = `http://localhost:${SALESGPT_PORT}`;
let serverProcess: any = null;

// Function to start the SalesGPT server
const startSalesGPTServer = () => {
  if (serverProcess) {
    console.log('SalesGPT server already running');
    return;
  }

  const appDir = path.join(process.cwd(), 'app');
  const pythonScript = path.join(appDir, 'main.py');

  // Check if the script exists
  if (!fs.existsSync(pythonScript)) {
    console.error(`SalesGPT server script not found at ${pythonScript}`);
    return;
  }

  console.log(`Starting SalesGPT server from ${pythonScript}`);
  
  // Start the FastAPI server
  serverProcess = spawn('python', [pythonScript], {
    cwd: appDir,
    env: { ...process.env, PORT: String(SALESGPT_PORT) },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (data: Buffer) => {
    console.log(`SalesGPT stdout: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data: Buffer) => {
    console.error(`SalesGPT stderr: ${data.toString().trim()}`);
  });

  serverProcess.on('close', (code: number) => {
    console.log(`SalesGPT server exited with code ${code}`);
    serverProcess = null;
  });

  // Give the server some time to start
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('SalesGPT server should be ready now');
      resolve(true);
    }, 5000);
  });
};

// Function to stop the SalesGPT server
const stopSalesGPTServer = () => {
  if (serverProcess) {
    console.log('Stopping SalesGPT server');
    serverProcess.kill();
    serverProcess = null;
  }
};

// Start the server when this module is imported
startSalesGPTServer().then(() => {
  console.log('SalesGPT server started');
});

// Handle process exit
process.on('exit', stopSalesGPTServer);
process.on('SIGINT', () => {
  stopSalesGPTServer();
  process.exit(0);
});

// Middleware to ensure the server is running
const ensureServerRunning = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!serverProcess) {
    await startSalesGPTServer();
  }
  next();
};

// Create a proxy middleware to forward requests to the FastAPI server
const proxyMiddleware = createProxyMiddleware({
  target: SALESGPT_ENDPOINT,
  changeOrigin: true,
  pathRewrite: {
    '^/api/salesgpt': '', // Remove the /api/salesgpt prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log the request details
    if (req.body) {
      console.log(`[SalesGPT Proxy] Forwarding request to ${req.url}:`, req.body);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[SalesGPT Proxy] Response from SalesGPT server: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[SalesGPT Proxy] Error: ${err.message}`);
    res.status(500).json({ error: 'SalesGPT server is not available' });
  },
});

// Use the middleware for all routes
router.use(ensureServerRunning, proxyMiddleware);

export default router;