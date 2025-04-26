# Jesko AI Quick Deployment Guide for Render

Follow these quick steps to deploy Jesko AI on Render:

## 1. Set Up Repository

Ensure you have the project in a GitHub repository with the `deployment-new` branch.

## 2. Create Web Service on Render

1. Log in to Render dashboard
2. Click "New" → "Web Service"
3. Connect to your GitHub repository
4. Use these settings:
   - **Name**: `jesko-ai` (or your preferred name)
   - **Environment**: `Node`
   - **Branch**: `deployment-new`
   - **Build Command**: `chmod +x ./deploy-build.sh && ./deploy-build.sh`
   - **Start Command**: `NODE_ENV=production node dist/index.js`

## 3. Set Environment Variables

Add these environment variables:
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT authentication (e.g., generated with `openssl rand -base64 32`)
- `NODE_ENV`: Set to `production`
- `OPENAI_API_KEY`: Your OpenAI API key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `VITE_STRIPE_PUBLIC_KEY`: Your Stripe public key

## 4. Deploy and Verify

1. Click "Create Web Service"
2. Wait for the build to complete (~3-5 minutes)
3. Visit your new Render URL to verify the application works
4. Check for database connectivity by visiting `[your-url]/api/database-status`

## Troubleshooting

If deployment fails:
1. Check Render logs for specific errors
2. Verify all environment variables are set correctly
3. Confirm database connection string is valid
4. Try redeploying manually from the Render dashboard

For detailed guidance, see the full [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md).