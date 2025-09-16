/**
 * 统一响应状态码定义
 * 包含HTTP状态码和业务状态码
 */

// HTTP状态码
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// 业务状态码
const BUSINESS_CODE = {
  // 成功状态码
  SUCCESS: 200,
  CREATED: 201,
  
  // 客户端错误状态码 (4xx)
  BAD_REQUEST: 400,           // 请求参数错误
  UNAUTHORIZED: 401,          // 未授权/未登录
  FORBIDDEN: 403,             // 禁止访问/权限不足
  NOT_FOUND: 404,             // 资源不存在
  CONFLICT: 409,              // 资源冲突
  VALIDATION_ERROR: 422,      // 参数验证失败
  
  // 认证相关状态码
  TOKEN_MISSING: 40101,       // 访问令牌缺失
  TOKEN_INVALID: 40102,       // 访问令牌无效
  TOKEN_EXPIRED: 40103,       // 访问令牌过期
  TOKEN_BLACKLISTED: 40104,   // 访问令牌已失效（登出）
  LOGIN_REQUIRED: 40105,      // 需要登录
  PERMISSION_DENIED: 40301,   // 权限不足
  
  // 用户相关状态码
  USER_NOT_FOUND: 40401,      // 用户不存在
  USER_ALREADY_EXISTS: 40901, // 用户已存在
  INVALID_CREDENTIALS: 40106, // 用户名或密码错误
  PASSWORD_TOO_WEAK: 40001,   // 密码强度不够
  EMAIL_INVALID: 40002,       // 邮箱格式无效
  
  // 服务器错误状态码 (5xx)
  INTERNAL_ERROR: 500,        // 服务器内部错误
  DATABASE_ERROR: 50001,      // 数据库错误
  REDIS_ERROR: 50002,         // Redis错误
  EXTERNAL_API_ERROR: 50003,  // 外部API错误
  SERVICE_UNAVAILABLE: 503    // 服务不可用
};

// 状态码对应的消息
const CODE_MESSAGES = {
  // 成功消息
  [BUSINESS_CODE.SUCCESS]: 'Operation successful',
  [BUSINESS_CODE.CREATED]: 'Created successfully',
  
  // 客户端错误消息
  [BUSINESS_CODE.BAD_REQUEST]: 'Bad request',
  [BUSINESS_CODE.UNAUTHORIZED]: 'Unauthorized access',
  [BUSINESS_CODE.FORBIDDEN]: 'Access forbidden',
  [BUSINESS_CODE.NOT_FOUND]: 'Resource not found',
  [BUSINESS_CODE.CONFLICT]: 'Resource conflict',
  [BUSINESS_CODE.VALIDATION_ERROR]: 'Validation failed',
  
  // 认证相关消息
  [BUSINESS_CODE.TOKEN_MISSING]: 'Access token missing',
  [BUSINESS_CODE.TOKEN_INVALID]: 'Invalid access token',
  [BUSINESS_CODE.TOKEN_EXPIRED]: 'Access token expired',
  [BUSINESS_CODE.TOKEN_BLACKLISTED]: 'Access token invalidated',
  [BUSINESS_CODE.LOGIN_REQUIRED]: 'Login required',
  [BUSINESS_CODE.PERMISSION_DENIED]: 'Permission denied',
  
  // 用户相关消息
  [BUSINESS_CODE.USER_NOT_FOUND]: 'User not found',
  [BUSINESS_CODE.USER_ALREADY_EXISTS]: 'User already exists',
  [BUSINESS_CODE.INVALID_CREDENTIALS]: 'Invalid username or password',
  [BUSINESS_CODE.PASSWORD_TOO_WEAK]: 'Password too weak, at least 6 characters required',
  [BUSINESS_CODE.EMAIL_INVALID]: 'Invalid email format',
  
  // 服务器错误消息
  [BUSINESS_CODE.INTERNAL_ERROR]: 'Internal server error',
  [BUSINESS_CODE.DATABASE_ERROR]: 'Database operation failed',
  [BUSINESS_CODE.REDIS_ERROR]: 'Cache service error',
  [BUSINESS_CODE.EXTERNAL_API_ERROR]: 'External service call failed',
  [BUSINESS_CODE.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable'
};

/**
 * 根据业务状态码获取对应的HTTP状态码
 * @param {number} businessCode - 业务状态码
 * @returns {number} HTTP状态码
 */
function getHttpStatus(businessCode) {
  // 1xx-3xx 成功状态码
  if (businessCode >= 200 && businessCode < 400) {
    return businessCode;
  }
  
  // 4xx 客户端错误
  if (businessCode >= 400 && businessCode < 500) {
    return Math.floor(businessCode / 100) * 100;
  }
  
  // 5xx 服务器错误
  if (businessCode >= 500 && businessCode < 600) {
    return Math.floor(businessCode / 100) * 100;
  }
  
  // 自定义业务状态码映射
  const customMappings = {
    [BUSINESS_CODE.TOKEN_MISSING]: HTTP_STATUS.UNAUTHORIZED,
    [BUSINESS_CODE.TOKEN_INVALID]: HTTP_STATUS.UNAUTHORIZED,
    [BUSINESS_CODE.TOKEN_EXPIRED]: HTTP_STATUS.UNAUTHORIZED,
    [BUSINESS_CODE.TOKEN_BLACKLISTED]: HTTP_STATUS.UNAUTHORIZED,
    [BUSINESS_CODE.LOGIN_REQUIRED]: HTTP_STATUS.UNAUTHORIZED,
    [BUSINESS_CODE.PERMISSION_DENIED]: HTTP_STATUS.FORBIDDEN,
    [BUSINESS_CODE.USER_NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
    [BUSINESS_CODE.USER_ALREADY_EXISTS]: HTTP_STATUS.CONFLICT,
    [BUSINESS_CODE.INVALID_CREDENTIALS]: HTTP_STATUS.UNAUTHORIZED,
    [BUSINESS_CODE.PASSWORD_TOO_WEAK]: HTTP_STATUS.BAD_REQUEST,
    [BUSINESS_CODE.EMAIL_INVALID]: HTTP_STATUS.BAD_REQUEST,
    [BUSINESS_CODE.DATABASE_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    [BUSINESS_CODE.REDIS_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    [BUSINESS_CODE.EXTERNAL_API_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR
  };
  
  return customMappings[businessCode] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * 根据业务状态码获取对应的消息
 * @param {number} businessCode - 业务状态码
 * @param {string} customMessage - 自定义消息（可选）
 * @returns {string} 状态消息
 */
function getMessage(businessCode, customMessage = null) {
  return customMessage || CODE_MESSAGES[businessCode] || 'Unknown error';
}

module.exports = {
  HTTP_STATUS,
  BUSINESS_CODE,
  CODE_MESSAGES,
  getHttpStatus,
  getMessage
};
