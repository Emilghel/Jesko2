/**
 * Generate a bcrypt hash for a password
 */
import bcrypt from 'bcrypt';

async function generateHash() {
  const password = 'partner123'; // Simple password for testing
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Hash:', hash);
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash();