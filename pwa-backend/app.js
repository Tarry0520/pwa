// Enable decorator support (non-blocking if dependency is missing)
try {
  require('reflect-metadata')
} catch (e) {
  console.warn('reflect-metadata is not installed, skipping (POC mode)')
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

// Middleware setup
app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "some_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Global field transformation middleware
// Only transform response data: snake_case -> camelCase (for frontend display)
// Do not transform request payloads; keep original frontend format
app.use(responseTransform({
  exclude: ['password', 'secretKey', 'token'] // exclude sensitive fields
}));

// Initialize database and Redis connections
async function initializeServices() {
  try {
    console.log('Initializing services...');
    
    // Test DB connection
    const dbConnected = await testConnection();
    if (dbConnected) {
      await initDatabase();
    }
    
    // Test Redis connection
    await testRedisConnection();
    
    console.log('Service initialization completed');
  } catch (error) {
    console.error('Service initialization failed:', error);
  }
}

// Initialize services on startup
initializeServices();

// Register routes
registerRoutes(app);

// 404 handler (must be after routes, before global error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

module.exports = app;
