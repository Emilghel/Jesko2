const { pool } = require('../../server/db');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');

// Function to authenticate admin user
async function loginAdmin(req, res) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Get the user from the database
    const result = await pool.query(
      'SELECT id, username, password, "isAdmin" FROM users WHERE username = $1',
      [username]
    );
    
    // Check if user exists
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const user = result.rows[0];
    
    // Verify if the user is an admin
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Not an admin user.' });
    }
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Return token and user info
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
}

// Get current admin user profile
async function getProfile(req, res) {
  try {
    // User is already attached to the request by the authenticateToken middleware
    const { id, username, isAdmin } = req.user;
    
    // Return user info without sensitive data
    return res.json({
      id,
      username,
      isAdmin
    });
  } catch (error) {
    console.error('Admin profile error:', error);
    return res.status(500).json({ error: 'Failed to get profile information' });
  }
}

module.exports = {
  loginAdmin,
  getProfile
};