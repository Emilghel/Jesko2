// Run with: npx tsx scripts/create-user.js

import bcrypt from 'bcrypt';
import { db } from '../server/db.js';
import { users } from '../shared/schema.js';

async function createAdminUser() {
  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'admin@warmleadnetwork.com')
    });

    if (existingUser) {
      console.log('Admin user already exists:', existingUser);
      return;
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const newUser = await db.insert(users).values({
      username: 'admin',
      email: 'admin@warmleadnetwork.com',
      password: hashedPassword,
      displayName: 'System Administrator',
      isAdmin: true,
      lastLogin: new Date()
    }).returning();

    console.log('Admin user created successfully:', newUser[0]);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();