const { errorResponse } = require('../utils/responseFormatter');
const humps = require('humps');



/**
 * Request data transform middleware
 * Convert frontend camelCase payloads to snake_case (for DB operations)
 * @param {Object} options - config options
 * @param {Array} options.sources - sources to transform ['body', 'query', 'params']
 * @param {Array} options.exclude - field names to exclude
 * @returns {Function} Express middleware
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
              // Skip excluded fields
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
      console.error('Request transform error:', error);
      return errorResponse(res, 400, 'Invalid request data format');
    }
  };
}

/**
 * Response data transform middleware
 * Convert DB snake_case fields to camelCase (for frontend display)
 * @param {Object} options - config options
 * @param {Array} options.exclude - field names to exclude
 * @param {boolean} options.deep - whether to deep transform nested objects
 * @returns {Function} Express middleware
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
          // Transform response data
          const transformedData = humps.camelizeKeys(data, {
            process: (key, convert, options) => {
              // Skip excluded fields
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
        console.error('Response transform error:', error);
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
