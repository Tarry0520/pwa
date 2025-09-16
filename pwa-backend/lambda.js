const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app');
const { initDatabase } = require('./config/database');

// Initialization flag
let isInitialized = false;

// Disable non-essential features in Lambda environment
if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  // Disable view engine
  app.set('view engine', null);
  app.set('views', null);
  
  // Remove static file serving
  app._router.stack = app._router.stack.filter(layer => {
    return layer.name !== 'serveStatic';
  });
}

// Wrap handler to ensure initialization
const handler = serverlessExpress({ app });

exports.handler = async (event, context) => {
  // Ensure we initialize only once
  if (!isInitialized) {
    console.log('Initializing Lambda environment...');
    try {
      await initDatabase();
      console.log('Database initialization successful');
      isInitialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      // Set flag even on failure to avoid repeated attempts
      isInitialized = true;
    }
  }
  
  // Invoke original handler
  return handler(event, context);
};
