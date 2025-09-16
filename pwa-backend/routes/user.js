const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticateToken } = require('../middleware/auth');
const { 
  formatUser, 
  formatLoginResponse, 
  successResponse, 
  errorResponse, 
  validationErrorResponse 
} = require('../utils/responseFormatter');

/**
 * User registration
 * POST /users/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return validationErrorResponse(res, 'Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return validationErrorResponse(res, 'Invalid email format');
    }

    // Validate password length
    if (password.length < 6) {
      return validationErrorResponse(res, 'Password must be at least 6 characters');
    }

    // Create user (auto-generate student ID)
    const user = await userService.createUser({ email, password });

    return successResponse(res, 201, 'User registered successfully, student ID generated automatically', formatUser(user));
  } catch (error) {
    console.error('User registration error:', error);
    return errorResponse(res, 400, error.message || 'User registration failed');
  }
});

/**
 * User login
 * POST /users/login
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validate required fields
    if (!identifier || !password) {
      return validationErrorResponse(res, 'Email/studentId and password are required');
    }

    // Perform login
    const result = await userService.login(identifier, password);

    return successResponse(res, 200, 'Login successful', formatLoginResponse(result));
  } catch (error) {
    console.error('User login error:', error);
    return errorResponse(res, 401, error.message || 'Login failed');
  }
});

/**
 * User logout
 * POST /users/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    const userId = req.user.id;

    await userService.logout(token, userId);

    return successResponse(res, 200, 'Logout successful');
  } catch (error) {
    console.error('User logout error:', error);
    return errorResponse(res, 500, 'Logout failed');
  }
});

/**
 * Get current user info
 * GET /users/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userInfo = await userService.getUserInfo(userId);

    if (!userInfo) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'User information retrieved successfully', formatUser(userInfo));
  } catch (error) {
    console.error('Get user info error:', error);
    return errorResponse(res, 500, 'Failed to get user info');
  }
});

/**
 * Verify token validity
 * GET /users/verify-token
 */
router.get('/verify-token', authenticateToken, (req, res) => {
  return successResponse(res, 200, 'Token is valid', {
    user: {
      id: req.user.id,
      studentId: req.user.student_id,
      email: req.user.email
    }
  });
});

/**
 * Update user profile
 * PUT /users/profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, email, phone } = req.body; // camelCase payload from frontend

    // Validate at least one field to update
    if (!displayName && !email && !phone) {
      return validationErrorResponse(res, 'At least one field must be provided for update');
    }

    // Update
    const updatedUser = await userService.updateUserProfile(userId, {
      displayName,
      email,
      phone
    });

    return successResponse(res, 200, 'Personal information updated successfully', formatUser(updatedUser));
  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse(res, 400, error.message || 'Failed to update personal information');
  }
});

/**
 * Change user password
 * PUT /users/password
 */
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body; // camelCase payload from frontend
    const currentToken = req.headers['authorization']?.split(' ')[1]; // current token

    // Validate required fields
    if (!oldPassword || !newPassword) {
      return validationErrorResponse(res, 'Old password and new password are required');
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return validationErrorResponse(res, 'New password must be at least 6 characters');
    }

    // Change password (also clears current token)
    await userService.changePassword(userId, oldPassword, newPassword, currentToken);

    return successResponse(res, 200, 'Password changed successfully, please login again');
  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse(res, 400, error.message || 'Failed to change password');
  }
});

module.exports = router;
