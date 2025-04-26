# Render Deployment Quick Fix Guide

This guide addresses common deployment issues for the Jesko AI Platform on Render.com and provides quick solutions.

## Common Issues and Solutions

### 1. Build Failing

**Problem**: The build process fails with errors.

**Quick Solutions**:
- Check the build logs for specific error messages
- Verify that all dependencies are correctly listed in package.json
- Try clearing the build cache in Render dashboard
- Ensure your build command is correct: `npm install && npm run build`

**Emergency Fix**:
If your build is failing consistently, deploy the simplified server:
1. Set Start Command to: `node run-simple-server.js`
2. Clear build cache and redeploy

### 2. Database Connection Errors

**Problem**: Application starts but can't connect to the database.

**Quick Solutions**:
- Verify DATABASE_URL environment variable is correctly set
- Check if the database service is running
- Verify IP allow list settings if applicable
- Test the connection string locally if possible

**Emergency Fix**:
Update your code to handle database connection failures more gracefully:
```javascript
try {
  await db.connect();
  console.log('Connected to database');
} catch (error) {
  console.error('Database connection failed, continuing with limited functionality', error);
  // Application can still run with limited functionality
}
```

### 3. Memory/Resource Issues

**Problem**: Application crashes with out-of-memory errors.

**Quick Solutions**:
- Upgrade to a higher plan with more memory
- Optimize your application's memory usage
- Implement garbage collection best practices
- Add memory monitoring and logging

**Emergency Fix**:
Add a memory limit for Node.js:
```
NODE_OPTIONS="--max-old-space-size=512"
```

### 4. Application Starts But Shows Blank Page

**Problem**: Deployment succeeds but the website shows a blank page.

**Quick Solutions**:
- Check browser console for JavaScript errors
- Verify that the build process completed successfully
- Check if static assets are being served correctly
- Look for path resolution issues in your server code

**Emergency Fix**:
Deploy with specific path configuration:
```javascript
// Add this to your Express server
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

### 5. API Routes Not Working

**Problem**: Frontend loads but API requests fail.

**Quick Solutions**:
- Check API route definitions
- Verify that your API routes are being registered correctly
- Look for CORS issues
- Check for authentication/authorization errors

**Emergency Fix**:
Add explicit CORS configuration:
```javascript
app.use(cors({
  origin: '*', // For emergency fix only, restrict this in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 6. Environment Variables Not Loading

**Problem**: Environment variables set in Render don't seem to be available.

**Quick Solutions**:
- Verify environment variables are set correctly in Render dashboard
- Check for typos in environment variable names
- Ensure your application is accessing them correctly
- Restart the service after adding new environment variables

**Emergency Fix**:
Add a debug route to check environment variables (remove after troubleshooting):
```javascript
app.get('/debug-env', (req, res) => {
  res.json({
    envVars: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      // Don't expose actual secret values
    }
  });
});
```

### 7. SSL/TLS Issues

**Problem**: SSL certificate errors or HTTPS not working.

**Quick Solutions**:
- Let Render handle SSL (they provide automatic certificates)
- Check for hardcoded HTTP URLs in your code
- Ensure all assets are loaded over HTTPS

**Emergency Fix**:
Force HTTPS redirection:
```javascript
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

## Quick Emergency Rollback Plan

If a deployment causes critical issues:

1. In the Render dashboard, go to your service
2. Click "Manual Deploy" 
3. Select "Rollback to Previous Deployment"
4. Monitor the rollback process

## Getting Help

If these quick fixes don't resolve your issue:

1. Check Render's status page: https://status.render.com/
2. Consult the Render documentation: https://render.com/docs
3. Contact Render support through their dashboard
4. Join the Render community Discord: https://render.com/discord