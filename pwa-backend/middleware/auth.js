const jwt = require('jsonwebtoken');
const { get, exists } = require('../config/redis');
const { errorResponse } = require('../utils/responseFormatter');
const { BUSINESS_CODE } = require('../utils/responseCodes');
require('dotenv').config();

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

/**
 * 生成JWT Token
 * @param {Object} payload - 用户信息
 * @param {string} expiresIn - 过期时间
 * @returns {string} JWT Token
 */
function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * 验证JWT Token
 * @param {string} token - JWT Token
 * @returns {Object|null} 解码后的用户信息
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * JWT认证中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function authenticateToken(req, res, next) {
  try {
    // 从请求头获取token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return errorResponse(res, BUSINESS_CODE.TOKEN_MISSING);
    }

    // 验证token
    const decoded = verifyToken(token);
    if (!decoded) {
      return errorResponse(res, BUSINESS_CODE.TOKEN_INVALID);
    }

    // 检查token是否在Redis黑名单中（用于登出功能）
    const isBlacklisted = await exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return errorResponse(res, BUSINESS_CODE.TOKEN_BLACKLISTED);
    }

    // 将用户信息添加到请求对象
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return errorResponse(res, BUSINESS_CODE.INTERNAL_ERROR, null, error.message);
  }
}

/**
 * 可选的JWT认证中间件（不强制要求token）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const isBlacklisted = await exists(`blacklist:${token}`);
        if (!isBlacklisted) {
          req.user = decoded;
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    next();
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuth
};
