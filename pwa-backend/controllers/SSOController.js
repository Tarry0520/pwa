/**
 * SSO Controller
 * Handles single sign-on related logic and field conversions
 */

const BaseController = require('./BaseController');

class SSOController extends BaseController {
  /**
   * Constructor
   * @param {Object} userService - user service instance
   */
  constructor(userService) {
    super(userService);
  }

  /**
   * Get OAuth user info
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getUserInfo(req, res) {
    // Read token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return this.sendError(res, 401, 'Access token not provided');
    }

    try {
      // Verify token and get user info
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const result = await this.handleAsync(
        () => this.service.getUserInfo(decoded.id),
        res,
        'Failed to get user information'
      );

      if (result) {
        return this.sendSuccess(res, 200, 'User information retrieved successfully', result);
      } else {
        return this.sendError(res, 404, 'User not found');
      }
    } catch (error) {
      console.error('Get OAuth user info failed:', error);
      return this.sendError(res, 401, 'Invalid access token');
    }
  }

  /**
   * Get OAuth service status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getStatus(req, res) {
    const statusData = {
      providers: {
        microsoft: {
          enabled: true,
          loginUrl: '/sso/microsoft'
        }
      }
    };
    
    return this.sendSuccess(res, 200, 'OAuth service is running', statusData);
  }

  /**
   * OAuth logout
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Failed to destroy session:', err);
        return this.sendError(res, 500, 'Logout failed');
      }
      
      return this.sendSuccess(res, 200, 'Logout successful');
    });
  }
}

module.exports = SSOController;
