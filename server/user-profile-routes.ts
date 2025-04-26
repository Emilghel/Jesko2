import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "./db";
import { pool } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { users } from "../shared/schema";
import { savedContent } from "../shared/schema-saved-content";
import bcrypt from "bcrypt";
// Using bcrypt for consistent password hashing across the application

import { users as usersSchema } from "../shared/schema";

// Define the user type based on the schema
type User = typeof usersSchema.$inferSelect;

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const router = Router();

// Auth middleware to check if user is authenticated
const isAuthenticated = async (req: Request, res: Response, next: Function) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    // Verify token from database (simplified - in a real app, use proper JWT verification)
    const result = await pool.query(
      'SELECT * FROM auth_tokens WHERE token = $1 AND expires_at > NOW()', 
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Add user to request object 
    // Fetch full user object from database
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [result.rows[0].user_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Assign complete user object to req.user
    req.user = userResult.rows[0] as User;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Hash password for secure storage using bcrypt
async function hashPassword(password: string) {
  // Use 12 rounds for better security (higher than the default 10)
  const BCRYPT_ROUNDS = 12;
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Compare plain text password with stored hashed password using bcrypt
async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

// Get user profile information
router.get('/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
      profession: users.profession
    })
    .from(users)
    .where(eq(users.id, req.user.id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile information
router.patch('/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { displayName, email } = req.body;
    
    // Update user information
    const [updatedUser] = await db.update(users)
      .set({ 
        displayName, 
        email,
        // Update other fields as needed
      })
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName
      });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Change user password
router.post('/change-password', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    
    // Get user with password
    const result = await db.execute(
      sql`SELECT password FROM users WHERE id = ${req.user.id} LIMIT 1`
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userPassword = result.rows[0].password;
    
    // Verify current password
    const isCorrectPassword = await comparePasswords(currentPassword, userPassword as string);
    if (!isCorrectPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, req.user.id));
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user's saved content
router.get('/saved-content', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Base conditions for query
    const conditions = [eq(savedContent.userId, req.user.id)];
    
    // Add content type condition if specified
    if (type) {
      conditions.push(eq(savedContent.contentType, String(type)));
    }
    
    // Execute query with all conditions
    const items = await db.select()
      .from(savedContent)
      .where(conditions[0]) // Apply first condition
      .orderBy(desc(savedContent.createdAt))
      .limit(Number(limit))
      .offset(offset);
    
    // Get total count for pagination using raw SQL for compatibility
    const result = await db.execute(
      sql`SELECT COUNT(*)::integer AS count FROM ${savedContent} WHERE user_id = ${req.user.id}`
    );
    const count = result.rows[0].count;
    
    res.json({
      items,
      pagination: {
        total: Number(count),
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(Number(count) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching saved content:', error);
    res.status(500).json({ error: 'Failed to fetch saved content' });
  }
});

// Save new content
router.post('/saved-content', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { title, description, contentType, content, tags } = req.body;
    
    // Validate input
    if (!title || !contentType || !content) {
      return res.status(400).json({ error: 'Title, content type, and content are required' });
    }
    
    // Save the content
    const [savedItem] = await db.insert(savedContent)
      .values({
        userId: req.user.id,
        title,
        description,
        contentType,
        content,
        tags: tags ? JSON.stringify(tags) : null
      })
      .returning();
    
    res.status(201).json(savedItem);
  } catch (error) {
    console.error('Error saving content:', error);
    res.status(500).json({ error: 'Failed to save content' });
  }
});

// Delete saved content
router.delete('/saved-content/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { id } = req.params;
    
    // Check if content exists and belongs to user using raw SQL for compatibility
    const contentResult = await db.execute(
      sql`SELECT id FROM ${savedContent} WHERE id = ${Number(id)} AND user_id = ${req.user.id} LIMIT 1`
    );
    
    if (!contentResult.rows.length) {
      return res.status(404).json({ error: 'Content not found or does not belong to user' });
    }
    
    // Delete the content
    await db.delete(savedContent)
      .where(eq(savedContent.id, Number(id)));
    
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved content:', error);
    res.status(500).json({ error: 'Failed to delete saved content' });
  }
});

// Update saved content
router.patch('/saved-content/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { id } = req.params;
    const { title, description, tags } = req.body;
    
    // Check if content exists and belongs to user using raw SQL for compatibility
    const contentResult = await db.execute(
      sql`SELECT id FROM ${savedContent} WHERE id = ${Number(id)} AND user_id = ${req.user.id} LIMIT 1`
    );
    
    if (!contentResult.rows.length) {
      return res.status(404).json({ error: 'Content not found or does not belong to user' });
    }
    
    // Update the content
    const [updatedContent] = await db.update(savedContent)
      .set({ 
        title, 
        description, 
        tags: tags ? JSON.stringify(tags) : null,
        updatedAt: new Date()
      })
      .where(eq(savedContent.id, Number(id)))
      .returning();
    
    res.json(updatedContent);
  } catch (error) {
    console.error('Error updating saved content:', error);
    res.status(500).json({ error: 'Failed to update saved content' });
  }
});

export default router;