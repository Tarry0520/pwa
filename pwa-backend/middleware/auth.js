const jwt = require('jsonwebtoken');
const { get, exists } = require('../config/redis');
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
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失'
      });
    }

    // 验证token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: '无效的访问令牌'
      });
    }

    // 检查token是否在Redis黑名单中（用于登出功能）
    const isBlacklisted = await exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(403).json({
        success: false,
        message: '令牌已失效'
      });
    }

    // 将用户信息添加到请求对象
    req.user = decoded;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
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
    console.error('可选认证中间件错误:', error);
    next();
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuth
};
