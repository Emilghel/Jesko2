const express = require('express');
const { 
  getUsers, 
  getSystemStats, 
  getCallHistory, 
  getSystemLogs 
} = require('../controllers/dataController');
const { authenticateToken } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Create router
const router = express.Router();

// Apply authentication middleware for all data routes
router.use(authenticateToken);
// Apply rate limiter
router.use(rateLimiter);

// Data routes
router.get('/users', getUsers);
router.get('/stats', getSystemStats);
router.get('/calls', getCallHistory);
router.get('/logs', getSystemLogs);

module.exports = router;