/**
 * Simplified Express Server for Production Deployment on Render.com
 * 
 * This is a simplified Express server designed for production deployment on Render.com.
 * It serves static files from the 'dist' directory where the Vite build output is located,
 * and all API routes from the main Express server.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import { registerRoutes } from './routes.js';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers for production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Register API routes
const httpServer = await registerRoutes(app);

// Serve static files from 'dist' directory
app.use(express.static(path.join(__dirname, '../dist')));

// For any other request, serve the index.html file (client-side routing)
app.get('*', (req, res) => {
  // Skip API routes - they should have been handled by registerRoutes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

export default app;