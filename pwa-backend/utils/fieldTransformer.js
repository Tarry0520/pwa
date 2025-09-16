/**
 * Field transformation utilities
 * Convert between DB fields and frontend fields
 * Uses the humps library for automatic conversion
 */

const humps = require('humps');

/**
 * Field transformer class
 * Performs key conversion using humps
 */
class FieldTransformer {
  /**
   * Convert snake_case to camelCase
   * @param {string} str - snake string
   * @returns {string} camel string
   * @deprecated Prefer humps.camelize
   */
  static toCamelCase(str) {
    return humps.camelize(str);
  }

  /**
   * Convert camelCase to snake_case
   * @param {string} str - camel string
   * @returns {string} snake string
   * @deprecated Prefer humps.decamelize
   */
  static toSnakeCase(str) {
    return humps.decamelize(str);
  }

  /**
   * Convert DB fields to frontend fields (snake -> camel)
   * @param {Object|Array} data - data
   * @param {Object} options - options
   * @param {Array} options.exclude - field names to exclude
   * @returns {Object|Array} transformed
   */
  static toFrontend(data, options = {}) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    return humps.camelizeKeys(data, {
      process: (key, convert, opts) => {
        // Skip excluded fields
        if (options.exclude && options.exclude.includes(key)) {
          return key;
        }
        return convert(key, opts);
      }
    });
  }

  /**
   * Convert frontend fields to DB fields (camel -> snake)
   * @param {Object|Array} data - data
   * @param {Object} options - options
   * @param {Array} options.exclude - field names to exclude
   * @returns {Object|Array} transformed
   */
  static toDatabase(data, options = {}) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    return humps.decamelizeKeys(data, {
      separator: '_',
      process: (key, convert, opts) => {
        // Skip excluded fields
        if (options.exclude && options.exclude.includes(key)) {
          return key;
        }
        return convert(key, opts);
      }
    });
  }

  /**
   * Transform request data (frontend -> DB)
   * @param {Object} req - Express request
   * @param {Object} options - options
   * @returns {Object} transformed request
   */
  static transformRequest(req, options = {}) {
    const transformedReq = { ...req };
    
    if (req.body && Object.keys(req.body).length > 0) {
      transformedReq.body = this.toDatabase(req.body, options);
    }
    
    if (req.query && Object.keys(req.query).length > 0) {
      transformedReq.query = this.toDatabase(req.query, options);
    }
    
    if (req.params && Object.keys(req.params).length > 0) {
      transformedReq.params = this.toDatabase(req.params, options);
    }
    
    return transformedReq;
  }

  /**
   * Transform response data (DB -> frontend)
   * @param {Object} responseData - response data
   * @param {Object} options - options
   * @returns {Object} transformed data
   */
  static transformResponse(responseData, options = {}) {
    if (!responseData || typeof responseData !== 'object') {
      return responseData;
    }

    return this.toFrontend(responseData, options);
  }

  /**
   * Batch-transform an array of objects
   * @param {Array} dataArray - array of objects
   * @param {Function} transformFn - transform function (toFrontend or toDatabase)
   * @param {Object} options - options
   * @returns {Array} transformed array
   */
  static transformArray(dataArray, transformFn, options = {}) {
    if (!Array.isArray(dataArray)) {
      return dataArray;
    }

    return dataArray.map(item => transformFn.call(this, item, options));
  }
}

module.exports = FieldTransformer;
