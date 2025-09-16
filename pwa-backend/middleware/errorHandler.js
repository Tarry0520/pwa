/**
 * Global error handler middleware
 * Handles uncaught errors and returns a unified API response structure
 */

const { errorResponse } = require('../utils/responseFormatter');

/**
 * Global error handler function
 * @param {Error} err - error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - next Express middleware
 */
function globalErrorHandler(err, req, res, next) {
  // Log error
  console.error('Global error handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Detect API requests (Accept header includes application/json or path starts with /api)
  const isApiRequest = req.accepts('json') || req.path.startsWith('/api') || 
                      req.headers['content-type']?.includes('application/json');

  if (isApiRequest) {
    // Return JSON error response
    return handleApiError(err, req, res);
  }

  // Non-API request: defer to default error handling
  next(err);
}

/**
 * Handle API error response
 * @param {Error} err - error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function handleApiError(err, req, res) {
  let statusCode = 500;
  let message = 'Internal server error';

  // Map error types to status codes/messages
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Request parameter validation failed';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden access';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    message = 'Resource conflict';
  } else if (err.status || err.statusCode) {
    // Use explicit status/statusCode when provided
    statusCode = err.status || err.statusCode;
    message = err.message || message;
  } else if (err.message) {
    // Fallback to error message
    message = err.message;
  }

  // Return more details in development
  const details = process.env.NODE_ENV === 'development' ? {
    stack: err.stack,
    name: err.name
  } : null;

  return errorResponse(res, statusCode, message, details);
}

/**
 * 404 middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - next Express middleware
 */
function notFoundHandler(req, res, next) {
  const isApiRequest = req.accepts('json') || req.path.startsWith('/api') || 
                      req.headers['content-type']?.includes('application/json');

  if (isApiRequest) {
    return errorResponse(res, 404, 'Requested resource not found');
  }

  // Non-API request, continue
  next();
}

/**
 * Async error wrapper
 * Wraps async route handlers and forwards rejected promises
 * @param {Function} fn - async function
 * @returns {Function} wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler
};
