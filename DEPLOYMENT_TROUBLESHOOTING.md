# Deployment Troubleshooting Guide

This guide outlines common issues that may arise when deploying the Jesko AI application to Render and provides steps to resolve them.

## Static File Access Issues

If you're seeing the emergency index.html page but not the full application, the problem is likely that the frontend files aren't being properly built or copied during deployment.

### Solution:

1. Check the build logs on Render to see if there are any errors during the frontend build process
2. Visit `/debug-index-location` on your deployed app to see which paths were checked for the index.html file
3. Ensure that the `deploy-build.sh` script is executable by running:
   ```bash
   git update-index --chmod=+x deploy-build.sh
   git commit -m "Make deploy script executable"
   git push
   ```

4. If the frontend build is failing due to memory issues, try adding the following environment variable in your Render dashboard:
   - Key: `NODE_OPTIONS`
   - Value: `--max-old-space-size=4096`

## API Works But Frontend Doesn't

If you can access `/api/status` but the frontend is not loading, try the following:

1. Open the browser's developer console (F12) to check for frontend errors
2. Visit `/deployment-test.html` to check both API and static file serving
3. Verify that the `vite build` process is completing successfully in the build logs

### Manual Solution:

If all else fails, you can build the frontend locally and upload the compiled files to Render:

1. Run `npm run build` locally to generate the client/dist folder
2. Create a ZIP of the client/dist folder
3. Upload it directly to your Render service using SFTP or the web UI

## Database Connection Issues

If the API is working but database operations fail:

1. Check if the DATABASE_URL environment variable is correctly set in Render
2. Visit `/api/database-status` to check the database connection status
3. Ensure your IP is allowed in the database's access control settings

## Memory Issues During Build

If the build process fails with "Out of memory" errors:

1. Increase the memory limit for Node.js by setting the NODE_OPTIONS environment variable as mentioned above
2. Consider breaking up the build process into smaller chunks by modifying the deploy-build.sh script

## Port Configuration Issues

If the application is running but not accessible:

1. Ensure that your application is listening on the port specified by the PORT environment variable (usually set by Render)
2. In your code, make sure you're using:
   ```javascript
   const port = process.env.PORT || 10000;
   ```

## Environment Variables

Ensure all required environment variables are set in the Render dashboard:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT generation
- `NODE_ENV` - Set to "production"
- `OPENAI_API_KEY` - OpenAI API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `VITE_STRIPE_PUBLIC_KEY` - Stripe public key

## Logging and Debugging

To add more detailed logging to help diagnose issues:

1. Add more console.log statements in critical parts of the code
2. Create specific debug endpoints that return helpful information
3. Check the application logs in the Render dashboard

## Manual Building

If the automated build process doesn't work reliably, you can switch to a simpler build command in Render:

```bash
npm install && mkdir -p dist && npx vite build && npx esbuild server/production-server.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js && cp -r client/dist/* dist/public/
```

And for the start command:

```bash
NODE_ENV=production node dist/index.js
```

## Final Checklist

- [ ] Frontend builds successfully
- [ ] Static files are correctly copied to the right location
- [ ] API endpoints respond correctly
- [ ] Database connection is established
- [ ] Environment variables are properly set
- [ ] Application port is correctly configured
- [ ] Logs show no critical errors