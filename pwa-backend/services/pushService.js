const webpush = require('web-push');

class PushService {
  constructor() {
    // VAPID密钥配置
    this.publicKey = process.env.VAPID_PUBLIC_KEY || 'BOJvBId6mQHxPsNTKP9HNj6It8SVxo0Q4epoj30zLHix3gbRwu8mprXMTB-Z3RfKFaiE1BPykqD6yfu0XKumgoA';
    this.privateKey = process.env.VAPID_PRIVATE_KEY || 'qvAFblStXsP9IzBJHJs3mvw1tEWDaRqY5OAzq4gkAQI';
    
    // 设置VAPID详情
    webpush.setVapidDetails(
      'mailto:admin@example.com',
      this.publicKey,
      this.privateKey
    );
    
    // 存储订阅信息（实际项目中应该存储在数据库中）
    this.subscriptions = [];
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
  saveSubscription(subscription, userId = null) {
    try {
      // 检查是否已存在相同的订阅
      const existingIndex = this.subscriptions.findIndex(sub => 
        sub.endpoint === subscription.endpoint
      );
      
      if (existingIndex !== -1) {
        // 更新现有订阅
        this.subscriptions[existingIndex] = {
          ...subscription,
          userId,
          createdAt: this.subscriptions[existingIndex].createdAt,
          updatedAt: new Date()
        };
      } else {
        // 添加新订阅
        this.subscriptions.push({
          ...subscription,
          userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      console.log('推送订阅已保存:', subscription.endpoint);
      return true;
    } catch (error) {
      console.error('保存推送订阅失败:', error);
      return false;
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
  getAllSubscriptions() {
    return this.subscriptions;
  }

  /**
   * 根据用户ID获取订阅
   * @param {number} userId 用户ID
   * @returns {Array} 用户订阅列表
   */
  getSubscriptionsByUserId(userId) {
    return this.subscriptions.filter(sub => sub.userId === userId);
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

    if (this.subscriptions.length === 0) {
      return {
        ...results,
        message: '没有可用的订阅'
      };
    }

    const pushPromises = this.subscriptions.map(async (subscription, index) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        results.success++;
        console.log(`推送成功: ${subscription.endpoint}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          endpoint: subscription.endpoint,
          error: error.message
        });
        
        // 如果是订阅失效，删除该订阅
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('订阅已失效，删除:', subscription.endpoint);
          this.subscriptions.splice(index, 1);
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
    const userSubscriptions = this.getSubscriptionsByUserId(userId);
    
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
        
        // 如果是订阅失效，删除该订阅
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('订阅已失效，删除:', subscription.endpoint);
          this.removeSubscription(subscription.endpoint);
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
    const subscription = this.subscriptions.find(sub => sub.endpoint === endpoint);
    
    if (!subscription) {
      return {
        success: false,
        message: '订阅不存在'
      };
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log(`推送成功: ${endpoint}`);
      return {
        success: true,
        message: '推送成功'
      };
    } catch (error) {
      console.error('推送失败:', error);
      
      // 如果是订阅失效，删除该订阅
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('订阅已失效，删除:', endpoint);
        this.removeSubscription(endpoint);
      }
      
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }
}

// 创建单例实例
const pushService = new PushService();

module.exports = pushService;
