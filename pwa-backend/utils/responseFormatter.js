/**
 * API响应格式化工具
 * 用于统一处理API响应格式，避免直接暴露数据库字段
 */

/**
 * 格式化用户信息，只返回前端需要的字段
 * @param {Object} user - 数据库用户对象
 * @returns {Object} 格式化后的用户信息
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
 * 格式化登录响应
 * @param {Object} loginResult - 登录结果对象
 * @returns {Object} 格式化后的登录响应
 */
function formatLoginResponse(loginResult) {
  return {
    user: formatUser(loginResult.user),
    token: loginResult.token,
    expiresIn: loginResult.expiresIn
  };
}

/**
 * 格式化用户列表
 * @param {Array} users - 用户数组
 * @returns {Array} 格式化后的用户数组
 */
function formatUserList(users) {
  if (!Array.isArray(users)) return [];
  return users.map(user => formatUser(user));
}

/**
 * 成功响应格式
 * @param {Object} res - Express响应对象
 * @param {number} statusCode - HTTP状态码
 * @param {string} message - 响应消息
 * @param {*} data - 响应数据
 * @returns {Object} 格式化的响应
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
 * 错误响应格式
 * @param {Object} res - Express响应对象
 * @param {number} statusCode - HTTP状态码
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情（可选，仅开发环境）
 * @returns {Object} 格式化的错误响应
 */
function errorResponse(res, statusCode = 500, message = 'Internal server error', details = null) {
  const response = {
    success: false,
    message
  };
  
  // 仅在开发环境返回错误详情
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * 验证错误响应格式
 * @param {Object} res - Express响应对象
 * @param {Array|string} errors - 验证错误信息
 * @returns {Object} 格式化的验证错误响应
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
 * 分页响应格式
 * @param {Object} res - Express响应对象
 * @param {Array} items - 数据项
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {number} total - 总数量
 * @param {string} message - 响应消息
 * @returns {Object} 格式化的分页响应
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
