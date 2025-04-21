// This script creates an admin user for testing purposes
require('tsx').register();
const { registerUser } = require('../server/lib/auth-simple');

async function createAdminUser() {
  try {
    const username = 'admin';
    const email = 'admin@warmleadnetwork.com';
    const password = 'password123';
    const displayName = 'System Administrator';
    const isAdmin = true;

    console.log('Creating admin user...');
    const user = await registerUser(username, email, password, displayName, isAdmin);
    console.log('Admin user created successfully:', user);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();