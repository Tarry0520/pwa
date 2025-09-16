/**
 * API响应格式化工具
 * 用于统一处理API响应格式，避免直接暴露数据库字段
 */

const { BUSINESS_CODE, getHttpStatus, getMessage } = require('./responseCodes');

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
 * @param {number} businessCode - 业务状态码
 * @param {string} message - 响应消息
 * @param {*} data - 响应数据
 * @returns {Object} 格式化的响应
 */
function successResponse(res, businessCode = BUSINESS_CODE.SUCCESS, message = null, data = null) {
  const httpStatus = getHttpStatus(businessCode);
  const responseMessage = getMessage(businessCode, message);
  
  const response = {
    success: true,
    code: businessCode,
    message: responseMessage,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(httpStatus).json(response);
}

/**
 * 错误响应格式
 * @param {Object} res - Express响应对象
 * @param {number} businessCode - 业务状态码
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情（可选，仅开发环境）
 * @returns {Object} 格式化的错误响应
 */
function errorResponse(res, businessCode = BUSINESS_CODE.INTERNAL_ERROR, message = null, details = null) {
  const httpStatus = getHttpStatus(businessCode);
  const responseMessage = getMessage(businessCode, message);
  
  const response = {
    success: false,
    code: businessCode,
    message: responseMessage,
    timestamp: new Date().toISOString()
  };
  
  // 仅在开发环境返回错误详情
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  
  return res.status(httpStatus).json(response);
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
    code: BUSINESS_CODE.VALIDATION_ERROR,
    message: getMessage(BUSINESS_CODE.VALIDATION_ERROR),
    errors: Array.isArray(errors) ? errors : [errors],
    timestamp: new Date().toISOString()
  };
  
  return res.status(getHttpStatus(BUSINESS_CODE.VALIDATION_ERROR)).json(response);
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
  
  return successResponse(res, BUSINESS_CODE.SUCCESS, message, {
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
