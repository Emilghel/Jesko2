/**
 * Custom TypeScript declarations for libraries without type definitions
 */

declare module 'csurf';
declare module 'xss-clean';
declare module 'hpp';
declare module './direct-admin-access.js';

// Add CSRF Token to Express Request
declare namespace Express {
  export interface Request {
    csrfToken(): string;
  }
}