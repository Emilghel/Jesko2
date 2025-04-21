import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * Special route to force admin access for a user
 * This is a temporary solution to fix admin access issues
 */
router.get('/force-admin/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Get the user from storage
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update the user's isAdmin flag
    const updatedUser = await storage.updateUser(userId, { isAdmin: true });
    
    // Special handling for the admin user to ensure isAdmin is set correctly in the DB
    if (user.email === 'admin@warmleadnetwork.com') {
      // Try to update via direct SQL if available
      try {
        await storage.executeSQL(
          "UPDATE users SET is_admin = TRUE WHERE email = 'admin@warmleadnetwork.com'"
        );
      } catch (error) {
        console.error('SQL update failed, using standard update method:', error);
      }
    }
    
    return res.json({
      message: 'Admin access forced successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        displayName: updatedUser.displayName
      }
    });
  } catch (error) {
    console.error('Error forcing admin access:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get the current user's status
 */
router.get('/admin-status', (req, res) => {
  if (req.user) {
    return res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        isAdmin: req.user.isAdmin,
        displayName: req.user.displayName
      }
    });
  } else {
    return res.json({
      authenticated: false,
      user: null
    });
  }
});

export default router;