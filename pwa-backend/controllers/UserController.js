/**
 * 用户Controller
 * 处理用户相关的业务逻辑和字段转换
 */

const BaseController = require('./BaseController');

class UserController extends BaseController {
  /**
   * 构造函数
   * @param {Object} userService - 用户服务实例
   */
  constructor(userService) {
    super(userService);
  }

  /**
   * 用户注册
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async register(req, res) {
    // 转换请求数据（前端字段 -> 数据库字段）
    const transformedReq = this.transformRequest(req);
    const { email, password } = transformedReq.body;

    // 验证必填字段
    const requiredErrors = this.validateRequired({ email, password }, ['email', 'password']);
    if (requiredErrors.length > 0) {
      return this.sendValidationError(res, requiredErrors);
    }

    // 验证邮箱格式
    if (!this.validateEmail(email)) {
      return this.sendValidationError(res, 'Invalid email format');
    }

    // 验证密码长度
    if (!this.validatePassword(password)) {
      return this.sendValidationError(res, 'Password must be at least 6 characters');
    }

    // 调用服务层
    const result = await this.handleAsync(
      () => this.service.createUser({ email, password }),
      res,
      'User registration failed'
    );

    if (result) {
      return this.sendSuccess(res, 201, 'User registered successfully, student ID generated automatically', result);
    }
  }

  /**
   * 用户登录
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async login(req, res) {
    // 转换请求数据
    const transformedReq = this.transformRequest(req);
    const { identifier, password } = transformedReq.body;

    // 验证必填字段
    const requiredErrors = this.validateRequired({ identifier, password }, ['identifier', 'password']);
    if (requiredErrors.length > 0) {
      return this.sendValidationError(res, requiredErrors);
    }

    // 调用服务层
    const result = await this.handleAsync(
      () => this.service.login(identifier, password),
      res,
      'Login failed'
    );

    if (result) {
      // 转换登录响应数据
      const transformedResult = {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn
      };
      return this.sendSuccess(res, 200, 'Login successful', transformedResult);
    }
  }

  /**
   * 用户登出
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async logout(req, res) {
    const token = req.headers['authorization'].split(' ')[1];
    const userId = req.user.id;

    const result = await this.handleAsync(
      () => this.service.logout(token, userId),
      res,
      'Logout failed'
    );

    if (result) {
      return this.sendSuccess(res, 200, 'Logout successful');
    }
  }

  /**
   * 获取用户信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getProfile(req, res) {
    const userId = req.user.id;

    const result = await this.handleAsync(
      () => this.service.getUserInfo(userId),
      res,
      'Failed to get user information'
    );

    if (result) {
      return this.sendSuccess(res, 200, 'User information retrieved successfully', result);
    } else {
      return this.sendError(res, 404, 'User not found');
    }
  }

  /**
   * 更新用户信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async updateProfile(req, res) {
    // 直接使用req.body（前端发送的驼峰格式）
    const { displayName, email, phone } = req.body;
    const userId = req.user.id;

    // 验证至少有一个字段要更新
    if (!displayName && !email && !phone) {
      return this.sendValidationError(res, 'At least one field must be provided for update');
    }

    // 验证邮箱格式（如果提供了邮箱）
    if (email && !this.validateEmail(email)) {
      return this.sendValidationError(res, 'Invalid email format');
    }

    // 调用服务层
    const result = await this.handleAsync(
      () => this.service.updateUserProfile(userId, { 
        displayName,
        email, 
        phone 
      }),
      res,
      'Failed to update personal information'
    );

    if (result) {
      return this.sendSuccess(res, 200, 'Personal information updated successfully', result);
    }
  }

  /**
   * 修改密码
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async changePassword(req, res) {
    // 直接使用req.body（前端发送的驼峰格式）
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    const currentToken = req.headers['authorization']?.split(' ')[1]; // 获取当前token

    // 验证必填字段
    const requiredErrors = this.validateRequired({ oldPassword, newPassword }, ['oldPassword', 'newPassword']);
    if (requiredErrors.length > 0) {
      return this.sendValidationError(res, requiredErrors);
    }

    // 验证新密码长度
    if (!this.validatePassword(newPassword)) {
      return this.sendValidationError(res, 'New password must be at least 6 characters');
    }

    // 调用服务层（传递当前token用于清除）
    const result = await this.handleAsync(
      () => this.service.changePassword(userId, oldPassword, newPassword, currentToken),
      res,
      'Failed to change password'
    );

    if (result) {
      return this.sendSuccess(res, 200, 'Password changed successfully, please login again');
    }
  }

  /**
   * 验证Token
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  verifyToken(req, res) {
    const userInfo = {
      id: req.user.id,
      studentId: req.user.student_id,
      email: req.user.email
    };
    
    return this.sendSuccess(res, 200, 'Token is valid', { user: userInfo });
  }
}

module.exports = UserController;
