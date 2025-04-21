const express = require('express');
const authRoutes = require('./authRoutes');
const dataRoutes = require('./dataRoutes');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Initialize admin routes router
const router = express.Router();

// Apply cookie parser middleware
router.use(cookieParser());

// Apply routes
router.use('/auth', authRoutes);
router.use('/data', dataRoutes);

// Serve static admin files
router.use('/', express.static(path.join(__dirname, '../../public/admin')));

// Serve the admin panel
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin/index.html'));
});

module.exports = router;