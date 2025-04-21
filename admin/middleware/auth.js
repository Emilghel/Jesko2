const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-panel-jwt-secret';
const TOKEN_EXPIRY = '24h';

// Generate JWT token for admin user
function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, isAdmin: true }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY
  });
}

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  // Get the token from the request header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Token is valid, attach the user to the request
    req.user = user;
    next();
  });
}

module.exports = {
  generateToken,
  authenticateToken
};