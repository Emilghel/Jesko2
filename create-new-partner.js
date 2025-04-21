/**
 * Create Partner Account with Tokens
 * 
 * This script creates a new partner account with the specified email and password,
 * and assigns initial tokens.
 */

import { db } from './server/storage.js';
import bcrypt from 'bcrypt';

async function createNewPartner() {
  // Command line arguments
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.error('Usage: node create-new-partner.js <email> <password>');
    process.exit(1);
  }
  
  try {
    // Check if partner already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });
    
    if (existingUser) {
      console.log(`Partner with email ${email} already exists`);
      process.exit(0);
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert partner record
    const newUser = await db.insert(db.schema.users).values({
      email: email,
      password: hashedPassword,
      displayName: email.split('@')[0],
      role: 'partner',
      coins: 100, // Give initial coins
      createdAt: new Date(),
      lastLogin: new Date()
    }).returning();
    
    console.log(`Partner account created successfully:`);
    console.log(`- Email: ${email}`);
    console.log(`- User ID: ${newUser[0].id}`);
    console.log(`- Initial coins: 100`);
    console.log(`\nPartner can now log in at /login with these credentials.`);
    
  } catch (error) {
    console.error('Error creating partner account:', error);
    process.exit(1);
  }
}

createNewPartner();