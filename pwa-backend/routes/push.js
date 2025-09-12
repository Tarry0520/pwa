const express = require('express');
const router = express.Router();
const pushService = require('../services/pushService');
const { authenticateToken } = require('../middleware/auth');
const { 
  successResponse, 
  errorResponse, 
  validationErrorResponse 
} = require('../utils/responseFormatter');

/**
 * 获取VAPID公钥
 * GET /push/vapid-key
 */
router.get('/vapid-key', (req, res) => {
  try {
    const publicKey = pushService.getPublicKey();
    return successResponse(res, 200, '获取VAPID公钥成功', { publicKey });
  } catch (error) {
    console.error('获取VAPID公钥错误:', error);
    return errorResponse(res, 500, '获取VAPID公钥失败');
  }
});

/**
 * 保存推送订阅
 * POST /push/subscribe
 */
router.post('/subscribe', async (req, res) => {
  try {
    // Get user ID if authenticated
    const userId = req.user?.id || null;
    
    // Support both formats
    let subscription = req.body.subscription || req.body;

    // Validate subscription format
    if (!subscription || !subscription.endpoint || !subscription.keys ||
        !subscription.keys.p256dh || !subscription.keys.auth) {
      return validationErrorResponse(res, '订阅信息格式不正确');
    }

    // Add user agent information
    subscription.userAgent = req.headers['user-agent'];

    console.log('收到推送订阅请求:', {
      userId,
      endpoint: subscription.endpoint,
      userAgent: subscription.userAgent,
      timestamp: new Date().toISOString()
    });

    // Save subscription
    const success = await pushService.saveSubscription(subscription, userId);
    
    if (success) {
      return successResponse(res, 200, '订阅保存成功');
    } else {
      return errorResponse(res, 500, '订阅保存失败');
    }
  } catch (error) {
    console.error('保存推送订阅错误:', error);
    return errorResponse(res, 500, '保存推送订阅失败');
  }
});

/**
 * 删除推送订阅
 * DELETE /push/unsubscribe
 */
router.delete('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!endpoint) {
      return validationErrorResponse(res, '订阅端点是必填项');
    }

    // 删除订阅
    const success = pushService.removeSubscription(endpoint);
    
    if (success) {
      return successResponse(res, 200, '取消订阅成功');
    } else {
      return errorResponse(res, 404, '订阅不存在');
    }
  } catch (error) {
    console.error('删除推送订阅错误:', error);
    return errorResponse(res, 500, '删除推送订阅失败');
  }
});

/**
 * 获取当前用户的推送订阅
 * GET /push/subscriptions
 */
router.get('/subscriptions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptions = pushService.getSubscriptionsByUserId(userId);
    
    return successResponse(res, 200, '获取订阅列表成功', { 
      subscriptions: subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      }))
    });
  } catch (error) {
    console.error('获取推送订阅错误:', error);
    return errorResponse(res, 500, '获取推送订阅失败');
  }
});

/**
 * 发送推送消息给所有用户
 * POST /push/send-all
 */
router.post('/send-all', authenticateToken, async (req, res) => {
  try {
    const { title, body, icon, badge, data } = req.body;

    // 验证必填字段
    if (!title || !body) {
      return validationErrorResponse(res, '标题和内容都是必填项');
    }

    // 构建推送载荷
    const payload = {
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-96x96.png',
      data: data || {},
      timestamp: new Date().toISOString()
    };

    // 发送推送
    const result = await pushService.sendToAll(payload);
    
    return successResponse(res, 200, result.message, result);
  } catch (error) {
    console.error('发送推送消息错误:', error);
    return errorResponse(res, 500, '发送推送消息失败');
  }
});

/**
 * 发送推送消息给指定用户
 * POST /push/send-user
 */
router.post('/send-user', authenticateToken, async (req, res) => {
  try {
    const { userId, title, body, icon, badge, data } = req.body;

    // 验证必填字段
    if (!userId || !title || !body) {
      return validationErrorResponse(res, '用户ID、标题和内容都是必填项');
    }

    // 构建推送载荷
    const payload = {
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-96x96.png',
      data: data || {},
      timestamp: new Date().toISOString()
    };

    // 发送推送
    const result = await pushService.sendToUser(userId, payload);
    
    return successResponse(res, 200, result.message, result);
  } catch (error) {
    console.error('发送用户推送消息错误:', error);
    return errorResponse(res, 500, '发送用户推送消息失败');
  }
});

/**
 * 发送推送消息给指定订阅
 * POST /push/send-subscription
 */
router.post('/send-subscription', authenticateToken, async (req, res) => {
  try {
    const { endpoint, title, body, icon, badge, data } = req.body;

    // 验证必填字段
    if (!endpoint || !title || !body) {
      return validationErrorResponse(res, '订阅端点、标题和内容都是必填项');
    }

    // 构建推送载荷
    const payload = {
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-96x96.png',
      data: data || {},
      timestamp: new Date().toISOString()
    };

    // 发送推送
    const result = await pushService.sendToSubscription(endpoint, payload);
    
    if (result.success) {
      return successResponse(res, 200, result.message, result);
    } else {
      return errorResponse(res, 400, result.message, result);
    }
  } catch (error) {
    console.error('发送订阅推送消息错误:', error);
    return errorResponse(res, 500, '发送订阅推送消息失败');
  }
});

/**
 * 获取推送统计信息
 * GET /push/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const allSubscriptions = pushService.getAllSubscriptions();
    const userSubscriptions = pushService.getSubscriptionsByUserId(req.user.id);
    
    const stats = {
      totalSubscriptions: allSubscriptions.length,
      userSubscriptions: userSubscriptions.length,
      activeSubscriptions: allSubscriptions.filter(sub => {
        // 简单的活跃度检查：最近7天内有更新
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(sub.updatedAt) > weekAgo;
      }).length
    };
    
    return successResponse(res, 200, '获取推送统计成功', stats);
  } catch (error) {
    console.error('获取推送统计错误:', error);
    return errorResponse(res, 500, '获取推送统计失败');
  }
});

module.exports = router;
