/**
 * SSO Controller
 * 处理单点登录相关的业务逻辑和字段转换
 */

const BaseController = require('./BaseController');
const { BUSINESS_CODE } = require('../utils/responseCodes');

class SSOController extends BaseController {
  /**
   * 构造函数
   * @param {Object} userService - 用户服务实例
   */
  constructor(userService) {
    super(userService);
  }

  /**
   * 获取OAuth用户信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getUserInfo(req, res) {
    // 从Authorization头获取token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return this.sendError(res, BUSINESS_CODE.TOKEN_MISSING);
    }

    try {
      // 验证token并获取用户信息
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const result = await this.handleAsync(
        () => this.service.getUserInfo(decoded.id),
        res,
        'Failed to get user information'
      );

      if (result) {
        return this.sendSuccess(res, BUSINESS_CODE.SUCCESS, 'User information retrieved successfully', result);
      } else {
        return this.sendError(res, BUSINESS_CODE.USER_NOT_FOUND);
      }
    } catch (error) {
      console.error('Failed to get OAuth user information:', error);
      return this.sendError(res, BUSINESS_CODE.TOKEN_INVALID);
    }
  }

  /**
   * 获取OAuth服务状态
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
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
    
    return this.sendSuccess(res, BUSINESS_CODE.SUCCESS, 'OAuth service is running', statusData);
  }

  /**
   * OAuth登出
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction failed:', err);
        return this.sendError(res, BUSINESS_CODE.INTERNAL_ERROR, 'Logout failed');
      }
      
      return this.sendSuccess(res, BUSINESS_CODE.SUCCESS, 'Logout successful');
    });
  }
}

module.exports = SSOController;
