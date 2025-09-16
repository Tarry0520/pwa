/**
 * Controller基类
 * 提供通用的字段转换和响应处理功能
 */

const FieldTransformer = require('../utils/fieldTransformer');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/responseFormatter');
const { BUSINESS_CODE } = require('../utils/responseCodes');

class BaseController {
  /**
   * 构造函数
   * @param {Object} service - 服务层实例
   */
  constructor(service) {
    this.service = service;
  }

  /**
   * 处理请求数据转换（前端字段 -> 数据库字段）
   * @param {Object} req - Express请求对象
   * @returns {Object} 转换后的请求数据
   */
  transformRequest(req) {
    return FieldTransformer.transformRequest(req);
  }

  /**
   * 处理响应数据转换（数据库字段 -> 前端字段）
   * @param {Object} data - 响应数据
   * @returns {Object} 转换后的响应数据
   */
  transformResponse(data) {
    return FieldTransformer.transformResponse(data);
  }

  /**
   * 发送成功响应
   * @param {Object} res - Express响应对象
   * @param {number} businessCode - 业务状态码
   * @param {string} message - 响应消息
   * @param {*} data - 响应数据
   * @returns {Object} 响应对象
   */
  sendSuccess(res, businessCode = BUSINESS_CODE.SUCCESS, message = null, data = null) {
    return successResponse(res, businessCode, message, data ? FieldTransformer.toFrontend(data) : null);
  }

  /**
   * 发送错误响应
   * @param {Object} res - Express响应对象
   * @param {number} businessCode - 业务状态码
   * @param {string} message - 错误消息
   * @param {*} details - 错误详情
   * @returns {Object} 响应对象
   */
  sendError(res, businessCode = BUSINESS_CODE.INTERNAL_ERROR, message = null, details = null) {
    return errorResponse(res, businessCode, message, details);
  }

  /**
   * 发送验证错误响应
   * @param {Object} res - Express响应对象
   * @param {Array|string} errors - 验证错误信息
   * @returns {Object} 响应对象
   */
  sendValidationError(res, errors) {
    return validationErrorResponse(res, errors);
  }

  /**
   * 验证必填字段
   * @param {Object} data - 要验证的数据
   * @param {Array} requiredFields - 必填字段数组
   * @returns {Array} 验证错误数组
   */
  validateRequired(data, requiredFields) {
    const errors = [];
    
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });
    
    return errors;
  }

  /**
   * 验证邮箱格式
   * @param {string} email - 邮箱地址
   * @returns {boolean} 是否有效
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证密码长度
   * @param {string} password - 密码
   * @param {number} minLength - 最小长度
   * @returns {boolean} 是否有效
   */
  validatePassword(password, minLength = 6) {
    return password && password.length >= minLength;
  }

  /**
   * 处理异步操作
   * @param {Function} asyncFn - 异步函数
   * @param {Object} res - Express响应对象
   * @param {string} errorMessage - 错误消息
   * @param {number} errorCode - 错误状态码
   */
  async handleAsync(asyncFn, res, errorMessage = 'Operation failed', errorCode = BUSINESS_CODE.INTERNAL_ERROR) {
    try {
      const result = await asyncFn();
      return result;
    } catch (error) {
      console.error('Controller error:', error);
      return this.sendError(res, errorCode, errorMessage, error.message);
    }
  }
}

module.exports = BaseController;
