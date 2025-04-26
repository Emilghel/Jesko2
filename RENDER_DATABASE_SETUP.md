# Render Database Setup Guide

This guide provides instructions for setting up and troubleshooting the PostgreSQL database connection for your Jesko AI application on Render.

## Current Status

The application is showing a database connection error:
```
Database issue: Database connection failed
Error: connect ECONNREFUSED 10.227.35.167:443
```

## Setting Up PostgreSQL on Render

### Option 1: Use Render's Built-in PostgreSQL Service

1. **Create a PostgreSQL Database**:
   - Log in to your Render dashboard
   - Click on "New" and select "PostgreSQL"
   - Fill in the database details:
     - Name: `jesko-postgres`
     - Database: `jesko_db`
     - User: Leave default
     - Region: Choose closest to your users
   - Click "Create Database"

2. **Get the Database URL**:
   - Once created, Render will show you the database connection details
   - Note the "Internal Database URL" - this is what you'll use for connecting from another Render service
   - It will look like: `postgres://username:password@postgresql-instance-name.render.com:5432/database_name`

3. **Set the Environment Variable**:
   - Go to your Jesko AI web service in Render
   - Navigate to the "Environment" tab
   - Add a new environment variable:
     - Key: `DATABASE_URL`
     - Value: Paste the Internal Database URL from step 2
   - Click "Save Changes"

4. **Redeploy Your Application**:
   - Click "Manual Deploy" > "Deploy latest commit"

### Option 2: Use an External PostgreSQL Database

If you're using an external PostgreSQL service (like ElephantSQL, AWS RDS, or a self-hosted instance):

1. **Ensure Network Access**:
   - The database must allow connections from Render's IP ranges
   - Check your database provider's documentation for whitelisting IPs

2. **Set the Connection String**:
   - Format: `postgres://username:password@hostname:port/database_name`
   - Add this as the `DATABASE_URL` environment variable in your Render service

## Troubleshooting Database Connection Issues

### 1. Verify Environment Variables

Make sure the `DATABASE_URL` environment variable is correctly set in your Render service:

1. Go to your service in Render
2. Navigate to "Environment"
3. Check that `DATABASE_URL` exists and has the correct value
4. If you make changes, redeploy your application

### 2. Check Database Credentials

1. Test your database credentials with a direct connection:
   ```bash
   psql "postgres://username:password@hostname:port/database_name"
   ```
2. If you can't connect directly, the credentials may be incorrect

### 3. Check Network Access

1. Render services can only connect to databases that:
   - Accept connections from Render's IP ranges
   - Are publicly accessible or within Render's private network
2. For external databases, ensure the database server allows incoming connections on the PostgreSQL port (typically 5432)

### 4. SSL Requirements

1. Some PostgreSQL providers require SSL connections
2. Update your connection string to include SSL parameters:
   ```
   postgres://username:password@hostname:port/database_name?sslmode=require
   ```

### 5. Check Database Logs

1. If using Render's PostgreSQL, check the database logs:
   - Go to your PostgreSQL service in Render
   - Click on "Logs"
   - Look for connection errors or rejected connections

### 6. Verify Service Status

1. Ensure your database service is running
2. Check for any maintenance or outages reported by your provider

## Next Steps

Once your database connection is working:

1. Run migrations if needed (check the Render deployment logs to see if migrations are running automatically)
2. Verify data access through API endpoints
3. Proceed with the frontend deployment as outlined in [RENDER_DEPLOYMENT_STAGED.md](./RENDER_DEPLOYMENT_STAGED.md)

## Further Assistance

If you continue to experience database connection issues:

1. Contact your database provider's support
2. Check Render's documentation at [https://render.com/docs/databases](https://render.com/docs/databases)
3. Consider using database connection pooling to improve stability and performance