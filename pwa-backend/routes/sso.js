const express = require("express");
const router = express.Router();
const axios = require("axios");
const querystring = require("querystring");
const userService = require('../services/userService');
const { formatUser, successResponse, errorResponse } = require('../utils/responseFormatter');
require('dotenv').config();

// ========== Azure AD App Configuration ==========
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI;
const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Microsoft login
router.get("/microsoft", (req, res) => {
  try {
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in session
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
    
    console.log('Microsoft OAuth configuration:');
    console.log('- CLIENT_ID:', CLIENT_ID);
    console.log('- REDIRECT_URI:', REDIRECT_URI);
    console.log('- TENANT_ID:', TENANT_ID);
    console.log('- state:', state);
    console.log('- redirect URL:', microsoftAuthUrl);
    
    res.redirect(microsoftAuthUrl);
  } catch (error) {
    console.error('Microsoft login redirect failed:', error);
    return errorResponse(res, 500, 'Microsoft login initialization failed', error.message);
  }
});

// Microsoft OAuth callback
router.get("/callback", async (req, res) => {
  const { code, error, error_description, state } = req.query;
  
  // Validate state
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
    // Exchange authorization code for access token
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

    // Fetch user info
    const userRes = await axios.get("https://graph.microsoft.com/oidc/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const microsoftUser = userRes.data;
    
    // Prepare OAuth user data
    const oauthData = {
      provider: 'microsoft',
      providerId: microsoftUser.sub,
      email: microsoftUser.email,
      displayName: microsoftUser.name || microsoftUser.email,
      avatarUrl: microsoftUser.picture || null
    };

    // Perform OAuth login
    const loginResult = await userService.oauthLogin(oauthData);

    // Clear session state
    delete req.session.oauthState;

    // Redirect to frontend with user info and token
    const userData = {
      id: loginResult.user.id,
      studentId: loginResult.user.student_id,
      email: loginResult.user.email,
      displayName: loginResult.user.display_name,
      avatarUrl: loginResult.user.avatar_url,
      provider: loginResult.user.provider
    };
    
    // Encode data for URL
    const userDataEncoded = encodeURIComponent(JSON.stringify(userData));
    const tokenEncoded = encodeURIComponent(loginResult.token);
    
    // Redirect to frontend
    const redirectUrl = `${FRONTEND_URL}/?token=${tokenEncoded}&user=${userDataEncoded}&login=success`;
    res.redirect(redirectUrl);
    
  } catch (err) {
    console.error("Microsoft OAuth authentication failed:", err.response?.data || err.message);
    
    // Redirect to frontend with error
    const errorUrl = `${FRONTEND_URL}/?login=error&error=${encodeURIComponent('Authentication failed')}`;
    res.redirect(errorUrl);
  }
});

// Get current OAuth user info (via JWT)
router.get("/userinfo", async (req, res) => {
  try {
    // Read token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return errorResponse(res, 401, 'Access token not provided');
    }

    // Verify token and fetch user info
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userInfo = await userService.getUserInfo(decoded.id);
    
    if (!userInfo) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'User information retrieved successfully', formatUser(userInfo));
  } catch (error) {
    console.error('Get OAuth user info failed:', error);
    return errorResponse(res, 401, 'Invalid access token');
  }
});

// Get OAuth service status
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

// Verify login status (for frontend home page check)
router.get("/verify-login", async (req, res) => {
  try {
    // Read token and user from query
    const { token, user } = req.query;
    
    if (!token || !user) {
      return successResponse(res, 200, 'Not logged in', { 
        isLoggedIn: false,
        user: null,
        token: null
      });
    }
    
    // Verify token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded) {
      return successResponse(res, 200, 'Token is invalid', { 
        isLoggedIn: false,
        user: null,
        token: null
      });
    }
    
    // Parse user
    const userData = JSON.parse(decodeURIComponent(user));
    
    return successResponse(res, 200, 'Login status is valid', {
      isLoggedIn: true,
      user: userData,
      token: token
    });
    
  } catch (error) {
    console.error('Verify login status failed:', error);
    return successResponse(res, 200, 'Login status verification failed', { 
      isLoggedIn: false,
      user: null,
      token: null
    });
  }
});

// Logout (clear session)
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return errorResponse(res, 500, 'Logout failed');
    }
    
    return successResponse(res, 200, 'Logout successful');
  });
});

module.exports = router;
