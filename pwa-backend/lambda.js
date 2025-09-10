const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app');

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

// 導出 Lambda handler
exports.handler = serverlessExpress({ app });