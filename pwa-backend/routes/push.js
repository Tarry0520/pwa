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
 * Get VAPID public key
 * GET /push/vapid-key
 */
router.get('/vapid-key', (req, res) => {
  try {
    const publicKey = pushService.getPublicKey();
    return successResponse(res, 200, 'VAPID public key retrieved', { publicKey });
  } catch (error) {
    console.error('Failed to get VAPID public key:', error);
    return errorResponse(res, 500, 'Failed to get VAPID public key');
  }
});

/**
 * Save push subscription
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
      return validationErrorResponse(res, 'Invalid subscription payload');
    }

    // Add user agent information
    subscription.userAgent = req.headers['user-agent'];

    console.log('Received push subscription:', {
      userId,
      endpoint: subscription.endpoint,
      userAgent: subscription.userAgent,
      timestamp: new Date().toISOString()
    });

    // Save subscription
    const success = await pushService.saveSubscription(subscription, userId);
    
    if (success) {
      return successResponse(res, 200, 'Subscription saved successfully');
    } else {
      return errorResponse(res, 500, 'Failed to save subscription');
    }
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return errorResponse(res, 500, 'Error saving push subscription');
  }
});

/**
 * Delete push subscription
 * DELETE /push/unsubscribe
 */
router.delete('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.id;

    // Validate required field
    if (!endpoint) {
      return validationErrorResponse(res, 'Subscription endpoint is required');
    }

    // Remove subscription
    const success = pushService.removeSubscription(endpoint);
    
    if (success) {
      return successResponse(res, 200, 'Unsubscribed successfully');
    } else {
      return errorResponse(res, 404, 'Subscription not found');
    }
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return errorResponse(res, 500, 'Failed to delete subscription');
  }
});

/**
 * Get current user's push subscriptions
 * GET /push/subscriptions
 */
router.get('/subscriptions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptions = pushService.getSubscriptionsByUserId(userId);
    
    return successResponse(res, 200, 'Subscriptions fetched', { 
      subscriptions: subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      }))
    });
  } catch (error) {
    console.error('Failed to get subscriptions:', error);
    return errorResponse(res, 500, 'Failed to get subscriptions');
  }
});

/**
 * Send push to all users
 * POST /push/send-all
 */
router.post('/send-all', async (req, res) => {
  try {
    const { title, body, icon, badge, data } = req.body;

    // Validate
    if (!title || !body) {
      return validationErrorResponse(res, 'Title and body are required');
    }

    // Build payload
    const payload = {
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-96x96.png',
      data: data || {},
      timestamp: new Date().toISOString()
    };

    // Send push
    const result = await pushService.sendToAll(payload);
    
    return successResponse(res, 200, result.message, result);
  } catch (error) {
    console.error('Error sending push to all:', error);
    return errorResponse(res, 500, 'Failed to send push to all');
  }
});

/**
 * Send push to a specific user
 * POST /push/send-user
 */
router.post('/send-user', authenticateToken, async (req, res) => {
  try {
    const { userId, title, body, icon, badge, data } = req.body;

    // Validate
    if (!userId || !title || !body) {
      return validationErrorResponse(res, 'userId, title and body are required');
    }

    // Build payload
    const payload = {
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-96x96.png',
      data: data || {},
      timestamp: new Date().toISOString()
    };

    // Send push
    const result = await pushService.sendToUser(userId, payload);
    
    return successResponse(res, 200, result.message, result);
  } catch (error) {
    console.error('Error sending push to user:', error);
    return errorResponse(res, 500, 'Failed to send push to user');
  }
});

/**
 * Send push to a specific subscription
 * POST /push/send-subscription
 */
router.post('/send-subscription', authenticateToken, async (req, res) => {
  try {
    const { endpoint, title, body, icon, badge, data } = req.body;

    // Validate
    if (!endpoint || !title || !body) {
      return validationErrorResponse(res, 'endpoint, title and body are required');
    }

    // Build payload
    const payload = {
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-96x96.png',
      data: data || {},
      timestamp: new Date().toISOString()
    };

    // Send push
    const result = await pushService.sendToSubscription(endpoint, payload);
    
    if (result.success) {
      return successResponse(res, 200, result.message, result);
    } else {
      return errorResponse(res, 400, result.message, result);
    }
  } catch (error) {
    console.error('Error sending push to subscription:', error);
    return errorResponse(res, 500, 'Failed to send push to subscription');
  }
});

/**
 * Get push statistics
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
        // Simple activity check: updated within the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(sub.updatedAt) > weekAgo;
      }).length
    };
    
    return successResponse(res, 200, 'Push stats fetched', stats);
  } catch (error) {
    console.error('Failed to get push stats:', error);
    return errorResponse(res, 500, 'Failed to get push stats');
  }
});

module.exports = router;
