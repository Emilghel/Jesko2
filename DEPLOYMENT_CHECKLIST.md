# Deployment Checklist for Jesko AI

Use this checklist to ensure a smooth deployment of Jesko AI to production.

## Before Deployment

- [ ] Run tests to ensure all functionality works as expected
- [ ] Verify all API endpoints are working correctly
- [ ] Check for any hardcoded development URLs or credentials
- [ ] Ensure proper error handling throughout the application
- [ ] Remove any debugging code or console logs
- [ ] Verify that all required environment variables are documented

## Environment Variables

Ensure these environment variables are configured in your production environment:

- [ ] `NODE_ENV=production` - Set environment to production mode
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Secret key for JWT authentication
- [ ] `OPENAI_API_KEY` - API key for OpenAI services
- [ ] `ELEVENLABS_API_KEY` - API key for ElevenLabs voice synthesis (if used)
- [ ] `RUNWAY_API_KEY` - API key for Runway video generation (if used)
- [ ] `ANTHROPIC_API_KEY` - API key for Anthropic Claude AI (if used)

## Database

- [ ] Ensure the database is properly configured and accessible
- [ ] Verify database migrations run successfully
- [ ] Check that database connection pool settings are appropriate for production

## Server Configuration

- [ ] Set appropriate memory allocation (minimum 1GB recommended)
- [ ] Configure auto-scaling if necessary
- [ ] Enable HTTPS/SSL for all traffic
- [ ] Set up health checks for monitoring

## Post-Deployment

- [ ] Verify the application starts correctly
- [ ] Test core functionality on the production site
- [ ] Check database connections are working
- [ ] Verify external API integrations (OpenAI, ElevenLabs, etc.)
- [ ] Monitor error logs for any issues
- [ ] Test user authentication flows

## Security

- [ ] Ensure all API endpoints are properly authenticated
- [ ] Verify that sensitive routes are protected
- [ ] Check for any exposed secrets or credentials
- [ ] Confirm proper CORS settings in production
- [ ] Enable rate limiting for authentication endpoints

## Performance

- [ ] Verify load times are acceptable
- [ ] Check API response times
- [ ] Monitor resource usage (CPU, memory)
- [ ] Set up performance monitoring