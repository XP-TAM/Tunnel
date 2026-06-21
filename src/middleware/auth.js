/**
 * احراز هویت
 * Authentication Middleware - Verify API keys and JWTs
 */

const logger = require('../utils/logger');

const AuthMiddleware = (req, res, next) => {
  // Skip auth for health check
  if (req.path === '/health' || req.path === '/api/docs') {
    return next();
  }

  // Get auth token from header
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (!authHeader && !apiKey) {
    logger.warn(`⚠️ درخواست بدون احراز هویت: ${req.path}`);
    return res.status(401).json({
      error: 'احراز هویت مورد نیاز است',
      message: 'Authorization header or API key required'
    });
  }

  // Validate API key
  if (apiKey === process.env.API_KEY) {
    req.user = { type: 'api_key' };
    return next();
  }

  // For now, allow requests with Authorization header
  // In production, validate JWT properly
  if (authHeader) {
    req.user = { type: 'jwt' };
    return next();
  }

  return res.status(403).json({
    error: 'فاقد دسترسی',
    message: 'Invalid credentials'
  });
};

module.exports = AuthMiddleware;