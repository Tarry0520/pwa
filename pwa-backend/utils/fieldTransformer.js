/**
 * 字段转换工具类
 * 处理数据库字段与前端字段的转换
 * 使用 humps 库进行自动转换
 */

const humps = require('humps');

/**
 * 字段转换器类
 * 使用 humps 库进行字段名转换
 */
class FieldTransformer {
  /**
   * 将下划线命名转换为驼峰命名
   * @param {string} str - 下划线字符串
   * @returns {string} 驼峰字符串
   * @deprecated 建议使用 humps.camelize 替代
   */
  static toCamelCase(str) {
    return humps.camelize(str);
  }

  /**
   * 将驼峰命名转换为下划线命名
   * @param {string} str - 驼峰字符串
   * @returns {string} 下划线字符串
   * @deprecated 建议使用 humps.decamelize 替代
   */
  static toSnakeCase(str) {
    return humps.decamelize(str);
  }

  /**
   * 将数据库字段转换为前端字段（下划线转驼峰）
   * @param {Object|Array} data - 数据
   * @param {Object} options - 转换选项
   * @param {Array} options.exclude - 排除的字段名
   * @returns {Object|Array} 转换后的数据
   */
  static toFrontend(data, options = {}) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    return humps.camelizeKeys(data, {
      process: (key, convert, opts) => {
        // 排除不需要转换的字段
        if (options.exclude && options.exclude.includes(key)) {
          return key;
        }
        return convert(key, opts);
      }
    });
  }

  /**
   * 将前端字段转换为数据库字段（驼峰转下划线）
   * @param {Object|Array} data - 数据
   * @param {Object} options - 转换选项
   * @param {Array} options.exclude - 排除的字段名
   * @returns {Object|Array} 转换后的数据
   */
  static toDatabase(data, options = {}) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    return humps.decamelizeKeys(data, {
      separator: '_',
      process: (key, convert, opts) => {
        // 排除不需要转换的字段
        if (options.exclude && options.exclude.includes(key)) {
          return key;
        }
        return convert(key, opts);
      }
    });
  }

  /**
   * 转换请求数据（前端 -> 数据库）
   * @param {Object} req - Express请求对象
   * @param {Object} options - 转换选项
   * @returns {Object} 转换后的请求对象
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
   * 转换响应数据（数据库 -> 前端）
   * @param {Object} responseData - 响应数据
   * @param {Object} options - 转换选项
   * @returns {Object} 转换后的响应数据
   */
  static transformResponse(responseData, options = {}) {
    if (!responseData || typeof responseData !== 'object') {
      return responseData;
    }

    return this.toFrontend(responseData, options);
  }

  /**
   * 批量转换对象数组
   * @param {Array} dataArray - 对象数组
   * @param {Function} transformFn - 转换函数 (toFrontend 或 toDatabase)
   * @param {Object} options - 转换选项
   * @returns {Array} 转换后的数组
   */
  static transformArray(dataArray, transformFn, options = {}) {
    if (!Array.isArray(dataArray)) {
      return dataArray;
    }

    return dataArray.map(item => transformFn.call(this, item, options));
  }
}

module.exports = FieldTransformer;