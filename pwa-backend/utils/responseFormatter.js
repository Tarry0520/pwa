/**
 * API response formatting utilities
 * Unify API response shape and avoid leaking raw DB fields
 */

/**
 * Format user object for frontend
 * @param {Object} user - DB user row
 * @returns {Object} formatted user
 */
function formatUser(user) {
  if (!user) return null;
  
  return {
    id: user.id,
    studentId: user.student_id,
    email: user.email,
    displayName: user.display_name,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    provider: user.provider || 'local',
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/**
 * Format login response
 * @param {Object} loginResult - result from login service
 * @returns {Object} formatted login response
 */
function formatLoginResponse(loginResult) {
  return {
    user: formatUser(loginResult.user),
    token: loginResult.token,
    expiresIn: loginResult.expiresIn
  };
}

/**
 * Format user list
 * @param {Array} users - array of DB users
 * @returns {Array} formatted users
 */
function formatUserList(users) {
  if (!Array.isArray(users)) return [];
  return users.map(user => formatUser(user));
}

/**
 * Success response helper
 * @param {Object} res - Express response
 * @param {number} statusCode - HTTP status
 * @param {string} message - message
 * @param {*} data - payload
 * @returns {Object} response
 */
function successResponse(res, statusCode = 200, message = 'Operation successful', data = null) {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Error response helper
 * @param {Object} res - Express response
 * @param {number} statusCode - HTTP status
 * @param {string} message - error message
 * @param {*} details - error details (optional, dev only)
 * @returns {Object} response
 */
function errorResponse(res, statusCode = 500, message = 'Internal server error', details = null) {
  const response = {
    success: false,
    message
  };
  
  // Only return error details in development
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Validation error response helper
 * @param {Object} res - Express response
 * @param {Array|string} errors - validation error(s)
 * @returns {Object} response
 */
function validationErrorResponse(res, errors) {
  const response = {
    success: false,
    message: 'Request parameter validation failed',
    errors: Array.isArray(errors) ? errors : [errors]
  };
  
  return res.status(400).json(response);
}

/**
 * Paginated response helper
 * @param {Object} res - Express response
 * @param {Array} items - items
 * @param {number} page - current page
 * @param {number} limit - page size
 * @param {number} total - total items
 * @param {string} message - message
 * @returns {Object} response
 */
function paginatedResponse(res, items, page, limit, total, message = 'Data retrieved successfully') {
  const totalPages = Math.ceil(total / limit);
  
  return successResponse(res, 200, message, {
    items,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}

module.exports = {
  formatUser,
  formatLoginResponse,
  formatUserList,
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse
};
