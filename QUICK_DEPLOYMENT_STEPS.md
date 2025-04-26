# Jesko AI Platform - Quick Deployment Steps

This guide provides the essential steps to deploy Jesko AI Platform to Render.com as quickly as possible.

## 1. Prepare Your Repository

Ensure your code is committed to GitHub and contains:
- All necessary source files
- package.json with correct dependencies
- build scripts configured properly

## 2. Set Up Render Web Service

1. Log in to your Render dashboard
2. Click "New +" and select "Web Service"
3. Connect to your GitHub repository
4. Configure the service:
   - Name: `jesko-ai-platform` (or your preferred name)
   - Environment: `Node`
   - Region: Choose nearest to your users
   - Branch: `main` (or your deployment branch)
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/index.js`
   - Instance Type: Recommend at least Standard plan for production

## 3. Configure Environment Variables

Add these required environment variables:
- `DATABASE_URL`: Your Postgres connection string
- `JWT_SECRET`: A secure random string (use a generator)
- `OPENAI_API_KEY`: Your OpenAI API key
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key
- `RUNWAY_API_KEY`: Your Runway ML API key
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `NODE_ENV`: Set to `production`

## 4. Create PostgreSQL Database

1. In Render dashboard, go to "New +" and select "PostgreSQL"
2. Configure your database:
   - Name: `jesko-db` (or your preferred name)
   - User: Leave as default
   - Database: Leave as default
   - Create database

3. After creation, get the internal connection string
4. Add this as `DATABASE_URL` in your web service environment variables

## 5. Deploy

1. Click "Create Web Service" to start the deployment
2. Monitor the build logs for any errors
3. Once deployed, test the application at the provided URL

## 6. Verify Functionality

Access your deployed application and verify:
- Landing page loads correctly
- Authentication works
- API endpoints respond appropriately
- AI features function properly

## 7. Troubleshooting

If you encounter issues:
- Check the application logs in Render
- Verify all environment variables are set correctly
- Confirm database connection is working
- If needed, use the simplified server for testing
  (`node server-production.js`)

For more detailed instructions, refer to the complete [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md).