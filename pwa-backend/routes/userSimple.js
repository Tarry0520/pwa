const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticateToken } = require('../middleware/auth');
// Note: Global middleware is configured in app.js; no need to duplicate here
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// Note: Field transform middleware is configured globally in app.js

/**
 * User registration - simplified
 * POST /users/register
 */
router.post('/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Create user
      const user = await userService.createUser({ email, password });
      
      return successResponse(res, 201, 'User registered successfully, student ID generated automatically', user);
    } catch (error) {
      console.error('User registration error:', error);
      return errorResponse(res, 400, error.message || 'User registration failed');
    }
  }
);

/**
 * User login - simplified
 * POST /users/login
 */
router.post('/login', async (req, res) => {
    try {
      const { identifier, password } = req.body;
      
      // Perform login
      const result = await userService.login(identifier, password);
      
      return successResponse(res, 200, 'Login successful', result);
    } catch (error) {
      console.error('User login error:', error);
      return errorResponse(res, 401, error.message || 'Login failed');
    }
  }
);

/**
 * Get user info - auto field transform
 * GET /users/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userInfo = await userService.getUserInfo(userId);
    
    if (!userInfo) {
      return errorResponse(res, 404, 'User not found');
    }
    
    return successResponse(res, 200, 'User information retrieved successfully', userInfo);
  } catch (error) {
    console.error('Get user info error:', error);
    return errorResponse(res, 500, 'Failed to get user info');
  }
});

/**
 * Update user info - simplified
 * PUT /users/profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { displayName, email, phone } = req.body; // camelCase payload from frontend
      
      // Validate at least one field to update
      if (!displayName && !email && !phone) {
        return errorResponse(res, 400, 'At least one field must be provided for update');
      }
      
      // Update user info
      const updatedUser = await userService.updateUserProfile(userId, {
        displayName,
        email,
        phone
      });
      
      return successResponse(res, 200, 'Personal information updated successfully', updatedUser);
    } catch (error) {
      console.error('Update profile error:', error);
      return errorResponse(res, 400, error.message || 'Failed to update personal information');
    }
  }
);

/**
 * Change password - simplified
 * PUT /users/password
 */
router.put('/password', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body; // camelCase payload from frontend
      const currentToken = req.headers['authorization']?.split(' ')[1]; // current token
      
      // Change password (also clears current token)
      await userService.changePassword(userId, oldPassword, newPassword, currentToken);
      
      return successResponse(res, 200, 'Password changed successfully, please login again');
    } catch (error) {
      console.error('Change password error:', error);
      return errorResponse(res, 400, error.message || 'Failed to change password');
    }
  }
);

module.exports = router;
