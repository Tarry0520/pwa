/**
 * 用户路由 - 使用Controller层
 * 自动处理字段转换：前端字段 <-> 数据库字段
 */

const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticateToken } = require('../middleware/auth');
const UserController = require('../controllers/UserController');

// 创建Controller实例
const userController = new UserController(userService);

/**
 * 用户注册
 * POST /users/register
 * 前端发送: { email, password }
 * 后端接收: { email, password } (字段名不变)
 * 后端返回: { studentId, email, displayName, ... } (数据库字段转驼峰)
 */
router.post('/register', (req, res) => {
  userController.register(req, res);
});

/**
 * 用户登录
 * POST /users/login
 * 前端发送: { identifier, password }
 * 后端接收: { identifier, password } (字段名不变)
 * 后端返回: { user: { studentId, displayName, ... }, token, expiresIn }
 */
router.post('/login', (req, res) => {
  userController.login(req, res);
});

/**
 * 用户登出
 * POST /users/logout
 * 后端返回: { success: true, message: "登出成功" }
 */
router.post('/logout', authenticateToken, (req, res) => {
  userController.logout(req, res);
});

/**
 * 获取用户信息
 * GET /users/profile
 * 后端返回: { studentId, displayName, avatarUrl, ... } (数据库字段转驼峰)
 */
router.get('/profile', authenticateToken, (req, res) => {
  userController.getProfile(req, res);
});

/**
 * 更新用户信息
 * PUT /users/profile
 * 前端发送: { displayName, email, phone }
 * 后端接收: { display_name, email, phone } (驼峰转下划线)
 * 后端返回: { studentId, displayName, phone, ... } (数据库字段转驼峰)
 */
router.put('/profile', authenticateToken, (req, res) => {
  userController.updateProfile(req, res);
});

/**
 * 修改密码
 * PUT /users/password
 * 前端发送: { oldPassword, newPassword }
 * 后端接收: { oldPassword, newPassword } (字段名不变)
 * 后端返回: { success: true, message: "密码修改成功" }
 */
router.put('/password', authenticateToken, (req, res) => {
  userController.changePassword(req, res);
});

/**
 * 验证Token
 * GET /users/verify-token
 * 后端返回: { user: { id, studentId, email } }
 */
router.get('/verify-token', authenticateToken, (req, res) => {
  userController.verifyToken(req, res);
});

module.exports = router;
