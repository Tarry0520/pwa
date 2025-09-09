const express = require("express");
const router = express.Router();
const axios = require("axios");
const querystring = require("querystring");
const userService = require('../services/userService');
const { formatUser, successResponse, errorResponse } = require('../utils/responseFormatter');
require('dotenv').config();

// ========== 配置 Azure AD 应用信息 ==========
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI;
const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL;

// 微软登录
router.get("/microsoft", (req, res) => {
  try {
    // 生成随机state参数用于安全验证
    const state = Math.random().toString(36).substring(2, 15);
    
    // 将state存储到session中
    req.session.oauthState = state;
    
    const params = querystring.stringify({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      response_mode: "query",
      scope: "openid profile email",
      state: state,
    });
    
    const microsoftAuthUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`;
    
    console.log('Microsoft OAuth配置:');
    console.log('- CLIENT_ID:', CLIENT_ID);
    console.log('- REDIRECT_URI:', REDIRECT_URI);
    console.log('- TENANT_ID:', TENANT_ID);
    console.log('- 生成的state:', state);
    console.log('- 重定向URL:', microsoftAuthUrl);
    
    res.redirect(microsoftAuthUrl);
  } catch (error) {
    console.error('Microsoft登录重定向失败:', error);
    return errorResponse(res, 500, 'Microsoft login initialization failed', error.message);
  }
});

// 微软OAuth回调
router.get("/callback", async (req, res) => {
  const { code, error, error_description, state } = req.query;
  
  // 验证state参数
  if (state !== req.session.oauthState) {
    return errorResponse(res, 400, 'Invalid state parameter');
  }
  
  if (error) {
    return errorResponse(res, 400, `Login error: ${error_description}`);
  }
  
  if (!code) {
    return errorResponse(res, 400, 'No authorization code returned from Microsoft');
  }

  try {
    // 交换授权码获取访问令牌
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      querystring.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        scope: "openid profile email",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token } = tokenRes.data;

    // 获取用户信息
    const userRes = await axios.get("https://graph.microsoft.com/oidc/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const microsoftUser = userRes.data;
    
    // 准备OAuth用户数据
    const oauthData = {
      provider: 'microsoft',
      providerId: microsoftUser.sub,
      email: microsoftUser.email,
      displayName: microsoftUser.name || microsoftUser.email,
      avatarUrl: microsoftUser.picture || null
    };

    // 使用OAuth登录
    const loginResult = await userService.oauthLogin(oauthData);

    // 清除session中的state
    delete req.session.oauthState;

    // 重定向到前端首页，携带用户信息和token
    const userData = {
      id: loginResult.user.id,
      studentId: loginResult.user.student_id,
      email: loginResult.user.email,
      displayName: loginResult.user.display_name,
      avatarUrl: loginResult.user.avatar_url,
      provider: loginResult.user.provider
    };
    
    // 将用户信息编码为URL参数
    const userDataEncoded = encodeURIComponent(JSON.stringify(userData));
    const tokenEncoded = encodeURIComponent(loginResult.token);
    
    // 直接跳转到前端首页
    const redirectUrl = `${FRONTEND_URL}/?token=${tokenEncoded}&user=${userDataEncoded}&login=success`;
    res.redirect(redirectUrl);
    
  } catch (err) {
    console.error("微软OAuth认证失败:", err.response?.data || err.message);
    
    // 重定向到前端首页，携带错误信息
    const errorUrl = `${FRONTEND_URL}/?login=error&error=${encodeURIComponent('Authentication failed')}`;
    res.redirect(errorUrl);
  }
});

// 获取当前OAuth用户信息（基于JWT）
router.get("/userinfo", async (req, res) => {
  try {
    // 从Authorization头获取token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return errorResponse(res, 401, 'Access token not provided');
    }

    // 验证token并获取用户信息
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userInfo = await userService.getUserInfo(decoded.id);
    
    if (!userInfo) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'User information retrieved successfully', formatUser(userInfo));
  } catch (error) {
    console.error('获取OAuth用户信息失败:', error);
    return errorResponse(res, 401, 'Invalid access token');
  }
});

// 获取OAuth登录状态
router.get("/status", (req, res) => {
  return successResponse(res, 200, 'OAuth service is running', {
    providers: {
      microsoft: {
        enabled: true,
        loginUrl: '/sso/login'
      }
    },
    config: {
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      tenantId: TENANT_ID,
      frontendUrl: FRONTEND_URL
    }
  });
});

// 验证登录状态（用于前端首页检查）
router.get("/verify-login", async (req, res) => {
  try {
    // 从查询参数获取token和用户信息
    const { token, user } = req.query;
    
    if (!token || !user) {
      return successResponse(res, 200, 'Not logged in', { 
        isLoggedIn: false,
        user: null,
        token: null
      });
    }
    
    // 验证token有效性
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded) {
      return successResponse(res, 200, 'Token is invalid', { 
        isLoggedIn: false,
        user: null,
        token: null
      });
    }
    
    // 解析用户信息
    const userData = JSON.parse(decodeURIComponent(user));
    
    return successResponse(res, 200, 'Login status is valid', {
      isLoggedIn: true,
      user: userData,
      token: token
    });
    
  } catch (error) {
    console.error('验证登录状态失败:', error);
    return successResponse(res, 200, 'Login status verification failed', { 
      isLoggedIn: false,
      user: null,
      token: null
    });
  }
});

// 登出（清除session）
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session销毁失败:', err);
      return errorResponse(res, 500, 'Logout failed');
    }
    
    return successResponse(res, 200, 'Logout successful');
  });
});

module.exports = router;
