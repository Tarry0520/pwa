const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
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

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

// Initialize database tables
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Create users table (supports OAuth login and student ID)
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
    
    // Add phone column if missing on existing table
    try {
      await connection.execute(`
        ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER display_name
      `);
      console.log('Phone column added successfully');
    } catch (error) {
      // Column might already exist; ignore the error if so
      if (!error.message.includes('Duplicate column name')) {
        console.log('Phone column may already exist or add failed:', error.message);
      }
    }

    // Create push_subscriptions table
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
    
    console.log('Database tables initialized successfully');
    connection.release();
  } catch (error) {
    console.error('Database table initialization failed:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  initDatabase
};
