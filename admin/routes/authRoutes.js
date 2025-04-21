const express = require('express');
const { loginAdmin, getProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Create router
const router = express.Router();

// Apply rate limiter for all auth routes
router.use(rateLimiter);

// Login route
router.post('/login', loginAdmin);

// Get current user profile
router.get('/profile', authenticateToken, getProfile);

module.exports = router;