# Jesko AI Platform - Deployment Checklist

This checklist guides you through the process of deploying the Jesko AI Platform to Render.com.

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set in Render:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token generation
- `OPENAI_API_KEY` - For AI features
- `ELEVENLABS_API_KEY` - For voice generation
- `RUNWAY_API_KEY` - For video generation
- `ANTHROPIC_API_KEY` - For Claude AI integration
- `NODE_ENV` - Set to "production"

### 2. Database Setup
- Create PostgreSQL database in Render
- Note the connection string for the `DATABASE_URL` environment variable

### 3. Code Preparation
- Ensure all code is committed to GitHub
- Verify `package.json` contains correct dependencies
- Check build and start scripts are properly configured:
  - Build: `npm install && npm run build`
  - Start: `node dist/index.js`

### 4. Render Service Configuration
- Web Service type: Node.js
- Build Command: `npm install && npm run build`
- Start Command: `node dist/index.js`
- Auto-Deploy: Enabled (recommended)

## Deployment Steps

1. **Create New Web Service in Render**
   - Connect to your GitHub repository
   - Set the name (e.g., "jesko-ai-platform")
   - Select the appropriate branch

2. **Configure Environment Variables**
   - Add all required variables from the checklist above
   - For sensitive values, use Render's environment variables

3. **Set Up Database**
   - Create a PostgreSQL database in Render
   - Link it to your web service

4. **Deploy**
   - Click "Create Web Service"
   - Monitor the build logs for any errors

5. **Verify Deployment**
   - Check that the application is running
   - Test critical features
   - Monitor server logs

## Post-Deployment Tasks

1. **Set Up Custom Domain (Optional)**
   - Configure a custom domain in Render settings
   - Update DNS records as instructed

2. **Configure SSL**
   - Render provides automatic SSL with Let's Encrypt

3. **Monitor Performance**
   - Set up tracking in Render Dashboard
   - Check application logs regularly

4. **Backup Strategy**
   - Configure regular database backups
   - Document restore procedures

## Troubleshooting

If you encounter deployment issues:

1. **Check Build Logs**
   - Examine the build logs in Render for errors
   - Verify all dependencies are being installed correctly

2. **Verify Environment Variables**
   - Ensure all required variables are set correctly
   - Check for typos in values

3. **Test Database Connection**
   - Verify the database connection string is correct
   - Check database credentials

4. **Review Application Logs**
   - Examine application logs for runtime errors
   - Look for startup failures

5. **Simplified Deployment Option**
   - If needed, use the simplified server.js for troubleshooting
   - Deploy with `node server-production.js` as the start command