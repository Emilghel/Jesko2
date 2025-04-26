import express from 'express';
import path from 'path';

// Create router to handle character-related redirects
const characterRouter = express.Router();

// Redirect /character-creation to home page (character selection removed)
characterRouter.get('/character-creation', (req, res) => {
  console.log("Server-side redirect: /character-creation -> /home");
  res.redirect(301, '/home');
});

// Handle the incorrect route that's causing 404
characterRouter.get('/character-creation-3d', (req, res) => {
  console.log("Server-side redirect: /character-creation-3d -> /home");
  res.redirect(301, '/home');
});

// Redirect /character-selection to home page (character selection removed)
characterRouter.get('/character-selection', (req, res) => {
  console.log("Server-side redirect: /character-selection -> /home");
  res.redirect(301, '/home');
});

// Redirect /character-selection-3d to home page (character selection removed)
characterRouter.get('/character-selection-3d', (req, res) => {
  console.log("Server-side redirect: /character-selection-3d -> /home");
  res.redirect(301, '/home');
});

// Handle the raw domain/character-creation-3d request that's causing DNS errors
characterRouter.get('/character-redirect-fix', (req, res) => {
  console.log("Serving character redirect fix page");
  // Redirect to home instead
  res.redirect(301, '/home');
});

// For maximum compatibility, explicitly handle these paths too
characterRouter.get('/character-redirect.html', (req, res) => {
  console.log("Serving character redirect page");
  res.redirect(301, '/home');
});

characterRouter.get('/redirect-to-3d.html', (req, res) => {
  console.log("Serving redirect-to-3d page");
  res.redirect(301, '/home');
});

export default characterRouter;