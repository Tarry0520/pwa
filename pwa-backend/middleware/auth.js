const jwt = require('jsonwebtoken');
const { get, exists } = require('../config/redis');
require('dotenv').config();

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

/**
 * Generate JWT token
 * @param {Object} payload - user payload
 * @param {string} expiresIn - expiry time
 * @returns {string} JWT Token
 */
function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verify JWT token
 * @param {string} token - JWT Token
 * @returns {Object|null} decoded payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * JWT authentication middleware
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Function} next - next middleware
 */
async function authenticateToken(req, res, next) {
  try {
    // Read token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is missing'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: 'Invalid access token'
      });
    }

    // Check if token is in Redis blacklist (for logout)
    const isBlacklisted = await exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(403).json({
        success: false,
        message: 'Token has been revoked'
      });
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Optional JWT auth middleware (token not required)
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Function} next - next middleware
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
    console.error('Optional auth middleware error:', error);
    next();
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuth
};
