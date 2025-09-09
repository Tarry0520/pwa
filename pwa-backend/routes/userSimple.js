const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticateToken } = require('../middleware/auth');
// 注意：全局中间件已在 app.js 中配置，无需在此处重复配置
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// 注意：字段转换中间件已在 app.js 中全局配置

/**
 * 用户注册 - 使用简单验证和转换
 * POST /users/register
 */
router.post('/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // 创建用户
      const user = await userService.createUser({ email, password });
      
      return successResponse(res, 201, '用户注册成功，学号已自动生成', user);
    } catch (error) {
      console.error('用户注册错误:', error);
      return errorResponse(res, 400, error.message || '用户注册失败');
    }
  }
);

/**
 * 用户登录 - 使用简单验证和转换
 * POST /users/login
 */
router.post('/login', async (req, res) => {
    try {
      const { identifier, password } = req.body;
      
      // 用户登录
      const result = await userService.login(identifier, password);
      
      return successResponse(res, 200, '登录成功', result);
    } catch (error) {
      console.error('用户登录错误:', error);
      return errorResponse(res, 401, error.message || '登录失败');
    }
  }
);

/**
 * 获取用户信息 - 自动字段转换
 * GET /users/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userInfo = await userService.getUserInfo(userId);
    
    if (!userInfo) {
      return errorResponse(res, 404, '用户不存在');
    }
    
    return successResponse(res, 200, '获取用户信息成功', userInfo);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return errorResponse(res, 500, '获取用户信息失败');
  }
});

/**
 * 更新用户信息 - 使用简单验证和转换
 * PUT /users/profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { displayName, email, phone } = req.body; // 使用驼峰命名（前端发送的格式）
      
      // 验证至少有一个字段要更新
      if (!displayName && !email && !phone) {
        return errorResponse(res, 400, '至少需要提供一个要更新的字段');
      }
      
      // 更新用户信息
      const updatedUser = await userService.updateUserProfile(userId, {
        displayName,
        email,
        phone
      });
      
      return successResponse(res, 200, '个人信息更新成功', updatedUser);
    } catch (error) {
      console.error('更新个人信息错误:', error);
      return errorResponse(res, 400, error.message || '更新个人信息失败');
    }
  }
);

/**
 * 修改密码 - 使用简单验证和转换
 * PUT /users/password
 */
router.put('/password', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body; // 使用驼峰命名（前端发送的格式）
      const currentToken = req.headers['authorization']?.split(' ')[1]; // 获取当前token
      
      // 修改密码（传递当前token用于清除）
      await userService.changePassword(userId, oldPassword, newPassword, currentToken);
      
      return successResponse(res, 200, '密码修改成功，请重新登录');
    } catch (error) {
      console.error('修改密码错误:', error);
      return errorResponse(res, 400, error.message || '修改密码失败');
    }
  }
);

module.exports = router;
