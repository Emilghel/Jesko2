// Simple in-memory rate limiter for admin panel
const rateLimit = {};

// Reset rate limit after specified window (in milliseconds)
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 50; // Maximum number of requests per window

function rateLimiter(req, res, next) {
  // Get client IP address or a unique identifier
  const clientIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  
  // Initialize rate limit entry for this client if it doesn't exist
  if (!rateLimit[clientIP]) {
    rateLimit[clientIP] = {
      count: 0,
      resetTime: Date.now() + RATE_LIMIT_WINDOW
    };
  }
  
  // Check if the rate limit window has expired
  if (Date.now() > rateLimit[clientIP].resetTime) {
    // Reset the counter and set a new reset time
    rateLimit[clientIP].count = 0;
    rateLimit[clientIP].resetTime = Date.now() + RATE_LIMIT_WINDOW;
  }
  
  // Increment request count
  rateLimit[clientIP].count++;
  
  // Check if rate limit is exceeded
  if (rateLimit[clientIP].count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ 
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil((rateLimit[clientIP].resetTime - Date.now()) / 1000)
    });
  }
  
  // Add rate limit headers to response
  res.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - rateLimit[clientIP].count));
  res.set('X-RateLimit-Reset', Math.ceil(rateLimit[clientIP].resetTime / 1000));
  
  next();
}

module.exports = rateLimiter;