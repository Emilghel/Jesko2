# Replit Port Configuration Guide

This guide explains how the port configuration works for the Jesko AI application in the Replit environment.

## Port Configuration in Replit

Replit requires applications to run on port `5000` for proper external access. Traffic coming from the internet through HTTPS (port 443) is internally forwarded to port 5000 on your Replit instance.

## Configuration Files

### 1. `server/port-fix.js`

This module detects if the application is running in a Replit environment and sets the appropriate port and proxy settings:

```javascript
// Detects Replit environment using process.env.REPL_ID or process.env.REPLIT
function setupPortProxy() {
  if (isReplitEnv || process.env.REPLIT) {
    console.log('Replit environment detected, using port 5000');
    process.env.PORT = '5000';
    
    return {
      port: 5000,
      trustProxy: true
    };
  }
  
  // For non-Replit environments
  return {
    port: process.env.PORT || 3000,
    trustProxy: false
  };
}
```

### 2. `server/index.ts`

The main server file uses the port-fix module and applies the required settings:

```typescript
// Initialize port-fix to ensure compatibility with Replit
let portSettings = { port: process.env.PORT || 3000, trustProxy: false };
try {
  const portFix = require('./port-fix');
  portSettings = portFix.setupPortProxy();
  console.log(`Port configured for ${portSettings.port} with trustProxy=${portSettings.trustProxy}`);
} catch (err) {
  log('Port-fix module not available, skipping (only needed for Replit)');
}

const app = express();

// Set trust proxy based on environment
if (portSettings.trustProxy) {
  app.set('trust proxy', true);
  console.log('Express "trust proxy" setting enabled for Replit environment');
}
```

### 3. `.env` Configuration

Added a `REPLIT=true` entry to the environment to ensure the application recognizes the Replit environment even when traditional Replit environment variables aren't available.

## Port Usage

The application uses the following port configuration:

- Public-facing port: `443` (HTTPS) - automatically handled by Replit
- Internal application port: `5000` - where our Express server listens
- SalesGPT service port: `3001` - internal service that's proxied through Express

## Common Issues

1. **502 Bad Gateway**: This often indicates that the application isn't listening on port 5000 as expected.

2. **CORS Errors**: These can occur when the application's URLs don't match the actual hostname that Replit assigns.

3. **WebSocket Connection Failures**: WebSocket connections need special handling in Replit. We use a distinct path for WebSockets to avoid conflicts.

## Troubleshooting

If port issues persist:

1. Verify that `process.env.PORT` is set to `5000` in the server logs.
2. Check that `trustProxy` is enabled in the Express app when running in Replit.
3. Ensure that host is set to `0.0.0.0` to allow external connections.
4. Confirm that no other services are trying to use the same ports.

## CSRF and Security

When using the `trust proxy` setting, be aware that the application will trust the `X-Forwarded-For` header. This is necessary for proper IP-based rate limiting in Replit where all requests come through a proxy.