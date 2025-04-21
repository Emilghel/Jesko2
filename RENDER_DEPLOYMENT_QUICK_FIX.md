# Render Deployment Quick Fix Guide

This guide provides fast solutions to common deployment issues on Render.com. Use these fixes to quickly get your application running while you work on more permanent solutions.

## Emergency One-Line Server

If your application is completely failing to start, use this one-line server as an absolute last resort:

1. Go to your Render.com dashboard
2. Navigate to your web service
3. Go to Settings > Build & Deploy
4. Set the Build Command to: `npm install express cors`
5. Set the Start Command to:
```
node -e "const express=require('express');const app=express();app.get('*',(req,res)=>res.send('<h1>Jesko AI</h1><p>Temporary server while we perform maintenance</p>'));app.listen(process.env.PORT||3000);"
```
6. Click "Save Changes" and deploy

This will deploy a minimal server that at least keeps your domain active while you fix the underlying issues.

## Database Connection Issues

If your application can't connect to the database:

1. Check if your DATABASE_URL environment variable is set
2. Verify the format of your connection string
3. Try this quick fix start command that ignores database errors:
```
node -e "const express=require('express');const app=express();app.get('/health',(req,res)=>res.json({status:'ok'}));app.get('*',(req,res)=>res.send('<h1>Database Maintenance</h1><p>Our database is currently undergoing maintenance. Please check back soon.</p>'));app.listen(process.env.PORT||3000);"
```

## Schema File Issues

If your application has schema-related errors:

1. Deploy the server-render.js file as a temporary solution
2. Set the Start Command to: `node server-render.js`
3. Fix the schema file in your GitHub repository
4. Once fixed, redeploy with the proper start command

## Missing Dependencies

If your application is failing due to missing dependencies:

1. Set the Build Command to: `npm install express cors pg`
2. Set the Start Command to: `node server-render.js`
3. Update your package.json with the correct dependencies
4. Push the changes to GitHub and redeploy

## Environment Variable Problems

If your application is crashing due to missing environment variables:

1. Deploy the server-render.js file as a temporary solution
2. Add all required environment variables in the Render dashboard
3. Redeploy with the proper start command

## Staged Recovery Process

Follow this step-by-step process to recover from deployment issues:

1. Deploy minimal one-line server to keep the domain active
2. Deploy server-render.js for basic functionality
3. Fix schema and dependency issues in your repository
4. Deploy the full application with proper build/start commands

## Checking Logs

Always check your Render logs for specific error messages:

1. Go to your Render dashboard
2. Navigate to your web service
3. Click on "Logs" in the sidebar
4. Look for error messages in red

## Testing Changes Safely

Before deploying directly to production:

1. Create a new web service with a different name
2. Deploy your changes to this service
3. Test everything thoroughly
4. Once confirmed working, update your production service