/**
 * SSO Controller
 * 处理单点登录相关的业务逻辑和字段转换
 */

const BaseController = require('./BaseController');

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
      return this.sendError(res, 401, 'Access token not provided');
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
        return this.sendSuccess(res, 200, 'User information retrieved successfully', result);
      } else {
        return this.sendError(res, 404, 'User not found');
      }
    } catch (error) {
      console.error('获取OAuth用户信息失败:', error);
      return this.sendError(res, 401, 'Invalid access token');
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
    
    return this.sendSuccess(res, 200, 'OAuth service is running', statusData);
  }

  /**
   * OAuth登出
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session销毁失败:', err);
        return this.sendError(res, 500, 'Logout failed');
      }
      
      return this.sendSuccess(res, 200, 'Logout successful');
    });
  }
}

module.exports = SSOController;
