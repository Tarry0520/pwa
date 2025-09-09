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
 * 用户注册
 * POST /users/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 验证必填字段
    if (!email || !password) {
      return validationErrorResponse(res, '邮箱和密码都是必填项');
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return validationErrorResponse(res, '邮箱格式不正确');
    }

    // 验证密码长度
    if (password.length < 6) {
      return validationErrorResponse(res, '密码长度至少6位');
    }

    // 创建用户（自动生成学号）
    const user = await userService.createUser({ email, password });

    return successResponse(res, 201, '用户注册成功，学号已自动生成', formatUser(user));
  } catch (error) {
    console.error('用户注册错误:', error);
    return errorResponse(res, 400, error.message || '用户注册失败');
  }
});

/**
 * 用户登录
 * POST /users/login
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // 验证必填字段
    if (!identifier || !password) {
      return validationErrorResponse(res, '邮箱/学号和密码都是必填项');
    }

    // 用户登录
    const result = await userService.login(identifier, password);

    return successResponse(res, 200, '登录成功', formatLoginResponse(result));
  } catch (error) {
    console.error('用户登录错误:', error);
    return errorResponse(res, 401, error.message || '登录失败');
  }
});

/**
 * 用户登出
 * POST /users/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    const userId = req.user.id;

    await userService.logout(token, userId);

    return successResponse(res, 200, '登出成功');
  } catch (error) {
    console.error('用户登出错误:', error);
    return errorResponse(res, 500, '登出失败');
  }
});

/**
 * 获取当前用户信息
 * GET /users/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userInfo = await userService.getUserInfo(userId);

    if (!userInfo) {
      return errorResponse(res, 404, '用户不存在');
    }

    return successResponse(res, 200, '获取用户信息成功', formatUser(userInfo));
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return errorResponse(res, 500, '获取用户信息失败');
  }
});

/**
 * 验证Token有效性
 * GET /users/verify-token
 */
router.get('/verify-token', authenticateToken, (req, res) => {
  return successResponse(res, 200, 'Token有效', {
    user: {
      id: req.user.id,
      studentId: req.user.student_id,
      email: req.user.email
    }
  });
});

/**
 * 更新用户个人信息
 * PUT /users/profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, email, phone } = req.body; // 使用驼峰命名（前端发送的格式）

    // 验证至少有一个字段要更新
    if (!displayName && !email && !phone) {
      return validationErrorResponse(res, '至少需要提供一个要更新的字段');
    }

    // 更新用户信息
    const updatedUser = await userService.updateUserProfile(userId, {
      displayName,
      email,
      phone
    });

    return successResponse(res, 200, '个人信息更新成功', formatUser(updatedUser));
  } catch (error) {
    console.error('更新个人信息错误:', error);
    return errorResponse(res, 400, error.message || '更新个人信息失败');
  }
});

/**
 * 修改用户密码
 * PUT /users/password
 */
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body; // 使用驼峰命名（前端发送的格式）
    const currentToken = req.headers['authorization']?.split(' ')[1]; // 获取当前token

    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return validationErrorResponse(res, '旧密码和新密码都是必填项');
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return validationErrorResponse(res, '新密码长度至少6位');
    }

    // 修改密码（传递当前token用于清除）
    await userService.changePassword(userId, oldPassword, newPassword, currentToken);

    return successResponse(res, 200, '密码修改成功，请重新登录');
  } catch (error) {
    console.error('修改密码错误:', error);
    return errorResponse(res, 400, error.message || '修改密码失败');
  }
});

module.exports = router;
