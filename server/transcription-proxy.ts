import { Express, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Simple logger utility for the transcription service
 */
const logger = {
  info: (message: string) => {
    console.log(`[TRANSCRIPTION] ${message}`);
  },
  error: (message: string) => {
    console.error(`[TRANSCRIPTION ERROR] ${message}`);
  }
};

// Track if the transcription service is running
let transcriptionServiceRunning = false;
let transcriptionProcess: ChildProcess | null = null;

/**
 * Start the Flask transcription service
 */
export function startTranscriptionService(): void {
  if (transcriptionServiceRunning) {
    logger.info('Transcription service is already running');
    return;
  }

  const transcriptionPath = path.join(process.cwd(), 'audio_transcription');
  
  if (!fs.existsSync(transcriptionPath)) {
    logger.error(`Transcription service directory not found at ${transcriptionPath}`);
    return;
  }

  logger.info('Starting transcription service...');
  
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    logger.error('OPENAI_API_KEY environment variable is not set. Transcription service cannot start.');
    return;
  }
  
  // Spawn a process to run the Flask app
  transcriptionProcess = spawn('python', [
    path.join(transcriptionPath, 'main.py')
  ], {
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
    }
  });

  transcriptionProcess.stdout?.on('data', (data: Buffer) => {
    logger.info(`${data.toString().trim()}`);
  });

  transcriptionProcess.stderr?.on('data', (data: Buffer) => {
    logger.error(`${data.toString().trim()}`);
  });

  transcriptionProcess.on('close', (code: number) => {
    logger.info(`Transcription service exited with code ${code}`);
    transcriptionServiceRunning = false;
    transcriptionProcess = null;
  });

  transcriptionServiceRunning = true;
}

/**
 * Stop the Flask transcription service
 */
export function stopTranscriptionService(): void {
  if (transcriptionProcess) {
    transcriptionProcess.kill();
    transcriptionServiceRunning = false;
    transcriptionProcess = null;
    logger.info('Transcription service stopped');
  }
}

/**
 * Setup routes to proxy requests to the transcription service
 */
export function setupTranscriptionProxy(app: Express): void {
  // Start the transcription service when setting up the proxy
  startTranscriptionService();

  // Create a proxy for the transcription service
  const proxyMiddleware = createProxyMiddleware({
    target: 'http://localhost:81',
    changeOrigin: true,
    pathRewrite: {
      '^/transcription': '/', // Map /transcription to root URL of the service
    },
    // @ts-ignore: logLevel is valid but TypeScript definition doesn't include it
    logLevel: 'warn',
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      // Using type assertion to satisfy TypeScript
      const typedReq = req as Request;
      logger.info(`Proxying ${typedReq.method} ${typedReq.url} to transcription service (http://localhost:81)`);
      
      // Log headers
      logger.info(`Request headers: ${JSON.stringify(typedReq.headers)}`);
    },
    onError: (err: any, req: any, res: any) => {
      const typedRes = res as Response;
      const errorMessage = 'Transcription service is not available';
      logger.error(`Proxy error: ${err.message}`);
      
      if (!typedRes.headersSent) {
        typedRes.status(502).json({ error: errorMessage });
      }
    }
  });

  // Apply the proxy middleware for all routes starting with /transcription
  app.use('/transcription', proxyMiddleware);

  // Add a health check endpoint for the transcription service
  app.get('/api/transcription/health', (req: Request, res: Response) => {
    if (transcriptionServiceRunning) {
      res.json({ status: 'healthy', service: 'transcription' });
    } else {
      res.status(503).json({ status: 'unhealthy', service: 'transcription' });
    }
  });

  // When the server stops, also stop the transcription service
  process.on('exit', () => {
    stopTranscriptionService();
  });

  // Handle shutdown signals
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      stopTranscriptionService();
      process.exit(0);
    });
  });
}