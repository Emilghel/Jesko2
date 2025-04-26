# Render Quickstart Guide

This guide provides simple steps to quickly deploy Jesko AI to Render.

## Quick Deployment Steps

1. **Create a Web Service on Render**:
   - Connect to your GitHub repository
   - Select the branch: `deployment-new`
   - Give it a name: `jesko-ai`
   - Select Environment: `Node`
   - Build Command: `chmod +x render-min-build.sh && ./render-min-build.sh`
   - Start Command: `NODE_ENV=production node dist/index.js`

2. **Set Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `JWT_SECRET`: Your JWT secret (ex: `1ZDvMNbvmc0YyGLNL3XiUIRxsCq9FyGG7iqoZddDMIE=`)

3. **Deploy the Service**:
   - Click "Create Web Service"
   - Wait for the deployment to complete

## Database Setup (After Initial Deployment)

Once your API is deployed and running:

1. **Create a PostgreSQL Database**:
   - Click "New" and select "PostgreSQL"
   - Name: `jesko-postgres`
   - User: Leave as default
   - Database: `jesko_db`
   - Create Database

2. **Connect Your Database**:
   - Go to your web service settings
   - Add environment variable: `DATABASE_URL`
   - Value: Copy the Internal Database URL from your Postgres service
   - Save changes and redeploy

3. **Verify Database Connection**:
   - Visit `https://your-app.onrender.com/database-check.html`
   - Click "Check Again" to test the database connection

## Setting Up Full Frontend (Optional)

If you need the full frontend application:

1. **Build Locally**:
   ```bash
   git clone https://github.com/Emilghel/Jesko2.git
   cd Jesko2
   npm install
   npx vite build
   ```

2. **Upload to Render**:
   - Zip the contents of `client/dist`
   - Use Render shell to upload and extract to `dist/public`
   - Redeploy the service

## Troubleshooting

- **API Works But Frontend Doesn't**: Follow the frontend setup steps above
- **Database Connection Fails**: Check DATABASE_URL format and ensure the database is running
- **Build Fails**: Check Render logs for specific error messages

## Full Documentation

For more detailed instructions, see:
- [RENDER_DEPLOYMENT_SUMMARY.md](./RENDER_DEPLOYMENT_SUMMARY.md)
- [RENDER_DATABASE_SETUP.md](./RENDER_DATABASE_SETUP.md)
- [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md)