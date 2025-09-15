const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pwa_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    return false;
  }
}

// 初始化数据库表
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // 创建用户表（支持OAuth登录和学号）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255),
        provider VARCHAR(20) DEFAULT 'local',
        provider_id VARCHAR(100),
        display_name VARCHAR(100),
        phone VARCHAR(20),
        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_provider (provider, provider_id),
        INDEX idx_email (email),
        INDEX idx_student_id (student_id),
        INDEX idx_phone (phone)
      )
    `);
    
    // 添加手机号字段（如果表已存在但字段不存在）
    try {
      await connection.execute(`
        ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER display_name
      `);
      console.log('手机号字段添加成功');
    } catch (error) {
      // 字段可能已存在，忽略错误
      if (!error.message.includes('Duplicate column name')) {
        console.log('手机号字段可能已存在或添加失败:', error.message);
      }
    }

    // 创建推送订阅表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        endpoint VARCHAR(512) NOT NULL,
        auth_key VARCHAR(255) NOT NULL,
        p256dh_key VARCHAR(255) NOT NULL,
        user_id INT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_endpoint (endpoint),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('数据库表初始化成功');
    connection.release();
  } catch (error) {
    console.error('数据库表初始化失败:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  initDatabase
};
