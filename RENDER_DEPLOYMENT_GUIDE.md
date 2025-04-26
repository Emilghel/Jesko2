# Jesko AI Deployment Guide for Render

This guide provides step-by-step instructions for deploying the Jesko AI application on Render.

## Prerequisites

1. A Render account (https://render.com)
2. A PostgreSQL database (can be provisioned on Render or elsewhere)
3. Required environment variables ready

## Environment Variables

Ensure the following environment variables are set in your Render deployment:

- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT authentication
- `NODE_ENV`: Set to `production`
- `PORT`: Set to `10000` (or let Render assign one)
- `OPENAI_API_KEY`: Your OpenAI API key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `VITE_STRIPE_PUBLIC_KEY`: Your Stripe public key
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

## Deployment Steps

### 1. Fork or Clone the Repository

First, ensure you have the project code in a GitHub repository that Render can access.

### 2. Create a New Web Service on Render

1. Log in to your Render dashboard
2. Click "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure the following settings:

- **Name**: `jesko-ai` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose the region closest to your users
- **Branch**: `deployment-new` (or your deployment branch)
- **Build Command**: `chmod +x ./deploy-build.sh && ./deploy-build.sh`
- **Start Command**: `NODE_ENV=production node dist/index.js`

### 3. Configure Environment Variables

Add all the required environment variables listed above in the "Environment" section of your Render web service.

### 4. Set up Database

If you don't already have a PostgreSQL database:

1. On Render, go to "PostgreSQL" in the sidebar
2. Click "New PostgreSQL"
3. Configure your database settings
4. Once created, find the "External Database URL" and copy it
5. Add this as the `DATABASE_URL` environment variable in your web service settings

### 5. Deploy

Click "Create Web Service" and wait for the deployment to complete. Render will run the build script and start the application.

## Troubleshooting

### Common Issues:

1. **Build Failures**: Check build logs for specific errors. Common issues include:
   - Missing dependencies
   - Syntax errors in code
   - Permission issues with build scripts

2. **Database Connection Issues**: Verify that:
   - The `DATABASE_URL` is correct
   - The database server is accessible from Render
   - Database tables exist (they should be created automatically on first run)

3. **Application Errors**: Check application logs for runtime errors.

### Accessing Logs

To view your application logs:
1. Go to your Web Service in Render dashboard
2. Click on "Logs" in the top navigation

## Updating Your Deployment

When you push changes to the configured GitHub branch, Render will automatically redeploy your application.

## Custom Domain Setup

To set up a custom domain:
1. Go to your Web Service in Render dashboard
2. Click on "Settings"
3. Scroll to "Custom Domain"
4. Follow the instructions to add and verify your domain

## Security Notes

- Never commit sensitive environment variables to your repository
- Regularly rotate your JWT_SECRET and API keys
- Monitor your application for unusual activity

## Support

If you encounter any issues with your deployment, please contact Render support or consult their documentation for more assistance.