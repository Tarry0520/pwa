const webpush = require('web-push');
const { pool } = require('../config/database');

class PushService {
  constructor() {
    // VAPID密钥配置
    this.publicKey = process.env.VAPID_PUBLIC_KEY;
    this.privateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!this.publicKey || !this.privateKey) {
      console.error('VAPID keys not found in environment variables');
      throw new Error('VAPID configuration is missing');
    }
    
    // 设置VAPID详情
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
    
    // 使用现有的数据库连接池
    this.pool = pool;
  }

  /**
   * 获取VAPID公钥
   * @returns {string} VAPID公钥
   */
  getPublicKey() {
    return this.publicKey;
  }

  /**
   * 保存推送订阅
   * @param {Object} subscription 推送订阅对象
   * @param {number} userId 用户ID（可选）
   * @returns {boolean} 保存是否成功
   */
  async saveSubscription(subscription, userId = null) {
    let connection;
    try {
      console.log('保存推送订阅，详细信息:', {
        endpoint: subscription.endpoint,
        userId,
        keys: subscription.keys,
        userAgent: subscription.userAgent,
        timestamp: new Date().toISOString()
      });

      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // 检查是否已存在相同的订阅
      const [rows] = await connection.query(
        'SELECT id FROM push_subscriptions WHERE endpoint = ?',
        [subscription.endpoint]
      );

      if (rows.length > 0) {
        // 更新现有订阅
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
        console.log('更新现有订阅:', {
          endpoint: subscription.endpoint,
          userId,
          updatedAt: new Date().toISOString()
        });
      } else {
        // 添加新订阅
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
        console.log('添加新订阅:', {
          endpoint: subscription.endpoint,
          userId,
          createdAt: new Date().toISOString()
        });
      }

      const [countRows] = await connection.query(
        'SELECT COUNT(*) as count FROM push_subscriptions'
      );
      console.log('当前订阅总数:', countRows[0].count);

      await connection.commit();
      return true;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('保存推送订阅失败:', error);
      return false;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * 删除推送订阅
   * @param {string} endpoint 订阅端点
   * @returns {boolean} 删除是否成功
   */
  removeSubscription(endpoint) {
    try {
      const index = this.subscriptions.findIndex(sub => sub.endpoint === endpoint);
      if (index !== -1) {
        this.subscriptions.splice(index, 1);
        console.log('推送订阅已删除:', endpoint);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除推送订阅失败:', error);
      return false;
    }
  }

  /**
   * 获取所有订阅
   * @returns {Array} 订阅列表
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
      console.error('获取订阅列表失败:', error);
      return [];
    }
  }

  /**
   * 根据用户ID获取订阅
   * @param {number} userId 用户ID
   * @returns {Array} 用户订阅列表
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
      console.error('获取用户订阅列表失败:', error);
      return [];
    }
  }

  /**
   * 发送推送消息给所有订阅者
   * @param {Object} payload 推送内容
   * @returns {Promise<Object>} 推送结果
   */
  async sendToAll(payload) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // 从数据库获取所有订阅
    const subscriptions = await this.getAllSubscriptions();

    if (subscriptions.length === 0) {
      return {
        ...results,
        message: '没有可用的订阅'
      };
    }

    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        console.log('准备发送推送:', {
          endpoint: subscription.endpoint,
          payload: JSON.stringify(payload),
          timestamp: new Date().toISOString()
        });
        
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        results.success++;
        console.log('推送成功:', {
          endpoint: subscription.endpoint,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          endpoint: subscription.endpoint,
          error: error.message
        });
        
        // 如果是订阅失效，从数据库中删除该订阅
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('订阅已失效，删除:', subscription.endpoint);
          let connection;
          try {
            connection = await this.pool.getConnection();
            await connection.execute(
              'DELETE FROM push_subscriptions WHERE endpoint = ?',
              [subscription.endpoint]
            );
          } catch (dbError) {
            console.error('删除失效订阅失败:', dbError);
          } finally {
            if (connection) {
              connection.release();
            }
          }
        } else {
          console.error('推送失败:', error);
        }
      }
    });

    await Promise.all(pushPromises);

    return {
      ...results,
      message: `推送完成，成功: ${results.success}，失败: ${results.failed}`
    };
  }

  /**
   * 发送推送消息给指定用户
   * @param {number} userId 用户ID
   * @param {Object} payload 推送内容
   * @returns {Promise<Object>} 推送结果
   */
  async sendToUser(userId, payload) {
    const userSubscriptions = await this.getSubscriptionsByUserId(userId);
    
    if (userSubscriptions.length === 0) {
      return {
        success: 0,
        failed: 0,
        message: '用户没有推送订阅'
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
        console.log(`推送给用户${userId}成功: ${subscription.endpoint}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          endpoint: subscription.endpoint,
          error: error.message
        });
        
        // 如果是订阅失效，从数据库中删除该订阅
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('订阅已失效，删除:', subscription.endpoint);
          let connection;
          try {
            connection = await this.pool.getConnection();
            await connection.execute(
              'DELETE FROM push_subscriptions WHERE endpoint = ?',
              [subscription.endpoint]
            );
          } catch (dbError) {
            console.error('删除失效订阅失败:', dbError);
          } finally {
            if (connection) {
              connection.release();
            }
          }
        } else {
          console.error('推送给用户失败:', error);
        }
      }
    });

    await Promise.all(pushPromises);

    return {
      ...results,
      message: `推送给用户${userId}完成，成功: ${results.success}，失败: ${results.failed}`
    };
  }

  /**
   * 发送推送消息给指定订阅
   * @param {string} endpoint 订阅端点
   * @param {Object} payload 推送内容
   * @returns {Promise<Object>} 推送结果
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
          message: '订阅不存在'
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
      console.log(`推送成功: ${endpoint}`);
      return {
        success: true,
        message: '推送成功'
      };
    } catch (error) {
      console.error('推送失败:', error);
      
      // 如果是订阅失效，从数据库中删除该订阅
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('订阅已失效，删除:', endpoint);
        try {
          await connection.execute(
            'DELETE FROM push_subscriptions WHERE endpoint = ?',
            [endpoint]
          );
        } catch (dbError) {
          console.error('删除失效订阅失败:', dbError);
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

// 创建单例实例
const pushService = new PushService();

module.exports = pushService;
