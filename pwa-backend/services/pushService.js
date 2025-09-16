const webpush = require('web-push');
const { pool } = require('../config/database');

class PushService {
  constructor() {
    // VAPID key configuration
    this.publicKey = process.env.VAPID_PUBLIC_KEY;
    this.privateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!this.publicKey || !this.privateKey) {
      console.error('VAPID keys not found in environment variables');
      throw new Error('VAPID configuration is missing');
    }
    
    // Configure VAPID details
    const contact = process.env.VAPID_CONTACT || 'mailto:your-email@example.com';
    console.log('Initializing VAPID with:', {
      contact,
      publicKeyLength: this.publicKey.length,
      timestamp: new Date().toISOString()
    });
    
    webpush.setVapidDetails(
      contact,
      this.publicKey,
      this.privateKey
    );
    
    // Reuse shared DB pool
    this.pool = pool;
  }

  /**
   * Get VAPID public key
   * @returns {string} public key
   */
  getPublicKey() {
    return this.publicKey;
  }

  /**
   * Save a push subscription
   * @param {Object} subscription - subscription object
   * @param {number} userId - optional user ID
   * @returns {boolean} whether saved successfully
   */
  async saveSubscription(subscription, userId = null) {
    let connection;
    try {
      console.log('Saving push subscription:', {
        endpoint: subscription.endpoint,
        userId,
        keys: subscription.keys,
        userAgent: subscription.userAgent,
        timestamp: new Date().toISOString()
      });

      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Check if subscription already exists
      const [rows] = await connection.query(
        'SELECT id FROM push_subscriptions WHERE endpoint = ?',
        [subscription.endpoint]
      );

      if (rows.length > 0) {
        // Update existing subscription
        await connection.query(
          `UPDATE push_subscriptions 
           SET auth_key = ?, 
               p256dh_key = ?, 
               user_id = ?, 
               user_agent = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE endpoint = ?`,
          [
            subscription.keys.auth,
            subscription.keys.p256dh,
            userId,
            subscription.userAgent,
            subscription.endpoint
          ]
        );
        console.log('Updated existing subscription:', {
          endpoint: subscription.endpoint,
          userId,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Insert new subscription
        await connection.query(
          `INSERT INTO push_subscriptions 
           (endpoint, auth_key, p256dh_key, user_id, user_agent)
           VALUES (?, ?, ?, ?, ?)`,
          [
            subscription.endpoint,
            subscription.keys.auth,
            subscription.keys.p256dh,
            userId,
            subscription.userAgent
          ]
        );
        console.log('Inserted new subscription:', {
          endpoint: subscription.endpoint,
          userId,
          createdAt: new Date().toISOString()
        });
      }

      const [countRows] = await connection.query(
        'SELECT COUNT(*) as count FROM push_subscriptions'
      );
      console.log('Total subscriptions:', countRows[0].count);

      await connection.commit();
      return true;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Failed to save subscription:', error);
      return false;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Remove push subscription
   * @param {string} endpoint - subscription endpoint
   * @returns {boolean} whether removed
   */
  removeSubscription(endpoint) {
    try {
      const index = this.subscriptions.findIndex(sub => sub.endpoint === endpoint);
      if (index !== -1) {
        this.subscriptions.splice(index, 1);
        console.log('Subscription removed:', endpoint);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to remove subscription:', error);
      return false;
    }
  }

  /**
   * Get all subscriptions
   * @returns {Array} subscriptions
   */
  async getAllSubscriptions() {
    try {
      const [rows] = await this.pool.query(
        `SELECT endpoint, auth_key, p256dh_key, user_id, user_agent 
         FROM push_subscriptions`
      );
      
      return rows.map(row => ({
        endpoint: row.endpoint,
        keys: {
          auth: row.auth_key,
          p256dh: row.p256dh_key
        },
        userId: row.user_id,
        userAgent: row.user_agent
      }));
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      return [];
    }
  }

  /**
   * Get subscriptions by user ID
   * @param {number} userId - user ID
   * @returns {Array} subscriptions
   */
  async getSubscriptionsByUserId(userId) {
    try {
      const [rows] = await this.pool.query(
        `SELECT endpoint, auth_key, p256dh_key, user_id, user_agent 
         FROM push_subscriptions 
         WHERE user_id = ?`,
        [userId]
      );
      
      return rows.map(row => ({
        endpoint: row.endpoint,
        keys: {
          auth: row.auth_key,
          p256dh: row.p256dh_key
        },
        userId: row.user_id,
        userAgent: row.user_agent
      }));
    } catch (error) {
      console.error('Failed to fetch user subscriptions:', error);
      return [];
    }
  }

  /**
   * Send a push message to all subscribers
   * @param {Object} payload - push payload
   * @returns {Promise<Object>} result summary
   */
  async sendToAll(payload) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Fetch all subscriptions from DB
    const subscriptions = await this.getAllSubscriptions();

    if (subscriptions.length === 0) {
      return {
        ...results,
        message: 'No available subscriptions'
      };
    }

    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        console.log('Sending push:', {
          endpoint: subscription.endpoint,
          payload: JSON.stringify(payload),
          timestamp: new Date().toISOString()
        });
        
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        results.success++;
        console.log('Push successful:', {
          endpoint: subscription.endpoint,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          endpoint: subscription.endpoint,
          error: error.message
        });
        
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('Subscription expired, deleting:', subscription.endpoint);
          let connection;
          try {
            connection = await this.pool.getConnection();
            await connection.execute(
              'DELETE FROM push_subscriptions WHERE endpoint = ?',
              [subscription.endpoint]
            );
          } catch (dbError) {
            console.error('Failed to delete expired subscription:', dbError);
          } finally {
            if (connection) {
              connection.release();
            }
          }
        } else {
          console.error('Push failed:', error);
        }
      }
    });

    await Promise.all(pushPromises);

    return {
      ...results,
      message: `Push completed, success: ${results.success}, failed: ${results.failed}`
    };
  }

  /**
   * Send a push message to a specific user
   * @param {number} userId - user ID
   * @param {Object} payload - push payload
   * @returns {Promise<Object>} result summary
   */
  async sendToUser(userId, payload) {
    const userSubscriptions = await this.getSubscriptionsByUserId(userId);
    
    if (userSubscriptions.length === 0) {
      return {
        success: 0,
        failed: 0,
        message: 'User has no subscriptions'
      };
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    const pushPromises = userSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        results.success++;
        console.log(`Push to user ${userId} successful: ${subscription.endpoint}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          endpoint: subscription.endpoint,
          error: error.message
        });
        
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('Subscription expired, deleting:', subscription.endpoint);
          let connection;
          try {
            connection = await this.pool.getConnection();
            await connection.execute(
              'DELETE FROM push_subscriptions WHERE endpoint = ?',
              [subscription.endpoint]
            );
          } catch (dbError) {
            console.error('Failed to delete expired subscription:', dbError);
          } finally {
            if (connection) {
              connection.release();
            }
          }
        } else {
          console.error('Push to user failed:', error);
        }
      }
    });

    await Promise.all(pushPromises);

    return {
      ...results,
      message: `Push to user ${userId} completed, success: ${results.success}, failed: ${results.failed}`
    };
  }

  /**
   * Send a push message to a specific subscription
   * @param {string} endpoint - subscription endpoint
   * @param {Object} payload - push payload
   * @returns {Promise<Object>} result
   */
  async sendToSubscription(endpoint, payload) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      const [rows] = await connection.query(
        `SELECT endpoint, auth_key, p256dh_key, user_id, user_agent 
         FROM push_subscriptions 
         WHERE endpoint = ?`,
        [endpoint]
      );

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Subscription not found'
        };
      }

      const subscription = {
        endpoint: rows[0].endpoint,
        keys: {
          auth: rows[0].auth_key,
          p256dh: rows[0].p256dh_key
        }
      };

      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log(`Push successful: ${endpoint}`);
      return {
        success: true,
        message: 'Push successful'
      };
    } catch (error) {
      console.error('Push failed:', error);
      
      // Remove invalid subscription if expired
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('Subscription expired, deleting:', endpoint);
        try {
          await connection.execute(
            'DELETE FROM push_subscriptions WHERE endpoint = ?',
            [endpoint]
          );
        } catch (dbError) {
          console.error('Failed to delete expired subscription:', dbError);
        }
      }
      
      return {
        success: false,
        message: error.message,
        error: error
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

// Create singleton instance
const pushService = new PushService();

module.exports = pushService;
