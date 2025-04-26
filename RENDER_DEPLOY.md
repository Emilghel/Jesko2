# Render Deployment Guide for Jesko AI

## Introduction
This document provides step-by-step instructions for deploying Jesko AI to Render.com.

## Prerequisites
- A Render.com account
- Access to your project repository
- Your database connection string (from NeonDB or another PostgreSQL provider)
- The JWT secret for authentication
- Any other API keys needed for the application

## Environment Variables

Set up the following environment variables in your Render dashboard:

1. **Required Environment Variables**
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: Secret for JWT authentication (`1ZDvMNbvmc0YyGLNL3XiUIRxsCq9FyGG7iqoZddDMIE=`)
   - `SESSION_SECRET`: Secret for session management (can be the same as JWT_SECRET)
   - `NODE_ENV`: Set to `production`

2. **Optional API Keys** (add these when you want to enable the corresponding features)
   - `OPENAI_API_KEY`: For AI chat functionality
   - `ELEVENLABS_API_KEY`: For voice generation
   - `TWILIO_ACCOUNT_SID`: For SMS and phone call functionality
   - `TWILIO_AUTH_TOKEN`: For Twilio authentication
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number
   - `GOOGLE_CLIENT_ID`: For Google OAuth login
   - `GOOGLE_CLIENT_SECRET`: For Google OAuth login

## Deployment Steps

1. **Create a new Web Service**
   - Log in to your Render dashboard at https://dashboard.render.com/
   - Click "New" and select "Web Service"
   - Connect your GitHub repository or upload your code

2. **Configure the Service**
   - Name: `Jesko AI` (or your preferred name)
   - Region: Choose the closest to your users
   - Branch: `main` (or your deployment branch)
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `node server-render.js`
   - Instance Type: Choose based on your needs (starts with "Free")

3. **Add Environment Variables**
   - Click "Advanced" then "Add Environment Variable"
   - Add all required and optional environment variables listed above

4. **Deploy the Service**
   - Click "Create Web Service"
   - Wait for the build and deployment to complete

5. **Verify Deployment**
   - Once deployed, click the URL provided by Render
   - You should see the Jesko AI landing page
   - Test key functionality to ensure everything works correctly

## Troubleshooting

If you encounter issues:

1. **Check the Logs**
   - In your Render dashboard, select your service
   - Click on "Logs" to see deployment and runtime logs

2. **Database Connection Issues**
   - Verify your `DATABASE_URL` is correct
   - Ensure your database is publicly accessible from Render's IPs

3. **Static Asset Problems**
   - Make sure the paths in your code match the actual file structure
   - Verify that files are being properly served from the correct directories

4. **Authentication Problems**
   - Confirm that your `JWT_SECRET` is correctly set
   - Check that cookies and sessions are properly configured

## Updating Your Deployment

To update your deployed application:

1. Push changes to your GitHub repository
2. Render will automatically detect the changes and rebuild
3. Monitor the logs to ensure successful deployment

## Support

If you need help with Render-specific issues, contact Render support at https://render.com/support

For application-specific issues, check the project documentation or contact the development team.