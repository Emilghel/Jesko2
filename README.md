# Jesko AI - Partner Management & AI Video Platform

Jesko AI is an advanced AI-powered partner management platform that delivers secure, intelligent administrative workflows through cutting-edge security design and user-centric technologies.

## Core Features

- AI Video Generation & Editing
- Partner Ecosystem Management
- Lead Management System
- Voice Synthesis & Audio Processing
- Admin Dashboard & Controls
- Secure User Authentication
- Coin-based Credit System
- Automated Agent Management

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI Components
- **Backend**: Node.js, Express, PostgreSQL
- **AI Integration**: OpenAI, ElevenLabs, Runway ML
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT Tokens, bcrypt password hashing
- **Audio Processing**: Whisper, ElevenLabs
- **Video Generation**: Runway ML

## Environment Variables

The application requires the following environment variables to be set:

```env
# Database
DATABASE_URL=postgresql://username:password@hostname:port/database

# Authentication
JWT_SECRET=your_jwt_secret_key

# AI Services
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
RUNWAY_API_KEY=your_runway_api_key

# Optional Services
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Deployment to Render

### Prerequisites

1. A PostgreSQL database (can be provisioned on Render)
2. API keys for OpenAI, ElevenLabs, and Runway ML
3. A Render account

### Steps

1. **Create a PostgreSQL Database on Render**
   - Go to the Render Dashboard
   - Click "New" → "PostgreSQL"
   - Fill out the form (name, region, etc.)
   - Click "Create Database"
   - Note the connection details (hostname, port, username, password, database name)

2. **Create a Web Service on Render**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Fill out the form:
     - Name: "jesko-ai" (or preferred name)
     - Environment: "Node.js"
     - Build Command: `npm install`
     - Start Command: `npm run dev`

3. **Configure Environment Variables**
   - Go to the "Environment" tab
   - Add all the required environment variables
   - Important: Add `DATABASE_URL` from your PostgreSQL database
   - Set `NODE_ENV=production`

4. **Deploy the Application**
   - Click "Create Web Service"
   - Wait for the build to complete

5. **Verify the Deployment**
   - Open the application URL
   - The application should be running and connected to the database

## Local Development

```bash
# Install dependencies
npm install

# Start the database (if using Docker)
docker-compose up -d db

# Start the development server
npm run dev
```

## Important Notes

- The uploads directory is not included in the repository due to its size. It will be automatically created by the application.
- The workflow is configured to run `npm run dev` to start the application.
- Express is configured to run on port 3000 by default but will use `PORT` environment variable if set.
- Setting `trust proxy` in Express is needed if running behind a proxy like Render's.
