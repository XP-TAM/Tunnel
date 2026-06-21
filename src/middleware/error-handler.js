/**
 * مدیریت خطا
 * Error Handler - Centralized error handling middleware
 */

const logger = require('../utils/logger');

const ErrorHandler = (err, req, res, next) => {
  logger.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'خطای داخلی سرور';

  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date(),
    path: req.path
  });
};

module.exports = ErrorHandler;