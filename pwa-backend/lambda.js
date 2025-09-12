const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app');
const { initDatabase } = require('./config/database');

// 初始化標記
let isInitialized = false;

// 在 Lambda 環境中禁用某些不必要的功能
if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  // 禁用 view engine
  app.set('view engine', null);
  app.set('views', null);
  
  // 移除靜態文件服務
  app._router.stack = app._router.stack.filter(layer => {
    return layer.name !== 'serveStatic';
  });
}

// 包裝 handler 以確保初始化
const handler = serverlessExpress({ app });

exports.handler = async (event, context) => {
  // 確保只初始化一次
  if (!isInitialized) {
    console.log('正在初始化 Lambda 環境...');
    try {
      await initDatabase();
      console.log('數據庫初始化成功');
      isInitialized = true;
    } catch (error) {
      console.error('數據庫初始化失敗:', error);
      // 即使初始化失敗也設置標記，避免重複嘗試
      isInitialized = true;
    }
  }
  
  // 調用原始 handler
  return handler(event, context);
};