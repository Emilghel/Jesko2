import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { User } from '../../shared/schema';

// Configure passport
export function setupPassport() {
  // Serialize user to session
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Local strategy for email/password login
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: 'Incorrect email or password.' });
          }
          
          // If user has no password (Google-only account)
          if (!user.password) {
            return done(null, false, { message: 'Please log in with Google.' });
          }
          
          // Verify password
          const isValid = await bcrypt.compare(password, user.password);
          
          if (!isValid) {
            return done(null, false, { message: 'Incorrect email or password.' });
          }
          
          // Update last login
          await storage.updateUser(user.id, { lastLogin: new Date() });
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists by Google ID
            let user = await storage.getUserByGoogleId(profile.id);
            
            if (user) {
              // Update user info
              await storage.updateUser(user.id, {
                lastLogin: new Date(),
                displayName: profile.displayName || user.displayName,
                avatarUrl: profile.photos?.[0]?.value || user.avatarUrl,
              });
              
              return done(null, user);
            }
            
            // Check if user exists by email
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('Google account has no email address'), null);
            }
            
            user = await storage.getUserByEmail(email);
            
            if (user) {
              // Link Google account to existing user
              await storage.updateUser(user.id, {
                googleId: profile.id,
                lastLogin: new Date(),
                displayName: profile.displayName || user.displayName,
                avatarUrl: profile.photos?.[0]?.value || user.avatarUrl,
              });
              
              return done(null, user);
            }
            
            // Create new user with Google data
            const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
            const newUser = await storage.createUser({
              username,
              email,
              googleId: profile.id,
              displayName: profile.displayName || username,
              avatarUrl: profile.photos?.[0]?.value || null,
            });
            
            return done(null, newUser);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  } else {
    console.warn('Google OAuth credentials not set. Google authentication is disabled.');
  }
}

// Helper to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

// Helper to check if user is an admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as User).isAdmin) {
    return next();
  }
  res.status(403).json({ error: 'Not authorized' });
}