# Render PostgreSQL Database Setup Guide

This guide provides detailed instructions for setting up and configuring a PostgreSQL database for the Jesko AI Platform on Render.com.

## Creating a PostgreSQL Database on Render

### Step 1: Create the Database

1. Log in to your Render dashboard
2. Click "New +" in the top-right corner
3. Select "PostgreSQL" from the dropdown menu
4. Fill in the database details:
   - **Name**: Choose a meaningful name (e.g., `jesko-production-db`)
   - **Database**: Leave as default or specify a custom name
   - **User**: Leave as default or set a custom username
   - **Region**: Select the region closest to your users
   - **Instance Type**: Choose based on your needs (at least 1GB RAM recommended)
   - **Storage**: Start with 10GB for most applications (can be increased later)
5. Click "Create Database"

### Step 2: Get Connection Information

After the database is created, you'll be redirected to its dashboard page. From here:

1. Note the following information:
   - **Internal Database URL**: This is what your web service will use
   - **External Database URL**: For connecting from outside Render
   - **PSQL Command**: For command-line access to your database

2. The **Internal Database URL** is what you'll need for your application. It follows this format:
   ```
   postgres://username:password@hostname:port/database_name
   ```

### Step 3: Connect Your Web Service

1. Go to your Jesko AI web service in Render
2. Navigate to the "Environment" tab
3. Add the following environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the Internal Database URL from Step 2
4. Click "Save Changes"

## Database Migration and Schema Setup

Once your database is created and connected to your service, you'll need to set up your schema.

### Option 1: Automatic Migration on Deployment

Add a migration step to your build script in `package.json`:

```json
"scripts": {
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && npm run db:push",
  "db:push": "drizzle-kit push"
}
```

This will automatically run your migrations during the build process.

### Option 2: Manual Migration

For more control, you can run migrations manually:

1. Connect to your database using the PSQL command from your Render dashboard:
   ```bash
   PGPASSWORD=your_password psql -h hostname -p port -U username database_name
   ```

2. Run your SQL migrations manually or use the Drizzle CLI tools.

## Database Management

### Accessing the Database

You can access your database in several ways:

1. **Render Dashboard**: Basic operations can be performed via the Render dashboard
2. **PSQL Command Line**: Use the PSQL command provided by Render
3. **External Tools**: Use tools like pgAdmin, DBeaver, or TablePlus with the External Database URL

### Database Backup

Render automatically creates daily backups of your database. To manage backups:

1. Go to your database in the Render dashboard
2. Click the "Backups" tab
3. From here you can:
   - View available backups
   - Create a manual backup
   - Restore from a backup

### Performance Monitoring

Monitor your database performance:

1. Go to your database in the Render dashboard
2. Click the "Metrics" tab to view:
   - CPU usage
   - Memory usage
   - Disk usage
   - Connection count

### Scaling

If you need to scale your database:

1. Go to your database in the Render dashboard
2. Click "Change Plan"
3. Select a larger instance type
4. Confirm the change

## Troubleshooting Database Connections

If your application can't connect to the database:

1. **Check Environment Variables**: Verify `DATABASE_URL` is set correctly
2. **Check Network Access**: Ensure your web service has network access to the database
3. **Verify Credentials**: Double-check username and password in the connection string
4. **Check Instance Status**: Verify the database instance is running
5. **Connection Limits**: Check if you've hit connection limits (especially on free plans)

For persistent issues, Render's logs can provide valuable information:

1. Go to your web service in the Render dashboard
2. Click "Logs"
3. Look for database-related errors or connection issues

## Best Practices

1. **Use Connection Pooling**: Implement connection pooling to manage database connections efficiently
2. **Prepare for Restarts**: Render databases may occasionally restart for maintenance; ensure your application handles reconnections gracefully
3. **Monitor Usage**: Regularly check your database metrics to ensure you're not approaching limits
4. **Regular Backups**: Although Render provides automatic backups, consider implementing additional backup strategies for critical applications
5. **Secure Secrets**: Never commit database credentials to your code repository