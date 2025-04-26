# Staged Render Deployment Guide

This guide outlines a staged approach to deploying the full Jesko AI application to Render.

## Current Deployment Status

Currently, we have:
- ✅ API server running successfully
- ✅ Basic static file serving working
- ❌ Full frontend application not deployed

The current deployment is intentionally using a simplified approach where we're not attempting to build the frontend during the Render deployment process, as this may be causing timeout or memory issues.

## Step 1: API-Only Deploy (Current)

The current deployment focuses on getting the API up and running without a full frontend. This lets us validate that:

- The server can start successfully
- API endpoints are accessible and working
- Database connections are established
- Authentication works correctly

## Step 2: Manual Frontend Upload (Next)

To get the frontend working, follow these steps:

1. **Build the Frontend Locally**:
   ```bash
   # Clone the repository
   git clone https://github.com/Emilghel/Jesko2.git
   cd Jesko2
   
   # Install dependencies
   npm install
   
   # Build the frontend
   npx vite build
   ```

2. **Package the Frontend Files**:
   ```bash
   cd client/dist
   zip -r ../frontend-dist.zip .
   ```

3. **Upload to Render**:
   - Log into the Render dashboard
   - Navigate to your Jesko AI service
   - Go to the "Shell" tab
   - Execute these commands:
     ```bash
     mkdir -p dist/public
     cd dist/public
     curl -o frontend.zip <URL to your uploaded zip file>
     unzip frontend.zip
     ls -la  # Verify files were extracted correctly
     ```

4. **Restart the Service**:
   - Go back to the main service page in Render
   - Click "Manual Deploy" > "Deploy latest commit"

## Step 3: Integrated Build (Future)

Once we've confirmed everything works, we can work on integrating the frontend build into the automated deployment process. This might involve:

1. Increasing build memory limits
2. Optimizing the build process
3. Using Render's build hooks for more control
4. Creating a separate frontend service if needed

## Troubleshooting

If you encounter issues with the manual upload approach:

1. **Check File Paths**: Ensure files are in the correct location (should be in `dist/public/`)
2. **Fix Permissions**: Make sure files have correct permissions with `chmod -R 755 dist/public`
3. **Check Logs**: Review Render logs for any file access errors
4. **Verify Static Serving**: Test with a simple HTML file first

## API Access

Even without the frontend, all API endpoints are fully functional and can be accessed directly:

- **Status Check**: `GET /api/status`
- **User Authentication**: `POST /api/login` and `POST /api/register`
- **Partner Routes**: `GET /api/partner/*`
- **Admin Dashboard**: `GET /api/admin/*`

## Additional Resources

- [Render Static Site Docs](https://render.com/docs/static-sites)
- [Render Web Service Docs](https://render.com/docs/web-services)
- See [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md) for more detailed debugging tips