const redis = require('redis');
require('dotenv').config();

// Redis连接配置 - Redis v5.x版本
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Redis重试次数过多');
      }
      return Math.min(retries * 100, 3000);
    }
  },
  // 只有在设置了密码时才添加password字段
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
};

// 创建Redis客户端
const client = redis.createClient(redisConfig);

client.connect();

// 连接事件处理
client.on('connect', () => {
  console.log('Redis客户端已连接');
});

client.on('error', (err) => {
  console.error('Redis连接错误:', err);
});

client.on('ready', () => {
  console.log('Redis客户端已就绪');
});

// 测试Redis连接
async function testRedisConnection() {
  try {
    await client.ping();
    console.log('Redis连接测试成功');
    return true;
  } catch (error) {
    console.error('Redis连接测试失败:', error.message);
    return false;
  }
}

// 设置键值对（带过期时间）
async function setWithExpiry(key, value, expirySeconds = 3600) {
  try {
    await client.set(key, JSON.stringify(value), {
      EX: expirySeconds
    });
    return true;
  } catch (error) {
    console.error('Redis设置失败:', error);
    return false;
  }
}

// 获取键值
async function get(key) {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis获取失败:', error);
    return null;
  }
}

// 删除键
async function del(key) {
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis删除失败:', error);
    return false;
  }
}

// 检查键是否存在
async function exists(key) {
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Redis检查键存在失败:', error);
    return false;
  }
}

module.exports = {
  client,
  testRedisConnection,
  setWithExpiry,
  get,
  del,
  exists
};
