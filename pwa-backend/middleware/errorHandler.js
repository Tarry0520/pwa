/**
 * 全局错误处理中间件
 * 统一处理所有未捕获的错误，确保返回统一的API响应格式
 */

const { errorResponse } = require('../utils/responseFormatter');

/**
 * 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function globalErrorHandler(err, req, res, next) {
  // 记录错误日志
  console.error('全局错误处理:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // 如果是API请求（Accept头包含application/json或路径以/api开头）
  const isApiRequest = req.accepts('json') || req.path.startsWith('/api') || 
                      req.headers['content-type']?.includes('application/json');

  if (isApiRequest) {
    // 返回JSON格式的错误响应
    return handleApiError(err, req, res);
  }

  // 非API请求，继续使用默认的错误处理
  next(err);
}

/**
 * 处理API错误响应
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function handleApiError(err, req, res) {
  let statusCode = 500;
  let message = 'Internal server error';

  // 根据错误类型设置状态码和消息
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
    // 如果错误对象有status或statusCode属性
    statusCode = err.status || err.statusCode;
    message = err.message || message;
  } else if (err.message) {
    // 如果有自定义错误消息，使用它
    message = err.message;
  }

  // 在开发环境下返回更多错误详情
  const details = process.env.NODE_ENV === 'development' ? {
    stack: err.stack,
    name: err.name
  } : null;

  return errorResponse(res, statusCode, message, details);
}

/**
 * 404错误处理中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function notFoundHandler(req, res, next) {
  const isApiRequest = req.accepts('json') || req.path.startsWith('/api') || 
                      req.headers['content-type']?.includes('application/json');

  if (isApiRequest) {
    return errorResponse(res, 404, 'Requested resource not found');
  }

  // 非API请求，继续到下一个中间件
  next();
}

/**
 * 异步错误包装器
 * 用于包装异步路由处理函数，自动捕获Promise错误
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
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
