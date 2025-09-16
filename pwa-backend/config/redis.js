const redis = require('redis');
require('dotenv').config();

// Redis connection configuration - Redis v5.x
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Too many Redis retries');
      }
      return Math.min(retries * 100, 3000);
    }
  },
  // Only include password field when provided
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
};

// Create Redis client
const client = redis.createClient(redisConfig);

client.connect();

// Connection event handlers
client.on('connect', () => {
  console.log('Redis client connected');
});

client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

client.on('ready', () => {
  console.log('Redis client ready');
});

// Test Redis connection
async function testRedisConnection() {
  try {
    await client.ping();
    console.log('Redis connection test successful');
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error.message);
    return false;
  }
}

// Set key with expiry
async function setWithExpiry(key, value, expirySeconds = 3600) {
  try {
    await client.set(key, JSON.stringify(value), {
      EX: expirySeconds
    });
    return true;
  } catch (error) {
    console.error('Redis set failed:', error);
    return false;
  }
}

// Get key
async function get(key) {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get failed:', error);
    return null;
  }
}

// Delete key
async function del(key) {
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis delete failed:', error);
    return false;
  }
}

// Check if key exists
async function exists(key) {
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Redis exists check failed:', error);
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
