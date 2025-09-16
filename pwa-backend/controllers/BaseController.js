/**
 * Base controller
 * Provides common field transformation and response helpers
 */

const FieldTransformer = require('../utils/fieldTransformer');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/responseFormatter');

class BaseController {
  /**
   * Constructor
   * @param {Object} service - service layer instance
   */
  constructor(service) {
    this.service = service;
  }

  /**
   * Transform request payload (frontend -> DB fields)
   * @param {Object} req - Express request
   * @returns {Object} transformed request
   */
  transformRequest(req) {
    return FieldTransformer.transformRequest(req);
  }

  /**
   * Transform response data (DB -> frontend fields)
   * @param {Object} data - response data
   * @returns {Object} transformed data
   */
  transformResponse(data) {
    return FieldTransformer.transformResponse(data);
  }

  /**
   * Send success response
   * @param {Object} res - Express response
   * @param {number} statusCode - HTTP status
   * @param {string} message - message
   * @param {*} data - payload
   * @returns {Object} response
   */
  sendSuccess(res, statusCode = 200, message = 'Operation successful', data = null) {
    const responseData = { success: true, message, timestamp: new Date().toISOString() };
    
    if (data !== null) {
      responseData.data = FieldTransformer.toFrontend(data);
    }
    
    return res.status(statusCode).json(responseData);
  }

  /**
   * Send error response
   * @param {Object} res - Express response
   * @param {number} statusCode - HTTP status
   * @param {string} message - error message
   * @param {*} details - error details
   * @returns {Object} response
   */
  sendError(res, statusCode = 500, message = 'Internal server error', details = null) {
    const responseData = {
      success: false,
      message
    };
    
    if (details && process.env.NODE_ENV === 'development') {
      responseData.details = details;
    }
    
    return res.status(statusCode).json(responseData);
  }

  /**
   * Send validation error response
   * @param {Object} res - Express response
   * @param {Array|string} errors - validation errors
   * @returns {Object} response
   */
  sendValidationError(res, errors) {
    const responseData = {
      success: false,
      message: 'Request parameter validation failed',
      errors: Array.isArray(errors) ? errors : [errors]
    };
    
    return res.status(400).json(responseData);
  }

  /**
   * Validate required fields
   * @param {Object} data - data to validate
   * @param {Array} requiredFields - required field names
   * @returns {Array} validation errors
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
   * Validate email format
   * @param {string} email - email
   * @returns {boolean} valid
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password length
   * @param {string} password - password
   * @param {number} minLength - min length
   * @returns {boolean} valid
   */
  validatePassword(password, minLength = 6) {
    return password && password.length >= minLength;
  }

  /**
   * Handle async operation
   * @param {Function} asyncFn - async function
   * @param {Object} res - Express response
   * @param {string} errorMessage - error message
   */
  async handleAsync(asyncFn, res, errorMessage = 'Operation failed') {
    try {
      const result = await asyncFn();
      return result;
    } catch (error) {
      console.error('Controller error:', error);
      return this.sendError(res, 500, errorMessage, error.message);
    }
  }
}

module.exports = BaseController;
