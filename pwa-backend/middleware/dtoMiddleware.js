const { errorResponse } = require('../utils/responseFormatter');
const humps = require('humps');



/**
 * 请求数据转换中间件
 * 将前端发送的驼峰命名转换为下划线命名（用于数据库操作）
 * @param {Object} options - 配置选项
 * @param {Array} options.sources - 要转换的数据源 ['body', 'query', 'params']
 * @param {Array} options.exclude - 排除的字段名
 * @returns {Function} Express中间件函数
 */
function requestTransform(options = {}) {
  const { 
    sources = ['body', 'query', 'params'], 
    exclude = [] 
  } = options;

  return (req, res, next) => {
    try {
      sources.forEach(source => {
        if (req[source] && typeof req[source] === 'object') {
          req[source] = humps.decamelizeKeys(req[source], {
            separator: '_',
            process: (key, convert, options) => {
              // 排除不需要转换的字段
              if (exclude.includes(key)) {
                return key;
              }
              return convert(key, options);
            }
          });
        }
      });
      
      next();
    } catch (error) {
      console.error('请求数据转换错误:', error);
      return errorResponse(res, 400, '请求数据格式错误');
    }
  };
}

/**
 * 响应数据转换中间件
 * 将数据库返回的下划线命名转换为驼峰命名（用于前端显示）
 * @param {Object} options - 配置选项
 * @param {Array} options.exclude - 排除的字段名
 * @param {boolean} options.deep - 是否深度转换嵌套对象
 * @returns {Function} Express中间件函数
 */
function responseTransform(options = {}) {
  const { 
    exclude = [], 
    deep = true 
  } = options;

  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      try {
        if (data && typeof data === 'object') {
          // 转换响应数据
          const transformedData = humps.camelizeKeys(data, {
            process: (key, convert, options) => {
              // 排除不需要转换的字段
              if (exclude.includes(key)) {
                return key;
              }
              return convert(key, options);
            }
          });
          
          return originalJson.call(this, transformedData);
        }
        
        return originalJson.call(this, data);
      } catch (error) {
        console.error('响应数据转换错误:', error);
        return originalJson.call(this, data);
      }
    };
    
    next();
  };
}


module.exports = {
  requestTransform,
  responseTransform,
};
