const express = require('express');
const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const { authenticateToken } = require('./middleware/auth');

// Create admin router
const router = express.Router();

// API Routes
router.use('/api/admin/login', authRoutes);
router.use('/api/admin', authenticateToken, dataRoutes);

// Admin panel routes
router.use('/admin', express.static('public/admin'));
router.get('/admin', (req, res) => {
  res.sendFile('index.html', { root: 'public/admin' });
});

// Export the router as default and named export
module.exports = router;
module.exports.default = router;