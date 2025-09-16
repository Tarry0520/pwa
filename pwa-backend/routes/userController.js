/**
 * User routes - via Controller layer
 * Automatically handles field transformation: frontend <-> database
 */

const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticateToken } = require('../middleware/auth');
const UserController = require('../controllers/UserController');

// Create controller instance
const userController = new UserController(userService);

/**
 * User registration
 * POST /users/register
 * Frontend: { email, password }
 * Backend receives: { email, password }
 * Backend returns: { studentId, email, displayName, ... }
 */
router.post('/register', (req, res) => {
  userController.register(req, res);
});

/**
 * User login
 * POST /users/login
 * Frontend: { identifier, password }
 * Backend receives: { identifier, password }
 * Backend returns: { user: {...}, token, expiresIn }
 */
router.post('/login', (req, res) => {
  userController.login(req, res);
});

/**
 * User logout
 * POST /users/logout
 * Returns: { success: true, message }
 */
router.post('/logout', authenticateToken, (req, res) => {
  userController.logout(req, res);
});

/**
 * Get user info
 * GET /users/profile
 * Returns: { studentId, displayName, avatarUrl, ... }
 */
router.get('/profile', authenticateToken, (req, res) => {
  userController.getProfile(req, res);
});

/**
 * Update user info
 * PUT /users/profile
 * Frontend: { displayName, email, phone }
 * Returns: { studentId, displayName, phone, ... }
 */
router.put('/profile', authenticateToken, (req, res) => {
  userController.updateProfile(req, res);
});

/**
 * Change password
 * PUT /users/password
 * Frontend: { oldPassword, newPassword }
 */
router.put('/password', authenticateToken, (req, res) => {
  userController.changePassword(req, res);
});

/**
 * Verify token
 * GET /users/verify-token
 * Returns: { user: { id, studentId, email } }
 */
router.get('/verify-token', authenticateToken, (req, res) => {
  userController.verifyToken(req, res);
});

module.exports = router;
