// This script adds a purchased phone number to a user account
import { sql } from 'drizzle-orm';
import { db } from './server/db.js'; // Import the database connection

async function addPurchasedPhoneNumber() {
  try {
    console.log('Adding purchased Twilio phone number to user account...');
    
    // First, find the user with the given email
    const userEmail = 'emilghelmeci@gmail.com';
    const users = await db.execute(sql`
      SELECT id FROM users WHERE email = ${userEmail}
    `);
    
    if (!users || users.length === 0) {
      console.error(`User with email ${userEmail} not found`);
      return;
    }
    
    const userId = users[0].id;
    console.log(`Found user with ID: ${userId}`);
    
    // Check if the phone number already exists
    const phoneNumber = '+15302886523';
    const existingNumbers = await db.execute(sql`
      SELECT id FROM purchased_phone_numbers 
      WHERE phone_number = ${phoneNumber}
    `);
    
    if (existingNumbers && existingNumbers.length > 0) {
      console.log(`Phone number ${phoneNumber} already exists in the database`);
      
      // Update the user_id if it's assigned to a different user
      if (existingNumbers[0].user_id !== userId) {
        await db.execute(sql`
          UPDATE purchased_phone_numbers
          SET user_id = ${userId}, is_active = true
          WHERE phone_number = ${phoneNumber}
        `);
        console.log(`Updated phone number ${phoneNumber} to be assigned to user ID: ${userId}`);
      }
      
      return;
    }
    
    // Insert the new phone number
    await db.execute(sql`
      INSERT INTO purchased_phone_numbers (
        user_id, phone_number, friendly_name, is_active, 
        purchase_date, monthly_cost, capabilities, country_code
      ) VALUES (
        ${userId}, ${phoneNumber}, 'Twilio Voice Line', true,
        CURRENT_TIMESTAMP, 4.87, '{"voice":true,"sms":true}', 'US'
      )
    `);
    
    console.log(`Successfully added phone number ${phoneNumber} to user ID: ${userId}`);
  } catch (error) {
    console.error('Error adding purchased phone number:', error);
  }
}

// Run the function
addPurchasedPhoneNumber()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });