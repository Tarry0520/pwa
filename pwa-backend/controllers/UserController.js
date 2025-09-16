/**
 * User controller
 * Handles user-related logic and field transformations
 */

const BaseController = require('./BaseController');

class UserController extends BaseController {
  /**
   * Constructor
   * @param {Object} userService - user service instance
   */
  constructor(userService) {
    super(userService);
  }

  /**
   * Register user
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async register(req, res) {
    // Transform request (frontend -> DB fields)
    const transformedReq = this.transformRequest(req);
    const { email, password } = transformedReq.body;

    // Validate required
    const requiredErrors = this.validateRequired({ email, password }, ['email', 'password']);
    if (requiredErrors.length > 0) {
      return this.sendValidationError(res, requiredErrors);
    }

    // Validate email
    if (!this.validateEmail(email)) {
      return this.sendValidationError(res, 'Invalid email format');
    }

    // Validate password length
    if (!this.validatePassword(password)) {
      return this.sendValidationError(res, 'Password must be at least 6 characters');
    }

    // Call service
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
   * Login
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async login(req, res) {
    // Transform request
    const transformedReq = this.transformRequest(req);
    const { identifier, password } = transformedReq.body;

    // Validate required
    const requiredErrors = this.validateRequired({ identifier, password }, ['identifier', 'password']);
    if (requiredErrors.length > 0) {
      return this.sendValidationError(res, requiredErrors);
    }

    // Call service
    const result = await this.handleAsync(
      () => this.service.login(identifier, password),
      res,
      'Login failed'
    );

    if (result) {
      // Build response
      const transformedResult = {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn
      };
      return this.sendSuccess(res, 200, 'Login successful', transformedResult);
    }
  }

  /**
   * Logout
   * @param {Object} req - Express request
   * @param {Object} res - Express response
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
   * Get user info
   * @param {Object} req - Express request
   * @param {Object} res - Express response
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
   * Update user info
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async updateProfile(req, res) {
    // Use req.body as-is (camelCase from frontend)
    const { displayName, email, phone } = req.body;
    const userId = req.user.id;

    // Require at least one field
    if (!displayName && !email && !phone) {
      return this.sendValidationError(res, 'At least one field must be provided for update');
    }

    // Validate email if provided
    if (email && !this.validateEmail(email)) {
      return this.sendValidationError(res, 'Invalid email format');
    }

    // Call service
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
   * Change password
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async changePassword(req, res) {
    // Use req.body as-is (camelCase)
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    const currentToken = req.headers['authorization']?.split(' ')[1]; // current token

    // Validate required
    const requiredErrors = this.validateRequired({ oldPassword, newPassword }, ['oldPassword', 'newPassword']);
    if (requiredErrors.length > 0) {
      return this.sendValidationError(res, requiredErrors);
    }

    // Validate new password length
    if (!this.validatePassword(newPassword)) {
      return this.sendValidationError(res, 'New password must be at least 6 characters');
    }

    // Call service (clear current token as well)
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
   * Verify token
   * @param {Object} req - Express request
   * @param {Object} res - Express response
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
