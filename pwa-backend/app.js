// 启用装饰器支持（在缺少依賴時不阻擋啟動）
try {
  require('reflect-metadata')
} catch (e) {
  console.warn('reflect-metadata 未安裝，略過（POC 模式）')
}

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const session = require("express-session");
require('dotenv').config();

const registerRoutes = require('./routes/router');
const { testConnection, initDatabase } = require('./config/database');
const { testRedisConnection } = require('./config/redis');
const { requestTransform, responseTransform } = require('./middleware/dtoMiddleware');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// 中间件配置
app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Session配置
app.use(
  session({
    secret: process.env.SESSION_SECRET || "some_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
  })
);

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 全局字段转换中间件
// 只对响应数据进行转换：下划线 -> 驼峰（用于前端显示）
// 请求数据不进行转换，保持前端发送的原始格式
app.use(responseTransform({
  exclude: ['password', 'secretKey', 'token'] // 排除敏感字段
}));

// 初始化数据库和Redis连接
async function initializeServices() {
  try {
    console.log('正在初始化服务...');
    
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (dbConnected) {
      await initDatabase();
    }
    
    // 测试Redis连接
    await testRedisConnection();
    
    console.log('服务初始化完成');
  } catch (error) {
    console.error('服务初始化失败:', error);
  }
}

// 启动时初始化服务
initializeServices();

// 注册路由
registerRoutes(app);

// 404错误处理（必须在路由之后，全局错误处理之前）
app.use(notFoundHandler);

// 全局错误处理中间件（必须在最后）
app.use(globalErrorHandler);

module.exports = app;
