import { Express } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import { randomBytes } from "crypto";

// Utility to generate secure passwords for Google sign-up users
const generateSecurePassword = () => {
  return randomBytes(24).toString("hex");
};

export function setupGoogleAuth(app: Express) {
  // Skip Google auth setup if client ID or secret is not available
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Google OAuth credentials are missing, skipping Google authentication setup');
    return;
  }
  
  // Configure Google Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    scope: ["profile", "email"],
    passReqToCallback: true,
    // Add production domain to work with www.jesko.ai
    proxy: true
  }, 
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value;
      
      if (!email) {
        return done(new Error("No email found in Google profile"), undefined);
      }
      
      // Check if user already exists by Google ID or email
      let user = await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Check if user exists with this email but no Google ID
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Update existing user with Google ID
          user = await storage.updateUserGoogleId(user.id, googleId);
        } else {
          // Create new user
          const username = email.split('@')[0] + "_" + Math.floor(Math.random() * 10000);
          const displayName = profile.displayName || username;
          const password = generateSecurePassword();
          
          // Get the IP address from the request if available
          const ipAddress = (req as any)?.ip || 
                          (req as any)?.headers?.['x-forwarded-for'] || 
                          "";
          
          // Create new user with Google profile info
          user = await storage.createUser({
            username,
            email,
            password,
            displayName,
            googleId,
            phoneNumber: "", // This field is required but we don't have it from Google
            ipAddress
          });
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));
  
  // Google auth routes
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );
  
  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { 
      failureRedirect: "/auth?error=google-auth-failed",
      session: true
    }),
    (req, res) => {
      // Successful authentication, redirect to home page
      res.redirect("/");
    }
  );
}