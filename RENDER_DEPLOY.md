# Render.com Deployment Guide

This guide explains how to deploy the Jesko AI platform to Render.com.

## Prerequisites

1. A [Render.com](https://render.com) account
2. Access to the GitHub repository 
3. Required API keys:
   - OpenAI API Key
   - ElevenLabs API Key (optional for voice synthesis)
   - Runway API Key (optional for video generation)
   - Anthropic API Key (optional for Claude AI integration)
4. A PostgreSQL database (can be provisioned on Render.com or use existing NeonDB instance)

## Deployment Steps

### 1. Create a New Web Service

1. Log in to your Render.com dashboard
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service with these settings:
   - **Name**: jesko-ai (or your preferred name)
   - **Environment**: Node
   - **Region**: Choose the region closest to your users
   - **Branch**: main (or your deployment branch)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `./start-render.sh`
   - **Plan**: Choose a plan based on your needs (at least 1GB RAM recommended)

### 2. Configure Environment Variables

Add the following environment variables:

```
NODE_ENV=production
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
RUNWAY_API_KEY=your_runway_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Create a PostgreSQL Database (Optional)

If you don't have an existing database:

1. In your Render.com dashboard, click "New +" and select "PostgreSQL"
2. Configure your database settings
3. After creation, grab the internal connection string and add it as the `DATABASE_URL` environment variable in your web service

### 4. Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy your application
3. Once deployed, you can access your application at the provided Render URL

## Troubleshooting

If you encounter issues:

1. Check the logs in the Render dashboard
2. Verify all environment variables are set correctly
3. Ensure your database is properly configured and accessible
4. Check if the start script has proper permissions: `git update-index --chmod=+x start-render.sh`

## Updating Your Deployment

When you push changes to your connected GitHub repository, Render will automatically rebuild and deploy your application.